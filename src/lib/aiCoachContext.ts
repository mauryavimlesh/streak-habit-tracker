import { readLocalHabits, readLocalLogs, Habit, HabitLog } from './habitService';
import { readLocalTasks, TaskItem } from './taskService';
import { readLocalGoals, Goal, getDailyGoalDetailedStats } from './goalService';
import { getLocalActivities, Activity } from './activityService';
import { readLocalJournal, JournalEntry } from './journalService';
import { calculateDailyMomentum, MomentumResult, isHabitScheduledForDate } from './momentumService';
import { getTodayDateKey, addDays } from './dateUtils';

export interface StructuredAICoachContext {
  user: {
    userName: string;
    todayDate: string;
  };
  today: {
    momentumScore: number;
    momentumState: string;
    isZeroPlanDay: boolean;
    plannedItemsCount: number;
    completedItemsCount: number;
    remainingItemsCount: number;
    breakdown: {
      habits: { completed: number; target: number; score: number };
      tasks: { completed: number; target: number; score: number };
      goals: { completed: number; target: number; score: number };
      focus: { completedMinutes: number; targetMinutes: number; score: number };
    };
    plannedItemsSummary: string[];
    completedItemsSummary: string[];
    remainingItemsSummary: string[];
  };
  habits: {
    activeHabitsCount: number;
    todayCompletedCount: number;
    todayScheduledCount: number;
    currentOverallStreak: number;
    longestOverallStreak: number;
    recent7DaysCompletionRate: number;
    habitList: Array<{
      name: string;
      category: string;
      target: number;
      unit: string;
      currentStreak: number;
      completedToday: boolean;
    }>;
  };
  tasks: {
    completedToday: number;
    pendingToday: number;
    overdueCount: number;
    recent7DaysCompletionRate: number;
    overdueTaskTitles: string[];
    dueTodayTaskTitles: string[];
  };
  goals: Array<{
    title: string;
    type: string;
    dailyTarget: number;
    unit: string;
    todayProgress: number;
    todayCompleted: boolean;
    completedTargetDays: number;
    totalTrackedDays: number;
    consistencyRate: number;
    currentStreak: number;
    longestStreak: number;
    deadline?: string;
    lastActiveDate?: string;
  }>;
  focus: {
    todayMinutes: number;
    weeklyMinutes: number;
    monthlyMinutes: number;
    averageSessionMinutes: number;
    totalSessionsCount: number;
  };
  journal: {
    totalEntriesCount: number;
    hasEntryToday: boolean;
    recentEntries: Array<{
      date: string;
      mood?: string;
      productivityRating?: number;
      momentum?: number;
      snippet: string;
    }>;
  };
  calendar: {
    recent7DaysActivitySummary: Array<{
      date: string;
      activitiesCount: number;
      totalFocusMinutes: number;
    }>;
  };
}

export function buildAICoachContext(userName: string = 'User'): StructuredAICoachContext {
  const todayStr = getTodayDateKey();
  const habits = readLocalHabits();
  const logs = readLocalLogs();
  const tasks = readLocalTasks();
  const goals = readLocalGoals();
  const activities = getLocalActivities();
  const journals = readLocalJournal();

  // 1. Calculate deterministic Momentum for today
  const momentum = calculateDailyMomentum({
    dateStr: todayStr,
    habits,
    logs,
    tasks,
    goals,
    activities,
    plannedFocusMinutes: 120,
  });

  // Scheduled habits today
  const scheduledHabits = habits.filter((h) => isHabitScheduledForDate(h, todayStr));
  const dueTasks = tasks.filter((t) => t.date === todayStr && !t.isArchived && !t.archivedAt);
  const activeDailyGoals = goals.filter((g) => g.type === 'daily' && g.status !== 'paused' && g.status !== 'archived');

  const plannedItemsSummary: string[] = [];
  const completedItemsSummary: string[] = [];
  const remainingItemsSummary: string[] = [];

  for (const h of scheduledHabits) {
    const todayLog = logs.find((l) => l.habitId === h.id && l.date === todayStr);
    const target = Math.max(1, h.targetValue || 1);
    const progress = todayLog?.progressValue ?? (todayLog?.status === 'completed' ? target : 0);
    const done = todayLog?.status === 'completed' || progress >= target;
    const desc = `Habit: ${h.name} (${progress}/${target} ${h.targetUnit || 'units'})`;
    plannedItemsSummary.push(desc);
    if (done) completedItemsSummary.push(desc);
    else remainingItemsSummary.push(desc);
  }

  for (const t of dueTasks) {
    const desc = `Task: ${t.title}`;
    plannedItemsSummary.push(desc);
    if (t.completed) completedItemsSummary.push(desc);
    else remainingItemsSummary.push(desc);
  }

  for (const g of activeDailyGoals) {
    const dayEntry = g.dailyHistory?.[todayStr];
    const target = Math.max(1, dayEntry?.target ?? g.dailyTarget ?? g.target ?? 1);
    const progress = dayEntry?.progress || 0;
    const done = dayEntry?.completed || progress >= target;
    const desc = `Goal: ${g.title} (${progress}/${target} ${g.unit || 'units'})`;
    plannedItemsSummary.push(desc);
    if (done) completedItemsSummary.push(desc);
    else remainingItemsSummary.push(desc);
  }

  // Habits statistics
  let maxHabitStreak = 0;
  let bestHabitStreak = 0;
  for (const h of habits) {
    const streak = (h as any).streak || 0;
    const best = (h as any).bestStreak || 0;
    if (streak > maxHabitStreak) maxHabitStreak = streak;
    if (best > bestHabitStreak) bestHabitStreak = best;
  }

  // 7-day habit completion rate
  let last7HabitOpportunities = 0;
  let last7HabitCompletions = 0;
  for (let i = 0; i < 7; i++) {
    const dStr = addDays(todayStr, -i);
    const daysHabits = habits.filter((h) => isHabitScheduledForDate(h, dStr));
    last7HabitOpportunities += daysHabits.length;
    for (const h of daysHabits) {
      const log = logs.find((l) => l.habitId === h.id && l.date === dStr);
      if (log?.status === 'completed') last7HabitCompletions++;
    }
  }
  const recent7DaysHabitRate = last7HabitOpportunities > 0
    ? Math.round((last7HabitCompletions / last7HabitOpportunities) * 100)
    : 0;

  // Tasks statistics
  const overdueTasks = tasks.filter((t) => t.date && t.date < todayStr && !t.completed && !t.isArchived && !t.archivedAt);
  const completedTodayTasks = dueTasks.filter((t) => t.completed).length;
  const pendingTodayTasks = dueTasks.filter((t) => !t.completed).length;

  const past7Tasks = tasks.filter((t) => t.date && t.date >= addDays(todayStr, -7) && t.date <= todayStr && !t.isArchived && !t.archivedAt);
  const past7TasksCompleted = past7Tasks.filter((t) => t.completed).length;
  const recent7DaysTaskRate = past7Tasks.length > 0
    ? Math.round((past7TasksCompleted / past7Tasks.length) * 100)
    : 0;

  // Focus statistics
  const todayFocusActivities = activities.filter((a) => a.date === todayStr && a.completionStatus !== 'abandoned');
  const todayFocusMinutes = todayFocusActivities.reduce((s, a) => s + (a.durationMinutes || 0), 0);

  const weekAgoStr = addDays(todayStr, -7);
  const weeklyFocusMinutes = activities
    .filter((a) => a.date >= weekAgoStr && a.date <= todayStr && a.completionStatus !== 'abandoned')
    .reduce((s, a) => s + (a.durationMinutes || 0), 0);

  const monthAgoStr = addDays(todayStr, -30);
  const monthlyFocusMinutes = activities
    .filter((a) => a.date >= monthAgoStr && a.date <= todayStr && a.completionStatus !== 'abandoned')
    .reduce((s, a) => s + (a.durationMinutes || 0), 0);

  const completedSessions = activities.filter((a) => a.completionStatus !== 'abandoned');
  const totalSessionMinutes = completedSessions.reduce((s, a) => s + (a.durationMinutes || 0), 0);
  const averageSessionMinutes = completedSessions.length > 0
    ? Math.round(totalSessionMinutes / completedSessions.length)
    : 0;

  // Journal statistics
  const recentJournals = journals.slice(0, 5).map((j) => ({
    date: j.date,
    mood: j.mood,
    productivityRating: j.productivityRating,
    momentum: j.momentum,
    snippet: (j.text || j.content || '').substring(0, 140),
  }));

  // Calendar 7-day activity overview
  const recent7DaysCalendar = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(todayStr, -i);
    const dayActs = activities.filter((a) => a.date === d);
    recent7DaysCalendar.push({
      date: d,
      activitiesCount: dayActs.length,
      totalFocusMinutes: dayActs.reduce((s, a) => s + (a.durationMinutes || 0), 0),
    });
  }

  // Goal detailed stats
  const goalSummaries = goals.map((g) => {
    const detailed = getDailyGoalDetailedStats(g, todayStr);
    const dayEntry = g.dailyHistory?.[todayStr];
    return {
      title: g.title,
      type: g.type,
      dailyTarget: g.dailyTarget || g.target || 1,
      unit: g.unit || 'units',
      todayProgress: dayEntry?.progress || 0,
      todayCompleted: dayEntry?.completed || false,
      completedTargetDays: detailed.daysTargetCompleted,
      totalTrackedDays: detailed.totalDaysTracked,
      consistencyRate: detailed.overallCompletionPercentage,
      currentStreak: detailed.currentStreak,
      longestStreak: detailed.longestStreak,
      deadline: (g as any).deadline || (g as any).endDate,
      lastActiveDate: detailed.lastActiveDate || undefined,
    };
  });

  return {
    user: {
      userName,
      todayDate: todayStr,
    },
    today: {
      momentumScore: momentum.score,
      momentumState: momentum.stateMessage,
      isZeroPlanDay: momentum.isZeroPlanDay,
      plannedItemsCount: plannedItemsSummary.length,
      completedItemsCount: completedItemsSummary.length,
      remainingItemsCount: remainingItemsSummary.length,
      breakdown: {
        habits: {
          completed: momentum.breakdown.habits.completed,
          target: momentum.breakdown.habits.target,
          score: momentum.breakdown.habits.score,
        },
        tasks: {
          completed: momentum.breakdown.tasks.completed,
          target: momentum.breakdown.tasks.target,
          score: momentum.breakdown.tasks.score,
        },
        goals: {
          completed: momentum.breakdown.goals.completed,
          target: momentum.breakdown.goals.target,
          score: momentum.breakdown.goals.score,
        },
        focus: {
          completedMinutes: momentum.breakdown.focus.completed,
          targetMinutes: momentum.breakdown.focus.target,
          score: momentum.breakdown.focus.score,
        },
      },
      plannedItemsSummary,
      completedItemsSummary,
      remainingItemsSummary,
    },
    habits: {
      activeHabitsCount: habits.filter((h) => !h.archived).length,
      todayCompletedCount: momentum.breakdown.habits.completed,
      todayScheduledCount: momentum.breakdown.habits.target,
      currentOverallStreak: maxHabitStreak,
      longestOverallStreak: Math.max(bestHabitStreak, maxHabitStreak),
      recent7DaysCompletionRate: recent7DaysHabitRate,
      habitList: habits.map((h) => {
        const todayLog = logs.find((l) => l.habitId === h.id && l.date === todayStr);
        const target = Math.max(1, h.targetValue || 1);
        const progress = todayLog?.progressValue ?? (todayLog?.status === 'completed' ? target : 0);
        return {
          name: h.name,
          category: h.category || 'General',
          target,
          unit: h.targetUnit || 'units',
          currentStreak: (h as any).streak || 0,
          completedToday: todayLog?.status === 'completed' || progress >= target,
        };
      }),
    },
    tasks: {
      completedToday: completedTodayTasks,
      pendingToday: pendingTodayTasks,
      overdueCount: overdueTasks.length,
      recent7DaysCompletionRate: recent7DaysTaskRate,
      overdueTaskTitles: overdueTasks.map((t) => t.title),
      dueTodayTaskTitles: dueTasks.map((t) => t.title),
    },
    goals: goalSummaries,
    focus: {
      todayMinutes: todayFocusMinutes,
      weeklyMinutes: weeklyFocusMinutes,
      monthlyMinutes: monthlyFocusMinutes,
      averageSessionMinutes,
      totalSessionsCount: completedSessions.length,
    },
    journal: {
      totalEntriesCount: journals.length,
      hasEntryToday: journals.some((j) => j.date === todayStr),
      recentEntries: recentJournals,
    },
    calendar: {
      recent7DaysActivitySummary: recent7DaysCalendar,
    },
  };
}
