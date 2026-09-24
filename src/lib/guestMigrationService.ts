import { db } from './firebase';
import {
  collection,
  doc,
  writeBatch,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { GuestData, STREAK_GUEST_DATA_KEY } from './AuthContext';
import { readLocalHabits, readLocalLogs, Habit, HabitLog } from './habitService';
import { readLocalTasks, TaskItem } from './taskService';
import { readLocalGoals, Goal } from './goalService';
import { readLocalJournal } from './journalService';
import { readLocalReminders } from './reminderService';

export interface MigrationResult {
  success: boolean;
  migratedCounts: {
    profile: boolean;
    habits: number;
    habitLogs: number;
    tasks: number;
    goals: number;
    journal: number;
    reminders: number;
  };
  clearedLocalStorage: boolean;
  error?: string;
}

/**
 * Checks if there is unmigrated guest data in local storage
 */
export function hasGuestDataToMigrate(): boolean {
  try {
    const raw = localStorage.getItem(STREAK_GUEST_DATA_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed && typeof parsed === 'object');
  } catch {
    return false;
  }
}

/**
 * Retrieves the guest data object from localStorage
 */
export function getStoredGuestDataForMigration(): GuestData | null {
  try {
    const raw = localStorage.getItem(STREAK_GUEST_DATA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as GuestData;
    }
  } catch (e) {
    console.error('Failed reading streak_guest_data for migration:', e);
  }
  return null;
}

/**
 * Safely cleans and deletes local guest storage AFTER database write is confirmed
 */
export function clearGuestDataAfterMigration(): void {
  try {
    localStorage.removeItem(STREAK_GUEST_DATA_KEY);
    localStorage.removeItem('streak_habits_v1');
    localStorage.removeItem('streak_habit_logs_v1');
    localStorage.removeItem('streak_tasks_v1');
    localStorage.removeItem('streak_goals_v1');
    localStorage.removeItem('streak_journal_v1');
    localStorage.removeItem('streak_reminders_v1');
    sessionStorage.setItem('streak_guest_migrated', 'true');
  } catch (e) {
    console.error('Failed clearing local guest data after migration:', e);
  }
}

// Helpers to sanitize values to strictly adhere to firestore.rules
function sanitizeString(str: any, maxLen: number): string | undefined {
  if (typeof str !== 'string') return undefined;
  const trimmed = str.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLen);
}

function sanitizeNumber(num: any, fallback = 0): number {
  const val = Number(num);
  return Number.isFinite(val) ? val : fallback;
}

/**
 * Core Migration Utility
 * Migrates local 'streak_guest_data' and associated local guest records to Firestore.
 * 
 * CRITICAL SAFETY REQUIREMENT:
 * Local guest data is cleared ONLY after a confirmed successful write by Firestore.
 * If any database operation fails, local data is preserved completely.
 * 
 * @param userId - The authenticated Firebase user ID (request.auth.uid)
 * @param userEmail - Optional email of authenticated user
 */
export async function migrateGuestDataToFirestore(
  userId: string,
  userEmail?: string
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedCounts: {
      profile: false,
      habits: 0,
      habitLogs: 0,
      tasks: 0,
      goals: 0,
      journal: 0,
      reminders: 0,
    },
    clearedLocalStorage: false,
  };

  if (!userId || typeof userId !== 'string') {
    result.error = 'Cannot migrate without a valid authenticated user ID.';
    return result;
  }

  // 1. Read guest data
  const guestData = getStoredGuestDataForMigration();
  if (!guestData) {
    // Nothing to migrate
    result.success = true;
    return result;
  }

  try {
    // Prepare atomic write batch
    const batch = writeBatch(db);
    let operationCount = 0;

    // 2. Profile Migration
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const existingUserData = userSnap.exists() ? userSnap.data() : null;

    const guestDisplayName = guestData.displayName || guestData.name || guestData.userName || '';
    const resolvedName = existingUserData?.name || existingUserData?.userName || guestDisplayName || 'Explorer';
    const isCompleted = Boolean(
      existingUserData?.onboardingCompleted ??
      existingUserData?.hasCompletedOnboarding ??
      guestData.onboardingCompleted ??
      guestData.hasCompletedOnboarding ??
      true
    );

    const userPayload: Record<string, any> = {
      name: sanitizeString(resolvedName, 100) || 'Explorer',
      userName: sanitizeString(resolvedName, 100) || 'Explorer',
      hasCompletedOnboarding: isCompleted,
      onboardingCompleted: isCompleted,
      updatedAt: serverTimestamp(),
    };

    if (!existingUserData) {
      userPayload.createdAt = serverTimestamp();
    }

    if (userEmail || existingUserData?.email) {
      userPayload.email = sanitizeString(userEmail || existingUserData?.email, 100);
    }

    const avatarUrl = guestData.avatarUrl || existingUserData?.avatarUrl;
    if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.length <= 200000) {
      userPayload.avatarUrl = avatarUrl;
    }

    const selectedGoals = guestData.selectedGoals || existingUserData?.selectedGoals;
    if (Array.isArray(selectedGoals) && selectedGoals.length > 0) {
      userPayload.selectedGoals = selectedGoals.slice(0, 10).map((g) => String(g).slice(0, 50));
    }

    const mainGoal = guestData.mainGoal || existingUserData?.mainGoal;
    if (mainGoal) {
      const sanitized = sanitizeString(mainGoal, 200);
      if (sanitized) userPayload.mainGoal = sanitized;
    }

    const routinePref = guestData.routinePreference || existingUserData?.routinePreference;
    if (routinePref) {
      const sanitized = sanitizeString(routinePref, 100);
      if (sanitized) userPayload.routinePreference = sanitized;
    }

    const appearancePref = guestData.appearancePreference || existingUserData?.appearancePreference;
    if (appearancePref) {
      const sanitized = sanitizeString(appearancePref, 500);
      if (sanitized) userPayload.appearancePreference = sanitized;
    }

    batch.set(userRef, userPayload, { merge: true });
    operationCount++;
    result.migratedCounts.profile = true;

    // 3. Habits Migration
    // Gather habits from guestData namespace with fallback to local habits
    const habitsSource: Habit[] = (Array.isArray(guestData.habits) && guestData.habits.length > 0)
      ? guestData.habits
      : readLocalHabits();

    // Map old local IDs to new valid Firestore document IDs for relational mapping
    const habitIdMap = new Map<string, string>();

    const validFrequencyTypes = ['daily', 'selected_days', 'weekly', 'custom'];
    const validTargetTypes = ['binary', 'count', 'duration', 'quantity'];

    for (const habit of habitsSource) {
      if (!habit || !habit.name) continue;

      // Ensure a valid alphanumeric Firestore document ID
      const newHabitDoc = doc(collection(db, 'habits'));
      const oldId = habit.id || '';
      if (oldId) {
        habitIdMap.set(oldId, newHabitDoc.id);
      }

      const freqType = validFrequencyTypes.includes(habit.frequencyType)
        ? habit.frequencyType
        : 'daily';
      const targetType = validTargetTypes.includes(habit.targetType)
        ? habit.targetType
        : 'binary';

      const habitPayload: Record<string, any> = {
        userId: userId,
        name: sanitizeString(habit.name, 100) || 'Habit',
        category: sanitizeString(habit.category, 50) || 'General',
        frequencyType: freqType,
        targetType: targetType,
        targetValue: sanitizeNumber(habit.targetValue, 1),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (habit.icon) {
        const s = sanitizeString(habit.icon, 50);
        if (s) habitPayload.icon = s;
      }
      if (habit.color) {
        const s = sanitizeString(habit.color, 50);
        if (s) habitPayload.color = s;
      }
      if (Array.isArray(habit.frequencyValue)) {
        habitPayload.frequencyValue = habit.frequencyValue.slice(0, 31).map((v) => String(v).slice(0, 20));
      } else {
        habitPayload.frequencyValue = [];
      }
      if (habit.targetUnit) {
        const s = sanitizeString(habit.targetUnit, 50);
        if (s) habitPayload.targetUnit = s;
      }
      if (habit.reminderTime) {
        const s = sanitizeString(habit.reminderTime, 10);
        if (s) habitPayload.reminderTime = s;
      }

      batch.set(newHabitDoc, habitPayload);
      operationCount++;
      result.migratedCounts.habits++;
    }

    // 4. Habit Logs Migration
    const logsSource: HabitLog[] = (Array.isArray(guestData.habitLogs) && guestData.habitLogs.length > 0)
      ? guestData.habitLogs
      : readLocalLogs();

    const validStatuses = ['completed', 'partial', 'missed', 'skipped', 'in_progress', 'failed'];

    for (const log of logsSource) {
      if (!log || !log.date) continue;

      // Map to newly created Firestore habit ID if it was part of this batch
      const mappedHabitId = habitIdMap.get(log.habitId) || log.habitId;
      if (!mappedHabitId) continue;

      const logDoc = doc(collection(db, 'habit_logs'));
      const status = validStatuses.includes(log.status) ? log.status : 'completed';

      const logPayload: Record<string, any> = {
        userId: userId,
        habitId: sanitizeString(mappedHabitId, 128) || mappedHabitId,
        date: sanitizeString(log.date, 10) || new Date().toISOString().split('T')[0],
        status: status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (log.progressValue !== undefined) {
        logPayload.progressValue = sanitizeNumber(log.progressValue, 0);
      }
      if (log.note) {
        const s = sanitizeString(log.note, 1000);
        if (s) logPayload.note = s;
      }
      if (log.reflection) {
        const s = sanitizeString(log.reflection, 5000);
        if (s) logPayload.reflection = s;
      }

      batch.set(logDoc, logPayload);
      operationCount++;
      result.migratedCounts.habitLogs++;
    }

    // 5. Tasks Migration
    const tasksSource: TaskItem[] = (Array.isArray(guestData.tasks) && guestData.tasks.length > 0)
      ? guestData.tasks
      : readLocalTasks();

    const validPriorities = ['low', 'medium', 'high'];
    const validTaskTypes = ['task', 'meeting', 'event', 'reminder'];

    for (const task of tasksSource) {
      if (!task || !task.title) continue;

      const taskDoc = doc(collection(db, 'tasks'));
      const taskPayload: Record<string, any> = {
        userId: userId,
        title: sanitizeString(task.title, 200) || 'Task',
        date: sanitizeString(task.date, 10) || new Date().toISOString().split('T')[0],
        completed: Boolean(task.completed),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (task.description) {
        const s = sanitizeString(task.description, 1000);
        if (s) taskPayload.description = s;
      }
      if (task.time) {
        const s = sanitizeString(task.time, 50);
        if (s) taskPayload.time = s;
      }
      if (task.timeEnd) {
        const s = sanitizeString(task.timeEnd, 50);
        if (s) taskPayload.timeEnd = s;
      }
      if (task.repeat) {
        const s = sanitizeString(task.repeat, 50);
        if (s) taskPayload.repeat = s;
      }
      if (task.category) {
        const s = sanitizeString(task.category, 50);
        if (s) taskPayload.category = s;
      }
      if (task.priority && validPriorities.includes(task.priority)) {
        taskPayload.priority = task.priority;
      }
      if (task.type && validTaskTypes.includes(task.type)) {
        taskPayload.type = task.type;
      }

      batch.set(taskDoc, taskPayload);
      operationCount++;
      result.migratedCounts.tasks++;
    }

    // 6. Goals Migration
    const goalsSource: Goal[] = (Array.isArray(guestData.goals) && guestData.goals.length > 0)
      ? guestData.goals
      : readLocalGoals();

    const validGoalStatuses = ['in_progress', 'completed', 'paused', 'archived'];

    for (const goal of goalsSource) {
      if (!goal || !goal.title) continue;

      const goalDoc = doc(collection(db, 'goals'));
      const goalPayload: Record<string, any> = {
        userId: userId,
        title: sanitizeString(goal.title, 200) || 'Goal',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (goal.description) {
        const s = sanitizeString(goal.description, 1000);
        if (s) goalPayload.description = s;
      }
      if (goal.target !== undefined) {
        goalPayload.target = sanitizeNumber(goal.target, 1);
      }
      if (goal.currentProgress !== undefined) {
        goalPayload.currentProgress = sanitizeNumber(goal.currentProgress, 0);
      }
      if (goal.unit) {
        const s = sanitizeString(goal.unit, 50);
        if (s) goalPayload.unit = s;
      }
      if (goal.targetDate) {
        const s = sanitizeString(goal.targetDate, 20);
        if (s) goalPayload.targetDate = s;
      }
      if (goal.category) {
        const s = sanitizeString(goal.category, 50);
        if (s) goalPayload.category = s;
      }
      if (goal.priority && validPriorities.includes(goal.priority)) {
        goalPayload.priority = goal.priority;
      }
      if (goal.status && validGoalStatuses.includes(goal.status)) {
        goalPayload.status = goal.status;
      }
      if (Array.isArray(goal.milestones)) {
        goalPayload.milestones = goal.milestones.slice(0, 50);
      }

      batch.set(goalDoc, goalPayload);
      operationCount++;
      result.migratedCounts.goals++;
    }

    // 7. Journal Logs Migration (if present)
    const journalSource = (Array.isArray(guestData.journal) && guestData.journal.length > 0)
      ? guestData.journal
      : readLocalJournal();

    const validMoods = ['great', 'good', 'neutral', 'tired', 'stressed'];

    for (const entry of journalSource) {
      if (!entry || !entry.text) continue;

      const journalDoc = doc(collection(db, 'journal_logs'));
      const journalPayload: Record<string, any> = {
        userId: userId,
        date: sanitizeString(entry.date, 10) || new Date().toISOString().split('T')[0],
        text: sanitizeString(entry.text, 10000) || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (entry.title) {
        const s = sanitizeString(entry.title, 200);
        if (s) journalPayload.title = s;
      }
      if (entry.time) {
        const s = sanitizeString(entry.time, 50);
        if (s) journalPayload.time = s;
      }
      if (entry.mood && validMoods.includes(entry.mood)) {
        journalPayload.mood = entry.mood;
      }
      if (entry.prompt) {
        const s = sanitizeString(entry.prompt, 1000);
        if (s) journalPayload.prompt = s;
      }

      batch.set(journalDoc, journalPayload);
      operationCount++;
      result.migratedCounts.journal++;
    }

    // 8. Reminders Migration (if present)
    const remindersSource = (Array.isArray(guestData.reminders) && guestData.reminders.length > 0)
      ? guestData.reminders
      : readLocalReminders();

    for (const reminder of remindersSource) {
      if (!reminder || !reminder.title || !reminder.time) continue;

      const reminderDoc = doc(collection(db, 'reminders'));
      const reminderPayload: Record<string, any> = {
        userId: userId,
        title: sanitizeString(reminder.title, 200) || 'Reminder',
        time: sanitizeString(reminder.time, 50) || '09:00',
        repeat: sanitizeString(reminder.repeat, 50) || 'daily',
        enabled: Boolean(reminder.enabled),
        notificationEnabled: Boolean(reminder.notificationEnabled),
        category: sanitizeString(reminder.category, 50) || 'General',
        createdAt: serverTimestamp(),
      };

      if (reminder.description) {
        const s = sanitizeString(reminder.description, 1000);
        if (s) reminderPayload.description = s;
      }
      if (Array.isArray(reminder.days)) {
        reminderPayload.days = reminder.days.slice(0, 7);
      }
      if (reminder.soundTone) reminderPayload.soundTone = sanitizeString(reminder.soundTone, 50);
      if (reminder.customAudioId) reminderPayload.customAudioId = sanitizeString(reminder.customAudioId, 100);
      if (reminder.customAudioName) reminderPayload.customAudioName = sanitizeString(reminder.customAudioName, 100);
      if (typeof reminder.volume === 'number') reminderPayload.volume = reminder.volume;
      if (typeof reminder.vibrate === 'boolean') reminderPayload.vibrate = reminder.vibrate;
      if (reminder.vibrationPattern) reminderPayload.vibrationPattern = sanitizeString(reminder.vibrationPattern, 50);
      if (typeof reminder.snoozeEnabled === 'boolean') reminderPayload.snoozeEnabled = reminder.snoozeEnabled;
      if (typeof reminder.snoozeMinutes === 'number') reminderPayload.snoozeMinutes = reminder.snoozeMinutes;
      if (reminder.linkedHabitId) {
        const mappedId = habitIdMap.get(reminder.linkedHabitId) || reminder.linkedHabitId;
        reminderPayload.linkedHabitId = sanitizeString(mappedId, 128);
      }
      if (reminder.linkedEntityName) reminderPayload.linkedEntityName = sanitizeString(reminder.linkedEntityName, 100);

      batch.set(reminderDoc, reminderPayload);
      operationCount++;
      result.migratedCounts.reminders++;
    }

    // 9. EXECUTE AND CONFIRM THE WRITE
    if (operationCount > 0) {
      // Commit the atomic batch to Firestore
      await batch.commit();
    }

    // 10. ONLY AFTER SUCCESSFUL CONFIRMATION: CLEAR LOCAL GUEST STORAGE
    clearGuestDataAfterMigration();
    result.clearedLocalStorage = true;
    result.success = true;

    // Dispatch global event for application UI to notify users seamlessly
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('streak_guest_data_migrated', {
          detail: result,
        })
      );
    }

    return result;
  } catch (err: any) {
    console.error('Migration failed. Local guest storage was NOT cleared to protect user data:', err);
    result.success = false;
    result.clearedLocalStorage = false;
    result.error = err?.message || 'Database error occurred during migration.';
    return result;
  }
}
