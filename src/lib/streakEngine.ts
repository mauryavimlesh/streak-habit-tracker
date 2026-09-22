import { HabitLog, HabitFrequency, Habit } from './habitService';
import { getTodayDateKey, addDays, diffDays } from './dateUtils';

export type StreakStatus = 'not_started' | 'in_progress' | 'completed' | 'missed' | 'frozen';

/**
 * Historical daily completion record representing actual vs target progress.
 */
export interface DailyCompletionRecord {
  date: string; // 'YYYY-MM-DD'
  actual: number; // Actual progress/quantity achieved
  target: number; // Configured target value
  minimumTarget?: number; // Minimum required threshold to count as realized
  habitId?: string;
  status?: 'completed' | 'in_progress' | 'not_started' | 'missed' | 'skipped' | 'partial' | 'frozen';
  notes?: string;
  metadata?: Record<string, any>;
}

/**
 * Configuration and state for the Streak Freeze feature.
 * Protects streaks during planned days off or unexpected absences.
 */
export interface StreakFreezeConfig {
  totalAvailable: number; // Total freeze capacity granted (e.g. 2)
  usedFreezes?: string[]; // Array of date strings 'YYYY-MM-DD' where a freeze was consumed
  plannedDates?: string[]; // Array of pre-planned absence/day-off dates 'YYYY-MM-DD'
  autoConsume?: boolean; // Automatically consume a freeze to save a streak on an unplanned missed day (default: true)
  maxFreezesPerPeriod?: number; // Optional maximum limit
}

export interface FreezeStatus {
  availableCount: number; // Remaining unallocated freezes: totalAvailable - usedFreezes.length - plannedDates.length
  totalAvailable: number;
  consumedDates: string[];
  plannedDates: string[];
  protectedDates: string[]; // All dates protected (consumed + planned)
  isFrozenToday: boolean;
  freezesRemaining: number;
  canFreeze: boolean;
}

export interface StreakStats {
  currentStreak: number;
  bestStreak: number;
  recoveryStreak: number;
  totalSuccessfulDays?: number;
  totalRealizedDays?: number;
  totalIncompleteDays?: number;
  missedDays?: number;
  completionRate?: number; // 0 - 100 percentage
  lastCompletedDate?: string;
  isCompletedToday?: boolean;
  isTodayRealized?: boolean;
  todayActual?: number;
  todayTarget?: number;
  todayStatus?: 'completed' | 'in_progress' | 'not_started' | 'missed' | 'frozen';
  streakStatus?: 'active' | 'at_risk' | 'broken' | 'frozen' | 'none';
  // Streak Freeze reporting
  isTodayFrozen?: boolean;
  freezeState?: {
    available: number;
    total: number;
    consumed: string[];
    planned: string[];
    isFrozenToday: boolean;
    protectedDaysCount: number;
    freezesRemaining: number;
  };
}

export interface StreakCalculationOptions {
  targetDateStr?: string; // Anchor date (default: today)
  timezone?: string;
  frequencyType?: HabitFrequency;
  scheduleDays?: number[]; // [0..6] days of week (0=Sunday, 1=Monday, etc.)
  allowIncompleteContinuity?: boolean; // When true: incomplete days in history do not break continuity of realized goals
  breakOnIncompletePastDays?: boolean; // When false: incomplete days do not penalize streak continuity
  habit?: Habit;
  habits?: Habit[];
  freezeConfig?: StreakFreezeConfig;
}

export {
  evaluateHabitProgress,
  isLogCompleted,
  getHabitProgressForDate,
  calculateHabitStreakStats,
  calculateGlobalHabitStreak,
} from './habitEngine';
export type { HabitProgressInfo, DetailedStreakStats } from './habitEngine';

// ============================================================================
// STREAK FREEZE RESOURCE MANAGEMENT
// ============================================================================

/**
 * Calculates current freeze status, remaining available balance, and protected dates.
 */
export function getFreezeStatus(
  config?: StreakFreezeConfig,
  targetDateStr?: string
): FreezeStatus {
  const total = config?.totalAvailable ?? 0;
  const consumedDates = Array.from(new Set(config?.usedFreezes || []));
  const plannedDates = Array.from(
    new Set((config?.plannedDates || []).filter((d) => !consumedDates.includes(d)))
  );

  const availableCount = Math.max(0, total - consumedDates.length - plannedDates.length);
  const protectedDates = Array.from(new Set([...consumedDates, ...plannedDates]));
  const today = targetDateStr || getTodayDateKey();
  const isFrozenToday = protectedDates.includes(today);

  return {
    availableCount,
    totalAvailable: total,
    consumedDates,
    plannedDates,
    protectedDates,
    isFrozenToday,
    freezesRemaining: availableCount,
    canFreeze: availableCount > 0,
  };
}

/**
 * Plans a streak freeze for an upcoming day off or absence.
 * Deducts/reserves from the available freeze resource.
 */
export function planStreakFreeze(
  config: StreakFreezeConfig,
  dateStr: string
): { success: boolean; updatedConfig: StreakFreezeConfig; reason?: string } {
  if (!dateStr) {
    return { success: false, updatedConfig: config, reason: 'Invalid date provided' };
  }
  const dateKey = dateStr.split('T')[0];
  const used = new Set(config.usedFreezes || []);
  const planned = new Set(config.plannedDates || []);

  if (used.has(dateKey) || planned.has(dateKey)) {
    return { success: true, updatedConfig: config }; // Already protected
  }

  const currentAvailable = Math.max(0, config.totalAvailable - used.size - planned.size);
  if (currentAvailable <= 0) {
    return {
      success: false,
      updatedConfig: config,
      reason: `No freeze resources remaining (limit: ${config.totalAvailable})`,
    };
  }

  const updatedConfig: StreakFreezeConfig = {
    ...config,
    plannedDates: [...Array.from(planned), dateKey].sort(),
  };

  return { success: true, updatedConfig };
}

/**
 * Cancels a previously planned day off freeze, restoring the available freeze resource.
 */
export function unplanStreakFreeze(
  config: StreakFreezeConfig,
  dateStr: string
): StreakFreezeConfig {
  const dateKey = dateStr.split('T')[0];
  const planned = (config.plannedDates || []).filter((d) => d !== dateKey);
  return {
    ...config,
    plannedDates: planned,
  };
}

/**
 * Deducts/consumes a freeze resource for a specified date (e.g. an unplanned absence or missed day).
 */
export function consumeStreakFreeze(
  config: StreakFreezeConfig,
  dateStr: string
): { success: boolean; updatedConfig: StreakFreezeConfig; reason?: string } {
  if (!dateStr) {
    return { success: false, updatedConfig: config, reason: 'Invalid date' };
  }
  const dateKey = dateStr.split('T')[0];
  const used = new Set(config.usedFreezes || []);
  const planned = new Set(config.plannedDates || []);

  if (used.has(dateKey)) {
    return { success: true, updatedConfig: config };
  }

  if (planned.has(dateKey)) {
    // Convert planned to used (resource was already allocated)
    planned.delete(dateKey);
    used.add(dateKey);
    return {
      success: true,
      updatedConfig: {
        ...config,
        usedFreezes: Array.from(used).sort(),
        plannedDates: Array.from(planned).sort(),
      },
    };
  }

  // Check if freeze resource is available to deduct
  const currentAvailable = Math.max(0, config.totalAvailable - used.size - planned.size);
  if (currentAvailable <= 0) {
    return {
      success: false,
      updatedConfig: config,
      reason: 'No freeze resources available to consume',
    };
  }

  used.add(dateKey);
  return {
    success: true,
    updatedConfig: {
      ...config,
      usedFreezes: Array.from(used).sort(),
      plannedDates: Array.from(planned).sort(),
    },
  };
}

/**
 * Refunds a consumed or planned freeze if the user unexpectedly completed their goals on that date.
 */
export function refundStreakFreeze(
  config: StreakFreezeConfig,
  dateStr: string
): StreakFreezeConfig {
  const dateKey = dateStr.split('T')[0];
  const used = (config.usedFreezes || []).filter((d) => d !== dateKey);
  const planned = (config.plannedDates || []).filter((d) => d !== dateKey);
  return {
    ...config,
    usedFreezes: used,
    plannedDates: planned,
  };
}

// ============================================================================
// CORE EVALUATION & STREAK CALCULATIONS
// ============================================================================

/**
 * Evaluates whether a daily completion record or habit log represents a fully realized goal.
 * A goal is fully realized if and only if actual progress meets or exceeds
 * the required target (or minimumTarget if specified).
 */
export function isGoalFullyRealized(
  record: DailyCompletionRecord | { actual?: number; target?: number; minimumTarget?: number; status?: string } | HabitLog,
  habit?: Habit
): boolean {
  if (!record) return false;

  // Handle DailyCompletionRecord with actual and target
  if ('actual' in record && typeof record.actual === 'number') {
    const target = record.target ?? habit?.targetValue ?? 1;
    const minTarget = record.minimumTarget ?? habit?.minimumTarget ?? target;
    return record.actual >= minTarget && (record.actual > 0 || minTarget === 0);
  }

  // Handle HabitLog
  const log = record as HabitLog;
  const target = log.targetValue ?? habit?.targetValue ?? 1;
  const minTarget = log.minimumTarget ?? habit?.minimumTarget ?? target;

  const actual = typeof log.progressValue === 'number'
    ? log.progressValue
    : (log.status === 'completed' ? minTarget : 0);

  if (log.targetValue !== undefined || habit?.targetValue !== undefined || log.minimumTarget !== undefined) {
    return actual >= minTarget;
  }

  return log.status === 'completed';
}

/**
 * Converts a list of HabitLogs into standardized DailyCompletionRecords (actual vs target),
 * grouping by date and respecting habit targets or historical log snapshots.
 */
export function convertLogsToDailyRecords(
  logs: HabitLog[],
  habitMap?: Map<string, Habit> | Habit
): DailyCompletionRecord[] {
  const singleHabit = habitMap && !('get' in habitMap) ? (habitMap as Habit) : undefined;
  const map = habitMap && 'get' in habitMap ? (habitMap as Map<string, Habit>) : undefined;

  const recordsByDate = new Map<string, { actual: number; target: number; minTarget: number; habitId?: string; status?: any }>();

  logs.forEach((log) => {
    if (!log.date) return;
    const dateKey = log.date.split('T')[0];
    const habit = singleHabit || (log.habitId && map ? map.get(log.habitId) : undefined);

    const target = log.targetValue ?? habit?.targetValue ?? 1;
    const minTarget = log.minimumTarget ?? habit?.minimumTarget ?? target;
    const actual = typeof log.progressValue === 'number'
      ? log.progressValue
      : (log.status === 'completed' ? minTarget : 0);

    const existing = recordsByDate.get(dateKey);
    if (!existing) {
      recordsByDate.set(dateKey, {
        actual,
        target,
        minTarget,
        habitId: log.habitId,
        status: log.status,
      });
    } else {
      existing.actual = Math.max(existing.actual, actual);
      if (log.status === 'completed') existing.status = 'completed';
    }
  });

  const results: DailyCompletionRecord[] = [];
  recordsByDate.forEach((val, date) => {
    results.push({
      date,
      actual: val.actual,
      target: val.target,
      minimumTarget: val.minTarget,
      habitId: val.habitId,
      status: val.status,
    });
  });

  return results.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Unified Streak Engine with Streak Freeze Protection:
 * Calculates streak success based on historical daily completion records (actual vs target),
 * ensuring that incomplete days do not break continuity and only fully realized goals increment the streak count.
 * When freeze resources are provided, planned days off or unplanned missed days are protected from breaking the streak.
 */
export function calculateDailyRecordStreak(
  records: DailyCompletionRecord[],
  options?: StreakCalculationOptions
): StreakStats {
  const todayStr = options?.targetDateStr || getTodayDateKey(options?.timezone);
  const allowIncompleteContinuity = options?.allowIncompleteContinuity ?? true;
  const breakOnUnprotectedAbsence = options?.breakOnIncompletePastDays ?? false;
  const habit = options?.habit;

  // Streak freeze resource setup
  const freezeConfig = options?.freezeConfig;
  const autoConsume = freezeConfig?.autoConsume ?? true;
  const initialUsedSet = new Set(freezeConfig?.usedFreezes || []);
  const initialPlannedSet = new Set(freezeConfig?.plannedDates || []);

  // Compute available freeze resource capacity
  let remainingFreezes = Math.max(
    0,
    (freezeConfig?.totalAvailable ?? 0) - initialUsedSet.size - initialPlannedSet.size
  );

  const activeProtectedDates = new Set<string>();
  initialUsedSet.forEach((d) => activeProtectedDates.add(d));
  initialPlannedSet.forEach((d) => activeProtectedDates.add(d));

  const newlyConsumedFreezes = new Set<string>();

  // Map each date to its realized status and values
  const dateMap = new Map<string, { actual: number; target: number; isRealized: boolean }>();

  records.forEach((r) => {
    if (!r.date) return;
    const dateKey = r.date.split('T')[0];
    const isRealized = isGoalFullyRealized(r, habit);
    const existing = dateMap.get(dateKey);
    if (!existing) {
      dateMap.set(dateKey, {
        actual: r.actual,
        target: r.target,
        isRealized,
      });
    } else {
      existing.actual = Math.max(existing.actual, r.actual);
      existing.isRealized = existing.isRealized || isRealized;
    }
  });

  // Extract all completed (fully realized) dates
  const realizedDates = new Set<string>();
  dateMap.forEach((val, d) => {
    if (val.isRealized) {
      realizedDates.add(d);
    }
  });

  const sortedRealizedDates = Array.from(realizedDates).sort((a, b) => b.localeCompare(a));
  const totalSuccessfulDays = sortedRealizedDates.length;

  const todayRecord = dateMap.get(todayStr);
  const todayActual = todayRecord?.actual ?? 0;
  const todayTarget = todayRecord?.target ?? habit?.targetValue ?? 1;
  const isTodayRealized = realizedDates.has(todayStr);
  const isTodayFrozen = activeProtectedDates.has(todayStr);

  let todayStatus: 'completed' | 'in_progress' | 'not_started' | 'missed' | 'frozen' = 'not_started';
  if (isTodayRealized) {
    todayStatus = 'completed';
  } else if (isTodayFrozen) {
    todayStatus = 'frozen';
  } else if (todayActual > 0) {
    todayStatus = 'in_progress';
  } else {
    todayStatus = 'not_started';
  }

  // Determine scheduled days
  const isDayScheduled = (dateKey: string): boolean => {
    const scheduleDays = options?.scheduleDays || habit?.scheduleDays;
    const frequency = options?.frequencyType || habit?.frequencyType || habit?.frequency;
    if (frequency !== 'custom' && frequency !== 'selected_days') {
      return true; // daily by default
    }
    if (!scheduleDays || scheduleDays.length === 0) {
      return true;
    }
    const [y, m, d] = dateKey.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    return scheduleDays.includes(dayOfWeek);
  };

  const oldestRealizedDate = sortedRealizedDates.length > 0
    ? sortedRealizedDates[sortedRealizedDates.length - 1]
    : undefined;

  // Helper to check and potentially consume a freeze for a missed scheduled day
  const isProtectedByFreeze = (dateKey: string, allowConsume: boolean = true): boolean => {
    if (activeProtectedDates.has(dateKey)) {
      return true;
    }
    if (!allowConsume) {
      return false;
    }
    // Only auto-consume if there is an active realized date prior to or at this date in history
    if (oldestRealizedDate && dateKey < oldestRealizedDate) {
      return false;
    }
    if (freezeConfig && autoConsume && remainingFreezes > 0) {
      remainingFreezes--;
      activeProtectedDates.add(dateKey);
      newlyConsumedFreezes.add(dateKey);
      return true;
    }
    return false;
  };

  // ---------------------------------------------------------------------------
  // UNIFIED CONTINUITY & STREAK FREEZE ENGINE:
  // 1. Incomplete days (actual < target or in-progress) DO NOT break continuity.
  // 2. ONLY fully realized goals (actual >= target) increment the streak count.
  // 3. Planned days off or absences protected by a freeze preserve continuity.
  // ---------------------------------------------------------------------------
  let currentStreak = 0;
  let bestStreak = 0;

  if (sortedRealizedDates.length > 0) {
    // Traverse backwards starting from today
    let cursor = todayStr;
    const oldestDate = sortedRealizedDates[sortedRealizedDates.length - 1];

    while (cursor >= oldestDate && Math.abs(diffDays(cursor, todayStr)) <= 365) {
      if (isDayScheduled(cursor)) {
        if (realizedDates.has(cursor)) {
          // Fully realized goal increments streak count
          currentStreak++;
        } else if (isProtectedByFreeze(cursor)) {
          // Protected day off / freeze preserves continuity without incrementing
        } else if (allowIncompleteContinuity) {
          // Incomplete day does NOT break continuity; does NOT increment count
        } else if (breakOnUnprotectedAbsence) {
          break;
        }
      }
      cursor = addDays(cursor, -1);
    }

    // Calculate Best Streak across full historical record
    let run = 0;
    const allChronologicalDates = Array.from(
      new Set([...Array.from(dateMap.keys()), ...sortedRealizedDates])
    ).sort((a, b) => a.localeCompare(b));

    allChronologicalDates.forEach((d) => {
      if (isDayScheduled(d)) {
        if (realizedDates.has(d)) {
          run++;
          if (run > bestStreak) bestStreak = run;
        } else if (isProtectedByFreeze(d, false) || allowIncompleteContinuity) {
          // Incomplete or frozen: preserves continuity, does not reset run
        } else {
          run = 0;
        }
      }
    });

    if (currentStreak > bestStreak) {
      bestStreak = currentStreak;
    }
  }

  // Recovery streak
  const recoveryStreak = currentStreak > 0 && currentStreak < bestStreak ? currentStreak : 0;

  // Tracked days & completion rate
  let missedDays = 0;
  let completionRate = 0;
  let totalDaysTracked = 0;

  if (sortedRealizedDates.length > 0) {
    const oldestDate = sortedRealizedDates[sortedRealizedDates.length - 1];
    totalDaysTracked = Math.max(1, diffDays(oldestDate, todayStr) + 1);
    missedDays = Math.max(0, totalDaysTracked - totalSuccessfulDays);
    completionRate = Math.min(100, Math.round((totalSuccessfulDays / totalDaysTracked) * 100));
  }

  let streakStatus: 'active' | 'at_risk' | 'broken' | 'frozen' | 'none' = 'none';
  if (currentStreak > 0) {
    if (isTodayRealized) {
      streakStatus = 'active';
    } else if (isTodayFrozen) {
      streakStatus = 'frozen';
    } else {
      streakStatus = 'at_risk';
    }
  } else if (totalSuccessfulDays > 0) {
    streakStatus = isTodayFrozen ? 'frozen' : 'broken';
  }

  const allConsumed = Array.from(new Set([...Array.from(initialUsedSet), ...Array.from(newlyConsumedFreezes)]));
  const remainingPlanned = Array.from(initialPlannedSet).filter((d) => !allConsumed.includes(d));

  return {
    currentStreak,
    bestStreak,
    recoveryStreak,
    totalSuccessfulDays,
    totalRealizedDays: totalSuccessfulDays,
    totalIncompleteDays: missedDays,
    missedDays,
    completionRate,
    lastCompletedDate: sortedRealizedDates[0],
    isCompletedToday: isTodayRealized,
    isTodayRealized,
    todayActual,
    todayTarget,
    todayStatus,
    streakStatus,
    isTodayFrozen,
    freezeState: {
      available: remainingFreezes,
      total: freezeConfig?.totalAvailable ?? 0,
      consumed: allConsumed,
      planned: remainingPlanned,
      isFrozenToday: isTodayFrozen,
      protectedDaysCount: activeProtectedDates.size,
      freezesRemaining: remainingFreezes,
    },
  };
}

/**
 * Primary Unified Entrypoint:
 * Accepts HabitLogs, Habit lists, or frequency parameters and runs the unified streak calculation.
 * Preserves backwards-compatibility with existing calls from Analytics, tests, and services.
 */
export function calculateStreakStats(
  logs: HabitLog[],
  frequencyType: HabitFrequency = 'daily',
  frequencyValueOrHabits?: string[] | Habit[],
  targetDateStr?: string,
  habit?: Habit,
  freezeConfig?: StreakFreezeConfig
): StreakStats {
  if (!logs || logs.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      recoveryStreak: 0,
      totalSuccessfulDays: 0,
      totalRealizedDays: 0,
      totalIncompleteDays: 0,
      missedDays: 0,
      completionRate: 0,
      isCompletedToday: false,
      isTodayRealized: false,
      todayActual: 0,
      todayTarget: habit?.targetValue ?? 1,
      todayStatus: 'not_started',
      streakStatus: 'none',
      isTodayFrozen: false,
      freezeState: freezeConfig
        ? {
            available: freezeConfig.totalAvailable,
            total: freezeConfig.totalAvailable,
            consumed: freezeConfig.usedFreezes || [],
            planned: freezeConfig.plannedDates || [],
            isFrozenToday: false,
            protectedDaysCount: (freezeConfig.usedFreezes?.length || 0) + (freezeConfig.plannedDates?.length || 0),
            freezesRemaining: freezeConfig.totalAvailable,
          }
        : undefined,
    };
  }

  // Handle polymorphism of 3rd argument: could be string[] frequencyValue OR Habit[]
  let habitMap: Map<string, Habit> | undefined;
  let scheduleDays: number[] | undefined;

  if (Array.isArray(frequencyValueOrHabits) && frequencyValueOrHabits.length > 0) {
    if (typeof frequencyValueOrHabits[0] === 'object' && frequencyValueOrHabits[0] !== null) {
      habitMap = new Map();
      (frequencyValueOrHabits as Habit[]).forEach((h) => {
        if (h.id) habitMap!.set(h.id, h);
      });
    } else if (typeof frequencyValueOrHabits[0] === 'string') {
      const dayMap: Record<string, number> = {
        Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
        Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
      };
      scheduleDays = (frequencyValueOrHabits as string[])
        .map((s) => dayMap[s])
        .filter((n) => typeof n === 'number');
    }
  }

  const dailyRecords = convertLogsToDailyRecords(logs, habitMap || habit);

  return calculateDailyRecordStreak(dailyRecords, {
    targetDateStr,
    frequencyType,
    scheduleDays,
    habit,
    freezeConfig,
  });
}
