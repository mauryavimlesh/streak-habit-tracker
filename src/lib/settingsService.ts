import { readLocalHabits, saveLocalHabits, readLocalLogs, saveLocalLogs } from './habitService';
import { readLocalTasks, saveLocalTasks, readLocalArchivedTasks } from './taskService';
import { readLocalGoals, saveLocalGoals } from './goalService';
import { readLocalJournal, saveLocalJournal } from './journalService';
import { readLocalReminders, saveLocalReminders } from './reminderService';
import { readAppearanceSettings, saveAppearanceSettings } from './themeService';

export interface AppSettings {
  weekStart: 'monday' | 'sunday';
  timeFormat: '12h' | '24h';
  soundEffects: boolean;
  hapticFeedback: boolean;
  aiContextSharing: boolean;
  notificationsEnabled: boolean;
  appVersion: string;
}

const LOCAL_SETTINGS_KEY = 'streak_app_settings_v1';

const DEFAULT_APP_SETTINGS: AppSettings = {
  weekStart: 'monday',
  timeFormat: '12h',
  soundEffects: true,
  hapticFeedback: true,
  aiContextSharing: true,
  notificationsEnabled: true,
  appVersion: '2.4.0',
};

export function readAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (!raw) return DEFAULT_APP_SETTINGS;
    return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function saveAppSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

export interface FullBackupData {
  version: string;
  exportedAt: string;
  app: string;
  profile?: any;
  habits: any[];
  habitLogs: any[];
  tasks: any[];
  archivedTasks?: any[];
  goals: any[];
  journal: any[];
  reminders: any[];
  appearance: any;
  settings: any;
  feedback?: any[];
}

export function getArchiveStats() {
  const habits = readLocalHabits();
  const habitLogs = readLocalLogs();
  const tasks = readLocalTasks();
  const archivedTasks = readLocalArchivedTasks();
  const goals = readLocalGoals();
  const journal = readLocalJournal();
  const reminders = readLocalReminders();

  return {
    habitsCount: habits.length,
    logsCount: habitLogs.length,
    tasksCount: tasks.length,
    archivedTasksCount: archivedTasks.length,
    goalsCount: goals.length,
    journalCount: journal.length,
    remindersCount: reminders.length,
  };
}

export function exportAllData(): string {
  let profile = null;
  let feedback = [];

  try {
    const rawProfile = localStorage.getItem('streak_guest_data') || localStorage.getItem('streak_local_profile_v1') || localStorage.getItem('streak_user_profile');
    if (rawProfile) profile = JSON.parse(rawProfile);
  } catch {
    // Ignore
  }

  try {
    const rawFeedback = localStorage.getItem('streak_feedback_submissions_v1');
    if (rawFeedback) feedback = JSON.parse(rawFeedback);
  } catch {
    // Ignore
  }

  const data: FullBackupData = {
    version: '2.4.0',
    app: 'STREAK Personal OS',
    exportedAt: new Date().toISOString(),
    profile,
    habits: readLocalHabits(),
    habitLogs: readLocalLogs(),
    tasks: readLocalTasks(),
    archivedTasks: readLocalArchivedTasks(),
    goals: readLocalGoals(),
    journal: readLocalJournal(),
    reminders: readLocalReminders(),
    appearance: readAppearanceSettings(),
    settings: readAppSettings(),
    feedback,
  };

  return JSON.stringify(data, null, 2);
}

export function downloadBackupFile(): void {
  const json = exportAllData();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  a.download = `streak-complete-backup-${timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importBackupData(jsonString: string): { success: boolean; error?: string } {
  try {
    const data = JSON.parse(jsonString);
    if (data.profile) {
      localStorage.setItem('streak_local_profile_v1', JSON.stringify(data.profile));
      localStorage.setItem('streak_onboarding_completed', 'true');
    }
    if (data.habits && Array.isArray(data.habits)) saveLocalHabits(data.habits);
    if (data.habitLogs && Array.isArray(data.habitLogs)) saveLocalLogs(data.habitLogs);
    if (data.tasks && Array.isArray(data.tasks)) saveLocalTasks(data.tasks);
    if (data.goals && Array.isArray(data.goals)) saveLocalGoals(data.goals);
    if (data.journal && Array.isArray(data.journal)) saveLocalJournal(data.journal);
    if (data.reminders && Array.isArray(data.reminders)) saveLocalReminders(data.reminders);
    if (data.appearance) saveAppearanceSettings(data.appearance);
    if (data.settings) saveAppSettings(data.settings);
    if (data.feedback && Array.isArray(data.feedback)) {
      localStorage.setItem('streak_feedback_submissions_v1', JSON.stringify(data.feedback));
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Invalid JSON format' };
  }
}

export function clearAllLocalData(): void {
  try {
    const keysToRemove = [
      'streak_guest_data',
      'streak_habits_v1',
      'streak_habit_logs_v1',
      'streak_tasks_v1',
      'streak_goals_v1',
      'streak_journal_v1',
      'streak_reminders_v1',
      'streak_activities_v1',
      'streak_sleep_settings_v1',
      'streak_sleep_records_v1',
      'streak_google_calendar_config_v1',
      'streak_archived_tasks',
      'streak_journal_initialized',
      'streak_tasks_initialized',
      'streak_milestones_unlocked',
      'streak_appearance_v1',
      'streak_app_settings_v1',
      'streak_local_profile_v1',
      'streak_user_profile',
      'streak_onboarding_completed',
      'streak_habits',
      'streak_habit_logs',
      'streak_tasks',
      'streak_journal',
      'streak_goals',
      'streak_ai_coach_messages_v1',
      'streak_active_timer',
      'streak_snooze_history_v1',
      'lastSyncTime',
    ];
    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });

    // Clear dynamic user-scoped flags and caches
    if (typeof localStorage !== 'undefined') {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith('streak_habits_initialized_') ||
            key.startsWith('streak_habits_seeded_') ||
            key.startsWith('streak_notif_') ||
            key.startsWith('streak_ai_coach_messages_'))
        ) {
          try {
            localStorage.removeItem(key);
          } catch {}
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('streak_habits_updated'));
      window.dispatchEvent(new CustomEvent('streak_tasks_updated'));
      window.dispatchEvent(new CustomEvent('streak_goals_updated'));
      window.dispatchEvent(new CustomEvent('streak_activities_updated'));
      window.dispatchEvent(new CustomEvent('streak_reminders_updated'));
    }
  } catch {
    // Ignore
  }
}
