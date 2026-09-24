/**
 * Canonical Goal Progress Calculation Engine for STREAK
 * SINGLE SOURCE OF TRUTH for:
 * - today's progress & remaining quantity
 * - activity count vs quantity breakdown
 * - overall progress & percentage
 * - completed days count & streaks (with historical immutability)
 * - deadline status & required pace
 */

import { Goal, GoalActivity, DailyGoalEntry, GoalType } from './goalService';
import { getTodayDateKey, getYesterdayDateKey, diffDays, parseDateKey, addDays } from './dateUtils';

export interface GoalProgressResult {
  goalId: string;
  goalTitle: string;
  unit: string;
  type: GoalType;

  // Selected date metrics
  dateKey: string;
  todayTarget: number;
  todayProgress: number;
  todayRemaining: number;
  todayPercent: number;
  isTodayComplete: boolean;

  // Activity count vs Quantity breakdown for the selected day
  todayActivityCount: number;
  todayCompletedActivityCount: number;
  todayTargetQuantity: number;
  todayCompletedQuantity: number;

  // Overall Goal metrics
  overallTarget: number;
  overallProgress: number;
  overallRemaining: number;
  overallPercent: number;
  isOverallComplete: boolean;

  // Streak & Historical metrics (immutable past)
  currentStreak: number;
  bestStreak: number;
  completedDaysCount: number;
  totalTrackedDays: number;
  averagePerDay: number;
  completionRate: number;

  // Deadline & Pace metrics
  deadlineDate?: string;
  remainingDays: number;
  requiredDailyPace: number;
  paceStatus: 'on_track' | 'ahead' | 'at_risk' | 'behind_pace' | 'completed' | 'no_deadline';
  paceMessage: string;
}

/**
 * Calculates the exact quantity completed and total target quantity for a list of activities.
 * Strictly respects quantity: e.g. 2 lectures + 1 lecture = 3 activities, 4 lectures total.
 */
export function calculateActivityQuantities(activities: GoalActivity[] = []): {
  activityCount: number;
  completedActivityCount: number;
  totalQuantity: number;
  completedQuantity: number;
} {
  const activityCount = activities.length;
  let completedActivityCount = 0;
  let totalQuantity = 0;
  let completedQuantity = 0;

  for (const act of activities) {
    if (act.completed) {
      completedActivityCount++;
    }
    // If targetQuantity is specified, use it. Otherwise fallback to 1 unit.
    const qty = typeof act.targetQuantity === 'number' && act.targetQuantity > 0 ? act.targetQuantity : 1;
    totalQuantity += qty;

    if (act.completed) {
      completedQuantity += qty;
    } else if (typeof act.progress === 'number' && act.progress > 0) {
      completedQuantity += Math.min(qty, act.progress);
    }
  }

  return {
    activityCount,
    completedActivityCount,
    totalQuantity,
    completedQuantity,
  };
}

/**
 * Computes canonical progress for a specific day's entry.
 */
export function getCanonicalDayEntryProgress(
  entry: DailyGoalEntry | undefined,
  fallbackTarget: number
): {
  target: number;
  progress: number;
  completed: boolean;
  activityCount: number;
  completedActivityCount: number;
  totalQuantity: number;
  completedQuantity: number;
} {
  const target = entry?.target !== undefined && entry.target > 0 ? entry.target : fallbackTarget;
  const activities = entry?.activities || [];

  if (activities.length > 0) {
    const qtyBreakdown = calculateActivityQuantities(activities);
    // If activities exist, the day's progress and completion are strictly derived from the database activities
    const progress = qtyBreakdown.completedQuantity;
    const isActivityTargetMet = progress >= target;
    const areAllActivitiesFinished = qtyBreakdown.activityCount > 0 && qtyBreakdown.completedActivityCount === qtyBreakdown.activityCount;
    const completed = isActivityTargetMet || areAllActivitiesFinished;
    return {
      target,
      progress,
      completed,
      activityCount: qtyBreakdown.activityCount,
      completedActivityCount: qtyBreakdown.completedActivityCount,
      totalQuantity: qtyBreakdown.totalQuantity,
      completedQuantity: qtyBreakdown.completedQuantity,
    };
  }

  // No sub-activities: use direct logged progress from single source of truth in database
  const progress = entry?.progress || 0;
  const completed = progress >= target;
  return {
    target,
    progress,
    completed,
    activityCount: 0,
    completedActivityCount: 0,
    totalQuantity: target,
    completedQuantity: progress,
  };
}

/**
 * Calculates historical streaks with 100% Historical Immutability.
 * A past day counts toward streak IF AND ONLY IF daily progress >= that day's target.
 * Editing the current daily target does NOT alter past day evaluations.
 */
export function calculateImmutableGoalStreaks(
  goal: Goal,
  todayKey: string = getTodayDateKey()
): {
  currentStreak: number;
  bestStreak: number;
  completedDaysCount: number;
  totalTrackedDays: number;
  totalCompletedUnits: number;
  averagePerDay: number;
  completionRate: number;
} {
  const history = goal.dailyHistory || {};
  const entries = Object.entries(history);
  const totalTrackedDays = entries.length;

  if (totalTrackedDays === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      completedDaysCount: 0,
      totalTrackedDays: 0,
      totalCompletedUnits: 0,
      averagePerDay: 0,
      completionRate: 0,
    };
  }

  let totalCompletedUnits = 0;
  let completedDaysCount = 0;
  const completedDateKeys: string[] = [];

  for (const [dStr, entry] of entries) {
    const dayResult = getCanonicalDayEntryProgress(entry, goal.dailyTarget || goal.target || 1);
    totalCompletedUnits += dayResult.progress;

    if (dayResult.completed) {
      completedDaysCount++;
      completedDateKeys.push(dStr);
    }
  }

  // Sort completed dates chronologically
  completedDateKeys.sort();

  let bestStreak = 0;
  let currentRunningStreak = 0;
  let lastDateKey: string | null = null;

  for (const dStr of completedDateKeys) {
    if (!lastDateKey) {
      currentRunningStreak = 1;
    } else {
      const diff = diffDays(lastDateKey, dStr);
      if (diff === 1) {
        currentRunningStreak++;
      } else if (diff === 0) {
        // duplicate entry protection
      } else {
        currentRunningStreak = 1;
      }
    }
    if (currentRunningStreak > bestStreak) {
      bestStreak = currentRunningStreak;
    }
    lastDateKey = dStr;
  }

  // Current streak requires the active streak to reach reference date (todayKey) or the day before (yesterdayKey)
  const yesterdayKey = addDays(todayKey, -1);
  const todayEntry = history[todayKey];
  const todayResult = getCanonicalDayEntryProgress(todayEntry, goal.dailyTarget || goal.target || 1);
  const isTodayComplete = todayResult.completed;

  const yesterdayEntry = history[yesterdayKey];
  const yesterdayResult = getCanonicalDayEntryProgress(yesterdayEntry, goal.dailyTarget || goal.target || 1);
  const isYesterdayComplete = yesterdayResult.completed;

  let currentStreak = 0;
  if (lastDateKey === todayKey) {
    currentStreak = currentRunningStreak;
  } else if (lastDateKey === yesterdayKey) {
    currentStreak = currentRunningStreak;
  } else {
    currentStreak = 0;
  }

  const averagePerDay = totalTrackedDays > 0 ? Math.round((totalCompletedUnits / totalTrackedDays) * 10) / 10 : 0;
  const completionRate = totalTrackedDays > 0 ? Math.round((completedDaysCount / totalTrackedDays) * 100) : 0;

  return {
    currentStreak,
    bestStreak,
    completedDaysCount,
    totalTrackedDays,
    totalCompletedUnits,
    averagePerDay,
    completionRate,
  };
}

/**
 * SINGLE SOURCE OF TRUTH calculation function for any Goal in STREAK.
 */
export function calculateGoalProgress(
  goal: Goal,
  selectedDateKey?: string
): GoalProgressResult {
  const dateKey = selectedDateKey || getTodayDateKey();
  const fallbackDailyTarget = goal.dailyTarget || (goal.type === 'daily' ? 1 : goal.target || 1);
  const dayEntry = goal.dailyHistory?.[dateKey];

  // 1. Day specific metrics
  const dayStats = getCanonicalDayEntryProgress(dayEntry, fallbackDailyTarget);
  const todayTarget = dayStats.target;
  const todayProgress = dayStats.progress;
  const todayRemaining = Math.max(0, todayTarget - todayProgress);
  const todayPercent = Math.min(100, Math.round((todayProgress / Math.max(1, todayTarget)) * 100));
  const isTodayComplete = dayStats.completed;

  // 2. Streaks & Historical aggregation (Immutable)
  const streakStats = calculateImmutableGoalStreaks(goal, dateKey);

  // 3. Overall Goal progress
  let overallTarget = goal.target || 100;
  let overallProgress = 0;

  // Sum total progress across all days in dailyHistory
  const history = goal.dailyHistory || {};
  let sumHistoryProgress = 0;
  for (const entry of Object.values(history)) {
    const entryStats = getCanonicalDayEntryProgress(entry, fallbackDailyTarget);
    sumHistoryProgress += entryStats.progress;
  }

  if (goal.type === 'daily' || sumHistoryProgress > 0) {
    overallProgress = Math.max(sumHistoryProgress, goal.currentProgress || 0);
  } else {
    // Milestone or one-time target
    overallProgress = goal.currentProgress || 0;
  }

  const overallRemaining = Math.max(0, overallTarget - overallProgress);
  const overallPercent = Math.min(100, Math.round((overallProgress / Math.max(1, overallTarget)) * 100));
  const isOverallComplete = goal.status === 'completed' || overallProgress >= overallTarget;

  // 4. Deadline and Pace analysis
  const deadlineDate = goal.targetDate || goal.endDate;
  let remainingDays = Infinity;
  let requiredDailyPace = fallbackDailyTarget;
  let paceStatus: GoalProgressResult['paceStatus'] = 'no_deadline';
  let paceMessage = 'No deadline set';

  if (isOverallComplete) {
    paceStatus = 'completed';
    paceMessage = 'Goal Achieved!';
    remainingDays = deadlineDate ? Math.max(0, diffDays(getTodayDateKey(), deadlineDate)) : 0;
    requiredDailyPace = 0;
  } else if (deadlineDate) {
    const daysUntil = diffDays(getTodayDateKey(), deadlineDate);
    remainingDays = Math.max(0, daysUntil);

    if (daysUntil < 0) {
      paceStatus = 'behind_pace';
      requiredDailyPace = overallRemaining;
      paceMessage = `Overdue by ${Math.abs(daysUntil)} days`;
    } else if (daysUntil === 0) {
      paceStatus = 'at_risk';
      requiredDailyPace = overallRemaining;
      paceMessage = `Deadline is today (${overallRemaining} ${goal.unit || 'units'} left)`;
    } else {
      requiredDailyPace = Math.ceil(overallRemaining / Math.max(1, remainingDays));
      const nominalDaily = goal.dailyTarget || Math.ceil(overallTarget / Math.max(1, remainingDays));

      if (requiredDailyPace > nominalDaily * 1.25) {
        paceStatus = 'behind_pace';
        paceMessage = `Behind pace: requires ${requiredDailyPace} ${goal.unit || 'units'}/day`;
      } else if (requiredDailyPace > nominalDaily) {
        paceStatus = 'at_risk';
        paceMessage = `Pace tight: need ${requiredDailyPace} ${goal.unit || 'units'}/day`;
      } else if (requiredDailyPace < nominalDaily * 0.8) {
        paceStatus = 'ahead';
        paceMessage = `Ahead of schedule: ${requiredDailyPace} ${goal.unit || 'units'}/day`;
      } else {
        paceStatus = 'on_track';
        paceMessage = `On track: ${requiredDailyPace} ${goal.unit || 'units'}/day`;
      }
    }
  }

  return {
    goalId: goal.id,
    goalTitle: goal.title,
    unit: goal.unit || 'units',
    type: goal.type || 'one_time',
    dateKey,
    todayTarget,
    todayProgress,
    todayRemaining,
    todayPercent,
    isTodayComplete,
    todayActivityCount: dayStats.activityCount,
    todayCompletedActivityCount: dayStats.completedActivityCount,
    todayTargetQuantity: dayStats.totalQuantity,
    todayCompletedQuantity: dayStats.completedQuantity,
    overallTarget,
    overallProgress,
    overallRemaining,
    overallPercent,
    isOverallComplete,
    currentStreak: streakStats.currentStreak,
    bestStreak: streakStats.bestStreak,
    completedDaysCount: streakStats.completedDaysCount,
    totalTrackedDays: streakStats.totalTrackedDays,
    averagePerDay: streakStats.averagePerDay,
    completionRate: streakStats.completionRate,
    deadlineDate,
    remainingDays,
    requiredDailyPace,
    paceStatus,
    paceMessage,
  };
}

export interface DailyGoalDetailedStats {
  todayProgress: number;
  todayTarget: number;
  todayPercentage: number;
  isTodayCompleted: boolean;
  totalDaysTracked: number;
  daysTargetCompleted: number;
  daysPartiallyCompleted: number;
  missedDays: number;
  currentStreak: number;
  longestStreak: number;
  overallCompletionPercentage: number;
  averageDailyCompletion: number;
  lastActiveDate: string | null;
}

/**
 * Calculates comprehensive daily recurring goal statistics adhering strictly to
 * historical immutability and real stored data.
 */
export function getDailyGoalDetailedStats(
  goal: Goal,
  todayKey: string = getTodayDateKey()
): DailyGoalDetailedStats {
  const history = goal.dailyHistory || {};
  const entries = Object.entries(history);
  const fallbackTarget = goal.dailyTarget || goal.target || 1;

  const todayEntry = history[todayKey];
  const todayResult = getCanonicalDayEntryProgress(todayEntry, fallbackTarget);
  const todayProgress = todayResult.progress;
  const todayTarget = todayResult.target;
  const todayPercentage = Math.min(100, Math.round((todayProgress / Math.max(1, todayTarget)) * 100));
  const isTodayCompleted = todayProgress >= todayTarget;

  let daysTargetCompleted = 0;
  let daysPartiallyCompleted = 0;
  let missedDays = 0;
  let totalUnits = 0;
  let lastActiveDate: string | null = null;

  // Sort dates chronologically to find last active date
  const sortedDateKeys = Object.keys(history).sort();

  for (const dateStr of sortedDateKeys) {
    const entry = history[dateStr];
    const dayStats = getCanonicalDayEntryProgress(entry, fallbackTarget);
    totalUnits += dayStats.progress;

    if (dayStats.progress >= dayStats.target) {
      daysTargetCompleted++;
    } else if (dayStats.progress > 0) {
      daysPartiallyCompleted++;
    } else {
      missedDays++;
    }

    if (dayStats.progress > 0) {
      lastActiveDate = dateStr;
    }
  }

  const totalDaysTracked = entries.length;
  const streakStats = calculateImmutableGoalStreaks(goal, todayKey);
  const averageDailyCompletion = totalDaysTracked > 0 ? Math.round((totalUnits / totalDaysTracked) * 10) / 10 : 0;
  const overallTarget = goal.target || (fallbackTarget * 30);
  const overallCompletionPercentage = Math.min(100, Math.round((totalUnits / Math.max(1, overallTarget)) * 100));

  return {
    todayProgress,
    todayTarget,
    todayPercentage,
    isTodayCompleted,
    totalDaysTracked,
    daysTargetCompleted,
    daysPartiallyCompleted,
    missedDays,
    currentStreak: streakStats.currentStreak,
    longestStreak: streakStats.bestStreak,
    overallCompletionPercentage,
    averageDailyCompletion,
    lastActiveDate,
  };
}
