import { Habit, HabitLog } from './habitService';
import { TaskItem } from './taskService';
import { Goal, calculateGoalProgress } from './goalService';
import { Activity } from './activityService';
import { JournalEntry } from './journalService';
import { formatDateKey, parseDateKey, getTodayDateKey, addDays, diffDays, formatTime12 } from './dateUtils';

export type ActivitySourceType = 'focus' | 'habit' | 'task' | 'goal' | 'journal';

export interface UnifiedActivityItem {
  id: string;
  sourceType: ActivitySourceType;
  sourceId: string;
  title: string;
  date: string; // canonical local YYYY-MM-DD
  time?: string; // e.g. "11:30 PM"
  durationMinutes?: number;
  completed: boolean;
  status: 'completed' | 'in_progress' | 'missed' | 'pending' | 'skipped' | 'failed' | 'partial' | 'not_started';
  category?: string;
  subject?: string;
  quantity?: number;
  targetQuantity?: number;
  unit?: string;
  notes?: string;
  goalId?: string;
  activityId?: string;
  linkedHabitId?: string;
  createdAt?: string;
}

export type AnalyticsPeriod = 'today' | '7d' | '30d' | 'month' | 'all';

export interface PeriodStats {
  period: AnalyticsPeriod;
  startDate: string;
  endDate: string;
  totalTrackedItems: number;
  completedItems: number;
  completionRate: number;
  studyMinutes: number;
  studyHours: number;
  studySessions: number;
  habitsCompleted: number;
  habitsScheduled: number;
  habitCompletionRate: number;
  tasksCompleted: number;
  tasksScheduled: number;
  taskCompletionRate: number;
  goalsActive: number;
  goalsCompleted: number;
  journalEntries: number;
  productivityScore: number;
  isEmpty: boolean;
  scoreBreakdown: {
    habits: { earned: number; max: number; rate: number };
    tasks: { earned: number; max: number; rate: number };
    goals: { earned: number; max: number; rate: number };
    focus: { earned: number; max: number; minutes: number };
  };
  dailyTrend: {
    date: string;
    dayLabel: string;
    completedCount: number;
    studyMinutes: number;
    score: number;
  }[];
  subjectBreakdown: Record<string, { minutes: number; sessions: number }>;
}

export interface UnifiedActivityOptions {
  habits?: Habit[];
  logs?: HabitLog[];
  tasks?: TaskItem[];
  goals?: Goal[];
  activities?: Activity[];
  journals?: JournalEntry[];
}

/**
 * Returns a unified list of all activities for a specific canonical local date (YYYY-MM-DD).
 * Ensures consistency across Home, Calendar, Goals, and Analytics.
 */
export function getUnifiedActivitiesForDate(
  dateKey: string,
  options: UnifiedActivityOptions
): UnifiedActivityItem[] {
  const {
    habits = [],
    logs = [],
    tasks = [],
    goals = [],
    activities = [],
    journals = [],
  } = options;

  const result: UnifiedActivityItem[] = [];

  // Track explicit entity references to deduplicate linked actions on the same date
  const coveredGoalActivities = new Set<string>(); // "goalId_activityId"
  const coveredHabits = new Set<string>(); // "habitId"
  const coveredTasks = new Set<string>(); // "taskId"

  // 1. Focus / Study Activities on this date
  activities
    .filter((a) => a.date === dateKey)
    .forEach((a) => {
      const dur = a.durationMinutes + (a.durationSeconds ? Math.round(a.durationSeconds / 60) : 0);
      if (a.goalId && a.activityId) {
        coveredGoalActivities.add(`${a.goalId}_${a.activityId}`);
      }
      if (a.linkedHabitId) {
        coveredHabits.add(a.linkedHabitId);
      }
      if ((a as any).taskId) {
        coveredTasks.add((a as any).taskId);
      }

      result.push({
        id: `focus_${a.id || Date.now()}`,
        sourceType: 'focus',
        sourceId: a.id || '',
        title: a.name || 'Focus Session',
        date: a.date,
        time: a.time ? formatTime12(a.time) : undefined,
        durationMinutes: dur,
        completed: a.completionStatus !== 'abandoned',
        status: a.completionStatus === 'abandoned' ? 'missed' : 'completed',
        category: a.category || 'Focus',
        subject: a.subject,
        goalId: a.goalId,
        activityId: a.activityId,
        linkedHabitId: a.linkedHabitId,
        notes: a.notes,
        createdAt: a.createdAt,
      });
    });

  // 2. Tasks on this date (skip if already covered by an identical linked focus activity)
  tasks
    .filter((t) => t.date === dateKey)
    .forEach((t) => {
      const actKey = t.linkedGoalId && (t.linkedGoalActivityId || (t as any).activityId)
        ? `${t.linkedGoalId}_${t.linkedGoalActivityId || (t as any).activityId}`
        : null;

      if (coveredTasks.has(t.id)) {
        return; // Already represented by focus session
      }
      if (actKey && coveredGoalActivities.has(actKey)) {
        return; // Already represented by focus session on this goal activity
      }

      if (actKey) {
        coveredGoalActivities.add(actKey);
      }
      if (t.linkedHabitId) {
        coveredHabits.add(t.linkedHabitId);
      }
      coveredTasks.add(t.id);

      result.push({
        id: `task_${t.id}`,
        sourceType: 'task',
        sourceId: t.id,
        title: t.title,
        date: t.date,
        time: t.time ? formatTime12(t.time) : undefined,
        completed: Boolean(t.completed),
        status: t.completed ? 'completed' : 'pending',
        category: t.category || 'Task',
        quantity: t.progressQuantity,
        targetQuantity: t.targetQuantity,
        unit: t.unit,
        notes: t.description,
        goalId: t.linkedGoalId,
        activityId: t.linkedGoalActivityId,
        linkedHabitId: t.linkedHabitId,
        createdAt: t.createdAt,
      });
    });

  // 3. Habits logged on this date (skip if already covered by linked task or focus session)
  const habitMap = new Map<string, Habit>();
  habits.forEach((h) => {
    if (h.id) habitMap.set(h.id, h);
  });

  logs
    .filter((l) => l.date === dateKey)
    .forEach((l) => {
      if (coveredHabits.has(l.habitId)) {
        return; // Action already represented by linked task or focus session
      }
      coveredHabits.add(l.habitId);

      const habit = habitMap.get(l.habitId);
      const isCompleted = l.status === 'completed';
      result.push({
        id: `habit_${l.id || l.habitId}_${dateKey}`,
        sourceType: 'habit',
        sourceId: l.habitId,
        title: habit?.name || 'Habit',
        date: l.date,
        completed: isCompleted,
        status: l.status,
        category: habit?.category || 'Habit',
        quantity: l.progressValue,
        targetQuantity: habit?.targetValue || 1,
        unit: habit?.targetUnit,
        notes: l.note,
        linkedHabitId: l.habitId,
        createdAt: l.createdAt,
      });
    });

  // 4. Goal activities in dailyHistory for this date (skip if already covered)
  goals.forEach((goal) => {
    const dayEntry = goal.dailyHistory?.[dateKey];
    if (dayEntry?.activities && Array.isArray(dayEntry.activities)) {
      dayEntry.activities.forEach((act) => {
        const actKey = `${goal.id}_${act.id}`;
        if (coveredGoalActivities.has(actKey)) {
          return; // Already represented by focus session or task
        }
        coveredGoalActivities.add(actKey);

        result.push({
          id: `goal_${goal.id}_${act.id}`,
          sourceType: 'goal',
          sourceId: act.id,
          title: act.title,
          date: dateKey,
          time: act.scheduledTime ? formatTime12(act.scheduledTime) : undefined,
          durationMinutes: act.plannedDurationMinutes || act.estimatedDuration,
          completed: Boolean(act.completed),
          status: act.completed ? 'completed' : 'pending',
          category: goal.category || 'Goal',
          subject: act.subject,
          goalId: goal.id,
          activityId: act.id,
          notes: act.notes,
        });
      });
    }
  });

  // 5. Journal entries on this date
  journals
    .filter((j) => j.date === dateKey)
    .forEach((j) => {
      result.push({
        id: `journal_${j.id}`,
        sourceType: 'journal',
        sourceId: j.id,
        title: j.title || 'Journal Reflection',
        date: j.date,
        time: j.time ? formatTime12(j.time) : undefined,
        completed: true,
        status: 'completed',
        category: 'Reflection',
        notes: j.text,
        createdAt: j.createdAt,
      });
    });

  return result;
}

/**
 * Calculates start and end dates for a given analytics period.
 */
export function getPeriodDateRange(period: AnalyticsPeriod): { start: string; end: string; days: number } {
  const today = getTodayDateKey();
  const todayDate = parseDateKey(today);

  switch (period) {
    case 'today':
      return { start: today, end: today, days: 1 };
    case '7d':
      return { start: addDays(today, -6), end: today, days: 7 };
    case '30d':
      return { start: addDays(today, -29), end: today, days: 30 };
    case 'month': {
      const year = todayDate.getFullYear();
      const month = String(todayDate.getMonth() + 1).padStart(2, '0');
      const start = `${year}-${month}-01`;
      const days = diffDays(start, today) + 1;
      return { start, end: today, days };
    }
    case 'all':
      return { start: '2020-01-01', end: today, days: 9999 };
  }
}

/**
 * Calculates deterministic, real-data statistics for the specified time window.
 * Strictly guarantees that empty users receive 0 productivity scores.
 */
export function calculatePeriodStats(
  period: AnalyticsPeriod,
  options: UnifiedActivityOptions
): PeriodStats {
  const {
    habits = [],
    logs = [],
    tasks = [],
    goals = [],
    activities = [],
    journals = [],
  } = options;

  const { start: startDate, end: endDate, days } = getPeriodDateRange(period);

  // Filter records within [startDate, endDate]
  const periodLogs = logs.filter((l) => l.date >= startDate && l.date <= endDate);
  const periodTasks = tasks.filter((t) => t.date >= startDate && t.date <= endDate);
  const periodActivities = activities.filter((a) => a.date >= startDate && a.date <= endDate);
  const periodJournals = journals.filter((j) => j.date >= startDate && j.date <= endDate);

  // 1. Focus / Study calculation
  let studyMinutes = 0;
  const subjectBreakdown: Record<string, { minutes: number; sessions: number }> = {};

  periodActivities.forEach((a) => {
    const mins = (a.durationMinutes || 0) + (a.durationSeconds ? Math.round(a.durationSeconds / 60) : 0);
    studyMinutes += mins;

    const subj = a.subject || a.category || 'General';
    if (!subjectBreakdown[subj]) {
      subjectBreakdown[subj] = { minutes: 0, sessions: 0 };
    }
    subjectBreakdown[subj].minutes += mins;
    subjectBreakdown[subj].sessions += 1;
  });

  const studyHours = Number((studyMinutes / 60).toFixed(1));
  const studySessions = periodActivities.length;

  // 2. Habits calculation
  const activeHabits = habits.filter((h) => !h.archived);
  const habitsCompleted = periodLogs.filter((l) => l.status === 'completed').length;
  // Estimated scheduled habits in this window
  const habitsScheduled = activeHabits.length * (period === 'all' ? Math.max(1, periodLogs.length) : days);
  const habitCompletionRate = habitsScheduled > 0 ? Math.min(100, Math.round((habitsCompleted / habitsScheduled) * 100)) : 0;

  // 3. Tasks calculation
  const tasksCompleted = periodTasks.filter((t) => t.completed).length;
  const tasksScheduled = periodTasks.length;
  const taskCompletionRate = tasksScheduled > 0 ? Math.round((tasksCompleted / tasksScheduled) * 100) : 0;

  // 4. Goals calculation
  const activeGoals = goals.filter((g) => g.status === 'in_progress');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  // Measure daily goals met in this period
  let dailyGoalsTracked = 0;
  let dailyGoalsMet = 0;
  const dailyGoals = goals.filter((g) => g.type === 'daily' && g.status !== 'archived');

  if (dailyGoals.length > 0) {
    // Check each day in range
    const curDate = parseDateKey(startDate);
    const stopDate = parseDateKey(endDate);
    while (curDate <= stopDate) {
      const dKey = formatDateKey(curDate);
      dailyGoals.forEach((g) => {
        dailyGoalsTracked++;
        const p = calculateGoalProgress(g, dKey);
        if (p.isTodayComplete) {
          dailyGoalsMet++;
        }
      });
      curDate.setDate(curDate.getDate() + 1);
    }
  }

  const goalProgressRate = dailyGoalsTracked > 0 ? Math.round((dailyGoalsMet / dailyGoalsTracked) * 100) : 0;

  // 5. Total items tracked (deduplicate items that are explicitly linked to daily goals)
  const linkedHabitIdSet = new Set(goals.map((g) => g.linkedHabitId).filter(Boolean));
  const linkedTaskIdSet = new Set(goals.map((g) => g.linkedTaskId).filter(Boolean));

  const standaloneHabits = activeHabits.filter((h) => !linkedHabitIdSet.has(h.id));
  const standaloneHabitsScheduled = standaloneHabits.length * (period === 'all' ? Math.max(1, periodLogs.length) : days);
  const standaloneHabitsCompleted = periodLogs.filter((l) => l.status === 'completed' && !linkedHabitIdSet.has(l.habitId)).length;

  const standaloneTasksScheduled = periodTasks.filter((t) => !linkedTaskIdSet.has(t.id) && !t.linkedGoalId).length;
  const standaloneTasksCompleted = periodTasks.filter((t) => t.completed && !linkedTaskIdSet.has(t.id) && !t.linkedGoalId).length;

  const totalTrackedItems = standaloneTasksScheduled + (standaloneHabits.length > 0 ? standaloneHabitsScheduled : 0) + dailyGoalsTracked;
  const totalCompletedItems = standaloneTasksCompleted + standaloneHabitsCompleted + dailyGoalsMet;
  const overallCompletionRate = totalTrackedItems > 0 ? Math.round((totalCompletedItems / totalTrackedItems) * 100) : 0;

  // Check if completely empty
  const isEmpty =
    totalTrackedItems === 0 &&
    studyMinutes === 0 &&
    periodJournals.length === 0 &&
    habits.length === 0 &&
    tasks.length === 0 &&
    goals.length === 0;

  // 6. Truthful Productivity Score Calculation (0 - 100)
  // If the user has literally nothing tracked or completed, score is strictly 0!
  let productivityScore = 0;
  let habitEarned = 0;
  let taskEarned = 0;
  let goalEarned = 0;
  let focusEarned = 0;

  if (!isEmpty && (totalTrackedItems > 0 || studyMinutes > 0)) {
    // Weighted components:
    // Habits: up to 35 pts
    // Tasks: up to 30 pts
    // Daily Goals: up to 20 pts
    // Focus Minutes: up to 15 pts (1 pt per 10 mins up to 150 mins for the period)
    const habitMax = habitsScheduled > 0 ? 35 : 0;
    const taskMax = tasksScheduled > 0 ? 30 : 0;
    const goalMax = dailyGoalsTracked > 0 ? 20 : 0;
    const focusMax = 15;

    const activeMax = habitMax + taskMax + goalMax + focusMax;

    if (habitsScheduled > 0) {
      habitEarned = Math.round((habitsCompleted / habitsScheduled) * habitMax);
    }
    if (tasksScheduled > 0) {
      taskEarned = Math.round((tasksCompleted / tasksScheduled) * taskMax);
    }
    if (dailyGoalsTracked > 0) {
      goalEarned = Math.round((dailyGoalsMet / dailyGoalsTracked) * goalMax);
    }

    // Focus target: 25 mins per day in period
    const focusTargetMinutes = Math.max(25, days * 25);
    const focusRatio = Math.min(1, studyMinutes / focusTargetMinutes);
    focusEarned = Math.round(focusRatio * focusMax);

    const rawTotal = habitEarned + taskEarned + goalEarned + focusEarned;
    productivityScore = activeMax > 0 ? Math.min(100, Math.round((rawTotal / activeMax) * 100)) : 0;
  }

  // 7. Daily Trend for charts (up to last 14 days or period days)
  const trendDaysCount = Math.min(days, 14);
  const trendStartDate = addDays(endDate, -(trendDaysCount - 1));
  const dailyTrend: PeriodStats['dailyTrend'] = [];

  const loopDate = parseDateKey(trendStartDate);
  const finishDate = parseDateKey(endDate);

  while (loopDate <= finishDate) {
    const dKey = formatDateKey(loopDate);
    const dayActs = periodActivities.filter((a) => a.date === dKey);
    const dayTasks = periodTasks.filter((t) => t.date === dKey && t.completed);
    const dayLogs = periodLogs.filter((l) => l.date === dKey && l.status === 'completed');

    const dayMins = dayActs.reduce((acc, a) => acc + a.durationMinutes, 0);
    const completedCount = dayTasks.length + dayLogs.length;

    const weekdayShort = loopDate.toLocaleDateString(undefined, { weekday: 'short' });
    const dayNum = loopDate.getDate();

    // Day mini score
    const dayScore = completedCount > 0 || dayMins > 0 ? Math.min(100, completedCount * 20 + Math.round(dayMins / 2)) : 0;

    dailyTrend.push({
      date: dKey,
      dayLabel: `${weekdayShort} ${dayNum}`,
      completedCount,
      studyMinutes: dayMins,
      score: dayScore,
    });

    loopDate.setDate(loopDate.getDate() + 1);
  }

  return {
    period,
    startDate,
    endDate,
    totalTrackedItems,
    completedItems: totalCompletedItems,
    completionRate: overallCompletionRate,
    studyMinutes,
    studyHours,
    studySessions,
    habitsCompleted,
    habitsScheduled,
    habitCompletionRate,
    tasksCompleted,
    tasksScheduled,
    taskCompletionRate,
    goalsActive: activeGoals.length,
    goalsCompleted: completedGoals.length,
    journalEntries: periodJournals.length,
    productivityScore,
    isEmpty,
    scoreBreakdown: {
      habits: { earned: habitEarned, max: 35, rate: habitCompletionRate },
      tasks: { earned: taskEarned, max: 30, rate: taskCompletionRate },
      goals: { earned: goalEarned, max: 20, rate: goalProgressRate },
      focus: { earned: focusEarned, max: 15, minutes: studyMinutes },
    },
    dailyTrend,
    subjectBreakdown,
  };
}
