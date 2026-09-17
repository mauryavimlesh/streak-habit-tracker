import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  Flame,
  CheckCircle2,
  TrendingUp,
  Award,
  Calendar,
  Sparkles,
  Zap,
  Target,
  BarChart3,
  Clock,
  Activity as ActivityIcon,
  BookOpen,
  Share2,
  Check,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { readLocalHabits, readLocalLogs, getUserHabits, getHabitLogs, Habit, HabitLog } from '../../lib/habitService';
import { readLocalTasks, getAllTasks, TaskItem } from '../../lib/taskService';
import { readLocalGoals, getUserGoals, Goal, calculateGoalProgress } from '../../lib/goalService';
import { getUserActivities, getLocalActivities, Activity } from '../../lib/activityService';
import { getUserJournal, readLocalJournal, JournalEntry } from '../../lib/journalService';
import { useAuth } from '../../lib/AuthContext';
import { cn } from '../../lib/utils';
import { calculateRealMilestones, MilestoneItem } from '../../lib/milestoneService';
import { calculateStreakStats } from '../../lib/streakEngine';
import { MilestoneCelebrationModal } from '../../components/ui/MilestoneCelebrationModal';
import { WeeklyReviewModal } from '../../components/analytics/WeeklyReviewModal';
import { getTodayDateKey, addDays, formatDateKey, diffDays } from '../../lib/dateUtils';

export type AnalyticsTimeframe = 'today' | '7days' | '30days' | 'this_month' | 'all_time';

const TIMEFRAMES: { id: AnalyticsTimeframe; label: string; shortLabel: string }[] = [
  { id: 'today', label: 'Today', shortLabel: 'Today' },
  { id: '7days', label: '7 Days', shortLabel: '7D' },
  { id: '30days', label: '30 Days', shortLabel: '30D' },
  { id: 'this_month', label: 'This Month', shortLabel: 'Month' },
  { id: 'all_time', label: 'All Time', shortLabel: 'All' },
];

export default function Analytics() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overall' | 'habits' | 'goals' | 'tasks' | 'study' | 'milestones' | 'journal'>('overall');
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('7days');

  const [habits, setHabits] = useState<Habit[]>(readLocalHabits());
  const [logs, setLogs] = useState<HabitLog[]>(readLocalLogs());
  const [tasks, setTasks] = useState<TaskItem[]>(readLocalTasks());
  const [goals, setGoals] = useState<Goal[]>(readLocalGoals());
  const [activities, setActivities] = useState<Activity[]>(getLocalActivities());
  const [journals, setJournals] = useState<JournalEntry[]>(readLocalJournal());
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Selected milestone to celebrate/share
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneItem | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('review') === 'true') {
        setIsReviewOpen(true);
      }
    }
  }, []);

  const loadData = async () => {
    if (user) {
      try {
        const [h, l, t, g, a, j] = await Promise.all([
          getUserHabits(user.uid),
          getHabitLogs(user.uid),
          getAllTasks(user.uid),
          getUserGoals(user.uid),
          getUserActivities(user.uid),
          getUserJournal(user.uid),
        ]);
        setHabits(h);
        setLogs(l);
        setTasks(t);
        setGoals(g);
        setActivities(a);
        setJournals(j);
      } catch {
        // Fallback to local
        setHabits(readLocalHabits());
        setLogs(readLocalLogs());
        setTasks(readLocalTasks());
        setGoals(readLocalGoals());
        setActivities(getLocalActivities());
        setJournals(readLocalJournal());
      }
    } else {
      setHabits(readLocalHabits());
      setLogs(readLocalLogs());
      setTasks(readLocalTasks());
      setGoals(readLocalGoals());
      setActivities(getLocalActivities());
      setJournals(readLocalJournal());
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    const onDataUpdated = () => {
      loadData();
    };

    window.addEventListener('streak_habits_updated', onDataUpdated);
    window.addEventListener('streak_sleep_updated', onDataUpdated);
    window.addEventListener('streak_goals_updated', onDataUpdated);
    window.addEventListener('streak_tasks_updated', onDataUpdated);
    window.addEventListener('streak_activities_updated', onDataUpdated);
    window.addEventListener('streak_journal_updated', onDataUpdated);

    return () => {
      window.removeEventListener('streak_habits_updated', onDataUpdated);
      window.removeEventListener('streak_sleep_updated', onDataUpdated);
      window.removeEventListener('streak_goals_updated', onDataUpdated);
      window.removeEventListener('streak_tasks_updated', onDataUpdated);
      window.removeEventListener('streak_activities_updated', onDataUpdated);
      window.removeEventListener('streak_journal_updated', onDataUpdated);
    };
  }, [user]);

  const todayStr = getTodayDateKey();

  // Canonical date ranges for timeframes
  const { startDate, endDate, dateList } = useMemo(() => {
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
      // all_time: Collect all unique dates from stored data
      start = '1970-01-01';
      end = '9999-12-31';
      // For chart, show the last 14 active days if available
      for (let i = 13; i >= 0; i--) {
        list.push(addDays(todayStr, -i));
      }
    }

    return { startDate: start, endDate: end, dateList: list };
  }, [timeframe, todayStr]);

  const isDateInTimeframe = useMemo(() => {
    return (dateStr?: string): boolean => {
      if (!dateStr) return false;
      const d = dateStr.split('T')[0];
      if (timeframe === 'all_time') return true;
      if (timeframe === 'today') return d === todayStr;
      return d >= startDate && d <= endDate;
    };
  }, [timeframe, startDate, endDate, todayStr]);

  // Filtered collections based on timeframe
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => isDateInTimeframe(l.date));
  }, [logs, isDateInTimeframe]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (timeframe === 'all_time') return true;
      if (!t.date) return timeframe === 'today'; // undated tasks show on today
      return isDateInTimeframe(t.date);
    });
  }, [tasks, timeframe, isDateInTimeframe]);

  const filteredActivities = useMemo(() => {
    return activities.filter((a) => isDateInTimeframe(a.date));
  }, [activities, isDateInTimeframe]);

  const filteredJournals = useMemo(() => {
    return journals.filter((j) => isDateInTimeframe(j.date || j.createdAt?.slice(0, 10)));
  }, [journals, isDateInTimeframe]);

  // Focus & Study statistics for selected timeframe
  const studyStats = useMemo(() => {
    let totalMinutes = 0;
    let longestSession = 0;
    const subjectBreakdown: Record<string, { minutes: number; sessions: number }> = {};

    for (const act of filteredActivities) {
      const mins = act.durationMinutes + (act.durationSeconds ? Math.round(act.durationSeconds / 60) : 0);
      totalMinutes += mins;
      if (mins > longestSession) longestSession = mins;

      const subj = act.subject || act.category || 'General';
      if (!subjectBreakdown[subj]) {
        subjectBreakdown[subj] = { minutes: 0, sessions: 0 };
      }
      subjectBreakdown[subj].minutes += mins;
      subjectBreakdown[subj].sessions += 1;
    }

    const sessionCount = filteredActivities.length;
    const averageSessionMinutes = sessionCount > 0 ? Math.round(totalMinutes / sessionCount) : 0;

    return {
      totalMinutes,
      sessionCount,
      averageSessionMinutes,
      longestSession,
      subjectBreakdown,
    };
  }, [filteredActivities]);

  // Daily Chart Trend data
  const trendData = useMemo(() => {
    return dateList.map((dateKey) => {
      const dateLogs = logs.filter((l) => l.date === dateKey && l.status === 'completed');
      const dateTasks = tasks.filter((t) => t.date === dateKey && t.completed);
      const dateActs = activities.filter((a) => a.date === dateKey);
      const focusMins = dateActs.reduce((acc, a) => acc + a.durationMinutes + Math.round((a.durationSeconds || 0) / 60), 0);

      // Format display label: "Oct 14" or "Mon"
      const parts = dateKey.split('-');
      const monthNum = parseInt(parts[1], 10);
      const dayNum = parseInt(parts[2], 10);
      const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const displayLabel = timeframe === '7days' || timeframe === 'today'
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
  }, [dateList, logs, tasks, activities, timeframe]);

  // Productivity Score Calculation (Truthful, verified against actual records)
  // Empty users receiving 0: Strictly enforced!
  const productivityScore = useMemo(() => {
    const activeHabitsList = habits.filter((h) => !h.archived);
    const activeDailyGoals = goals.filter((g) => g.type === 'daily' && g.status !== 'archived');

    const hasAnyTrackedItems =
      activeHabitsList.length > 0 ||
      tasks.length > 0 ||
      goals.length > 0 ||
      activities.length > 0;

    // 1. Habits (30 pts max)
    let habitsPts = 0;
    if (activeHabitsList.length > 0) {
      const completedLogs = filteredLogs.filter((l) => l.status === 'completed');
      const daysInTimeframe = timeframe === 'today'
        ? 1
        : timeframe === '7days'
        ? 7
        : timeframe === '30days'
        ? 30
        : timeframe === 'this_month'
        ? parseInt(todayStr.split('-')[2], 10)
        : Math.max(1, new Set(logs.map((l) => l.date)).size);

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
            if (isDateInTimeframe(date)) {
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
    if (studyStats.totalMinutes > 0) {
      const daysCount = timeframe === 'today' ? 1 : dateList.length;
      const avgDailyFocus = studyStats.totalMinutes / Math.max(1, daysCount);
      // 50 minutes average per day yields maximum 20 points
      focusPts = Math.min(20, Math.round((avgDailyFocus / 50) * 20));
    }

    // Strict zero score for empty users or 0-activity state
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
  }, [habits, goals, tasks, activities, logs, filteredLogs, filteredTasks, studyStats, timeframe, todayStr, dateList, isDateInTimeframe]);

  // Overall Streak Stats (Truthful streak engine calculation)
  const streakStats = useMemo(() => {
    return calculateStreakStats(logs, 'daily', undefined, todayStr);
  }, [logs, todayStr]);

  // Tasks Analysis
  const completedTasks = filteredTasks.filter((t) => t.completed);
  const taskCompletionRate = filteredTasks.length ? Math.round((completedTasks.length / filteredTasks.length) * 100) : 0;
  const pendingTasksCount = filteredTasks.length - completedTasks.length;

  // Habits Analysis
  const activeHabits = habits.filter((h) => !h.archived);
  const completedHabitLogsCount = filteredLogs.filter((l) => l.status === 'completed').length;

  // Goals Analysis
  const activeGoals = goals.filter((g) => g.status === 'in_progress');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  // Real Milestones
  const { milestones, unlockedCount } = useMemo(() => calculateRealMilestones(), [habits, logs, tasks, goals, journals, activities]);

  // Subject colors for charts
  const SUBJECT_COLORS: Record<string, string> = {
    Physics: '#a5ff36',
    Chemistry: '#38bdf8',
    Botany: '#34d399',
    Zoology: '#fbbf24',
    Biology: '#10b981',
    Math: '#f43f5e',
    Study: '#818cf8',
    Reading: '#c084fc',
    General: '#94a3b8',
  };

  const subjectData = Object.entries(studyStats.subjectBreakdown).map(([name, data]: [string, any]) => ({
    name,
    minutes: data?.minutes || 0,
    hours: Number(((data?.minutes || 0) / 60).toFixed(1)),
    sessions: data?.sessions || 0,
    fill: SUBJECT_COLORS[name] || '#818cf8',
  }));

  const TABS = [
    { id: 'overall', label: 'Overall' },
    { id: 'study', label: 'Study & Focus' },
    { id: 'habits', label: 'Habits' },
    { id: 'goals', label: 'Goals' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'milestones', label: `Milestones (${unlockedCount})` },
    { id: 'journal', label: 'Journal' },
  ] as const;

  return (
    <div className="flex flex-col min-h-screen bg-background text-white select-none pb-24">
      {/* Header */}
      <header className="px-5 py-4 flex items-center justify-between border-b border-white/5 sticky top-0 bg-background/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/more')}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Analytics & Productivity</h1>
            <p className="text-[10px] text-[#7d8495] uppercase tracking-widest font-semibold mt-0.5">
              Verified Stored Records
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsReviewOpen(true)}
          className="px-3 py-1.5 rounded-full bg-accent-primary hover:bg-[#9eff38] active:scale-95 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_2px_8px_rgba(140,238,40,0.25)] cursor-pointer shrink-0"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Weekly Review</span>
        </button>
      </header>

      {/* Timeframe Selector Pill Bar (Phase 3 Requirement) */}
      <div className="px-5 pt-3.5 pb-2 border-b border-white/5 bg-background/50">
        <div className="flex items-center justify-between gap-1 bg-[#12151d] p-1 rounded-2xl border border-white/10">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setTimeframe(tf.id)}
              className={cn(
                'flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer',
                timeframe === tf.id
                  ? 'bg-accent-primary text-black shadow-sm'
                  : 'text-[#7d8495] hover:text-white hover:bg-white/5'
              )}
            >
              <span className="hidden sm:inline">{tf.label}</span>
              <span className="sm:hidden">{tf.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 py-3 overflow-x-auto hide-scrollbar border-b border-white/5">
        <div className="flex gap-2 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer',
                activeTab === tab.id
                  ? 'bg-white text-black shadow-md'
                  : 'bg-surface-card border border-[#1f232c] text-[#7d8495] hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 p-5 space-y-6 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-t-2 border-accent-primary rounded-full animate-spin"></div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${timeframe}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* OVERALL TAB */}
              {activeTab === 'overall' && (
                <div className="space-y-5">
                  {/* Real Productivity Score Card */}
                  <div className="p-5 rounded-3xl bg-surface-card border border-white/10 relative overflow-hidden space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-accent-primary">
                            Productivity Score
                          </span>
                          <span className="text-[10px] text-[#7d8495] font-semibold bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                            {TIMEFRAMES.find((t) => t.id === timeframe)?.label}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-white">{productivityScore.total}</span>
                          <span className="text-sm font-semibold text-[#7d8495]">/ 100 pts</span>
                        </div>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary font-black text-lg">
                        <Zap className="w-6 h-6 fill-accent-primary" />
                      </div>
                    </div>

                    {/* Transparent Breakdown (0 for empty users) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-xs">
                      <div className="p-2.5 rounded-xl bg-white/[0.02]">
                        <span className="text-[10px] text-[#7d8495] block">Habits</span>
                        <span className="font-bold text-white">
                          {productivityScore.breakdown.habits.earned}/{productivityScore.breakdown.habits.max} pts
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.02]">
                        <span className="text-[10px] text-[#7d8495] block">Tasks</span>
                        <span className="font-bold text-white">
                          {productivityScore.breakdown.tasks.earned}/{productivityScore.breakdown.tasks.max} pts
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.02]">
                        <span className="text-[10px] text-[#7d8495] block">Goals</span>
                        <span className="font-bold text-white">
                          {productivityScore.breakdown.goals.earned}/{productivityScore.breakdown.goals.max} pts
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.02]">
                        <span className="text-[10px] text-[#7d8495] block">Focus</span>
                        <span className="font-bold text-white">
                          {productivityScore.breakdown.focus.earned}/{productivityScore.breakdown.focus.max} pts
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <span className="text-[10px] font-bold text-[#7d8495] uppercase tracking-wider block">
                        Habits Done
                      </span>
                      <div className="text-2xl font-black text-white">
                        {completedHabitLogsCount}
                      </div>
                      <span className="text-[11px] text-[#7d8495] block">completions</span>
                    </div>

                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <span className="text-[10px] font-bold text-[#7d8495] uppercase tracking-wider block">
                        Tasks Done
                      </span>
                      <div className="text-2xl font-black text-white">
                        {completedTasks.length}
                      </div>
                      <span className="text-[11px] text-[#7d8495] block">
                        {filteredTasks.length > 0 ? `${taskCompletionRate}% rate` : '0 tracked'}
                      </span>
                    </div>

                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <span className="text-[10px] font-bold text-[#7d8495] uppercase tracking-wider block">
                        Focus Time
                      </span>
                      <div className="text-2xl font-black text-accent-primary">
                        {studyStats.totalMinutes >= 60
                          ? `${Math.floor(studyStats.totalMinutes / 60)}h ${studyStats.totalMinutes % 60}m`
                          : `${studyStats.totalMinutes}m`}
                      </div>
                      <span className="text-[11px] text-[#7d8495] block">
                        {studyStats.sessionCount} sessions
                      </span>
                    </div>

                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <span className="text-[10px] font-bold text-[#7d8495] uppercase tracking-wider block">
                        Active Streak
                      </span>
                      <div className="text-2xl font-black text-white flex items-center gap-1">
                        <Flame className="w-5 h-5 fill-accent-primary text-accent-primary" />
                        <span>{streakStats.currentStreak}d</span>
                      </div>
                      <span className="text-[11px] text-[#7d8495] block">Best: {streakStats.bestStreak}d</span>
                    </div>
                  </div>

                  {/* Daily Trend Chart (Real Stored Activity) */}
                  {trendData.length > 1 && (
                    <div className="p-5 rounded-3xl bg-surface-card border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-accent-primary" />
                          Activity Trend ({TIMEFRAMES.find((t) => t.id === timeframe)?.label})
                        </h3>
                        <span className="text-xs text-[#7d8495]">Completions per day</span>
                      </div>

                      <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={trendData}>
                            <XAxis dataKey="label" stroke="#7d8495" fontSize={11} />
                            <YAxis stroke="#7d8495" fontSize={11} allowDecimals={false} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#12151d',
                                borderColor: 'rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                fontSize: '12px',
                              }}
                            />
                            <Bar dataKey="habits" name="Habits" fill="#a5ff36" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="tasks" name="Tasks" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STUDY & FOCUS TAB */}
              {activeTab === 'study' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5">
                      <span className="text-[10px] font-bold text-[#7d8495] uppercase tracking-wider block mb-1">
                        Total Focus Time
                      </span>
                      <div className="text-2xl font-black text-accent-primary">
                        {studyStats.totalMinutes >= 60
                          ? `${Math.floor(studyStats.totalMinutes / 60)}h ${studyStats.totalMinutes % 60}m`
                          : `${studyStats.totalMinutes}m`}
                      </div>
                    </div>
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5">
                      <span className="text-[10px] font-bold text-[#7d8495] uppercase tracking-wider block mb-1">
                        Sessions Completed
                      </span>
                      <div className="text-2xl font-black text-white">
                        {studyStats.sessionCount}
                      </div>
                    </div>
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-bold text-[#7d8495] uppercase tracking-wider block mb-1">
                        Avg Session
                      </span>
                      <div className="text-2xl font-black text-white">
                        {studyStats.averageSessionMinutes}m
                      </div>
                    </div>
                  </div>

                  {/* Subject Study Time Breakdown */}
                  <div className="p-5 rounded-3xl bg-surface-card border border-white/5 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-accent-primary" />
                      Subject Focus Distribution
                    </h3>

                    {subjectData.length === 0 ? (
                      <p className="text-xs text-[#7d8495] py-4 text-center">
                        No focus sessions recorded for this timeframe.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <div className="h-44 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={subjectData}>
                              <XAxis dataKey="name" stroke="#7d8495" fontSize={11} />
                              <YAxis stroke="#7d8495" fontSize={11} unit="m" />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#12151d',
                                  borderColor: 'rgba(255,255,255,0.1)',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                }}
                              />
                              <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
                                {subjectData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                          {subjectData.map((item) => (
                            <div key={item.name} className="p-2.5 rounded-xl bg-white/[0.02] flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }}></span>
                                <span className="text-xs font-semibold text-white">{item.name}</span>
                              </div>
                              <span className="text-xs font-bold text-accent-primary">{item.minutes}m</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* HABITS TAB */}
              {activeTab === 'habits' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <div className="text-2xl font-black text-white">{activeHabits.length}</div>
                      <div className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">Active Habits</div>
                    </div>
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <div className="text-2xl font-black text-white">{completedHabitLogsCount}</div>
                      <div className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">
                        Completions ({TIMEFRAMES.find((t) => t.id === timeframe)?.label})
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white pl-1">Habit Consistency</h3>
                    {activeHabits.length === 0 ? (
                      <p className="text-xs text-[#7d8495] py-4 text-center">No active habits tracked.</p>
                    ) : (
                      activeHabits.map((habit) => {
                        const habitLogs = filteredLogs.filter((l) => l.habitId === habit.id && l.status === 'completed');
                        return (
                          <div key={habit.id} className="p-4 rounded-2xl bg-surface-card border border-white/5 flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-bold text-white">{habit.name}</h4>
                              <span className="text-[10px] text-[#7d8495]">{habitLogs.length} completed in timeframe</span>
                            </div>
                            <span className="text-xs font-bold text-accent-primary">
                              {habitLogs.length > 0 ? `${habitLogs.length} logged` : '0 logged'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* GOALS TAB */}
              {activeTab === 'goals' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <div className="text-2xl font-black text-white">{activeGoals.length}</div>
                      <div className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">Active Goals</div>
                    </div>
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <div className="text-2xl font-black text-white">{completedGoals.length}</div>
                      <div className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">Completed</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {goals.length === 0 ? (
                      <p className="text-xs text-[#7d8495] py-4 text-center">No goals tracked yet.</p>
                    ) : (
                      goals.map((g) => {
                        const p = calculateGoalProgress(g, todayStr);
                        return (
                          <div key={g.id} className="p-4 rounded-2xl bg-surface-card border border-white/5 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-white">{g.title}</span>
                              <div className="flex items-center gap-2">
                                {p.currentStreak > 0 && (
                                  <span className="flex items-center gap-0.5 text-xs font-bold text-amber-400">
                                    <Flame className="w-3.5 h-3.5 fill-amber-400" />
                                    {p.currentStreak}d
                                  </span>
                                )}
                                <span className="text-xs font-bold text-accent-primary">
                                  {g.type === 'daily'
                                    ? `${p.todayProgress}/${p.todayTarget} ${g.unit || ''}`
                                    : `${p.overallProgress}/${p.overallTarget} ${g.unit || ''}`}
                                </span>
                              </div>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-black/40 overflow-hidden">
                              <div
                                className="h-full bg-accent-primary transition-all duration-300 rounded-full"
                                style={{ width: `${g.type === 'daily' ? p.todayPercent : p.overallPercent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TASKS TAB */}
              {activeTab === 'tasks' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <div className="text-2xl font-black text-white">{filteredTasks.length}</div>
                      <div className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">Total Tasks</div>
                    </div>
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <div className="text-2xl font-black text-white">{taskCompletionRate}%</div>
                      <div className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">Completion</div>
                    </div>
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <div className="text-2xl font-black text-white">{completedTasks.length}</div>
                      <div className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">Done</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {filteredTasks.length === 0 ? (
                      <p className="text-xs text-[#7d8495] py-4 text-center">No tasks recorded for this timeframe.</p>
                    ) : (
                      filteredTasks.map((t) => (
                        <div
                          key={t.id}
                          className="p-3.5 rounded-2xl bg-surface-card border border-white/5 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                'w-5 h-5 rounded-lg flex items-center justify-center border',
                                t.completed
                                  ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                                  : 'border-white/20'
                              )}
                            >
                              {t.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <span className={cn('text-xs font-semibold', t.completed ? 'text-[#7d8495] line-through' : 'text-white')}>
                              {t.title}
                            </span>
                          </div>
                          {t.date && (
                            <span className="text-[10px] text-[#7d8495] font-mono">{t.date}</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* REAL MILESTONES TAB */}
              {activeTab === 'milestones' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-3xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Student Milestones</h3>
                      <span className="text-xs text-[#a1a8b9]">
                        {unlockedCount} of {milestones.length} unlocked from your verified data
                      </span>
                    </div>
                    <Award className="w-8 h-8 text-accent-primary" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {milestones.map((m) => {
                      const percent = Math.min(100, Math.round((m.currentValue / m.threshold) * 100));
                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            if (m.isUnlocked) setSelectedMilestone(m);
                          }}
                          className={cn(
                            'p-4 rounded-2xl border transition-all space-y-2',
                            m.isUnlocked
                              ? 'bg-surface-card border-accent-primary/30 hover:border-accent-primary cursor-pointer'
                              : 'bg-white/[0.01] border-white/5 opacity-60'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-white">{m.title}</h4>
                            {m.isUnlocked ? (
                              <span className="text-[10px] font-bold text-accent-primary px-2 py-0.5 rounded-md bg-accent-primary/10">
                                Unlocked ✓
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#7d8495]">
                                {m.currentValue} / {m.threshold} {m.unit}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#7d8495] line-clamp-2">{m.description}</p>
                          <div className="w-full h-1.5 rounded-full bg-black/40 overflow-hidden">
                            <div
                              className={cn('h-full', m.isUnlocked ? 'bg-accent-primary' : 'bg-white/20')}
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                          {m.isUnlocked && (
                            <div className="pt-1 flex items-center justify-end text-[10px] text-accent-primary font-bold gap-1">
                              <Share2 className="w-3 h-3" /> Click to Share Card
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* JOURNAL TAB */}
              {activeTab === 'journal' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <div className="text-2xl font-black text-white">{filteredJournals.length}</div>
                      <div className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">
                        Entries ({TIMEFRAMES.find((t) => t.id === timeframe)?.label})
                      </div>
                    </div>
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <div className="text-2xl font-black text-white">{journals.length}</div>
                      <div className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">All-Time Entries</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {filteredJournals.length === 0 ? (
                      <p className="text-xs text-[#7d8495] py-4 text-center">No journal entries in this timeframe.</p>
                    ) : (
                      filteredJournals.map((j) => (
                        <div key={j.id} className="p-4 rounded-2xl bg-surface-card border border-white/5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-white">{j.title || 'Untitled Entry'}</h4>
                            <span className="text-[10px] text-[#7d8495]">{j.date}</span>
                          </div>
                          <p className="text-xs text-[#a1a8b9] line-clamp-2">{j.text}</p>
                          {j.tags && j.tags.length > 0 && (
                            <div className="flex gap-1.5 pt-1">
                              {j.tags.map((t) => (
                                <span key={t} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-[#7d8495]">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Milestone Modal Celebration */}
      <MilestoneCelebrationModal
        milestone={selectedMilestone}
        onClose={() => setSelectedMilestone(null)}
      />

      {/* Weekly Academic Review Modal */}
      <WeeklyReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        userId={user?.uid}
        habits={habits}
        logs={logs}
        goals={goals}
        activities={activities}
      />
    </div>
  );
}
