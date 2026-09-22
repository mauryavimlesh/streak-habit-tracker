import { Habit, HabitLog, HabitFrequency } from './habitService';
import { getTodayDateKey, addDays, diffDays, formatDateKey, getUserTimezone } from './dateUtils';

export type StreakStatus = 'not_started' | 'in_progress' | 'completed' | 'missed';

export interface HabitProgressInfo {
  currentVal: number;
  targetVal: number;
  minimumVal: number;
  unit: string;
  remaining: number;
  minRemaining: number;
  percentage: number;
  isCompleted: boolean;
  status: StreakStatus;
  statusLabel: string;
  contributesToStreak: boolean;
  streakMessage: string;
}

export interface DetailedStreakStats {
  currentStreak: number;
  bestStreak: number;
  recoveryStreak: number;
  totalSuccessfulDays: number;
  missedDays: number;
  completionRate: number; // 0 - 100
  lastCompletedDate?: string;
  isTodayFrozen?: boolean;
  freezeState?: {
    available: number;
    total: number;
    consumed: string[];
    planned: string[];
    isFrozenToday: boolean;
  };
}

/**
 * Single Source of Truth for evaluating habit progress and completion status.
 * Reusable for all habit types (workout, study, water, lectures, etc.).
 */
export function evaluateHabitProgress(
  habit: Habit,
  progressValue: number = 0,
  options?: {
    isPast?: boolean;
    customTarget?: number;
    customMinimum?: number;
    customUnit?: string;
  }
): HabitProgressInfo {
  const targetVal = Math.max(1, options?.customTarget ?? habit.targetValue ?? 1);
  const minimumVal = Math.max(
    1,
    options?.customMinimum ?? habit.minimumTarget ?? targetVal
  );
  const unit = options?.customUnit ?? habit.targetUnit ?? (habit.targetType === 'binary' ? 'times' : 'times');
  const currentVal = Math.max(0, progressValue);
  const remaining = Math.max(0, targetVal - currentVal);
  const minRemaining = Math.max(0, minimumVal - currentVal);
  const percentage = Math.min(100, Math.round((currentVal / targetVal) * 100));
  const isCompleted = currentVal >= minimumVal;

  let status: StreakStatus = 'not_started';
  let statusLabel = 'Not started';

  if (isCompleted) {
    status = 'completed';
    statusLabel = 'Completed';
  } else if (currentVal > 0) {
    if (options?.isPast) {
      status = 'missed';
      statusLabel = 'Missed';
    } else {
      status = 'in_progress';
      statusLabel = 'In progress';
    }
  } else {
    if (options?.isPast) {
      status = 'missed';
      statusLabel = 'Missed';
    } else {
      status = 'not_started';
      statusLabel = 'Not started';
    }
  }

  let streakMessage = '';
  if (isCompleted) {
    streakMessage = "Today's streak requirement completed.";
  } else if (status === 'in_progress') {
    streakMessage = `Needs ${minRemaining} ${unit} more to count toward streak.`;
  } else if (status === 'not_started') {
    streakMessage = `Complete ${minimumVal} ${unit} to count toward streak.`;
  } else {
    streakMessage = 'Streak requirement was not reached.';
  }

  return {
    currentVal,
    targetVal,
    minimumVal,
    unit,
    remaining,
    minRemaining,
    percentage,
    isCompleted,
    status,
    statusLabel,
    contributesToStreak: isCompleted,
    streakMessage,
  };
}

/**
 * Checks whether a specific HabitLog represents a successfully completed day,
 * taking into account historical target values stored on the log.
 */
export function isLogCompleted(log: HabitLog, habit?: Habit): boolean {
  if (!log || !log.date) return false;

  // Determine required target (respecting historical snapshot on log)
  const target = log.targetValue ?? habit?.targetValue ?? 1;
  const minimum = log.minimumTarget ?? habit?.minimumTarget ?? target;

  const progress = typeof log.progressValue === 'number'
    ? log.progressValue
    : (log.status === 'completed' ? minimum : 0);

  // If a target is defined on log or habit, completion strictly requires meeting the minimum target
  if (log.targetValue !== undefined || habit?.targetValue !== undefined || log.minimumTarget !== undefined) {
    return progress >= minimum;
  }

  // Fallback for legacy logs where only status string was stored
  return log.status === 'completed';
}

/**
 * Consolidates all logs for a habit on a given date into a single progress value.
 * Takes the maximum progress value reported for that day, or sums if incremental.
 */
export function getHabitProgressForDate(
  logs: HabitLog[],
  habitId: string,
  dateStr: string
): { progressValue: number; matchedLog?: HabitLog } {
  const canonicalDate = dateStr.split('T')[0];
  const dateLogs = logs.filter(
    (l) => l.habitId === habitId && l.date && l.date.split('T')[0] === canonicalDate
  );

  if (dateLogs.length === 0) {
    return { progressValue: 0 };
  }

  // Find max progressValue reported for this day
  let maxProgress = 0;
  let hasCompletedStatus = false;
  let latestLog = dateLogs[0];

  for (const l of dateLogs) {
    if (typeof l.progressValue === 'number' && l.progressValue > maxProgress) {
      maxProgress = l.progressValue;
      latestLog = l;
    }
    if (l.status === 'completed') {
      hasCompletedStatus = true;
    }
  }

  // If legacy completed with no progress value, use habit's target or 1
  if (maxProgress === 0 && hasCompletedStatus) {
    maxProgress = latestLog.targetValue || 1;
  }

  return { progressValue: maxProgress, matchedLog: latestLog };
}

/**
 * Calculates accurate streak statistics for an individual habit based on real daily completion records.
 * Supports both (habit, logs, today) and (habitId, logs, habit, today) invocation signatures.
 * Respects custom weekly schedule days (e.g. Mon/Wed/Fri) so non-scheduled rest days do not break the streak.
 */
export function calculateHabitStreakStats(
  habitOrId: string | Habit,
  logs: HabitLog[],
  habitOrDate?: Habit | string,
  targetDateStr?: string
): DetailedStreakStats {
  let habitId: string;
  let habit: Habit | undefined;
  let todayStr: string;

  if (typeof habitOrId === 'object') {
    habit = habitOrId;
    habitId = habitOrId.id || '';
    todayStr = typeof habitOrDate === 'string' ? habitOrDate : targetDateStr || getTodayDateKey();
  } else {
    habitId = habitOrId;
    if (typeof habitOrDate === 'object') {
      habit = habitOrDate;
      todayStr = targetDateStr || getTodayDateKey();
    } else {
      habit = undefined;
      todayStr = typeof habitOrDate === 'string' ? habitOrDate : targetDateStr || getTodayDateKey();
    }
  }

  // Filter logs for this habit and identify truly completed dates
  const completedDates = new Set<string>();
  const habitLogs = logs.filter((l) => l.habitId === habitId);

  // Group by date
  const logsByDate = new Map<string, HabitLog[]>();
  habitLogs.forEach((l) => {
    if (!l.date) return;
    const d = l.date.split('T')[0];
    const existing = logsByDate.get(d) || [];
    existing.push(l);
    logsByDate.set(d, existing);
  });

  logsByDate.forEach((dayLogs, d) => {
    // Check if the day's maximum progress met the required target
    const target = dayLogs[0].targetValue ?? habit?.targetValue ?? 1;
    const minimum = dayLogs[0].minimumTarget ?? habit?.minimumTarget ?? target;

    const maxProgress = Math.max(
      ...dayLogs.map((l) =>
        typeof l.progressValue === 'number'
          ? l.progressValue
          : l.status === 'completed'
          ? minimum
          : 0
      )
    );

    const isDone = maxProgress >= minimum || dayLogs.some((l) => l.status === 'completed' && l.targetValue === undefined);
    if (isDone) {
      completedDates.add(d);
    }
  });

  const isDayScheduled = (dateKey: string): boolean => {
    if (!habit || habit.frequency !== 'custom' || !habit.scheduleDays || habit.scheduleDays.length === 0) {
      return true; // daily by default
    }
    const [y, m, d] = dateKey.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay(); // 0 = Sunday, 1 = Monday, etc.
    return habit.scheduleDays.includes(dayOfWeek);
  };

  // Determine if streak is alive:
  // 1. If today is scheduled and completed -> streak is active starting from today.
  // 2. Or, finding the most recent scheduled day strictly before today:
  //    If that day was completed, streak is active starting from that day (today is either not scheduled or still in progress).
  let prevScheduled = addDays(todayStr, -1);
  while (!isDayScheduled(prevScheduled) && Math.abs(diffDays(prevScheduled, todayStr)) <= 14) {
    prevScheduled = addDays(prevScheduled, -1);
  }

  const todayIsScheduled = isDayScheduled(todayStr);
  const hasToday = todayIsScheduled && completedDates.has(todayStr);
  const hasPrevScheduled = completedDates.has(prevScheduled);

  let currentStreak = 0;
  if (hasToday || hasPrevScheduled) {
    let cursor = hasToday ? todayStr : prevScheduled;
    while (Math.abs(diffDays(cursor, todayStr)) <= 365) {
      if (isDayScheduled(cursor)) {
        if (completedDates.has(cursor)) {
          currentStreak++;
        } else {
          break; // Broken streak on a required scheduled day
        }
      }
      cursor = addDays(cursor, -1);
    }
  }

  // Calculate Longest / Best Streak
  const sortedDates = Array.from(completedDates).sort((a, b) => b.localeCompare(a));
  let bestStreak = 0;

  for (let i = 0; i < sortedDates.length; i++) {
    let tempStreak = 0;
    let curr = sortedDates[i];
    while (Math.abs(diffDays(curr, sortedDates[0])) <= 365) {
      if (isDayScheduled(curr)) {
        if (completedDates.has(curr)) {
          tempStreak++;
        } else {
          break;
        }
      }
      curr = addDays(curr, -1);
      if (sortedDates.length > 0 && curr < sortedDates[sortedDates.length - 1]) {
        break;
      }
    }
    if (tempStreak > bestStreak) {
      bestStreak = tempStreak;
    }
  }

  if (currentStreak > bestStreak) {
    bestStreak = currentStreak;
  }

  // Recovery streak
  const recoveryStreak = currentStreak > 0 && currentStreak < bestStreak ? currentStreak : 0;

  // Total successful days
  const totalSuccessfulDays = completedDates.size;

  // Calculate missed days based on tracked days range
  let missedDays = 0;
  let completionRate = 0;

  if (sortedDates.length > 0) {
    const oldestDate = sortedDates[sortedDates.length - 1];
    const totalDaysTracked = Math.max(1, diffDays(oldestDate, todayStr) + 1);
    missedDays = Math.max(0, totalDaysTracked - totalSuccessfulDays);
    completionRate = Math.min(100, Math.round((totalSuccessfulDays / totalDaysTracked) * 100));
  }

  return {
    currentStreak,
    bestStreak,
    recoveryStreak,
    totalSuccessfulDays,
    missedDays,
    completionRate,
    lastCompletedDate: sortedDates[0],
  };
}

/**
 * Calculates global app streak across all habits.
 * A day counts as a successful streak day if at least one active habit met its required target on that day.
 */
export function calculateGlobalHabitStreak(
  habits: Habit[],
  logs: HabitLog[],
  targetDateStr?: string,
  freezeConfig?: {
    totalAvailable: number;
    usedFreezes?: string[];
    plannedDates?: string[];
    autoConsume?: boolean;
  }
): DetailedStreakStats {
  const todayStr = targetDateStr || getTodayDateKey();
  const habitMap = new Map<string, Habit>();
  habits.forEach((h) => {
    if (h.id) habitMap.set(h.id, h);
  });

  // Freeze protected dates setup
  const protectedFreezeDates = new Set<string>();
  (freezeConfig?.usedFreezes || []).forEach((d) => protectedFreezeDates.add(d));
  (freezeConfig?.plannedDates || []).forEach((d) => protectedFreezeDates.add(d));

  let availableFreezes = Math.max(
    0,
    (freezeConfig?.totalAvailable ?? 0) -
      (freezeConfig?.usedFreezes?.length ?? 0) -
      (freezeConfig?.plannedDates?.length ?? 0)
  );
  const newlyConsumedFreezes = new Set<string>();

  // Collect all unique calendar dates where at least one habit requirement was completed
  const completedDates = new Set<string>();

  // Group logs by date and habit
  const dateHabitMap = new Map<string, Map<string, number>>();
  logs.forEach((l) => {
    if (!l.date || !l.habitId) return;
    const d = l.date.split('T')[0];
    if (!dateHabitMap.has(d)) {
      dateHabitMap.set(d, new Map());
    }
    const habitProgressMap = dateHabitMap.get(d)!;
    const current = habitProgressMap.get(l.habitId) || 0;
    const habit = habitMap.get(l.habitId);
    const target = l.targetValue ?? habit?.targetValue ?? 1;
    const minimum = l.minimumTarget ?? habit?.minimumTarget ?? target;

    const val = typeof l.progressValue === 'number'
      ? l.progressValue
      : l.status === 'completed'
      ? minimum
      : 0;

    habitProgressMap.set(l.habitId, Math.max(current, val));
  });

  dateHabitMap.forEach((habitProgressMap, d) => {
    // Check if any habit met its target on day d
    for (const [habitId, progress] of habitProgressMap.entries()) {
      const habit = habitMap.get(habitId);
      // Check against log historical target or habit target
      const target = habit?.targetValue ?? 1;
      const minimum = habit?.minimumTarget ?? target;
      if (progress >= minimum) {
        completedDates.add(d);
        break;
      }
    }
  });

  const sortedDates = Array.from(completedDates).sort((a, b) => b.localeCompare(a));
  const oldestCompletedDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : undefined;

  const isProtectedOrConsumed = (d: string, allowAuto: boolean = true) => {
    if (protectedFreezeDates.has(d)) return true;
    if (!allowAuto || !freezeConfig || freezeConfig.autoConsume === false) return false;
    if (oldestCompletedDate && d < oldestCompletedDate) return false;
    if (availableFreezes > 0) {
      availableFreezes--;
      protectedFreezeDates.add(d);
      newlyConsumedFreezes.add(d);
      return true;
    }
    return false;
  };

  // Calculate Current Streak
  const hasToday = completedDates.has(todayStr);
  const yesterdayStr = addDays(todayStr, -1);
  const hasYesterday = completedDates.has(yesterdayStr);
  const hasYesterdayFrozen = isProtectedOrConsumed(yesterdayStr);

  let currentStreak = 0;
  if (hasToday || hasYesterday || hasYesterdayFrozen) {
    let cursor = hasToday ? todayStr : yesterdayStr;
    while (Math.abs(diffDays(cursor, todayStr)) <= 365) {
      if (completedDates.has(cursor)) {
        currentStreak++;
      } else if (isProtectedOrConsumed(cursor)) {
        // Freeze day preserves continuity without incrementing
      } else {
        break;
      }
      cursor = addDays(cursor, -1);
    }
  }

  // Calculate Longest / Best Streak
  let bestStreak = 0;
  for (let i = 0; i < sortedDates.length; i++) {
    let tempStreak = 1;
    let curr = sortedDates[i];
    while (Math.abs(diffDays(curr, sortedDates[0])) <= 365) {
      const prev = addDays(curr, -1);
      if (completedDates.has(prev)) {
        tempStreak++;
        curr = prev;
      } else if (isProtectedOrConsumed(prev, false)) {
        curr = prev;
      } else {
        break;
      }
    }
    if (tempStreak > bestStreak) {
      bestStreak = tempStreak;
    }
  }

  if (currentStreak > bestStreak) {
    bestStreak = currentStreak;
  }

  const recoveryStreak = currentStreak > 0 && currentStreak < bestStreak ? currentStreak : 0;
  const totalSuccessfulDays = completedDates.size;

  let missedDays = 0;
  let completionRate = 0;

  if (sortedDates.length > 0) {
    const oldestDate = sortedDates[sortedDates.length - 1];
    const totalDaysTracked = Math.max(1, diffDays(oldestDate, todayStr) + 1);
    missedDays = Math.max(0, totalDaysTracked - totalSuccessfulDays);
    completionRate = Math.min(100, Math.round((totalSuccessfulDays / totalDaysTracked) * 100));
  }

  const allConsumed = Array.from(new Set([...(freezeConfig?.usedFreezes || []), ...Array.from(newlyConsumedFreezes)]));
  const remainingPlanned = (freezeConfig?.plannedDates || []).filter((d) => !allConsumed.includes(d));
  const isTodayFrozen = protectedFreezeDates.has(todayStr);

  return {
    currentStreak,
    bestStreak,
    recoveryStreak,
    totalSuccessfulDays,
    missedDays,
    completionRate,
    lastCompletedDate: sortedDates[0],
    isTodayFrozen,
    freezeState: freezeConfig
      ? {
          available: availableFreezes,
          total: freezeConfig.totalAvailable,
          consumed: allConsumed,
          planned: remainingPlanned,
          isFrozenToday: isTodayFrozen,
        }
      : undefined,
  };
}
