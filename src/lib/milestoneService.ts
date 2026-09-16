import { readLocalHabits, readLocalLogs } from './habitService';
import { readLocalTasks } from './taskService';
import { readLocalGoals, calculateGoalStreak } from './goalService';
import { readLocalJournal } from './journalService';
import { getLocalActivities } from './activityService';

export interface MilestoneItem {
  id: string;
  title: string;
  description: string;
  category: 'streak' | 'study' | 'tasks' | 'focus' | 'journal';
  icon: string;
  threshold: number;
  currentValue: number;
  unit: string;
  isUnlocked: boolean;
  unlockedAt?: string;
}

const UNLOCKED_MILESTONES_KEY = 'streak_unlocked_milestones_v1';

export function getStoredUnlockedMilestoneIds(): Record<string, string> {
  try {
    const raw = localStorage.getItem(UNLOCKED_MILESTONES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredUnlockedMilestone(id: string, dateStr: string) {
  const current = getStoredUnlockedMilestoneIds();
  current[id] = dateStr;
  localStorage.setItem(UNLOCKED_MILESTONES_KEY, JSON.stringify(current));
}

export function calculateRealMilestones(): {
  milestones: MilestoneItem[];
  unlockedCount: number;
  newlyUnlocked: MilestoneItem[];
} {
  const habits = readLocalHabits();
  const logs = readLocalLogs();
  const tasks = readLocalTasks();
  const goals = readLocalGoals();
  const journals = readLocalJournal();
  const activities = getLocalActivities();

  // 1. Max Streak
  let maxStreak = 0;
  for (const h of habits) {
    const habitLogs = logs.filter((l) => l.habitId === h.id && l.status === 'completed');
    const uDates = [...new Set<string>(habitLogs.map((l) => l.date))].sort();
    let temp = 0;
    let best = 0;
    let prev: string | null = null;
    for (const d of uDates) {
      if (!prev) temp = 1;
      else {
        const diff = Math.floor((new Date(d).getTime() - new Date(prev).getTime()) / 86400000);
        if (diff === 1) temp++;
        else temp = 1;
      }
      if (temp > best) best = temp;
      prev = d;
    }
    if (best > maxStreak) maxStreak = best;
  }
  for (const g of goals) {
    const streakData = calculateGoalStreak(g);
    if (streakData.currentStreak > maxStreak) maxStreak = streakData.currentStreak;
    if (streakData.bestStreak > maxStreak) maxStreak = streakData.bestStreak;
  }

  // 2. Lectures & Study Goal activities completed
  let totalLecturesCompleted = 0;
  for (const g of goals) {
    if (g.dailyHistory) {
      for (const day of Object.values(g.dailyHistory)) {
        if (day.activities) {
          for (const act of day.activities) {
            if (act.completed) {
              totalLecturesCompleted++;
            }
          }
        }
      }
    }
  }

  // 3. Completed Tasks
  const completedTasksCount = tasks.filter((t) => t.completed).length;

  // 4. Focus Hours
  const totalFocusMinutes = activities.reduce((sum, a) => sum + (a.durationMinutes || 0), 0);
  const totalFocusHours = Math.floor(totalFocusMinutes / 60);

  // 5. Journal Entries
  const totalJournalEntries = journals.length;

  const storedUnlocked = getStoredUnlockedMilestoneIds();
  const todayStr = new Date().toLocaleDateString('en-CA');
  const newlyUnlocked: MilestoneItem[] = [];

  const rawMilestonesDef = [
    {
      id: 'streak_7',
      title: '7 Day Streak',
      description: 'Maintained relentless daily discipline for one full week.',
      category: 'streak' as const,
      icon: 'Flame',
      threshold: 7,
      currentValue: maxStreak,
      unit: 'days',
    },
    {
      id: 'streak_21',
      title: '21 Day Habit Master',
      description: 'Habits are now deeply etched into your daily neurological wiring.',
      category: 'streak' as const,
      icon: 'Sparkles',
      threshold: 21,
      currentValue: maxStreak,
      unit: 'days',
    },
    {
      id: 'streak_50',
      title: '50 Day Unstoppable',
      description: 'A monument of consistency. You are in the top 1% of disciplined achievers.',
      category: 'streak' as const,
      icon: 'Award',
      threshold: 50,
      currentValue: maxStreak,
      unit: 'days',
    },
    {
      id: 'lectures_50',
      title: '50 Study Targets Completed',
      description: 'Crushed 50 scheduled lectures, practice papers, and revision blocks.',
      category: 'study' as const,
      icon: 'BookOpen',
      threshold: 50,
      currentValue: totalLecturesCompleted,
      unit: 'lectures',
    },
    {
      id: 'tasks_100',
      title: '100 Tasks Crushed',
      description: 'Closed out 100 scheduled productivity tasks and to-dos.',
      category: 'tasks' as const,
      icon: 'CheckCircle2',
      threshold: 100,
      currentValue: completedTasksCount,
      unit: 'tasks',
    },
    {
      id: 'focus_25',
      title: '25 Focus Hours',
      description: 'Logged 25 full hours of deep, distraction-free focus timer sessions.',
      category: 'focus' as const,
      icon: 'Clock',
      threshold: 25,
      currentValue: totalFocusHours,
      unit: 'hours',
    },
    {
      id: 'journal_30',
      title: '30 Journal Entries',
      description: 'Recorded 30 days of mindful reflections and mental self-awareness.',
      category: 'journal' as const,
      icon: 'Book',
      threshold: 30,
      currentValue: totalJournalEntries,
      unit: 'entries',
    },
  ];

  const milestones: MilestoneItem[] = rawMilestonesDef.map((def) => {
    const isUnlocked = def.currentValue >= def.threshold;
    let unlockedAt = storedUnlocked[def.id];

    if (isUnlocked && !unlockedAt) {
      unlockedAt = todayStr;
      saveStoredUnlockedMilestone(def.id, todayStr);
      newlyUnlocked.push({
        ...def,
        isUnlocked: true,
        unlockedAt,
      });
    }

    return {
      ...def,
      isUnlocked,
      unlockedAt,
    };
  });

  const unlockedCount = milestones.filter((m) => m.isUnlocked).length;

  return {
    milestones,
    unlockedCount,
    newlyUnlocked,
  };
}
