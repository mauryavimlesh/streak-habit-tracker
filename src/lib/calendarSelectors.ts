import { TaskItem } from './taskService';
import { Habit, HabitLog } from './habitService';
import { Activity } from './activityService';
import { Goal } from './goalService';
import { JournalEntry } from './journalService';
import { getUnifiedActivitiesForDate } from './unifiedActivityService';

export interface DayActivityStats {
  eventCount: number;
  meetingCount: number;
  standardTaskCount: number;
  completedCount: number;
  totalItemsCount: number;
  totalFocusMinutes: number;
  hasGoalActivities: boolean;
  streakScore: number;
}

export interface DayDataResult {
  dateKey: string;
  tasks: TaskItem[];
  completedLogs: HabitLog[];
  activities: Activity[];
  journals: JournalEntry[];
  stats: DayActivityStats;
}

export interface CalendarDataIndex {
  tasksByDate: Map<string, TaskItem[]>;
  completedLogsByDate: Map<string, HabitLog[]>;
  activitiesByDate: Map<string, Activity[]>;
  journalsByDate: Map<string, JournalEntry[]>;
  habitsById: Map<string, Habit>;
  focusMinutesByDate: Map<string, number>;
  goalDatesSet: Set<string>;
  taskDatesMap: Record<
    string,
    { count: number; completedCount: number; hasHighPriority: boolean }
  >;
  dayCache: Map<string, DayDataResult>;
  habits: Habit[];
  goals: Goal[];
}

/**
 * Builds a high-performance indexed registry of all calendar-related data.
 * Computed once per collection update, allowing all subsequent day navigations
 * to query in instant O(1) time.
 */
export function buildCalendarDataIndex(params: {
  tasks: TaskItem[];
  habits: Habit[];
  logs: HabitLog[];
  activities: Activity[];
  goals: Goal[];
  journals: JournalEntry[];
}): CalendarDataIndex {
  const { tasks, habits, logs, activities, goals, journals } = params;

  const tasksByDate = new Map<string, TaskItem[]>();
  const completedLogsByDate = new Map<string, HabitLog[]>();
  const activitiesByDate = new Map<string, Activity[]>();
  const journalsByDate = new Map<string, JournalEntry[]>();
  const habitsById = new Map<string, Habit>();
  const focusMinutesByDate = new Map<string, number>();
  const goalDatesSet = new Set<string>();
  const taskDatesMap: Record<
    string,
    { count: number; completedCount: number; hasHighPriority: boolean }
  > = {};

  // Index Habits
  for (const h of habits) {
    if (h.id) habitsById.set(h.id, h);
  }

  // Index Tasks
  for (const t of tasks) {
    if (!t.date) continue;
    const list = tasksByDate.get(t.date);
    if (list) list.push(t);
    else tasksByDate.set(t.date, [t]);

    if (!taskDatesMap[t.date]) {
      taskDatesMap[t.date] = { count: 0, completedCount: 0, hasHighPriority: false };
    }
    taskDatesMap[t.date].count += 1;
    if (t.completed) {
      taskDatesMap[t.date].completedCount += 1;
    }
    if (t.priority === 'high' && !t.completed) {
      taskDatesMap[t.date].hasHighPriority = true;
    }
  }

  // Index Habit Logs (only completed logs affect indicators and streak stats)
  for (const l of logs) {
    if (!l.date) continue;
    if (l.status === 'completed') {
      const list = completedLogsByDate.get(l.date);
      if (list) list.push(l);
      else completedLogsByDate.set(l.date, [l]);

      if (!taskDatesMap[l.date]) {
        taskDatesMap[l.date] = { count: 0, completedCount: 0, hasHighPriority: false };
      }
      taskDatesMap[l.date].count += 1;
      taskDatesMap[l.date].completedCount += 1;
    }
  }

  // Index Activities
  for (const a of activities) {
    if (!a.date) continue;
    const list = activitiesByDate.get(a.date);
    if (list) list.push(a);
    else activitiesByDate.set(a.date, [a]);

    const dur = a.durationMinutes || 0;
    focusMinutesByDate.set(a.date, (focusMinutesByDate.get(a.date) || 0) + dur);

    if (!taskDatesMap[a.date]) {
      taskDatesMap[a.date] = { count: 0, completedCount: 0, hasHighPriority: false };
    }
    taskDatesMap[a.date].count += 1;
    taskDatesMap[a.date].completedCount += 1;
  }

  // Index Journals
  for (const j of journals) {
    if (!j.date) continue;
    const list = journalsByDate.get(j.date);
    if (list) list.push(j);
    else journalsByDate.set(j.date, [j]);
  }

  // Index Goal Activity Dates
  for (const g of goals) {
    if (g.dailyHistory) {
      for (const [dateStr, hist] of Object.entries(g.dailyHistory)) {
        if (hist?.activities && hist.activities.length > 0) {
          goalDatesSet.add(dateStr);
        }
      }
    }
  }

  return {
    tasksByDate,
    completedLogsByDate,
    activitiesByDate,
    journalsByDate,
    habitsById,
    focusMinutesByDate,
    goalDatesSet,
    taskDatesMap,
    dayCache: new Map(),
    habits,
    goals,
  };
}

/**
 * O(1) Selector for all day-specific calendar data.
 * Cached lazily so repeat inspections during navigation take instantaneous constant time.
 */
export function selectDayData(index: CalendarDataIndex, dateKey: string): DayDataResult {
  const cached = index.dayCache.get(dateKey);
  if (cached) return cached;

  const dayTasks = index.tasksByDate.get(dateKey) || [];
  const dayLogs = index.completedLogsByDate.get(dateKey) || [];
  const dayActivities = index.activitiesByDate.get(dateKey) || [];
  const dayJournals = index.journalsByDate.get(dateKey) || [];
  const totalFocusMinutes = index.focusMinutesByDate.get(dateKey) || 0;
  const hasGoalActivities = index.goalDatesSet.has(dateKey);

  let eventCount = 0;
  let meetingCount = 0;
  let standardTaskCount = 0;
  let completedCount = 0;

  for (const t of dayTasks) {
    if (t.type === 'event') eventCount++;
    else if (t.type === 'meeting') meetingCount++;
    else standardTaskCount++;

    if (t.completed) completedCount++;
  }

  const unified = getUnifiedActivitiesForDate(dateKey, {
    habits: index.habits,
    logs: dayLogs,
    tasks: dayTasks,
    goals: index.goals,
    activities: dayActivities,
    journals: dayJournals,
  });

  const streakScore =
    unified.length === 0
      ? 0
      : Math.min(100, Math.round((unified.filter((u) => u.completed).length / unified.length) * 100));

  const stats: DayActivityStats = {
    eventCount,
    meetingCount,
    standardTaskCount,
    completedCount,
    totalItemsCount: eventCount + meetingCount + standardTaskCount + dayLogs.length + dayActivities.length,
    totalFocusMinutes,
    hasGoalActivities,
    streakScore,
  };

  const result: DayDataResult = {
    dateKey,
    tasks: dayTasks,
    completedLogs: dayLogs,
    activities: dayActivities,
    journals: dayJournals,
    stats,
  };

  index.dayCache.set(dateKey, result);
  return result;
}
