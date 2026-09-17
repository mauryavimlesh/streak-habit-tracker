import { HabitLog, HabitFrequency } from './habitService';
import { getTodayDateKey, parseDateKey, formatDateKey, addDays, diffDays } from './dateUtils';

export interface StreakStats {
  currentStreak: number;
  bestStreak: number;
  recoveryStreak: number;
}

/**
 * Calculates the current, best, and recovery streaks based on habit logs and frequency.
 */
export function calculateStreakStats(
  logs: HabitLog[],
  frequencyType: HabitFrequency,
  frequencyValue?: string[], // e.g. ['Mon', 'Wed', 'Fri']
  targetDateStr?: string
): StreakStats {
  const stats: StreakStats = { currentStreak: 0, bestStreak: 0, recoveryStreak: 0 };

  // Deduplicate and filter completed logs only
  const completedDateMap = new Map<string, HabitLog>();
  logs.forEach((log) => {
    if (log.status === 'completed' && log.date) {
      const canonicalDate = log.date.split('T')[0];
      completedDateMap.set(canonicalDate, { ...log, date: canonicalDate });
    }
  });

  // Sort logs in descending order by date (newest first)
  const sortedLogs = Array.from(completedDateMap.values()).sort((a, b) => b.date.localeCompare(a.date));

  if (sortedLogs.length === 0) return stats;

  const todayStr = targetDateStr || getTodayDateKey(); // 'YYYY-MM-DD'

  if (frequencyType === 'daily') {
    stats.bestStreak = calculateMaxContinuousDays(sortedLogs);
    stats.currentStreak = calculateCurrentContinuousDays(sortedLogs, todayStr);
    
    // Recovery Streak: If the current streak is active (>=1) but less than best,
    // it's considered a recovery streak. If they are on a best streak, recovery is 0.
    if (stats.currentStreak > 0 && stats.currentStreak < stats.bestStreak) {
      stats.recoveryStreak = stats.currentStreak;
    }
  } else if (frequencyType === 'weekly' || frequencyType === 'selected_days') {
    // For non-daily frequencies, count unique completion dates
    stats.bestStreak = sortedLogs.length; 
    stats.currentStreak = sortedLogs.length;
  }

  return stats;
}

function calculateCurrentContinuousDays(sortedLogs: HabitLog[], todayStr: string): number {
  if (sortedLogs.length === 0) return 0;
  
  const dateSet = new Set(sortedLogs.map((l) => l.date));
  const yesterdayStr = addDays(todayStr, -1);

  // If neither today nor yesterday has a log, streak is 0
  let cursor = todayStr;
  if (!dateSet.has(todayStr)) {
    if (dateSet.has(yesterdayStr)) {
      cursor = yesterdayStr;
    } else {
      return 0; // Streak broken
    }
  }

  let streak = 0;
  while (dateSet.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function calculateMaxContinuousDays(sortedLogs: HabitLog[]): number {
  if (sortedLogs.length === 0) return 0;
  if (sortedLogs.length === 1) return 1;

  // sortedLogs are sorted newest to oldest
  let maxStreak = 1;
  let currentRun = 1;

  for (let i = 0; i < sortedLogs.length - 1; i++) {
    const diff = diffDays(sortedLogs[i + 1].date, sortedLogs[i].date);

    if (diff === 1) {
      currentRun++;
      if (currentRun > maxStreak) {
        maxStreak = currentRun;
      }
    } else if (diff === 0) {
      // Duplicate entry for same day, ignore
    } else {
      currentRun = 1;
    }
  }

  return maxStreak;
}
