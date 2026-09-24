import React, { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Habit, HabitLog } from '../../lib/habitService';
import { TaskItem } from '../../lib/taskService';
import { Goal } from '../../lib/goalService';
import { Activity } from '../../lib/activityService';
import { JournalEntry } from '../../lib/journalService';
import { isHabitScheduledForDate } from '../../lib/momentumService';
import {
  CheckCircle2,
  Circle,
  Plus,
  Clock,
  BookOpen,
  Calendar as CalendarIcon,
  Flame,
  Check,
  ChevronRight,
  Sparkles,
  Edit3,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export interface TodayPlanProps {
  todayStr: string;
  habits: Habit[];
  logs: HabitLog[];
  localProgress: Record<string, number>;
  tasks: TaskItem[];
  goals: Goal[];
  activities: Activity[];
  journals: JournalEntry[];
  onToggleHabit: (habit: Habit) => void;
  onIncrementHabit: (habit: Habit) => void;
  onToggleTask: (taskId: string) => void;
  onIncrementGoal: (goalId: string, delta: number) => void;
  onOpenJournalModal: () => void;
}

export const TodayPlan: React.FC<TodayPlanProps> = ({
  todayStr,
  habits,
  logs,
  localProgress,
  tasks,
  goals,
  activities,
  journals,
  onToggleHabit,
  onIncrementHabit,
  onToggleTask,
  onIncrementGoal,
  onOpenJournalModal,
}) => {
  const navigate = useNavigate();

  // 1. Habits scheduled for today
  const scheduledHabits = useMemo(() => {
    return habits.filter((h) => isHabitScheduledForDate(h, todayStr));
  }, [habits, todayStr]);

  // Habit progress mapping
  const habitStatusMap = useMemo(() => {
    const map = new Map<string, { progress: number; isCompleted: boolean; target: number }>();
    for (const h of scheduledHabits) {
      const target = Math.max(1, h.targetValue || 1);
      const todayLog = logs.find((l) => l.habitId === h.id && l.date === todayStr);
      const lp = localProgress[h.id!] || 0;
      let progress = 0;
      if (typeof lp === 'number' && lp > 0) {
        progress = lp;
      } else if (todayLog) {
        progress = typeof todayLog.progressValue === 'number'
          ? todayLog.progressValue
          : todayLog.status === 'completed'
          ? target
          : 0;
      }
      const isCompleted = progress >= target || todayLog?.status === 'completed';
      map.set(h.id!, { progress, isCompleted, target });
    }
    return map;
  }, [scheduledHabits, logs, localProgress, todayStr]);

  // 2. Tasks due today
  const dueTasks = useMemo(() => {
    return tasks.filter((t) => t.date === todayStr && !t.archived);
  }, [tasks, todayStr]);

  // 3. Daily Goals
  const activeDailyGoals = useMemo(() => {
    return goals.filter((g) => g.type === 'daily' && g.status !== 'paused' && g.status !== 'archived');
  }, [goals]);

  // 4. Focus session time today
  const actualFocusMinutes = useMemo(() => {
    return activities
      .filter((a) => a.date === todayStr && a.completionStatus !== 'abandoned')
      .reduce((sum, a) => sum + (a.durationMinutes || 0), 0);
  }, [activities, todayStr]);

  // 5. Journal reflection today
  const todayJournal = useMemo(() => {
    return journals.find((j) => j.date === todayStr);
  }, [journals, todayStr]);

  const hasAnyPlan =
    scheduledHabits.length > 0 ||
    dueTasks.length > 0 ||
    activeDailyGoals.length > 0;

  return (
    <div className="bg-[#12141c] border border-[#1f2433] rounded-[24px] p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-accent-primary" />
          <h2 className="text-base font-bold text-white tracking-tight">Today's Plan</h2>
        </div>
        <span className="text-[11px] font-semibold text-[#7d8495] uppercase tracking-wider">
          Unified Agenda
        </span>
      </div>

      {!hasAnyPlan ? (
        <div className="py-6 text-center text-sm font-medium text-[#7d8495]">
          No planned habits, tasks, or daily goals scheduled for today.
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Scheduled Habits */}
          {scheduledHabits.map((habit) => {
            const status = habitStatusMap.get(habit.id!) || { progress: 0, isCompleted: false, target: 1 };
            const isMeasurable = (habit.targetType !== 'binary' && status.target > 1);

            return (
              <div
                key={`today-plan-habit-${habit.id}`}
                className={cn(
                  'flex items-center justify-between p-3 rounded-2xl border transition-all duration-200',
                  status.isCompleted
                    ? 'bg-[#152316]/60 border-[#254221]/70'
                    : 'bg-[#181a24] border-[#222736] hover:border-[#2f364a]'
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => onToggleHabit(habit)}
                    className="shrink-0 cursor-pointer text-white/70 hover:text-white transition-colors"
                    title={status.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {status.isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-accent-primary fill-accent-primary/20" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#5e6678]" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-sm font-semibold truncate transition-colors',
                        status.isCompleted ? 'text-white/60 line-through' : 'text-white'
                      )}
                    >
                      {habit.name}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-[#7d8495]">
                      <span className="capitalize">{habit.category || 'Habit'}</span>
                      {isMeasurable && (
                        <span>
                          • {status.progress} / {status.target} {habit.targetUnit || 'units'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick actions for measurable habit */}
                {isMeasurable && !status.isCompleted && (
                  <button
                    onClick={() => onIncrementHabit(habit)}
                    className="ml-2 px-2.5 py-1 rounded-lg bg-accent-primary/10 border border-accent-primary/20 hover:bg-accent-primary/20 text-accent-primary text-xs font-semibold cursor-pointer shrink-0 transition-colors"
                  >
                    +1 {habit.targetUnit || ''}
                  </button>
                )}
              </div>
            );
          })}

          {/* Tasks due today */}
          {dueTasks.map((task) => (
            <div
              key={`today-plan-task-${task.id}`}
              className={cn(
                'flex items-center justify-between p-3 rounded-2xl border transition-all duration-200',
                task.completed
                  ? 'bg-[#152316]/60 border-[#254221]/70'
                  : 'bg-[#181a24] border-[#222736] hover:border-[#2f364a]'
              )}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  onClick={() => onToggleTask(task.id)}
                  className="shrink-0 cursor-pointer text-white/70 hover:text-white transition-colors"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-accent-primary fill-accent-primary/20" />
                  ) : (
                    <Circle className="w-5 h-5 text-[#5e6678]" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-sm font-semibold truncate transition-colors',
                      task.completed ? 'text-white/60 line-through' : 'text-white'
                    )}
                  >
                    {task.title}
                  </p>
                  <p className="text-[11px] text-[#7d8495]">Task Due Today</p>
                </div>
              </div>
            </div>
          ))}

          {/* Daily Recurring Goals */}
          {activeDailyGoals.map((goal) => {
            const entry = goal.dailyHistory?.[todayStr];
            const target = Math.max(1, entry?.target ?? goal.dailyTarget ?? goal.target ?? 1);
            const progress = entry?.progress || 0;
            const isCompleted = entry?.completed || progress >= target;

            return (
              <div
                key={`today-plan-goal-${goal.id}`}
                className={cn(
                  'flex items-center justify-between p-3 rounded-2xl border transition-all duration-200',
                  isCompleted
                    ? 'bg-[#152316]/60 border-[#254221]/70'
                    : 'bg-[#181a24] border-[#222736] hover:border-[#2f364a]'
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => onIncrementGoal(goal.id, isCompleted ? -1 : 1)}
                    className="shrink-0 cursor-pointer text-white/70 hover:text-white transition-colors"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-accent-primary fill-accent-primary/20" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#5e6678]" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-sm font-semibold truncate transition-colors',
                        isCompleted ? 'text-white/60 line-through' : 'text-white'
                      )}
                    >
                      {goal.title}
                    </p>
                    <p className="text-[11px] text-[#7d8495]">
                      Goal Target: {progress} / {target} {goal.unit || 'units'}
                    </p>
                  </div>
                </div>

                {!isCompleted && (
                  <button
                    onClick={() => onIncrementGoal(goal.id, 1)}
                    className="ml-2 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 text-sky-400 text-xs font-semibold cursor-pointer shrink-0 transition-colors"
                  >
                    +1 {goal.unit || ''}
                  </button>
                )}
              </div>
            );
          })}

          {/* Focus Time Status */}
          <div
            onClick={() => navigate('/activity')}
            className="flex items-center justify-between p-3 rounded-2xl bg-[#181a24] border border-[#222736] hover:border-sky-500/30 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-5 h-5 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors">
                  Focus & Deep Work
                </p>
                <p className="text-[11px] text-[#7d8495]">
                  {actualFocusMinutes > 0 ? `${actualFocusMinutes} minutes completed today` : 'Start today’s focus timer'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#5e6678] group-hover:text-white transition-colors" />
          </div>

          {/* Daily Journal Reflection */}
          <div
            onClick={onOpenJournalModal}
            className={cn(
              'flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer group',
              todayJournal
                ? 'bg-[#152316]/60 border-[#254221]/70'
                : 'bg-[#181a24] border-[#222736] hover:border-amber-500/30'
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              {todayJournal ? (
                <CheckCircle2 className="w-5 h-5 text-accent-primary fill-accent-primary/20 shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                  <Edit3 className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors truncate">
                  {todayJournal ? 'Daily Reflection Written' : 'Write Daily Reflection'}
                </p>
                <p className="text-[11px] text-[#7d8495] truncate">
                  {todayJournal ? todayJournal.title || 'Entry recorded' : 'Record thoughts & momentum'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#5e6678] group-hover:text-white transition-colors shrink-0" />
          </div>
        </div>
      )}
    </div>
  );
};
