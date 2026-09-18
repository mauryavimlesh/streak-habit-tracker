import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Plus, Dumbbell, Droplets, Moon, Lightbulb, Check, Flame, Activity, Clock, CheckCircle2, Calendar as CalendarIcon, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router';
import { getUserHabits, getHabitLogs, logHabit, seedDefaultHabits, Habit, HabitLog, deleteHabit, readLocalHabits, readLocalLogs } from '../lib/habitService';
import { TaskItem, subscribeToTasks, toggleTaskComplete, deleteTask } from '../lib/taskService';
import { getUserActivities, Activity as FocusActivity } from '../lib/activityService';
import { getUserGoals, Goal, readLocalGoals, logDailyGoalProgressQuick, getTodayGoalProgress, calculateGoalStreak } from '../lib/goalService';
import { readLocalSleepSettings, format24To12 } from '../lib/sleepService';
import { Target, Award, Sparkles, SlidersHorizontal } from 'lucide-react';
import { DailyReflection } from '../components/ui/DailyReflection';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';
import { SleepModal } from '../components/ui/SleepModal';
import { ShareModal } from '../components/ui/ShareModal';
import { StreakShareCard } from '../components/ui/StreakShareCard';
import { cn } from '../lib/utils';
import { Edit2, Trash2, Share } from 'lucide-react';
import UserAvatar from '../components/profile/UserAvatar';
import confetti from 'canvas-confetti';
import { HabitConsistencyHeatmap } from '../components/ui/HabitConsistencyHeatmap';
import { getTodayDateKey, addDays } from '../lib/dateUtils';
import { ActiveTimerWidget } from "../components/home/ActiveTimerWidget";

// Reference authentic default habits matching the design reference
const DEFAULT_HABITS: Habit[] = [
  {
    id: 'default-1',
    userId: 'default',
    name: 'Morning Workout',
    category: 'fitness',
    icon: 'dumbbell',
    color: 'lime',
    frequencyType: 'daily',
    frequencyValue: [],
    targetType: 'count',
    targetValue: 30,
    targetUnit: 'min',
    reminderTime: '08:00',
  },
  {
    id: 'default-2',
    userId: 'default',
    name: 'Drink Water',
    category: 'health',
    icon: 'droplets',
    color: 'cyan',
    frequencyType: 'daily',
    frequencyValue: [],
    targetType: 'count',
    targetValue: 8,
    targetUnit: 'glasses',
    reminderTime: '10:00',
  },
  {
    id: 'default-3',
    userId: 'default',
    name: 'Sleep 8 Hours',
    category: 'health',
    icon: 'moon',
    color: 'violet',
    frequencyType: 'daily',
    frequencyValue: [],
    targetType: 'count',
    targetValue: 8,
    targetUnit: 'hours',
    reminderTime: '22:30',
  },
];

export default function Home() {
  const { profile, user, isGuest } = useAuth();
  const navigate = useNavigate();
  // useTimer removed to prevent global rerenders

  // Prefer user's real or guest name
  const userName = profile?.displayName?.split(' ')[0] || profile?.userName?.split(' ')[0] || profile?.name?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Guest';
  const userInitial = userName.charAt(0).toUpperCase();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [todayTasks, setTodayTasks] = useState<TaskItem[]>([]);
  const [allTasks, setAllTasks] = useState<TaskItem[]>([]);
  const [activities, setActivities] = useState<FocusActivity[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New state variables for Habit Notes and Sync Toast
  const [habitNotes, setHabitNotes] = useState<Record<string, string>>({});
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);

  // Deletion states
  const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  // Sleep tracking state
  const [editingSleepHabit, setEditingSleepHabit] = useState<Habit | null>(null);

  // Local progress values for instant responsive Apple OS feedback
  const [localProgress, setLocalProgress] = useState<Record<string, number>>({
    'default-1': 0,
    'default-2': 1, // Matches 1 / 8 glasses from screenshot
    'default-3': 0,
  });

  const [todayStr, setTodayStr] = useState<string>(() => getTodayDateKey());

  // Check for midnight rollover and update active day
  useEffect(() => {
    const checkDateRollover = () => {
      const currentKey = getTodayDateKey();
      setTodayStr((prev) => (prev !== currentKey ? currentKey : prev));
    };

    const interval = setInterval(checkDateRollover, 60000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkDateRollover();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Real-time task synchronization
  useEffect(() => {
    const unsubscribe = subscribeToTasks(user?.uid, (tasksData) => {
      setAllTasks(tasksData);
      const filtered = tasksData.filter((t) => t.date === todayStr);
      setTodayTasks(filtered);
    });
    return () => unsubscribe();
  }, [user, todayStr]);

  useEffect(() => {
    const lastSyncStr = localStorage.getItem('lastSyncTime');
    if (lastSyncStr) {
      const lastSyncTime = parseInt(lastSyncStr, 10);
      if (Date.now() - lastSyncTime > 7 * 24 * 60 * 60 * 1000) {
        setSyncToastMessage("It's been over 7 days since your last backup. Tap to sync now.");
      }
    } else {
      localStorage.setItem('lastSyncTime', Date.now().toString());
    }
  }, []);

  const fetchExtraData = async () => {
    if (user) {
      const { ensureDailyGoalTasks } = await import('../lib/goalService');
      await ensureDailyGoalTasks(user.uid);
      const [a, g] = await Promise.all([
        getUserActivities(user.uid),
        getUserGoals(user.uid)
      ]);
      setActivities(a);
      setGoals(g);
    } else {
      const { ensureDailyGoalTasks } = await import('../lib/goalService');
      await ensureDailyGoalTasks();
      setGoals(readLocalGoals());
    }
  };

  const loadData = async () => {
    if (!user) {
      const localHabits = readLocalHabits();
      const habitsToUse = localHabits.length > 0 ? localHabits : DEFAULT_HABITS;
      setHabits(habitsToUse);
      const localLogs = readLocalLogs();
      setLogs(localLogs);

      const progressMap: Record<string, number> = {};
      const todayString = getTodayDateKey();
      localLogs.forEach((l) => {
        if (l.date === todayString) {
          progressMap[l.habitId] = l.progressValue ?? (l.status === 'completed' ? 1 : 0);
        }
      });
      setLocalProgress((prev) => ({ ...prev, ...progressMap }));
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const todayString = getTodayDateKey();

      const [fetchedHabits, fetchedLogs] = await Promise.all([
        getUserHabits(user.uid),
        getHabitLogs(user.uid),
      ]);

      setLogs(fetchedLogs);
      if (fetchedHabits.length > 0) {
        setHabits(fetchedHabits);
        const progressMap: Record<string, number> = {};
        const noteMap: Record<string, string> = {};
        fetchedLogs.forEach((l) => {
          if (l.date === todayString) {
            progressMap[l.habitId] = l.progressValue ?? (l.status === 'completed' ? 1 : 0);
            if (l.note) {
               noteMap[l.habitId] = l.note;
            }
          }
        });
        setLocalProgress((prev) => ({ ...prev, ...progressMap }));
        setHabitNotes((prev) => ({ ...prev, ...noteMap }));
      } else {
        const isInit = localStorage.getItem(`streak_habits_initialized_${user.uid}`);
        if (!isInit) {
          const seeded = await seedDefaultHabits(user.uid);
          setHabits(seeded.length > 0 ? seeded : []);
        } else {
          setHabits([]);
        }
      }
      setLogs(fetchedLogs);
    } catch (err) {
      console.error(err);
      setHabits([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExtraData();
    loadData();

    const onHabitsUpdated = () => loadData();
    const onSleepUpdated = () => loadData();
    const onGoalsUpdated = () => fetchExtraData();

    window.addEventListener('streak_habits_updated', onHabitsUpdated);
    window.addEventListener('streak_sleep_updated', onSleepUpdated);
    window.addEventListener('streak_goals_updated', onGoalsUpdated);

    return () => {
      window.removeEventListener('streak_habits_updated', onHabitsUpdated);
      window.removeEventListener('streak_sleep_updated', onSleepUpdated);
      window.removeEventListener('streak_goals_updated', onGoalsUpdated);
    };
  }, [user]);

  // Derived stats for share card
  const totalStudyMinutes = activities.reduce((acc, a) => acc + (a.durationMinutes || 0) + Math.floor((a.durationSeconds || 0)/60), 0);
  const shareStudyHours = Math.floor(totalStudyMinutes / 60);
  const shareStudyMinutes = totalStudyMinutes % 60;
  
  const completedTasksCountShare = allTasks.filter(t => t.completed).length;
  const totalTasksCountShare = allTasks.length;
  
  const activeGoalsShare = goals.filter(g => g.status === 'in_progress').length;
  const completedGoalsShare = goals.filter(g => g.status === 'completed').length;

  // Determine step size for incrementing
  const getStep = (habit: Habit) => {
    if (habit.targetUnit === 'min') return 5;
    return 1;
  };

  // Check how many habits are completed today
  const isHabitCompleted = (habit: Habit) => {
    const currentVal = localProgress[habit.id!] ?? 0;
    const target = habit.targetValue || 1;
    return currentVal >= target;
  };

  const displayedHabits = !user ? (habits.length > 0 ? habits : DEFAULT_HABITS) : habits;
  
  const habitNames = new Set(displayedHabits.map(h => h.name.trim().toLowerCase()));
  const uniqueTasks = todayTasks.filter(t => !habitNames.has(t.title.trim().toLowerCase()));

  // Sort habits by relevance: incomplete/pending habits first, then completed
  const sortedHabits = [...displayedHabits].sort((a, b) => {
    const aDone = isHabitCompleted(a);
    const bDone = isHabitCompleted(b);
    if (aDone !== bDone) return aDone ? 1 : -1;
    return 0;
  });

  // Sort tasks by relevance: incomplete first, high priority first, then by time
  const sortedTasks = [...uniqueTasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.priority === 'high' && b.priority !== 'high') return -1;
    if (b.priority === 'high' && a.priority !== 'high') return 1;
    if (a.time && b.time) return a.time.localeCompare(b.time);
    return 0;
  });

  const visibleHabits = sortedHabits.slice(0, 4);
  const visibleTasks = sortedTasks.slice(0, 4);

  const completedHabitsCount = displayedHabits.filter(isHabitCompleted).length;
  const totalCount = displayedHabits.length || 3;
  const progressPercentage = totalCount === 0 ? 0 : Math.round((completedHabitsCount / totalCount) * 100);
  const leftCount = Math.max(0, totalCount - completedHabitsCount);

  // Quick action / stepper click handler
  const handleIncrement = async (e: React.MouseEvent, habit: Habit) => {
    e.stopPropagation();
    const habitId = habit.id!;
    const target = habit.targetValue || 1;
    const step = getStep(habit);
    const current = localProgress[habitId] ?? 0;

    const nextVal = current >= target ? 0 : Math.min(target, current + step);

    // Optimistic UI state
    setLocalProgress((prev) => ({ ...prev, [habitId]: nextVal }));

    const isDone = nextVal >= target;
    const wasCompleted = current >= target;

    // Physical feedback via navigator.vibrate() when marking habits as done for a tactile OS feel
    if (isDone && !wasCompleted) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          // Premium Apple OS double-pulse confirmation haptic
          navigator.vibrate([40, 50, 35]);
        } catch {
          // Ignore if unsupported or restricted
        }
      }
    } else if (nextVal > current) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          // Subtle micro-tap for incremental step
          navigator.vibrate(18);
        } catch {
          // Ignore
        }
      }
    } else if (nextVal === 0 && wasCompleted) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          // Subtle release tap
          navigator.vibrate(12);
        } catch {
          // Ignore
        }
      }
    }

    let newStatus: 'completed' | 'partial' | 'in_progress' | 'missed';
    if (isDone) {
      newStatus = 'completed';
    } else if (nextVal > 0) {
      newStatus = 'partial';
    } else {
      newStatus = 'missed';
    }

    try {
      await logHabit({
        userId: user?.uid || 'guest',
        habitId: habitId,
        date: todayStr,
        status: newStatus,
        progressValue: nextVal,
      });
    } catch (err) {
      console.error('Failed to log habit:', err);
    }
  };

  const saveNote = async (habit: Habit, note: string) => {
    const current = localProgress[habit.id!] ?? 0;
    const target = habit.targetValue || 1;
    try {
      await logHabit({
        userId: user?.uid || 'guest',
        habitId: habit.id!,
        date: todayStr,
        status: current >= target ? 'completed' : 'missed',
        progressValue: current,
        note: note
      });
      setHabitNotes((prev) => ({ ...prev, [habit.id!]: note }));
      setSyncToastMessage('Note saved!');
      setTimeout(() => setSyncToastMessage(null), 2200);
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  // Direct toggle habit completion (e.g. tapping the card or checkmark)
  const handleToggleHabitComplete = async (habit: Habit) => {
    const habitId = habit.id!;
    const target = habit.targetValue || 1;
    const current = localProgress[habitId] ?? 0;
    const isCurrentlyDone = current >= target;

    const nextVal = isCurrentlyDone ? 0 : target;
    setLocalProgress((prev) => ({ ...prev, [habitId]: nextVal }));

    // Tactile 'premium OS' feedback via navigator.vibrate()
    if (!isCurrentlyDone) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          // Double-pulse confirmation vibration when marking a habit as done
          navigator.vibrate([40, 60, 40]);
        } catch {
          // Ignore
        }
      }
      
      // Check if this completes the final habit for today
      if (nextVal >= target) {
        const willBeCompletedCount = displayedHabits.filter(h => {
          if (h.id === habitId) return true;
          return isHabitCompleted(h);
        }).length;
        
        if (willBeCompletedCount === totalCount && totalCount > 0) {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['var(--app-accent)', '#ffffff', '#22361b']
          });
        }
      }
    } else {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(15);
        } catch {
          // Ignore
        }
      }
    }

    try {
      const status = nextVal >= target ? 'completed' : 'missed';
      await logHabit({
        userId: user?.uid || 'guest',
        habitId: habitId,
        date: todayStr,
        status,
        progressValue: nextVal,
        note: habitNotes[habitId] || undefined,
      });
      setLogs(prev => {
        const idx = prev.findIndex(l => l.habitId === habitId && l.date === todayStr);
        if (idx !== -1) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], status, progressValue: nextVal };
          return copy;
        }
        return [...prev, { habitId, date: todayStr, status, progressValue: nextVal } as any];
      });
    } catch (err) {
      console.error('Failed to log habit:', err);
    }
  };

  // Direct toggle task completion on the dashboard with tactile OS feedback
  const handleToggleTask = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    
    // Find task and determine target state for instant UI update
    const currentTask = todayTasks.find((t) => t.id === taskId);
    const willBeCompleted = currentTask ? !currentTask.completed : true;

    // Tactile 'premium OS' feedback using navigator.vibrate() when a user marks a task as done
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (willBeCompleted) {
          // Apple OS double-pulse confirmation vibration
          navigator.vibrate([40, 60, 40]);
        } else {
          // Subtle micro-pulse on un-checking
          navigator.vibrate(15);
        }
      } catch {
        // Ignore if blocked or unsupported
      }
    }

    // Optimistic UI state
    setTodayTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: willBeCompleted } : t))
    );

    try {
      await toggleTaskComplete(taskId, user?.uid);
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };


  const getGlobalStreak = () => {
    // Collect all dates where at least one habit was completed
    const completedDates = new Set<string>();
    logs.forEach(l => {
      if (l.status === 'completed' || (l.progressValue && l.progressValue > 0)) {
        completedDates.add(l.date);
      }
    });
    
    if (completedDates.size === 0) return 0;
    
    const today = getTodayDateKey();
    const yesterdayStr = addDays(today, -1);
    const hasToday = completedDates.has(today);
    const hasYesterday = completedDates.has(yesterdayStr);
    
    if (!hasToday && !hasYesterday) {
      return 0; // Streak broken
    }
    
    let cursor = hasToday ? today : yesterdayStr;
    let currentStreak = 0;
    
    while (completedDates.has(cursor)) {
      currentStreak++;
      cursor = addDays(cursor, -1);
    }
    
    return currentStreak;
  };
  const handleConfirmDeleteHabit = async () => {
    if (!deletingHabit) return;
    setIsDeleting(true);
    await deleteHabit(deletingHabit.id!, user?.uid);
    setHabits(prev => prev.filter(h => h.id !== deletingHabit.id));
    setDeletingHabit(null);
    setIsDeleting(false);
  };

  const handleConfirmDeleteTask = async () => {
    if (!deletingTask) return;
    setIsDeleting(true);
    await deleteTask(deletingTask.id!, user?.uid);
    setDeletingTask(null);
    setIsDeleting(false);
  };

  const globalStreak = getGlobalStreak();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Icon and color mapping to replicate exact Apple OS aesthetic
  const getHabitVisuals = (habit: Habit) => {
    const nameLower = habit.name.toLowerCase();
    if (nameLower.includes('workout') || nameLower.includes('exercise') || habit.icon === 'dumbbell') {
      return {
        icon: <Dumbbell className="w-6 h-6 rotate-[-15deg]" strokeWidth={2.2} />,
        bg: 'bg-[#22361b]',
        text: 'text-accent-primary',
        ringColor: 'var(--app-accent)',
      };
    }
    if (nameLower.includes('water') || habit.icon === 'droplets') {
      return {
        icon: <Droplets className="w-6 h-6" strokeWidth={2.2} />,
        bg: 'bg-[#132935]',
        text: 'text-accent-primary',
        ringColor: 'var(--app-accent)',
      };
    }
    if (nameLower.includes('sleep') || habit.icon === 'moon') {
      return {
        icon: <Moon className="w-6 h-6" strokeWidth={2.2} />,
        bg: 'bg-[#281e39]',
        text: 'text-[#a78bfa]',
        ringColor: '#a78bfa',
      };
    }
    return {
      icon: <Activity className="w-6 h-6" strokeWidth={2.2} />,
      bg: 'bg-[#242936]',
      text: 'text-white/80',
      ringColor: 'var(--app-accent)',
    };
  };

  // Date formatted as "Saturday, September 12"
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const handleFocusClick = () => {
    navigate('/activity');
  };

  return (
    <div className="p-5 max-w-md mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between pt-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[14px] font-medium text-[#7d8495] tracking-tight">
              {formattedDate}
            </p>
            {isGuest && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-[10px] font-semibold text-accent-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
                Guest Session
              </span>
            )}
          </div>
          <h1 className="text-[34px] leading-[1.12] font-bold text-white tracking-tight">
            {getGreeting()},<br />{userName}
          </h1>
        </div>

        {/* Right Avatar Button */}
        <UserAvatar
          avatarUrl={profile?.avatarUrl}
          name={userName}
          size="md"
          onClick={() => navigate('/more')}
          className="cursor-pointer active:scale-95 transition-transform"
        />
      </header>

      {/* Today's Progress Card */}
      <div className="glass-effect rounded-[28px] p-6 flex items-center gap-5">
        {/* Left circular progress widget */}
        <div className="w-[114px] h-[114px] rounded-full bg-[#161922] border border-[#212633] flex items-center justify-center relative p-1 shrink-0">
          <svg className="w-[96px] h-[96px] transform -rotate-90" viewBox="0 0 96 96">
            {/* Dark background track */}
            <circle
              cx="48"
              cy="48"
              r="38"
              stroke="#1c222b"
              strokeWidth="9"
              fill="none"
            />
            {/* Progress arc */}
            {progressPercentage > 0 && (
              <circle
                cx="48"
                cy="48"
                r="38"
                stroke="var(--app-accent)"
                strokeWidth="9"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 38}`}
                strokeDashoffset={`${2 * Math.PI * 38 * (1 - progressPercentage / 100)}`}
                className="transition-all duration-700 ease-out"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[26px] font-bold text-white tracking-tight leading-none">
              {progressPercentage}%
            </span>
            <span className="text-[12px] font-medium text-[#7a8192] mt-0.5 tracking-tight">
              today
            </span>
          </div>
        </div>

        {/* Right side info */}
        <div className="flex-1">
          <p className="text-[13.5px] font-medium text-[#7d8495] mb-0.5">Today's progress</p>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-4xl font-extrabold text-white tracking-tight">
              {completedHabitsCount}
            </span>
            <span className="text-2xl font-semibold text-[#7d8495]">
              / {totalCount}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Streak badge */}
            <div className="bg-[#1e3419] border border-[#2d5025] text-accent-primary px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-semibold">
              <Flame className="w-3.5 h-3.5 fill-accent-primary/25 stroke-accent-primary" />
              <span>{globalStreak} {globalStreak === 1 ? 'day' : 'days'}</span>
            </div>

            {/* Score badge */}
            <div className="bg-[#1a1d25] border border-[#262b36] text-[#9ca2b2] px-3.5 py-1.5 rounded-full text-xs font-semibold">
              Score {globalStreak * 10}
            </div>

            {/* Share button */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Share className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Coach Banner */}
      <div className="glass-effect rounded-[28px] p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-[#271f38] border border-[#3b2e55] flex items-center justify-center shrink-0">
          <Lightbulb className="w-5 h-5 text-[#a78bfa]" strokeWidth={2.2} />
        </div>
        <div>
          <p className="text-[14.5px] text-[#dbe0ea] leading-relaxed font-normal">
            Your strongest completion window is 9–12 AM. Try scheduling your hardest habit then.
          </p>
          <button
            onClick={() => navigate('/ai-coach')}
            className="text-accent-primary hover:text-[#a5ff36] font-semibold text-[13.5px] mt-2.5 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            Ask the AI Coach
          </button>
        </div>
      </div>

      {/* Focus Timer Section */}
      <ActiveTimerWidget />
      {/* Daily Goals Section (Requirement 21) */}
      {(() => {
        const dailyGoals = goals.filter((g) => g.type === 'daily' && g.status !== 'paused');
        if (dailyGoals.length === 0) return null;

        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[14px] font-semibold text-[#828899] tracking-tight flex items-center gap-2">
                <Target className="w-4 h-4 text-accent-primary" /> Daily Goals
              </h3>
              <button
                onClick={() => navigate('/goals')}
                className="text-xs font-semibold text-accent-primary hover:underline cursor-pointer"
              >
                View all
              </button>
            </div>

            <div className="space-y-2.5">
              {dailyGoals.map((goal) => {
                const todayProgress = getTodayGoalProgress(goal, todayStr);
                const dailyTarget = goal.dailyTarget || goal.target || 1;
                const isCompleted = todayProgress >= dailyTarget;
                const streak = calculateGoalStreak(goal);
                const pct = Math.min(100, Math.round((todayProgress / dailyTarget) * 100));

                return (
                  <div
                    key={goal.id}
                    className="glass-effect rounded-[24px] p-4 border border-[#232938] space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-bold text-white truncate">{goal.title}</span>
                          {isCompleted ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="w-3 h-3" /> Done
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                              {Math.max(0, dailyTarget - todayProgress)} {goal.unit || 'units'} left
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#8c94a6] mt-0.5 flex items-center gap-2">
                          <span>
                            {todayProgress} / {dailyTarget} {goal.unit || 'units'} ({pct}%)
                          </span>
                          {streak.currentStreak > 0 && (
                            <span className="text-accent-primary font-bold flex items-center gap-0.5">
                              <Flame className="w-3 h-3 fill-accent-primary" /> {streak.currentStreak}d streak
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick log buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            await logDailyGoalProgressQuick(goal.id, todayStr, 1, user?.uid);
                            fetchExtraData();
                            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                              navigator.vibrate(30);
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-xs font-bold text-white border border-white/5 transition-all cursor-pointer"
                        >
                          +1
                        </button>
                        {dailyTarget >= 5 && (
                          <button
                            type="button"
                            onClick={async () => {
                              await logDailyGoalProgressQuick(goal.id, todayStr, 5, user?.uid);
                              fetchExtraData();
                              if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                                navigator.vibrate([30, 40]);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-xs font-bold text-white border border-white/5 transition-all cursor-pointer"
                          >
                            +5
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            const needed = Math.max(0, dailyTarget - todayProgress);
                            await logDailyGoalProgressQuick(goal.id, todayStr, needed > 0 ? needed : 1, user?.uid);
                            fetchExtraData();
                            confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
                          }}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            isCompleted
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 border border-accent-primary/30'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-[#1b1f2b] h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-primary transition-all duration-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Habits List Section */}
      <div>
        <div className="flex items-center justify-between px-1 mb-3">
          <h3 className="text-[14px] font-semibold text-[#828899] tracking-tight">
            Up next · {leftCount} left
          </h3>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/habits/new')}
              className="text-accent-primary hover:text-[#a5ff36] text-[14px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Add
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-sm text-[#7d8495] py-12">Loading habits...</div>
        ) : visibleHabits.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-[24px] bg-[#161922] border border-[#212633]">
            <p className="text-[14px] text-[#7d8495] mb-3">No active habits yet.</p>
            <button
              onClick={() => navigate('/habits/new')}
              className="text-xs font-semibold px-4 py-2 rounded-full bg-accent-primary text-black inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add your first habit
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleHabits.map((habit) => {
              const visuals = getHabitVisuals(habit);
              const currentVal = localProgress[habit.id!] ?? 0;
              const target = habit.targetValue || 1;
              const isCompleted = currentVal >= target;
              const step = getStep(habit);
              const progressRatio = Math.min(1, currentVal / target);

              let subtitle = '';
              let badge: React.ReactNode = null;
              
              if (habit.name.toLowerCase().includes('sleep')) {
                const sleepLog = logs.find(l => l.habitId === habit.id && l.date === todayStr);
                const actualSleep = sleepLog?.progressValue || 0;
                const bedtimeFmt = habit.sleepBedtime ? format24To12(habit.sleepBedtime) : '11:00 PM';
                const wakeFmt = habit.sleepWakeTime ? format24To12(habit.sleepWakeTime) : '07:00 AM';
                
                if (actualSleep > 0) {
                    subtitle = `${actualSleep}h logged / ${target}h goal • ${bedtimeFmt} → ${wakeFmt}`;
                    if (actualSleep >= target) {
                        badge = <span className="ml-2 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full border border-emerald-400/20">Target Met</span>;
                    } else {
                        badge = <span className="ml-2 text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full border border-amber-400/20">Partial ({Math.round((actualSleep / target) * 100)}%)</span>;
                    }
                } else {
                  subtitle = `${bedtimeFmt} → ${wakeFmt} • Target: ${target}h`;
                }
              } else {
                subtitle = `${currentVal} / ${target} ${habit.targetUnit || 'times'}`;
              }

              return (
                <div key={habit.id} className="flex flex-col gap-2">
                <div
                  onClick={() => {
                    if (habit.name.toLowerCase().includes('sleep')) {
                      setEditingSleepHabit(habit);
                    } else {
                      handleToggleHabitComplete(habit);
                    }
                  }}
                  className="h-[72px] rounded-full glass-effect-interactive px-3.5 flex items-center justify-between group cursor-pointer transition-all active:scale-[0.99]"
                >
                  {/* Left Icon + Text */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-[48px] h-[48px] rounded-full ${visuals.bg} ${visuals.text} flex items-center justify-center shrink-0`}
                    >
                      {visuals.icon}
                    </div>

                    <div className="flex flex-col truncate">
                      <span
                        className={cn(
                          'text-[15.5px] font-semibold tracking-tight truncate transition-all',
                          isCompleted ? 'text-white/50 line-through' : 'text-white'
                        )}
                      >
                        {habit.name}
                      </span>
                      <span className="text-[13px] font-medium text-[#7d8495] mt-0.5 flex items-center">
                        {subtitle}
                        {badge}
                      </span>
                    </div>
                  </div>

                  {/* Internal Edit/Delete Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mr-1 shrink-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate(`/habits/new?edit=${habit.id}`); }}
                      className="p-2 rounded-full hover:bg-white/10 text-[#7d8495] hover:text-white transition-colors"
                      title="Edit Habit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeletingHabit(habit); }}
                      className="p-2 rounded-full hover:bg-red-500/10 text-[#7d8495] hover:text-red-400 transition-colors"
                      title="Delete Habit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  {/* Right Action Stepper / Completion Button */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (habit.name.toLowerCase().includes('sleep')) {
                        setEditingSleepHabit(habit);
                        return;
                      }
                      if (target > 1 && !isCompleted) {
                        handleIncrement(e, habit);
                      } else {
                        handleToggleHabitComplete(habit);
                      }
                    }}
                    className="w-[42px] h-[42px] rounded-full relative flex items-center justify-center shrink-0 bg-[#1a1d25] border border-[#262b36] overflow-hidden hover:border-accent-primary/50 transition-colors"
                  >
                    {isCompleted ? (
                      <div className="w-full h-full bg-[#22361b] border border-[#2d5025] text-accent-primary flex items-center justify-center rounded-full animate-in zoom-in-75 duration-200">
                        <Check className="w-5 h-5 stroke-[3]" />
                      </div>
                    ) : (
                      <>
                        {/* Progress ring track around stepper button */}
                        {progressRatio > 0 && (
                          <svg
                            className="absolute inset-0 w-full h-full transform -rotate-90"
                            viewBox="0 0 42 42"
                          >
                            <circle
                              cx="21"
                              cy="21"
                              r="18"
                              stroke={visuals.ringColor}
                              strokeWidth="2.5"
                              fill="none"
                              strokeLinecap="round"
                              strokeDasharray={`${2 * Math.PI * 18}`}
                              strokeDashoffset={`${2 * Math.PI * 18 * (1 - progressRatio)}`}
                            />
                          </svg>
                        )}
                        <span
                          className={cn(
                            'text-xs font-bold relative z-10',
                            progressRatio > 0 ? 'text-white' : 'text-[#7d8495] group-hover:text-white'
                          )}
                        >
                          {habit.name.toLowerCase().includes('sleep') ? <Edit2 className="w-4 h-4" /> : `+${step}`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {isCompleted && (
                  <div className="px-4 mb-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <input
                      type="text"
                      placeholder="Add a quick reflection or note..."
                      value={habitNotes[habit.id!] || ''}
                      onChange={(e) => setHabitNotes(prev => ({...prev, [habit.id!]: e.target.value}))}
                      onBlur={() => saveNote(habit, habitNotes[habit.id!] || '')}
                      className="w-full bg-transparent border-b border-[#262b36] text-[13px] text-white focus:outline-none focus:border-accent-primary pb-1.5 placeholder:text-[#7d8495] transition-colors"
                    />
                  </div>
                )}

                </div>
              );
            })}

            {displayedHabits.length > 4 && (
              <div className="flex items-center justify-center pt-1 px-1">
                <button
                  type="button"
                  onClick={() => navigate('/habits')}
                  className="text-[13px] font-semibold text-accent-primary hover:text-[#a5ff36] transition-colors cursor-pointer py-1"
                >
                  View All Habits ({displayedHabits.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Habit Consistency Heatmap Component (Last 30 Days Recharts Visualization) */}
      <HabitConsistencyHeatmap
        habits={displayedHabits}
        logs={logs}
        localProgress={localProgress}
      />

      {/* Today's Tasks Section with tactile vibration feedback */}
      {todayTasks.length > 0 && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[14px] font-semibold text-[#828899] tracking-tight">
              Today's Tasks · {todayTasks.filter((t) => !t.completed).length} left
            </h3>
            <button
              onClick={() => navigate('/calendar')}
              className="text-accent-primary hover:text-[#a5ff36] text-[13px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <CalendarIcon className="w-3.5 h-3.5" /> View Calendar
            </button>
          </div>

          <div className="space-y-2.5">
            {visibleTasks.map((task) => (
              <div key={task.id} className="flex flex-col gap-2">
              <div
                onClick={(e) => handleToggleTask(e, task.id)}
                className="glass-effect-interactive rounded-[22px] px-4 py-3.5 flex items-center justify-between group cursor-pointer transition-all active:scale-[0.985]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full border flex items-center justify-center transition-all shrink-0',
                      task.completed
                        ? 'bg-[#22361b] border-[#2d5025] text-accent-primary'
                        : 'border-[#374151] group-hover:border-accent-primary/60 bg-[#161922]'
                    )}
                  >
                    {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div className="flex flex-col truncate">
                    <span
                      className={cn(
                        'text-[14.5px] font-semibold tracking-tight truncate transition-all',
                        task.completed ? 'text-white/50 line-through' : 'text-white'
                      )}
                    >
                      {task.title}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-[12px] font-medium text-[#7d8495]">
                      {task.time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#7d8495]" />
                          {task.time} {task.category ? `· ${task.category}` : ''}
                        </span>
                      )}
                      {typeof task.targetQuantity === 'number' && task.targetQuantity > 0 && (
                        <span className="text-accent-primary font-bold">
                          {task.progressQuantity ?? 0}/{task.targetQuantity} {task.unit || 'units'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      'text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0',
                      task.completed
                        ? 'bg-white/5 text-white/40'
                        : task.priority === 'high'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-[#1a1d25] text-[#9ca2b2] border border-[#262b36]'
                    )}
                  >
                    {task.completed ? 'Done' : task.type || 'Task'}
                  </span>
                  
                  {/* Internal Edit/Delete Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate('/calendar'); }}
                      className="p-1.5 rounded-full hover:bg-white/10 text-[#7d8495] hover:text-white transition-colors"
                      title="Edit Task"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeletingTask(task); }}
                      className="p-1.5 rounded-full hover:bg-red-500/10 text-[#7d8495] hover:text-red-400 transition-colors"
                      title="Delete Task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              </div>
            ))}

            {todayTasks.length > 4 && (
              <div className="flex items-center justify-center pt-1 px-1">
                <button
                  type="button"
                  onClick={() => navigate('/calendar')}
                  className="text-[13px] font-semibold text-accent-primary hover:text-[#a5ff36] transition-colors cursor-pointer py-1"
                >
                  View All Tasks ({todayTasks.length})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Daily Reflection */}
      {user && (
        <div className="pt-2">
          <DailyReflection userId={user.uid} date={todayStr} />
        </div>
      )}

      {syncToastMessage && (
        <div 
          className="fixed bottom-[100px] left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 cursor-pointer"
          onClick={() => {
            setSyncToastMessage(null);
            navigate('/sync');
          }}
        >
          <div className="bg-accent-primary text-[#1a1d25] px-5 py-3 rounded-full shadow-lg font-semibold text-sm flex items-center gap-2 whitespace-nowrap">
            <RefreshCw className="w-4 h-4" />
            {syncToastMessage}
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={Boolean(deletingHabit)}
        onClose={() => setDeletingHabit(null)}
        onConfirm={handleConfirmDeleteHabit}
        title={deletingHabit?.name || 'Habit'}
        itemType="habit"
        isDeleting={isDeleting}
      />
      
      <DeleteConfirmModal
        isOpen={Boolean(deletingTask)}
        onClose={() => setDeletingTask(null)}
        onConfirm={handleConfirmDeleteTask}
        title={deletingTask?.title || 'Task'}
        itemType="task"
        isDeleting={isDeleting}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        fileName={`streak-${globalStreak}-days`}
      >
        {(format) => (
          <StreakShareCard
            streak={globalStreak}
            userName={userName}
            totalHabits={totalCount}
            completedHabits={completedHabitsCount}
            format={format}
            studyHours={shareStudyHours}
            studyMinutes={shareStudyMinutes}
            completedTasks={completedTasksCountShare}
            totalTasks={totalTasksCountShare}
            activeGoals={activeGoalsShare}
            completedGoals={completedGoalsShare}
          />
        )}
      </ShareModal>

      {editingSleepHabit && (
        <SleepModal
          isOpen={true}
          onClose={() => setEditingSleepHabit(null)}
          habit={editingSleepHabit}
          onSaved={() => {
            loadData();
            fetchExtraData();
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate([40, 60, 40]);
            }
          }}
        />
      )}
    </div>
  );
}




