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
  Book,
  Clock,
  Activity as ActivityIcon,
  BookOpen,
  Share2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { readLocalHabits, readLocalLogs, getUserHabits, getHabitLogs, Habit, HabitLog } from '../../lib/habitService';
import { readLocalTasks, getAllTasks, TaskItem } from '../../lib/taskService';
import { readLocalGoals, getUserGoals, Goal } from '../../lib/goalService';
import { getUserActivities, Activity, calculateStudyStatistics } from '../../lib/activityService';
import { getUserJournal, JournalEntry } from '../../lib/journalService';
import { useAuth } from '../../lib/AuthContext';
import { cn } from '../../lib/utils';
import { calculateRealMilestones, MilestoneItem } from '../../lib/milestoneService';
import { MilestoneCelebrationModal } from '../../components/ui/MilestoneCelebrationModal';
import { WeeklyReviewModal } from '../../components/analytics/WeeklyReviewModal';

export default function Analytics() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overall' | 'habits' | 'goals' | 'tasks' | 'study' | 'milestones' | 'journal'>('overall');

  const [habits, setHabits] = useState<Habit[]>(readLocalHabits());
  const [logs, setLogs] = useState<HabitLog[]>(readLocalLogs());
  const [tasks, setTasks] = useState<TaskItem[]>(readLocalTasks());
  const [goals, setGoals] = useState<Goal[]>(readLocalGoals());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
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

  useEffect(() => {
    async function loadData() {
      if (user) {
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
      }
      setLoading(false);
    }
    loadData();

    const onDataUpdated = () => {
      loadData();
    };

    window.addEventListener('streak_habits_updated', onDataUpdated);
    window.addEventListener('streak_sleep_updated', onDataUpdated);
    window.addEventListener('streak_goals_updated', onDataUpdated);
    window.addEventListener('streak_tasks_updated', onDataUpdated);

    return () => {
      window.removeEventListener('streak_habits_updated', onDataUpdated);
      window.removeEventListener('streak_sleep_updated', onDataUpdated);
      window.removeEventListener('streak_goals_updated', onDataUpdated);
      window.removeEventListener('streak_tasks_updated', onDataUpdated);
    };
  }, [user]);

  const todayStr = new Date().toLocaleDateString('en-CA');

  // Study statistics calculation
  const studyStats = useMemo(() => calculateStudyStatistics(activities), [activities]);

  // Productivity Score (0-100) Transparent Breakdown
  const productivityScore = useMemo(() => {
    // 1. Goals score (30 pts max)
    const activeDailyGoals = goals.filter((g) => g.type === 'daily');
    let goalsPts = 0;
    if (activeDailyGoals.length > 0) {
      let completedDaily = 0;
      activeDailyGoals.forEach((g) => {
        const entry = g.dailyHistory?.[todayStr];
        if (entry && (entry.completed || entry.progress >= (g.dailyTarget || 1))) {
          completedDaily++;
        }
      });
      goalsPts = Math.round((completedDaily / activeDailyGoals.length) * 30);
    } else {
      goalsPts = 30; // default if no daily goals set
    }

    // 2. Habits score (25 pts max)
    const activeHabitsList = habits.filter((h) => !h.archived);
    let habitsPts = 0;
    if (activeHabitsList.length > 0) {
      const todayLogs = logs.filter((l) => l.date === todayStr && l.status === 'completed');
      habitsPts = Math.min(25, Math.round((todayLogs.length / activeHabitsList.length) * 25));
    } else {
      habitsPts = 25;
    }

    // 3. Tasks score (25 pts max)
    const todayTasks = tasks.filter((t) => t.date === todayStr);
    let tasksPts = 0;
    if (todayTasks.length > 0) {
      const completedToday = todayTasks.filter((t) => t.completed).length;
      tasksPts = Math.round((completedToday / todayTasks.length) * 25);
    } else {
      tasksPts = 25;
    }

    // 4. Focus minutes score (20 pts max - 1 pt per 5 mins up to 100 mins)
    const todayFocusMins = studyStats.todayStudyMinutes;
    const focusPts = Math.min(20, Math.round(todayFocusMins / 5));

    const total = goalsPts + habitsPts + tasksPts + focusPts;

    return {
      total: Math.min(100, Math.max(0, total)),
      breakdown: {
        goals: { earned: goalsPts, max: 30 },
        habits: { earned: habitsPts, max: 25 },
        tasks: { earned: tasksPts, max: 25 },
        focus: { earned: focusPts, max: 20 },
      },
    };
  }, [goals, habits, logs, tasks, studyStats, todayStr]);

  // Overall streak calculation
  const uniqueDates = [...new Set<string>(logs.filter((l) => l.status === 'completed').map((l) => l.date))].sort();
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  let prevDate: string | null = null;

  for (const d of uniqueDates) {
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diff = Math.floor((new Date(d).getTime() - new Date(prevDate).getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) tempStreak++;
      else tempStreak = 1;
    }
    if (tempStreak > bestStreak) bestStreak = tempStreak;
    prevDate = d;
  }

  if (prevDate) {
    const diff = Math.floor((new Date(todayStr).getTime() - new Date(prevDate).getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 1) currentStreak = tempStreak;
    else currentStreak = 0;
  }

  // Habits Analysis
  const activeHabits = habits.filter((h) => !h.archived);

  // Tasks Analysis
  const completedTasks = tasks.filter((t) => t.completed);
  const taskCompletionRate = tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  const overdueTasks = tasks.filter((t) => !t.completed && new Date(t.date || '') < new Date());

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
    { id: 'study', label: 'Study & Subjects' },
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
              Verified Data Insights
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

      {/* Tabs */}
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
              key={activeTab}
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
                        <span className="text-[10px] font-bold uppercase tracking-widest text-accent-primary block mb-1">
                          Productivity Score
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-white">{productivityScore.total}</span>
                          <span className="text-sm font-semibold text-[#7d8495]">/ 100 pts</span>
                        </div>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary font-black text-lg">
                        <Zap className="w-6 h-6 fill-accent-primary" />
                      </div>
                    </div>

                    {/* Transparent Breakdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-xs">
                      <div className="p-2.5 rounded-xl bg-white/[0.02]">
                        <span className="text-[10px] text-[#7d8495] block">Goals</span>
                        <span className="font-bold text-white">
                          {productivityScore.breakdown.goals.earned}/{productivityScore.breakdown.goals.max} pts
                        </span>
                      </div>
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
                        <span className="text-[10px] text-[#7d8495] block">Focus</span>
                        <span className="font-bold text-white">
                          {productivityScore.breakdown.focus.earned}/{productivityScore.breakdown.focus.max} pts
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Streak & Consistency Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <span className="text-[10px] font-bold text-[#7d8495] uppercase tracking-wider block">
                        Overall Streak
                      </span>
                      <div className="text-3xl font-black text-white flex items-center gap-1.5">
                        <Flame className="w-6 h-6 fill-accent-primary text-accent-primary" />
                        <span>{currentStreak}d</span>
                      </div>
                      <span className="text-[11px] text-[#7d8495] block">Best: {bestStreak} days</span>
                    </div>

                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <span className="text-[10px] font-bold text-[#7d8495] uppercase tracking-wider block">
                        Study Time (Week)
                      </span>
                      <div className="text-3xl font-black text-white flex items-center gap-1.5">
                        <Clock className="w-6 h-6 text-blue-400" />
                        <span>{Math.floor(studyStats.weeklyStudyMinutes / 60)}h</span>
                      </div>
                      <span className="text-[11px] text-[#7d8495] block">
                        {studyStats.sessionCount} total sessions logged
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* STUDY & SUBJECTS TAB */}
              {activeTab === 'study' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5">
                      <span className="text-[10px] font-bold text-[#7d8495] uppercase tracking-wider block mb-1">
                        Today's Focus
                      </span>
                      <div className="text-2xl font-black text-accent-primary">
                        {studyStats.todayStudyMinutes}m
                      </div>
                    </div>
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5">
                      <span className="text-[10px] font-bold text-[#7d8495] uppercase tracking-wider block mb-1">
                        Weekly Total
                      </span>
                      <div className="text-2xl font-black text-white">
                        {Math.floor(studyStats.weeklyStudyMinutes / 60)}h {studyStats.weeklyStudyMinutes % 60}m
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
                      Subject Time Distribution
                    </h3>

                    {subjectData.length === 0 ? (
                      <p className="text-xs text-[#7d8495] py-4 text-center">
                        No subject study sessions logged yet. Use the focus timer during your study sessions!
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

              {/* HABITS TAB */}
              {activeTab === 'habits' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <div className="text-2xl font-black text-white">{activeHabits.length}</div>
                      <div className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">Active Habits</div>
                    </div>
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <div className="text-2xl font-black text-white">{logs.filter((l) => l.status === 'completed').length}</div>
                      <div className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">Total Completions</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white pl-1">Habit Consistency</h3>
                    {activeHabits.map((habit) => {
                      const habitLogs = logs.filter((l) => l.habitId === habit.id && l.status === 'completed');
                      return (
                        <div key={habit.id} className="p-4 rounded-2xl bg-surface-card border border-white/5 flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-white">{habit.name}</h4>
                            <span className="text-[10px] text-[#7d8495]">{habitLogs.length} days logged</span>
                          </div>
                          <span className="text-xs font-bold text-accent-primary">Active</span>
                        </div>
                      );
                    })}
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
                    {goals.map((g) => (
                      <div key={g.id} className="p-4 rounded-2xl bg-surface-card border border-white/5 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-white">{g.title}</span>
                          <span className="text-xs font-bold text-accent-primary">
                            {g.dailyTarget ? `${g.dailyTarget} ${g.unit}/day` : `${g.currentProgress}/${g.target} ${g.unit}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TASKS TAB */}
              {activeTab === 'tasks' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 rounded-3xl bg-surface-card border border-white/5 space-y-1">
                      <div className="text-2xl font-black text-white">{tasks.length}</div>
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
                </div>
              )}

              {/* JOURNAL TAB */}
              {activeTab === 'journal' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-3xl bg-surface-card border border-white/5">
                    <div className="text-2xl font-black text-white">{journals.length}</div>
                    <div className="text-[10px] font-semibold text-[#7d8495] uppercase tracking-wider">Total Entries Logged</div>
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
