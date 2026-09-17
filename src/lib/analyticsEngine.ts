import { Habit, HabitLog } from './habitService';
import { TaskItem } from './taskService';
import { Goal } from './goalService';
import { Activity } from './activityService';
import { addDays, diffDays } from './dateUtils';
import { calculateStreakStats, StreakStats } from './streakEngine';
import { calculateGoalProgress } from './goalProgressEngine';

export type AnalyticsTimeframe = 'today' | '7days' | '30days' | 'this_month' | 'all_time';

export interface DateRangeResult {
  startDate: string;
  endDate: string;
  dateList: string[];
}

export function computeTimeframeDateRange(
  timeframe: AnalyticsTimeframe,
  todayStr: string
): DateRangeResult {
  let start = todayStr;
  let end = todayStr;
  const list: string[] = [];

  if (timeframe === 'today') {
    start = todayStr;
    end = todayStr;
    list.push(todayStr);
  } else if (timeframe === '7days') {
    start = addDays(todayStr, -6);
    end = todayStr;
    for (let i = 0; i < 7; i++) {
      list.push(addDays(start, i));
    }
  } else if (timeframe === '30days') {
    start = addDays(todayStr, -29);
    end = todayStr;
    for (let i = 0; i < 30; i++) {
      list.push(addDays(start, i));
    }
  } else if (timeframe === 'this_month') {
    start = `${todayStr.slice(0, 7)}-01`;
    end = todayStr;
    const daysCount = parseInt(todayStr.split('-')[2], 10);
    for (let i = 0; i < daysCount; i++) {
      list.push(addDays(start, i));
    }
  } else {
    // all_time
    start = '1970-01-01';
    end = '9999-12-31';
    for (let i = 13; i >= 0; i--) {
      list.push(addDays(todayStr, -i));
    }
  }

  return { startDate: start, endDate: end, dateList: list };
}

export function isDateInTimeframe(
  dateStr: string | undefined,
  timeframe: AnalyticsTimeframe,
  startDate: string,
  endDate: string,
  todayStr: string
): boolean {
  if (!dateStr) return false;
  const d = dateStr.split('T')[0];
  if (timeframe === 'all_time') return true;
  if (timeframe === 'today') return d === todayStr;
  return d >= startDate && d <= endDate;
}

export interface TrendDataPoint {
  date: string;
  label: string;
  completions: number;
  habits: number;
  tasks: number;
  focusMins: number;
}

export function computeTrendData(
  dateList: string[],
  logs: HabitLog[],
  tasks: TaskItem[],
  activities: Activity[],
  timeframe: AnalyticsTimeframe
): TrendDataPoint[] {
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return dateList.map((dateKey) => {
    const dateLogs = logs.filter((l) => l.date?.split('T')[0] === dateKey && l.status === 'completed');
    const dateTasks = tasks.filter((t) => t.date?.split('T')[0] === dateKey && t.completed);
    const dateActs = activities.filter((a) => a.date?.split('T')[0] === dateKey);
    const focusMins = dateActs.reduce(
      (acc, a) => acc + a.durationMinutes + Math.round((a.durationSeconds || 0) / 60),
      0
    );

    const parts = dateKey.split('-');
    const monthNum = parseInt(parts[1], 10);
    const dayNum = parseInt(parts[2], 10);
    const displayLabel =
      timeframe === '7days' || timeframe === 'today'
        ? `${shortMonths[monthNum - 1]} ${dayNum}`
        : `${dayNum}`;

    return {
      date: dateKey,
      label: displayLabel,
      completions: dateLogs.length + dateTasks.length,
      habits: dateLogs.length,
      tasks: dateTasks.length,
      focusMins,
    };
  });
}

export interface ProductivityScoreResult {
  total: number;
  breakdown: {
    goals: { earned: number; max: number };
    habits: { earned: number; max: number };
    tasks: { earned: number; max: number };
    focus: { earned: number; max: number };
  };
}

export function computeProductivityScore(
  habits: Habit[],
  goals: Goal[],
  tasks: TaskItem[],
  activities: Activity[],
  logs: HabitLog[],
  timeframe: AnalyticsTimeframe,
  todayStr: string
): ProductivityScoreResult {
  const activeHabitsList = habits.filter((h) => !h.archived);
  const activeDailyGoals = goals.filter((g) => g.type === 'daily' && g.status !== 'archived');

  const { startDate, endDate, dateList } = computeTimeframeDateRange(timeframe, todayStr);

  const isIncluded = (d?: string) => isDateInTimeframe(d, timeframe, startDate, endDate, todayStr);

  const filteredLogs = logs.filter((l) => isIncluded(l.date));
  const filteredTasks = tasks.filter((t) => {
    if (timeframe === 'all_time') return true;
    if (!t.date) return timeframe === 'today';
    return isIncluded(t.date);
  });
  const filteredActs = activities.filter((a) => isIncluded(a.date));

  // 1. Habits (30 pts max)
  let habitsPts = 0;
  if (activeHabitsList.length > 0) {
    const completedLogs = filteredLogs.filter((l) => l.status === 'completed');
    const daysInTimeframe =
      timeframe === 'today'
        ? 1
        : timeframe === '7days'
        ? 7
        : timeframe === '30days'
        ? 30
        : timeframe === 'this_month'
        ? parseInt(todayStr.split('-')[2], 10)
        : Math.max(1, new Set(logs.map((l) => l.date?.split('T')[0])).size);

    const expected = activeHabitsList.length * daysInTimeframe;
    if (expected > 0 && completedLogs.length > 0) {
      habitsPts = Math.min(30, Math.round((completedLogs.length / expected) * 30));
    }
  }

  // 2. Tasks (25 pts max)
  let tasksPts = 0;
  if (filteredTasks.length > 0) {
    const completedTasks = filteredTasks.filter((t) => t.completed);
    if (completedTasks.length > 0) {
      tasksPts = Math.round((completedTasks.length / filteredTasks.length) * 25);
    }
  }

  // 3. Goals (25 pts max)
  let goalsPts = 0;
  if (activeDailyGoals.length > 0) {
    let completedEntries = 0;
    let totalEntries = 0;

    activeDailyGoals.forEach((g) => {
      if (timeframe === 'today') {
        totalEntries++;
        const p = calculateGoalProgress(g, todayStr);
        if (p.isTodayComplete) completedEntries++;
      } else {
        const hist = (g.dailyHistory || {}) as Record<string, { completed?: boolean; progress?: number; target?: number }>;
        Object.entries(hist).forEach(([date, entry]) => {
          if (isIncluded(date)) {
            totalEntries++;
            if (entry.completed || (entry.progress !== undefined && entry.progress >= (entry.target || g.dailyTarget || 1))) {
              completedEntries++;
            }
          }
        });
      }
    });

    if (totalEntries > 0 && completedEntries > 0) {
      goalsPts = Math.min(25, Math.round((completedEntries / totalEntries) * 25));
    }
  }

  // 4. Focus minutes (20 pts max)
  let focusPts = 0;
  const totalFocusMins = filteredActs.reduce(
    (acc, a) => acc + a.durationMinutes + Math.round((a.durationSeconds || 0) / 60),
    0
  );
  if (totalFocusMins > 0) {
    const daysCount = timeframe === 'today' ? 1 : dateList.length;
    const avgDailyFocus = totalFocusMins / Math.max(1, daysCount);
    focusPts = Math.min(20, Math.round((avgDailyFocus / 50) * 20));
  }

  const hasAnyTrackedItems =
    activeHabitsList.length > 0 || tasks.length > 0 || goals.length > 0 || activities.length > 0;

  if (!hasAnyTrackedItems || (habitsPts === 0 && tasksPts === 0 && goalsPts === 0 && focusPts === 0)) {
    return {
      total: 0,
      breakdown: {
        goals: { earned: 0, max: 25 },
        habits: { earned: 0, max: 30 },
        tasks: { earned: 0, max: 25 },
        focus: { earned: 0, max: 20 },
      },
    };
  }

  const total = Math.min(100, Math.max(0, habitsPts + tasksPts + goalsPts + focusPts));

  return {
    total,
    breakdown: {
      goals: { earned: goalsPts, max: 25 },
      habits: { earned: habitsPts, max: 30 },
      tasks: { earned: tasksPts, max: 25 },
      focus: { earned: focusPts, max: 20 },
    },
  };
}
