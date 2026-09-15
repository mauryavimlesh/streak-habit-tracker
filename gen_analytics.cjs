const fs = require('fs');

const content = `import { useState, useMemo, useEffect } from 'react';
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
  Book,
  Clock,
  Activity as ActivityIcon
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
import { readLocalHabits, readLocalLogs, getUserHabits, getHabitLogs, Habit, HabitLog } from '../../lib/habitService';
import { readLocalTasks, getAllTasks, TaskItem } from '../../lib/taskService';
import { readLocalGoals, getUserGoals, Goal } from '../../lib/goalService';
import { getUserActivities, Activity } from '../../lib/activityService';
import { getUserJournal, JournalEntry } from '../../lib/journalService';
import { useAuth } from '../../lib/AuthContext';
import { cn } from '../../lib/utils';

export default function Analytics() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overall' | 'habits' | 'goals' | 'tasks' | 'study' | 'journal'>('overall');
  
  const [habits, setHabits] = useState<Habit[]>(readLocalHabits());
  const [logs, setLogs] = useState<HabitLog[]>(readLocalLogs());
  const [tasks, setTasks] = useState<TaskItem[]>(readLocalTasks());
  const [goals, setGoals] = useState<Goal[]>(readLocalGoals());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (user) {
        const [h, l, t, g, a, j] = await Promise.all([
          getUserHabits(user.uid),
          getHabitLogs(user.uid),
          getAllTasks(user.uid),
          getUserGoals(user.uid),
          getUserActivities(user.uid),
          getUserJournal(user.uid)
        ]);
        setHabits(h);
        setLogs(l);
        setTasks(t);
        setGoals(g);
        setActivities(a);
        setJournals(j);
      }
      setLoading(false);
    }
    loadData();
  }, [user]);

  // Overall calculations
  const totalCompletions = logs.filter(l => l.status === 'completed').length;
  
  // Basic streak calculation for the whole app
  const uniqueDates = [...new Set(logs.filter(l => l.status === 'completed').map(l => l.date))].sort();
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  let prevDate = null;
  const today = new Date().toLocaleDateString('en-CA');
  
  for (const d of uniqueDates) {
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diff = Math.floor((new Date(d).getTime() - new Date(prevDate).getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    if (tempStreak > bestStreak) bestStreak = tempStreak;
    prevDate = d;
  }
  
  if (prevDate) {
    const diff = Math.floor((new Date(today).getTime() - new Date(prevDate).getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 1) {
      currentStreak = tempStreak;
    } else {
      currentStreak = 0;
    }
  }

  // Habits Analysis
  const activeHabits = habits.filter(h => !h.archived);
  
  // Tasks Analysis
  const completedTasks = tasks.filter(t => t.completed);
  const taskCompletionRate = tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  const overdueTasks = tasks.filter(t => !t.completed && new Date(t.date || '') < new Date());

  // Goals Analysis
  const activeGoals = goals.filter(g => g.status === 'in_progress');
  const completedGoals = goals.filter(g => g.status === 'completed');

  // Study Analysis
  const totalStudyMinutes = activities.reduce((acc, a) => acc + (a.durationMinutes || 0) + Math.floor((a.durationSeconds || 0)/60), 0);
  const totalStudyHours = Math.floor(totalStudyMinutes / 60);

  const TABS = [
    { id: 'overall', label: 'Overall' },
    { id: 'habits', label: 'Habits' },
    { id: 'goals', label: 'Goals' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'study', label: 'Focus' },
    { id: 'journal', label: 'Journal' },
  ] as const;

  return (
    <div className="flex flex-col min-h-screen bg-background text-white select-none">
      <header className="px-5 py-4 flex items-center justify-between border-b border-white/5 sticky top-0 bg-background/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/more')}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Analytics</h1>
            <p className="text-[10px] text-[#7d8495] uppercase tracking-widest font-semibold mt-0.5">Real Data Insights</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-3 overflow-x-auto hide-scrollbar border-b border-white/5">
        <div className="flex gap-2 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                activeTab === tab.id
                  ? "bg-white text-black"
                  : "bg-surface-card border border-[#1f232c] text-[#7d8495] hover:text-white"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 p-5 space-y-6 pb-24 max-w-2xl mx-auto w-full">
        {loading ? (
           <div className="flex justify-center py-20"><div className="w-8 h-8 border-t-2 border-accent-primary rounded-full animate-spin"></div></div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {activeTab === 'overall' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-2">
                      <div className="text-xs font-semibold text-[#7d8495] uppercase tracking-wider">Overall Streak</div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-white">{currentStreak}</span>
                        <span className="text-[10px] text-accent-primary uppercase tracking-wider font-bold">days</span>
                      </div>
                      <div className="text-[10px] text-[#7d8495]">Best: {bestStreak} days</div>
                    </div>
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-2">
                      <div className="text-xs font-semibold text-[#7d8495] uppercase tracking-wider">Total Checks</div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-white">{totalCompletions}</span>
                        <span className="text-[10px] text-[#7d8495] uppercase tracking-wider font-bold">logs</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 rounded-3xl bg-surface-card border border-white/5">
                    <h3 className="text-sm font-bold text-white mb-4">Productivity Breakdown</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-[#7d8495]">Active Goals</span>
                        <span className="text-sm font-bold text-white">{activeGoals.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-[#7d8495]">Completed Goals</span>
                        <span className="text-sm font-bold text-white">{completedGoals.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-[#7d8495]">Tasks Completion</span>
                        <span className="text-sm font-bold text-white">{taskCompletionRate}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-[#7d8495]">Focus Hours</span>
                        <span className="text-sm font-bold text-white">{totalStudyHours}h</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-[#7d8495]">Journal Entries</span>
                        <span className="text-sm font-bold text-white">{journals.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'habits' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <div className="text-2xl font-black text-white">{activeHabits.length}</div>
                      <div className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">Active Habits</div>
                    </div>
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <div className="text-2xl font-black text-white">{totalCompletions}</div>
                      <div className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">Completions</div>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-bold text-white pl-1">Habit Breakdown</h3>
                    {activeHabits.length === 0 ? (
                      <p className="text-xs text-[#7d8495]">Not enough data yet</p>
                    ) : (
                      activeHabits.map(habit => {
                        const habitLogs = logs.filter(l => l.habitId === habit.id && l.status === 'completed');
                        
                        let hStreak = 0;
                        let hBest = 0;
                        let hTemp = 0;
                        let hPrev = null;
                        const uDates = [...new Set(habitLogs.map(l => l.date))].sort();
                        
                        for (const d of uDates) {
                          if (!hPrev) hTemp = 1;
                          else {
                            const diff = Math.floor((new Date(d).getTime() - new Date(hPrev).getTime()) / 86400000);
                            if (diff === 1) hTemp++; else hTemp = 1;
                          }
                          if (hTemp > hBest) hBest = hTemp;
                          hPrev = d;
                        }
                        if (hPrev) {
                          const diff = Math.floor((new Date(today).getTime() - new Date(hPrev).getTime()) / 86400000);
                          if (diff <= 1) hStreak = hTemp; else hStreak = 0;
                        }
                        
                        const createdDaysAgo = habit.createdAt ? Math.floor((new Date().getTime() - new Date(habit.createdAt).getTime()) / 86400000) : 0;
                        
                        return (
                          <div key={habit.id} className="p-4 rounded-2xl bg-surface-card border border-white/5 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-white">{habit.name}</span>
                              <span className="text-[10px] text-[#7d8495]">Started {createdDaysAgo} days ago</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <div className="text-[10px] text-[#7d8495]">Current</div>
                                <div className="text-sm font-bold text-white">{hStreak} <span className="text-[10px] font-normal">days</span></div>
                              </div>
                              <div>
                                <div className="text-[10px] text-[#7d8495]">Best</div>
                                <div className="text-sm font-bold text-white">{hBest} <span className="text-[10px] font-normal">days</span></div>
                              </div>
                              <div>
                                <div className="text-[10px] text-[#7d8495]">Total</div>
                                <div className="text-sm font-bold text-white">{habitLogs.length}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'goals' && (
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <div className="text-2xl font-black text-white">{activeGoals.length}</div>
                      <div className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">Active Goals</div>
                    </div>
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <div className="text-2xl font-black text-white">{completedGoals.length}</div>
                      <div className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">Completed Goals</div>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-bold text-white pl-1">Goal Breakdown</h3>
                    {goals.length === 0 ? (
                      <p className="text-xs text-[#7d8495]">Not enough data yet</p>
                    ) : (
                      goals.map(goal => {
                        const goalTasks = tasks.filter(t => t.goalId === goal.id);
                        const completedGTasks = goalTasks.filter(t => t.completed);
                        const createdDaysAgo = goal.createdAt ? Math.floor((new Date().getTime() - new Date(goal.createdAt).getTime()) / 86400000) : 0;
                        const progress = goal.target > 0 ? Math.round((goal.currentProgress / goal.target) * 100) : 0;
                        
                        return (
                          <div key={goal.id} className="p-4 rounded-2xl bg-surface-card border border-white/5 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-white">{goal.title}</span>
                              <span className="text-[10px] text-[#7d8495]">Started {createdDaysAgo} days ago</span>
                            </div>
                            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                              <div className="h-full bg-accent-primary" style={{ width: \`\${Math.min(100, progress)}%\` }} />
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              <div>
                                <span className="text-[#7d8495]">Progress:</span> <span className="text-white font-bold">{progress}%</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[#7d8495]">Tasks:</span> <span className="text-white font-bold">{completedGTasks.length}/{goalTasks.length}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
              
              {activeTab === 'tasks' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <div className="text-2xl font-black text-white">{tasks.length}</div>
                      <div className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">Total Tasks</div>
                    </div>
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <div className="text-2xl font-black text-white">{taskCompletionRate}%</div>
                      <div className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">Completion Rate</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <div className="text-2xl font-black text-white">{completedTasks.length}</div>
                      <div className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">Completed</div>
                    </div>
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <div className="text-2xl font-black text-red-400">{overdueTasks.length}</div>
                      <div className="text-[10px] font-semibold text-red-500/70 uppercase tracking-wider">Overdue</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'study' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">{totalStudyHours}</span>
                        <span className="text-[10px] text-[#7d8495] uppercase font-bold">h</span>
                        <span className="text-2xl font-black text-white ml-1">{totalStudyMinutes % 60}</span>
                        <span className="text-[10px] text-[#7d8495] uppercase font-bold">m</span>
                      </div>
                      <div className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">Total Focus Time</div>
                    </div>
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <div className="text-2xl font-black text-white">{activities.length}</div>
                      <div className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">Total Sessions</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-bold text-white pl-1">Recent Sessions</h3>
                    {activities.length === 0 ? (
                      <p className="text-xs text-[#7d8495]">Not enough data yet</p>
                    ) : (
                      activities.slice(0, 10).map((act, i) => (
                        <div key={act.id || i} className="p-4 rounded-2xl bg-surface-card border border-white/5 flex justify-between items-center">
                          <div>
                            <div className="text-sm font-bold text-white">{act.name}</div>
                            <div className="text-[10px] text-[#7d8495]">{new Date(act.date).toLocaleDateString()}</div>
                          </div>
                          <div className="text-sm font-bold text-accent-primary">
                            {act.durationMinutes}m {act.durationSeconds}s
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'journal' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                    <div className="text-2xl font-black text-white">{journals.length}</div>
                    <div className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">Total Entries</div>
                  </div>
                  
                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-bold text-white pl-1">Recent Entries</h3>
                    {journals.length === 0 ? (
                      <p className="text-xs text-[#7d8495]">Not enough data yet</p>
                    ) : (
                      journals.slice(0, 10).map(j => (
                        <div key={j.id} className="p-4 rounded-2xl bg-surface-card border border-white/5 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">{new Date(j.date).toLocaleDateString()}</span>
                            <span className="text-[10px] px-2 py-1 bg-white/5 rounded-md text-white capitalize">{j.mood}</span>
                          </div>
                          <p className="text-sm text-white line-clamp-2">{j.content}</p>
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
    </div>
  );
}
`

fs.writeFileSync('src/pages/analytics/Analytics.tsx', content);
