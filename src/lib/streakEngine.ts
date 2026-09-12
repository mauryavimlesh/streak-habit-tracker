import { HabitLog, HabitFrequency } from './habitService';

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

  // Sort logs in descending order by date (newest first), only counting completions
  const sortedLogs = [...logs]
    .filter((log) => log.status === 'completed')
    .sort((a, b) => b.date.localeCompare(a.date));

  if (sortedLogs.length === 0) return stats;

  const todayStr = targetDateStr || new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD'

  if (frequencyType === 'daily') {
    stats.bestStreak = calculateMaxContinuousDays(sortedLogs);
    stats.currentStreak = calculateCurrentContinuousDays(sortedLogs, todayStr);
    
    // Recovery Streak: If the current streak is active (>=1) but less than best,
    // it's considered a recovery streak. If they are on a best streak, recovery is 0.
    if (stats.currentStreak > 0 && stats.currentStreak < stats.bestStreak) {
      stats.recoveryStreak = stats.currentStreak;
    }
  } else if (frequencyType === 'weekly' || frequencyType === 'selected_days') {
    // For non-daily frequencies, we can count total completions as the "streak" or 
    // implement a more advanced ISO week logic. For now, continuous completions logic.
    stats.bestStreak = sortedLogs.length; 
    stats.currentStreak = sortedLogs.length;
  }

  return stats;
}

function calculateCurrentContinuousDays(sortedLogs: HabitLog[], todayStr: string): number {
  if (sortedLogs.length === 0) return 0;
  
  let currentStreak = 0;
  let checkDate = new Date(todayStr);
  
  // Verify if today or yesterday was completed to keep the streak alive
  const todayLog = sortedLogs.find(l => l.date === todayStr);
  
  const yesterdayDate = new Date(checkDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toLocaleDateString('en-CA');
  const yesterdayLog = sortedLogs.find(l => l.date === yesterdayStr);

  if (todayLog || yesterdayLog) {
    // Start counting backwards from the most recent logged date
    checkDate = new Date((todayLog || yesterdayLog)!.date);
  } else {
    return 0; // Streak broken
  }

  while (true) {
    const dateStr = checkDate.toLocaleDateString('en-CA');
    const hasLog = sortedLogs.find(l => l.date === dateStr);
    
    if (hasLog) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break; // Streak broken
    }
  }

  return currentStreak;
}

function calculateMaxContinuousDays(sortedLogs: HabitLog[]): number {
  if (sortedLogs.length === 0) return 0;
  if (sortedLogs.length === 1) return 1;

  let maxStreak = 1;
  let currentRun = 1;

  // We iterate through sorted logs (newest to oldest)
  // If the previous log is exactly 1 day older, we increment run
  for (let i = 0; i < sortedLogs.length - 1; i++) {
    const d1 = new Date(sortedLogs[i].date);
    const d2 = new Date(sortedLogs[i + 1].date);
    
    // Difference in days
    const diffTime = Math.abs(d1.getTime() - d2.getTime());
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentRun++;
      if (currentRun > maxStreak) {
        maxStreak = currentRun;
      }
    } else if (diffDays === 0) {
      // Duplicate entry for same day, ignore
    } else {
      currentRun = 1;
    }
  }

  return maxStreak;
}
