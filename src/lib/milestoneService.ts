import { readLocalHabits, readLocalLogs } from './habitService';
import { readLocalTasks } from './taskService';
import { readLocalGoals, calculateGoalStreak } from './goalService';
import { readLocalJournal } from './journalService';
import { getLocalActivities } from './activityService';
import { getTodayDateKey } from './dateUtils';
import { db } from './firebase';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { isCloudSyncableUser } from './authUtils';

export interface MilestoneItem {
  id: string;
  milestoneId: string;
  userId?: string;
  title: string;
  description: string;
  requirement: string;
  category: 'streak' | 'study' | 'tasks' | 'focus' | 'journal' | 'goal';
  icon: string;
  threshold: number;
  currentValue: number;
  unit: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  relatedEntityId?: string;
}

const UNLOCKED_MILESTONES_KEY = 'streak_unlocked_milestones_v1';

export interface StoredMilestoneRecord {
  milestoneId: string;
  userId?: string;
  unlockedAt: string;
  requirement: string;
  relatedEntityId?: string;
}

export function getStoredUnlockedMilestoneMap(): Record<string, StoredMilestoneRecord> {
  try {
    const raw = localStorage.getItem(UNLOCKED_MILESTONES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const result: Record<string, StoredMilestoneRecord> = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (typeof val === 'string') {
        result[key] = {
          milestoneId: key,
          unlockedAt: val,
          requirement: key,
        };
      } else if (val && typeof val === 'object') {
        result[key] = val as StoredMilestoneRecord;
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function saveStoredUnlockedMilestone(
  milestoneId: string,
  record: Partial<StoredMilestoneRecord>
) {
  const current = getStoredUnlockedMilestoneMap();
  const unlockedAt = record.unlockedAt || getTodayDateKey();
  current[milestoneId] = {
    milestoneId,
    userId: record.userId || 'local',
    unlockedAt,
    requirement: record.requirement || milestoneId,
    relatedEntityId: record.relatedEntityId,
  };
  localStorage.setItem(UNLOCKED_MILESTONES_KEY, JSON.stringify(current));

  // Sync to Firestore if signed in
  if (record.userId && isCloudSyncableUser(record.userId)) {
    try {
      const docRef = doc(db, 'milestones', `${record.userId}_${milestoneId}`);
      setDoc(docRef, current[milestoneId], { merge: true }).catch((err) => {
        console.warn('Could not sync milestone to cloud:', err);
      });
    } catch {
      // Ignore background sync errors
    }
  }
}

export async function syncUserMilestonesFromCloud(userId: string) {
  if (!isCloudSyncableUser(userId)) return;
  try {
    const q = query(collection(db, 'milestones'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const stored = getStoredUnlockedMilestoneMap();
    let updated = false;

    snapshot.forEach((d) => {
      const data = d.data() as StoredMilestoneRecord;
      if (data && data.milestoneId && !stored[data.milestoneId]) {
        stored[data.milestoneId] = data;
        updated = true;
      }
    });

    if (updated) {
      localStorage.setItem(UNLOCKED_MILESTONES_KEY, JSON.stringify(stored));
    }
  } catch (err) {
    console.warn('Failed to sync milestones from cloud:', err);
  }
}

export function calculateRealMilestones(userId?: string): {
  milestones: MilestoneItem[];
  unlockedCount: number;
  newlyUnlocked: MilestoneItem[];
} {
  const habits = readLocalHabits();
  const logs = readLocalLogs();
  const tasks = readLocalTasks();
  const goals = readLocalGoals();
  const journals = readLocalJournal();
  const activities = getLocalActivities();

  // 1. Max Streak (checks habits & goals, both current and best)
  let maxStreak = 0;
  for (const h of habits) {
    const habitLogs = logs.filter((l) => l.habitId === h.id && l.status === 'completed');
    const uDates = [...new Set<string>(habitLogs.map((l) => l.date))].sort();
    let temp = 0;
    let best = 0;
    let prev: string | null = null;
    for (const d of uDates) {
      if (!prev) temp = 1;
      else {
        const diff = Math.floor((new Date(d).getTime() - new Date(prev).getTime()) / 86400000);
        if (diff === 1) temp++;
        else temp = 1;
      }
      if (temp > best) best = temp;
      prev = d;
    }
    if (best > maxStreak) maxStreak = best;
    if (((h as any).streak || 0) > maxStreak) maxStreak = (h as any).streak || 0;
  }

  for (const g of goals) {
    const streakData = calculateGoalStreak(g);
    if (streakData.currentStreak > maxStreak) maxStreak = streakData.currentStreak;
    if (streakData.bestStreak > maxStreak) maxStreak = streakData.bestStreak;
  }

  // 2. Study Goal activities completed
  let totalLecturesCompleted = 0;
  for (const g of goals) {
    if (g.dailyHistory) {
      for (const day of Object.values(g.dailyHistory)) {
        if (day.activities) {
          for (const act of day.activities) {
            if (act.completed) {
              totalLecturesCompleted++;
            }
          }
        }
      }
    }
  }

  // 3. Completed Tasks
  const completedTasksCount = tasks.filter((t) => t.completed).length;

  // 4. Focus Hours
  const totalFocusMinutes = activities.reduce((sum, a) => sum + (a.durationMinutes || 0), 0);
  const totalFocusHours = Math.floor(totalFocusMinutes / 60);

  // 5. Journal Entries
  const totalJournalEntries = journals.length;

  // 6. Completed Goals
  const completedGoalsCount = goals.filter((g) => g.status === 'completed' || (g.currentProgress || 0) >= (g.target || 1)).length;

  // 7. First completion count across all entities
  const firstCompletionCount =
    (logs.some((l) => l.status === 'completed') ? 1 : 0) +
    (completedTasksCount > 0 ? 1 : 0) +
    (totalFocusMinutes > 0 ? 1 : 0) +
    (totalJournalEntries > 0 ? 1 : 0);

  const storedUnlockedMap = getStoredUnlockedMilestoneMap();
  const todayStr = getTodayDateKey();
  const newlyUnlocked: MilestoneItem[] = [];

  const rawMilestonesDef = [
    {
      id: 'first_completion',
      title: 'First Completion',
      description: 'Completed your first action in STREAK. The foundation of momentum.',
      requirement: 'Complete any 1 habit, task, or focus session',
      category: 'streak' as const,
      icon: 'Zap',
      threshold: 1,
      currentValue: firstCompletionCount,
      unit: 'actions',
    },
    {
      id: 'streak_7',
      title: '7-Day Streak',
      description: 'Maintained relentless daily discipline for one full week.',
      requirement: 'Reach a 7-day streak',
      category: 'streak' as const,
      icon: 'Flame',
      threshold: 7,
      currentValue: maxStreak,
      unit: 'days',
    },
    {
      id: 'streak_14',
      title: '14-Day Streak',
      description: 'Two full weeks of uninterrupted execution.',
      requirement: 'Reach a 14-day streak',
      category: 'streak' as const,
      icon: 'Flame',
      threshold: 14,
      currentValue: maxStreak,
      unit: 'days',
    },
    {
      id: 'streak_30',
      title: '30-Day Streak',
      description: 'A full month of non-negotiable dedication.',
      requirement: 'Reach a 30-day streak',
      category: 'streak' as const,
      icon: 'Sparkles',
      threshold: 30,
      currentValue: maxStreak,
      unit: 'days',
    },
    {
      id: 'streak_50',
      title: '50-Day Streak',
      description: 'A monument of consistency in the top tier of disciplined achievers.',
      requirement: 'Reach a 50-day streak',
      category: 'streak' as const,
      icon: 'Award',
      threshold: 50,
      currentValue: maxStreak,
      unit: 'days',
    },
    {
      id: 'streak_100',
      title: '100-Day Streak',
      description: 'Century mark. An elite milestone of habit transformation.',
      requirement: 'Reach a 100-day streak',
      category: 'streak' as const,
      icon: 'Award',
      threshold: 100,
      currentValue: maxStreak,
      unit: 'days',
    },
    {
      id: 'tasks_10',
      title: '10 Tasks Completed',
      description: 'Executed 10 scheduled productivity tasks and to-dos.',
      requirement: 'Complete 10 tasks',
      category: 'tasks' as const,
      icon: 'CheckCircle2',
      threshold: 10,
      currentValue: completedTasksCount,
      unit: 'tasks',
    },
    {
      id: 'tasks_100',
      title: '100 Tasks Completed',
      description: 'Closed out 100 scheduled productivity tasks.',
      requirement: 'Complete 100 tasks',
      category: 'tasks' as const,
      icon: 'CheckCircle2',
      threshold: 100,
      currentValue: completedTasksCount,
      unit: 'tasks',
    },
    {
      id: 'focus_10',
      title: '10 Focus Hours',
      description: 'Logged 10 full hours of deep, distraction-free focus sessions.',
      requirement: 'Log 10 focus hours',
      category: 'focus' as const,
      icon: 'Clock',
      threshold: 10,
      currentValue: totalFocusHours,
      unit: 'hours',
    },
    {
      id: 'goal_completed',
      title: 'Goal Completed',
      description: 'Fully achieved and conquered a primary major goal.',
      requirement: 'Complete at least 1 goal',
      category: 'goal' as const,
      icon: 'Award',
      threshold: 1,
      currentValue: completedGoalsCount,
      unit: 'goals',
    },
    {
      id: 'journal_30',
      title: '30 Journal Entries',
      description: 'Recorded 30 days of mindful reflections and mental self-awareness.',
      requirement: 'Write 30 journal entries',
      category: 'journal' as const,
      icon: 'Book',
      threshold: 30,
      currentValue: totalJournalEntries,
      unit: 'entries',
    },
  ];

  const milestones: MilestoneItem[] = rawMilestonesDef.map((def) => {
    const stored = storedUnlockedMap[def.id];
    // RULE: Once unlocked, a milestone remains permanently unlocked, even if current streak drops
    const wasPreviouslyUnlocked = Boolean(stored && stored.unlockedAt);
    const qualifiesNow = def.currentValue >= def.threshold;
    const isUnlocked = wasPreviouslyUnlocked || qualifiesNow;

    let unlockedAt = stored?.unlockedAt;

    if (qualifiesNow && !wasPreviouslyUnlocked) {
      unlockedAt = todayStr;
      saveStoredUnlockedMilestone(def.id, {
        unlockedAt: todayStr,
        userId: userId || 'local',
        requirement: def.requirement,
      });
      newlyUnlocked.push({
        ...def,
        milestoneId: def.id,
        isUnlocked: true,
        unlockedAt,
        requirement: def.requirement,
      });
    }

    return {
      ...def,
      milestoneId: def.id,
      isUnlocked,
      unlockedAt,
      requirement: def.requirement,
    };
  });

  const unlockedCount = milestones.filter((m) => m.isUnlocked).length;

  return {
    milestones,
    unlockedCount,
    newlyUnlocked,
  };
}
