import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { TaskItem } from '../../lib/taskService';
import { TaskItemCard } from './TaskItemCard';
import {
  CloudRain,
  Navigation,
  Plus,
  Moon,
  Zap,
  Flame,
  Calendar as CalendarIcon,
  Users,
  CheckSquare,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Book,
  Play,
  FastForward,
  ExternalLink,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Habit, HabitLog } from '../../lib/habitService';
import { Activity } from '../../lib/activityService';
import { Goal, rescheduleGoalActivity, updateGoalActivity } from '../../lib/goalService';
import { JournalEntry } from '../../lib/journalService';
import { createGoogleCalendarEventUrl, downloadICSFile } from '../../lib/googleCalendarService';
import { formatDateKey, formatDisplayDate } from '../../lib/dateUtils';

interface DayScheduleProps {
  habits?: Habit[];
  logs?: HabitLog[];
  activities?: Activity[];
  goals?: Goal[];
  journals?: JournalEntry[];
  selectedDate: Date;
  tasks: TaskItem[];
  onToggleTask: (taskId: string) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTaskProgress?: (taskId: string, newQuantity: number) => void;
  onOpenAddModal: (type?: 'task' | 'meeting' | 'event' | 'reminder') => void;
  streakScore?: number;
}

export function DaySchedule({
  habits = [],
  logs = [],
  activities = [],
  goals = [],
  journals = [],
  selectedDate,
  tasks,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onUpdateTaskProgress,
  onOpenAddModal,
  streakScore = 68,
}: DayScheduleProps) {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<'all' | 'task' | 'meeting' | 'event'>('all');
  const [feedbackLiked, setFeedbackLiked] = useState<boolean | null>(null);

  const selectedDateStr = useMemo(() => formatDateKey(selectedDate), [selectedDate]);

  // Fast O(1) Habit lookup
  const habitsMap = useMemo(() => {
    const map = new Map<string, Habit>();
    for (const h of habits) {
      if (h.id) map.set(h.id, h);
    }
    return map;
  }, [habits]);

  // Aggregate day items cleanly with memoization
  const { dayLogs, dayActivities, dayJournals, totalFocusMinutes } = useMemo(() => {
    const dLogs = logs.filter((l) => l.date === selectedDateStr && l.status === 'completed');
    const dActs = activities.filter((a) => a.date === selectedDateStr);
    const dJournals = journals.filter((j) => j.date === selectedDateStr);
    const focusMins = dActs.reduce((acc, a) => acc + (a.durationMinutes || 0), 0);
    return {
      dayLogs: dLogs,
      dayActivities: dActs,
      dayJournals: dJournals,
      totalFocusMinutes: focusMins,
    };
  }, [logs, activities, journals, selectedDateStr]);

  // Group items by type
  const { eventCount, meetingCount, standardTaskCount, completedCount } = useMemo(() => {
    let events = 0;
    let meetings = 0;
    let standards = 0;
    let completed = 0;
    for (const t of tasks) {
      if (t.type === 'event') events++;
      else if (t.type === 'meeting') meetings++;
      else standards++;
      if (t.completed) completed++;
    }
    return {
      eventCount: events,
      meetingCount: meetings,
      standardTaskCount: standards,
      completedCount: completed,
    };
  }, [tasks]);

  const totalItemsCount = eventCount + meetingCount + standardTaskCount + dayLogs.length + dayActivities.length;
  
  const filteredTasks = useMemo(() => {
    if (filterType === 'all') return tasks;
    if (filterType === 'task') return tasks.filter((t) => !t.type || t.type === 'task' || t.type === 'reminder');
    return tasks.filter((t) => t.type === filterType);
  }, [tasks, filterType]);

  // Calculate dynamic greeting based on current local hour
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? 'Good morning.' : currentHour < 18 ? 'Good afternoon.' : 'Good evening.';

  const isToday =
    selectedDate.toDateString() === new Date().toDateString();

  const hasGoalActivities = goals.some((g) => (g.dailyHistory?.[selectedDateStr]?.activities?.length || 0) > 0);

  return (
    <div className="space-y-6 pt-1 pb-16">
      {/* Date & Focus Status Header */}
      <div className="flex items-center gap-2.5 text-xs font-semibold text-[#8e96a8]">
        <div className="flex items-center gap-1.5 bg-[#14161e] border border-[#212634] px-3 py-1.5 rounded-full shadow-sm">
          <CalendarIcon className="w-3.5 h-3.5 text-accent-primary" />
          <span className="text-white">{formatDisplayDate(selectedDateStr)}</span>
        </div>
        {totalFocusMinutes > 0 && (
          <div className="flex items-center gap-1.5 bg-[#14161e] border border-[#212634] px-3 py-1.5 rounded-full shadow-sm">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-white">{totalFocusMinutes}m Focus</span>
          </div>
        )}
      </div>

      {/* Typographic Status Greeting */}
      <div className="space-y-1">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
          {greeting}
        </h2>
        <div className="text-lg sm:text-xl font-medium text-white/80 leading-snug">
          {tasks.length === 0 ? (
            <span>No tasks scheduled {isToday ? 'for today.' : 'on this date.'}</span>
          ) : (
            <>
              You have{' '}
              {eventCount > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-white mr-1.5">
                  <CalendarIcon className="w-4 h-4 text-[#c084fc] inline" /> {eventCount} event{eventCount !== 1 ? 's' : ''},
                </span>
              )}
              {meetingCount > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-white mr-1.5">
                  <Users className="w-4 h-4 text-[#818cf8] inline" /> {meetingCount} meeting{meetingCount !== 1 ? 's' : ''},
                </span>
              )}
              <span className="inline-flex items-center gap-1 font-semibold text-accent-primary">
                <CheckSquare className="w-4 h-4 text-accent-primary inline" /> {standardTaskCount} task{standardTaskCount !== 1 ? 's' : ''}
              </span>{' '}
              {isToday ? 'today.' : 'on this date.'}
            </>
          )}
        </div>
      </div>

      {/* Real Activity Badges */}
      {(dayLogs.length > 0 || totalFocusMinutes > 0 || completedCount > 0) && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {dayLogs.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#171a24] border border-[#232a3b] text-xs font-semibold text-white/90 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent-primary" />
              <span>{dayLogs.length} Habit{dayLogs.length !== 1 ? 's' : ''} Completed</span>
            </div>
          )}
          {totalFocusMinutes > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#171a24] border border-[#232a3b] text-xs font-semibold text-white/90 shrink-0">
              <Zap className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span>{totalFocusMinutes}m Focus Logged</span>
            </div>
          )}
          {completedCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#171a24] border border-[#232a3b] text-xs font-semibold text-white/90 shrink-0">
              <Flame className="w-3.5 h-3.5 text-accent-primary" />
              <span>{completedCount} Task{completedCount !== 1 ? 's' : ''} Done</span>
            </div>
          )}
        </div>
      )}

      {/* STREAK / Exo Score Banner with Progress Line (Matching Reference Screen 2) */}
      <div className="p-4 rounded-[24px] bg-[#13161f] border border-[#1f2533] shadow-sm">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-[#8e96a8] uppercase tracking-wider">
            STREAK Score
          </span>
          <div className="flex items-center gap-1 text-xs font-bold text-white font-mono">
            <Flame className="w-3.5 h-3.5 text-accent-primary" />
            <span>{streakScore}</span>
            <span className="text-[#636a7a] font-normal">/ 100</span>
          </div>
        </div>

        <div className="h-2 rounded-full bg-[#1d222e] overflow-hidden relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${streakScore}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-[#22c55e] via-accent-primary to-[#a3e635]"
          />
        </div>
      </div>

      {/* Schedule Summary Section (Matching Reference Screen 2) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#7d8495] uppercase tracking-wider">
            Schedule
          </h3>
          <span className="text-xs text-[#7d8495] font-medium">
            {completedCount}/{tasks.length} Done
          </span>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1e1b29] border border-[#3b2d55] text-[#c084fc]">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>{eventCount} {eventCount === 1 ? 'event' : 'events'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1a1d2e] border border-[#2b335c] text-[#818cf8]">
            <Users className="w-3.5 h-3.5" />
            <span>{meetingCount} {meetingCount === 1 ? 'meeting' : 'meetings'}</span>
          </div>
        </div>

        {/* Circadian / Alertness Curve Pills (Matching Reference Screen 2) */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#181a22] border border-[#252a39] text-[#9ba3b5]">
            <Clock className="w-3 h-3 text-[#fbbf24]" />
            <span>Morning grogginess cleared</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#181a22] border border-[#252a39] text-[#9ba3b5]">
            <ArrowUpRight className="w-3.5 h-3.5 text-accent-primary" />
            <span>Peak focus window active</span>
          </div>
        </div>
      </div>

      {/* Suggested / Day Tasks Section (Matching Reference Screen 2) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-accent-primary" /> Suggested & Tasks
            </h3>
            <span className="text-xs text-[#7d8495] font-mono">({filteredTasks.length})</span>
          </div>

          {/* Action buttons on header */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFeedbackLiked(true)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                feedbackLiked === true
                  ? 'bg-[#23381c] border-[#3b5e28] text-accent-primary'
                  : 'bg-white/5 border-white/5 text-[#7d8495] hover:text-white'
              }`}
            >
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setFeedbackLiked(false)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                feedbackLiked === false
                  ? 'bg-red-500/20 border-red-500/30 text-red-400'
                  : 'bg-white/5 border-white/5 text-[#7d8495] hover:text-white'
              }`}
            >
              <ThumbsDown className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onOpenAddModal('task')}
              className="ml-1 text-xs font-semibold text-accent-primary hover:text-white flex items-center gap-1 bg-[#23381c] hover:bg-[#2d4722] border border-[#375a28] px-2.5 py-1 rounded-xl transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 pb-1 overflow-x-auto no-scrollbar">
          {(['all', 'task', 'meeting', 'event'] as const).map((ft) => (
            <button
              key={ft}
              type="button"
              onClick={() => setFilterType(ft)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                filterType === ft
                  ? 'bg-[#22331c] border border-[#3b5a2b] text-accent-primary'
                  : 'bg-white/5 border border-white/5 text-[#7d8495] hover:text-white'
              }`}
            >
              {ft === 'all' ? 'All Items' : `${ft}s`}
            </button>
          ))}
        </div>

        {/* Task Cards List & Other Events */}
        {dayLogs.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-xs font-bold text-[#7d8495] uppercase tracking-wider">Completed Habits</h4>
            {dayLogs.map(log => {
              const habit = log.habitId ? habitsMap.get(log.habitId) : undefined;
              return (
                <div key={log.id} className="p-3 rounded-2xl bg-surface-card border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary"><CheckCircle2 className="w-4 h-4" /></div>
                    <span className="text-sm font-semibold text-white">{habit?.name || 'Habit'}</span>
                  </div>
                  <span className="text-xs text-[#7d8495]">Done</span>
                </div>
              );
            })}
          </div>
        )}
        
        {dayActivities.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-xs font-bold text-[#7d8495] uppercase tracking-wider">Focus Sessions</h4>
            {dayActivities.map(act => (
              <div key={act.id} className="p-3 rounded-2xl bg-surface-card border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400"><Clock className="w-4 h-4" /></div>
                  <span className="text-sm font-semibold text-white">{act.name}</span>
                </div>
                <span className="text-xs font-semibold text-blue-400">{act.durationMinutes}m {act.durationSeconds}s</span>
              </div>
            ))}
          </div>
        )}
        
        {dayJournals.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-xs font-bold text-[#7d8495] uppercase tracking-wider">Journal Entries</h4>
            {dayJournals.map(j => (
              <div key={j.id} className="p-3 rounded-2xl bg-surface-card border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400"><Book className="w-4 h-4" /></div>
                  <span className="text-sm font-semibold text-white line-clamp-1">{j.text}</span>
                </div>
                <span className="text-xs text-[#7d8495]">{j.time}</span>
              </div>
            ))}
          </div>
        )}
        
        {goals.map((goal) => {
          const entry = goal.dailyHistory?.[selectedDateStr];
          if (!entry || !entry.activities || entry.activities.length === 0) return null;

          return (
            <div key={`goal_${goal.id}`} className="space-y-3 mb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">{goal.title}</h4>
                  <span className="text-[10px] text-accent-primary font-semibold px-2 py-0.5 rounded-full bg-accent-primary/10">
                    Study Plan
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      downloadICSFile(
                        `${goal.title.replace(/\s+/g, '_')}_${selectedDateStr}`,
                        entry.activities.map((a) => ({
                          title: `${a.subject ? `[${a.subject}] ` : ''}${a.title}`,
                          date: selectedDateStr,
                          startTime: a.scheduledTime || '10:00 AM',
                          durationMinutes: a.plannedDurationMinutes || 50,
                          description: `Study Session for ${goal.title}`,
                        }))
                      );
                    }}
                    className="text-[11px] font-semibold text-[#7d8495] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    title="Download .ics for Google/Apple Calendar"
                  >
                    <Download className="w-3 h-3" /> .ICS
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {entry.activities.map((act) => {
                  const status = act.completed ? 'done' : act.status || 'upcoming';
                  const gcalUrl = createGoogleCalendarEventUrl({
                    title: `${act.subject ? `[${act.subject}] ` : ''}${act.title}`,
                    date: selectedDateStr,
                    startTime: act.scheduledTime || '10:00 AM',
                    durationMinutes: act.plannedDurationMinutes || 50,
                    description: `Part of goal: ${goal.title}`,
                  });

                  return (
                    <div
                      key={act.id}
                      className="p-3.5 rounded-2xl bg-surface-card border border-white/5 hover:border-white/15 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              updateGoalActivity(
                                goal.id,
                                selectedDateStr,
                                act.id,
                                { completed: !act.completed },
                                goal.userId
                              );
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                              act.completed
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-white/5 text-[#7d8495] hover:border-white/20 border border-white/10'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold ${act.completed ? 'line-through text-white/50' : 'text-white'}`}>
                                {act.title}
                              </span>
                              {act.subject && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/90">
                                  {act.subject}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[#7d8495] mt-0.5">
                              {act.scheduledTime && (
                                <span className="flex items-center gap-1 text-white/80">
                                  <Clock className="w-3 h-3 text-accent-primary" />
                                  {act.scheduledTime}
                                </span>
                              )}
                              <span>• {act.plannedDurationMinutes || 45} mins</span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {act.completed ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Done
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
                              Upcoming
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              navigate('/activity', {
                                state: {
                                  subject: act.subject || 'Study',
                                  plannedMinutes: act.plannedDurationMinutes || 45,
                                  activityTitle: act.title,
                                  goalId: goal.id,
                                  activityId: act.id,
                                },
                              });
                            }}
                            className="px-2.5 py-1 rounded-xl bg-accent-primary text-black font-bold text-[11px] flex items-center gap-1 hover:bg-[#9eff38] active:scale-95 transition-all cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-black" />
                            <span>Start Study Block</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              rescheduleGoalActivity(goal.id, selectedDateStr, act.id, 30, goal.userId);
                            }}
                            className="px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer"
                            title="Delay this session by 30 minutes if running late"
                          >
                            <FastForward className="w-3 h-3 text-[#fbbf24]" />
                            <span>+30m</span>
                          </button>
                        </div>

                        <a
                          href={gcalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-semibold text-[#7d8495] hover:text-white flex items-center gap-1 transition-colors"
                          title="Add to Google Calendar"
                        >
                          <ExternalLink className="w-3 h-3" /> GCal
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        
        {filteredTasks.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-xs font-bold text-[#7d8495] uppercase tracking-wider">Tasks</h4>
            <div className="space-y-2.5">
              <AnimatePresence mode="popLayout">
                {filteredTasks.map((task) => (
                  <TaskItemCard
                    key={task.id}
                    task={task}
                    onToggle={onToggleTask}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    onUpdateProgress={onUpdateTaskProgress}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
        
        {filteredTasks.length === 0 && dayLogs.length === 0 && dayActivities.length === 0 && dayJournals.length === 0 && !hasGoalActivities && (
          /* Empty State for the Day */
          <div className="py-8 px-4 rounded-[24px] bg-[#12141c] border border-dashed border-[#242a38] text-center">
            <div className="w-12 h-12 rounded-full bg-[#1b202c] border border-[#2b3345] flex items-center justify-center text-[#7d8495] mx-auto mb-3">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-white">No items for this date</h4>
            <p className="text-xs text-[#7d8495] mt-1 max-w-xs mx-auto">
              Keep your momentum going by scheduling a task, workout, or meeting for today.
            </p>
            <button
              type="button"
              onClick={() => onOpenAddModal('task')}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-primary hover:bg-[#9eff38] active:scale-95 text-background font-bold text-xs shadow-[0_4px_16px_rgba(140,238,40,0.25)] transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add Task</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}