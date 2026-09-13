import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
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
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { readLocalHabits, readLocalLogs, getUserHabits, getHabitLogs } from '../../lib/habitService';
import { readLocalTasks, getAllTasks } from '../../lib/taskService';
import { readLocalGoals, getUserGoals } from '../../lib/goalService';
import { useAuth } from '../../lib/AuthContext';
import { useEffect } from 'react';
import { cn } from '../../lib/utils';

export default function Analytics() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');

  const [habits, setHabits] = useState(readLocalHabits());
  const [logs, setLogs] = useState(readLocalLogs());
  const [tasks, setTasks] = useState(readLocalTasks());
  const [goals, setGoals] = useState(readLocalGoals());
  const { user } = useAuth();
  
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const [fetchedHabits, fetchedLogs, fetchedTasks, fetchedGoals] = await Promise.all([
        getUserHabits(user.uid),
        getHabitLogs(user.uid),
        getAllTasks(user.uid),
        getUserGoals(user.uid)
      ]);
      setHabits(fetchedHabits);
      setLogs(fetchedLogs);
      setTasks(fetchedTasks);
      setGoals(fetchedGoals);
    }
    loadData();
  }, [user]);

  // Compute daily completion rates for the selected time range
  const chartData = useMemo(() => {
    const daysCount = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 12;
    const now = new Date();
    const result = [];

    if (timeRange === 'year') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthPrefix = d.toISOString().slice(0, 7);
        const monthLogs = logs.filter((l) => l.date.startsWith(monthPrefix) && (l.status === 'completed' || (l.progressValue && l.progressValue > 0)));
        result.push({
          label: monthNames[d.getMonth()],
          completions: monthLogs.length,
        });
      }
      return result;
    }

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLogs = logs.filter(
        (l) => l.date === dateStr && (l.status === 'completed' || (l.progressValue && l.progressValue > 0))
      );
      const dayName = timeRange === 'week' 
        ? d.toLocaleDateString('en-US', { weekday: 'short' })
        : d.getDate().toString();

      result.push({
        label: dayName,
        date: dateStr,
        completions: dayLogs.length,
      });
    }

    return result;
  }, [logs, timeRange]);

  // Overall Statistics Calculation
  const totalHabits = habits.filter((h) => !h.archived).length || 1;
  const completedLogs = logs.filter(
    (l) => l.status === 'completed' || (l.progressValue && l.progressValue > 0)
  );
  const totalCompletions = completedLogs.length;

  // Task Stats
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const totalTasksCount = tasks.length;
  const taskCompletionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Streak Estimation
  const currentStreak = useMemo(() => {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      const hasAny = logs.some((l) => l.date === dateStr && (l.status === 'completed' || (l.progressValue && l.progressValue > 0)));
      if (hasAny) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return Math.max(1, streak);
  }, [logs]);

  // Real best streak calculation across recorded history
  const bestStreak = useMemo(() => {
    if (logs.length === 0) return currentStreak;
    const uniqueDates: string[] = Array.from(new Set<string>(
      logs
        .filter((l) => l.status === 'completed' || (l.progressValue && l.progressValue > 0))
        .map((l) => l.date)
    )).sort();

    if (uniqueDates.length === 0) return currentStreak;

    let maxRun = 0;
    let currentRun = 0;
    let prevTime = 0;

    for (const dateStr of uniqueDates) {
      const parts = dateStr.split('-').map(Number);
      const currTime = new Date(parts[0], parts[1] - 1, parts[2]).getTime();
      if (prevTime === 0) {
        currentRun = 1;
      } else {
        const diffDays = Math.round((currTime - prevTime) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentRun++;
        } else if (diffDays > 1) {
          currentRun = 1;
        }
      }
      prevTime = currTime;
      if (currentRun > maxRun) {
        maxRun = currentRun;
      }
    }
    return Math.max(currentStreak, maxRun);
  }, [logs, currentStreak]);

  // Category breakdown
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    habits.forEach((h) => {
      const cat = h.category || 'General';
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({
      name,
      count,
      percent: Math.round((count / (habits.length || 1)) * 100),
    }));
  }, [habits]);

  // Most consistent habit
  const mostConsistentHabit = useMemo(() => {
    if (habits.length === 0) return null;
    const habitCompletionCounts: Record<string, number> = {};
    completedLogs.forEach((l) => {
      habitCompletionCounts[l.habitId] = (habitCompletionCounts[l.habitId] || 0) + 1;
    });
    let topHabit = habits[0];
    let topCount = -1;
    habits.forEach((h) => {
      const cnt = habitCompletionCounts[h.id || ''] || 0;
      if (cnt > topCount) {
        topCount = cnt;
        topHabit = h;
      }
    });
    return topHabit;
  }, [habits, completedLogs]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-white pb-24 select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-white/10 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/more')}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Analytics & Stats</h1>
            <p className="text-xs text-[#7d8495]">Real progress insights & patterns</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto w-full px-5 pt-4 space-y-4">
        {/* Time Filter Pills */}
        <div className="grid grid-cols-3 p-1 rounded-2xl bg-black/40 border border-white/5">
          {(['week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={cn(
                'py-1.5 text-xs font-semibold rounded-xl capitalize transition-all cursor-pointer',
                timeRange === range
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-[#7d8495] hover:text-white'
              )}
            >
              {range === 'week' ? 'This Week' : range === 'month' ? '30 Days' : '1 Year'}
            </button>
          ))}
        </div>

        {/* Primary Streak & Metric Bento */}
        <div className="grid grid-cols-2 gap-3">
          {/* Current Streak Card */}
          <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#7d8495]">Current Streak</span>
              <div className="w-7 h-7 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400">
                <Flame className="w-4 h-4 fill-orange-400/20" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{currentStreak}</span>
              <span className="text-xs font-semibold text-accent-primary">days</span>
            </div>
            <p className="text-[11px] text-[#7d8495]">Best: {bestStreak} days</p>
          </div>

          {/* Completions Card */}
          <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#7d8495]">Total Checks</span>
              <div className="w-7 h-7 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{totalCompletions}</span>
              <span className="text-xs font-semibold text-[#7d8495]">logs</span>
            </div>
            <p className="text-[11px] text-[#7d8495]">Across all routines</p>
          </div>
        </div>

        {/* Interactive Bar Chart for Completion Trends */}
        <div className="p-5 rounded-3xl bg-surface-card border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Daily Habit Frequency</h3>
              <p className="text-[11px] text-[#7d8495]">Completed routines over time</p>
            </div>
            <BarChart3 className="w-4 h-4 text-accent-primary" />
          </div>

          <div className="h-44 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#7d8495', fontSize: 10 }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#7d8495', fontSize: 10 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{
                    backgroundColor: 'var(--app-card-bg)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="completions" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill="var(--app-accent)"
                      className="hover:opacity-80 transition-opacity"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task & Goal Synergy Summary */}
        <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-3">
          <h3 className="text-sm font-bold text-white">Execution Efficiency</h3>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-2xl bg-black/30 border border-white/5">
              <span className="text-[11px] text-[#7d8495] block mb-1">Task Completion</span>
              <span className="text-lg font-bold text-white">{taskCompletionRate}%</span>
              <p className="text-[10px] text-[#7d8495] mt-0.5">
                {completedTasksCount} of {totalTasksCount} tasks done
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-black/30 border border-white/5">
              <span className="text-[11px] text-[#7d8495] block mb-1">Active Goals</span>
              <span className="text-lg font-bold text-white">
                {goals.filter((g) => g.status === 'in_progress').length}
              </span>
              <p className="text-[10px] text-[#7d8495] mt-0.5">
                {goals.filter((g) => g.status === 'completed').length} completed
              </p>
            </div>
          </div>
        </div>

        {/* Most Consistent Habit Spotlight */}
        {mostConsistentHabit && (
          <div className="p-4 rounded-3xl bg-gradient-to-br from-surface-card to-[#182012] border border-accent-primary/20 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-accent-primary/15 border border-accent-primary/30 flex items-center justify-center text-accent-primary shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent-primary">
                MVP Habit
              </span>
              <h4 className="text-sm font-bold text-white mt-0.5">{mostConsistentHabit.name}</h4>
              <p className="text-xs text-[#7d8495]">Highest cumulative check-in rate</p>
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        {categoryCounts.length > 0 && (
          <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-2.5">
            <h3 className="text-sm font-bold text-white">Routines by Category</h3>
            <div className="space-y-2">
              {categoryCounts.map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/80">{cat.name}</span>
                    <span className="text-[#7d8495]">{cat.count} habits ({cat.percent}%)</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-black/40 overflow-hidden">
                    <div
                      className="h-full bg-accent-primary rounded-full"
                      style={{ width: `${cat.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
