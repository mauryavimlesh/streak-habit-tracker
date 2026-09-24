/**
 * STREAK DAILY MOMENTUM ENGINE - SINGLE SOURCE OF TRUTH
 *
 * Exact Formula:
 * Momentum = 100 * (0.35 * H + 0.25 * T + 0.25 * G + 0.15 * F) / totalAvailableWeight
 *
 * Where:
 * H = Habit completion score (completed scheduled habit units / scheduled habit units)
 * T = Task completion score (completed due task units / due task units)
 * G = Daily Goal progress score (completed daily goal target / daily goal target, capped at 1.0)
 * F = Focus/Study progress score (actual focus minutes / planned focus minutes, capped at 1.0)
 *
 * Every component is normalized between 0 and 1.
 * If a category has no planned items/targets today, it is excluded and remaining weights are re-normalized.
 * If zero planned activity exists across all categories, isZeroPlanDay is true ("No plans for today").
 */

import { Habit, HabitLog } from './habitService';
import { TaskItem } from './taskService';
import { Goal } from './goalService';
import { Activity } from './activityService';
import { getTodayDateKey, parseDateKey } from './dateUtils';

export interface CategoryBreakdown {
  score: number; // 0.0 - 1.0
  completed: number;
  target: number;
  unit: string;
  weight: number;
  available: boolean;
  label: string;
}

export type MomentumState =
  | 'zero_plan'
  | 'getting_started'
  | 'moving'
  | 'good_momentum'
  | 'almost_there'
  | 'day_complete';

export interface MomentumResult {
  score: number; // 0 - 100 integer
  rawScore: number; // exact floating point
  isZeroPlanDay: boolean;
  state: MomentumState;
  stateMessage: string;
  breakdown: {
    habits: CategoryBreakdown;
    tasks: CategoryBreakdown;
    goals: CategoryBreakdown;
    focus: CategoryBreakdown;
  };
  totalPlannedItems: number;
  totalCompletedItems: number;
  remainingItems: number;
}

export interface MomentumCalculationOptions {
  dateStr?: string;
  habits?: Habit[];
  logs?: HabitLog[];
  localProgress?: Record<string, number>;
  tasks?: TaskItem[];
  goals?: Goal[];
  activities?: Activity[];
  plannedFocusMinutes?: number;
}

/**
 * Determines whether a habit is scheduled for a given dateStr (YYYY-MM-DD).
 */
export function isHabitScheduledForDate(habit: Habit, dateStr: string): boolean {
  if (habit.archived) return false;

  const date = parseDateKey(dateStr);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayAbbr = dayNames[date.getDay()];
  const dayNum = date.getDay();

  const freq = habit.frequencyType || habit.frequency;
  if (!freq || freq === 'daily') {
    return true;
  }

  if (Array.isArray(habit.scheduleDays) && habit.scheduleDays.length > 0) {
    return habit.scheduleDays.includes(dayNum);
  }

  if (Array.isArray(habit.frequencyValue) && habit.frequencyValue.length > 0) {
    return habit.frequencyValue.includes(dayAbbr);
  }

  return true;
}

/**
 * Calculates deterministic daily momentum for any canonical local date.
 * Single source of truth used across Home, Calendar, Daily Reflection, and AI Coach.
 */
export function calculateDailyMomentum(options: MomentumCalculationOptions): MomentumResult {
  const dateStr = options.dateStr || getTodayDateKey();
  const {
    habits = [],
    logs = [],
    localProgress = {},
    tasks = [],
    goals = [],
    activities = [],
    plannedFocusMinutes = 0,
  } = options;

  // ==========================================
  // 1. HABIT SCORE (Weight 0.35)
  // ==========================================
  // Filter only habits scheduled for this specific date (exclude archived/inactive/future)
  const scheduledHabits = habits.filter((h) => isHabitScheduledForDate(h, dateStr));

  // Build unique progress map for dateStr to prevent duplicate log abuse
  const habitProgressMap = new Map<string, number>();

  // Prefer logs for past/current dates
  for (const log of logs) {
    if (log.date === dateStr && log.habitId) {
      const current = habitProgressMap.get(log.habitId) || 0;
      const val = typeof log.progressValue === 'number'
        ? log.progressValue
        : log.status === 'completed'
        ? 1
        : 0;
      habitProgressMap.set(log.habitId, Math.max(current, val));
    }
  }

  // Also check localProgress for today
  for (const [habitId, val] of Object.entries(localProgress)) {
    const current = habitProgressMap.get(habitId) || 0;
    habitProgressMap.set(habitId, Math.max(current, val));
  }

  let totalScheduledHabitUnits = 0;
  let totalCompletedHabitUnits = 0;

  for (const habit of scheduledHabits) {
    const target = Math.max(1, habit.targetValue || 1);
    const progress = Math.max(0, habitProgressMap.get(habit.id!) || 0);

    totalScheduledHabitUnits += 1; // Each habit is 1 planned unit, evaluated proportionally

    if (habit.targetType === 'binary' || target === 1) {
      // Binary habit
      const isDone = progress >= 1;
      if (isDone) totalCompletedHabitUnits += 1;
    } else {
      // Measurable habit: ratio capped at 1.0 (e.g. 6/8 = 0.75)
      const ratio = Math.min(1.0, progress / target);
      totalCompletedHabitUnits += ratio;
    }
  }

  const habitAvailable = scheduledHabits.length > 0;
  const habitScore = habitAvailable
    ? Math.min(1.0, totalCompletedHabitUnits / totalScheduledHabitUnits)
    : 0;

  // ==========================================
  // 2. TASK SCORE (Weight 0.25)
  // ==========================================
  // Only tasks actually due on this date count (do not penalize for future or overdue from prior days)
  const dueTasks = tasks.filter((t) => t.date === dateStr && !t.isArchived && !t.archivedAt);
  const taskAvailable = dueTasks.length > 0;
  let completedDueTasks = 0;

  for (const task of dueTasks) {
    if (task.completed) {
      completedDueTasks += 1;
    }
  }

  const taskScore = taskAvailable
    ? Math.min(1.0, completedDueTasks / dueTasks.length)
    : 0;

  // ==========================================
  // 3. DAILY GOAL SCORE (Weight 0.25)
  // ==========================================
  // Goals with daily recurring targets
  const activeDailyGoals = goals.filter(
    (g) => g.type === 'daily' && g.status !== 'paused' && g.status !== 'archived'
  );

  let goalCompletedUnits = 0;
  let goalTargetUnits = 0;

  for (const goal of activeDailyGoals) {
    const dayEntry = goal.dailyHistory?.[dateStr];
    const target = Math.max(1, dayEntry?.target ?? goal.dailyTarget ?? goal.target ?? 1);
    const progress = Math.max(0, dayEntry?.progress ?? 0);

    goalTargetUnits += 1;
    // Cap per-goal contribution at 1.0 (e.g. 6/4 = 1.0, NOT 1.5)
    const ratio = Math.min(1.0, progress / target);
    goalCompletedUnits += ratio;
  }

  const goalAvailable = activeDailyGoals.length > 0;
  const goalScore = goalAvailable
    ? Math.min(1.0, goalCompletedUnits / goalTargetUnits)
    : 0;

  // ==========================================
  // 4. FOCUS SCORE (Weight 0.15)
  // ==========================================
  // Sum focus session minutes for dateStr
  const actualFocusMinutes = activities
    .filter((a) => a.date === dateStr && a.completionStatus !== 'abandoned')
    .reduce((sum, a) => sum + (a.durationMinutes || 0), 0);

  const focusAvailable = plannedFocusMinutes > 0;
  const focusScore = focusAvailable
    ? Math.min(1.0, actualFocusMinutes / plannedFocusMinutes)
    : 0;

  // ==========================================
  // 5. NORMALIZED WEIGHTED CALCULATION
  // ==========================================
  const BASE_WEIGHTS = {
    habit: 0.35,
    task: 0.25,
    goal: 0.25,
    focus: 0.15,
  };

  let totalAvailableWeight = 0;
  let earnedScore = 0;

  if (habitAvailable) {
    totalAvailableWeight += BASE_WEIGHTS.habit;
    earnedScore += BASE_WEIGHTS.habit * habitScore;
  }
  if (taskAvailable) {
    totalAvailableWeight += BASE_WEIGHTS.task;
    earnedScore += BASE_WEIGHTS.task * taskScore;
  }
  if (goalAvailable) {
    totalAvailableWeight += BASE_WEIGHTS.goal;
    earnedScore += BASE_WEIGHTS.goal * goalScore;
  }
  if (focusAvailable) {
    totalAvailableWeight += BASE_WEIGHTS.focus;
    earnedScore += BASE_WEIGHTS.focus * focusScore;
  }

  const isZeroPlanDay = totalAvailableWeight === 0;

  let rawScore = 0;
  let finalScore = 0;

  if (!isZeroPlanDay) {
    rawScore = 100 * (earnedScore / totalAvailableWeight);
    finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));
  }

  // ==========================================
  // 6. MOMENTUM STATES
  // ==========================================
  let state: MomentumState = 'getting_started';
  let stateMessage = "Let's get started.";

  if (isZeroPlanDay) {
    state = 'zero_plan';
    stateMessage = 'No plans for today';
  } else if (finalScore === 100) {
    state = 'day_complete';
    stateMessage = 'Day complete. 🔥';
  } else if (finalScore >= 75) {
    state = 'almost_there';
    stateMessage = 'Almost there.';
  } else if (finalScore >= 50) {
    state = 'good_momentum';
    stateMessage = 'Good momentum.';
  } else if (finalScore >= 25) {
    state = 'moving';
    stateMessage = "You're moving.";
  } else {
    state = 'getting_started';
    stateMessage = "Let's get started.";
  }

  const totalPlannedItems =
    scheduledHabits.length +
    dueTasks.length +
    activeDailyGoals.length +
    (focusAvailable ? 1 : 0);

  const totalCompletedItems =
    Math.round(totalCompletedHabitUnits) +
    completedDueTasks +
    Math.round(goalCompletedUnits) +
    (focusScore >= 1.0 ? 1 : 0);

  const remainingItems = Math.max(0, totalPlannedItems - totalCompletedItems);

  return {
    score: finalScore,
    rawScore,
    isZeroPlanDay,
    state,
    stateMessage,
    breakdown: {
      habits: {
        score: habitScore,
        completed: Math.round(totalCompletedHabitUnits * 10) / 10,
        target: totalScheduledHabitUnits,
        unit: 'habits',
        weight: BASE_WEIGHTS.habit,
        available: habitAvailable,
        label: `${Math.round(habitScore * 100)}% habits`,
      },
      tasks: {
        score: taskScore,
        completed: completedDueTasks,
        target: dueTasks.length,
        unit: 'tasks',
        weight: BASE_WEIGHTS.task,
        available: taskAvailable,
        label: `${completedDueTasks}/${dueTasks.length} tasks`,
      },
      goals: {
        score: goalScore,
        completed: Math.round(goalCompletedUnits * 10) / 10,
        target: goalTargetUnits,
        unit: 'goals',
        weight: BASE_WEIGHTS.goal,
        available: goalAvailable,
        label: `${Math.round(goalScore * 100)}% goals`,
      },
      focus: {
        score: focusScore,
        completed: actualFocusMinutes,
        target: plannedFocusMinutes,
        unit: 'min',
        weight: BASE_WEIGHTS.focus,
        available: focusAvailable,
        label: focusAvailable ? `${actualFocusMinutes}/${plannedFocusMinutes}m focus` : 'No focus target',
      },
    },
    totalPlannedItems,
    totalCompletedItems,
    remainingItems,
  };
}
