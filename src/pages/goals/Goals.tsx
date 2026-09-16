import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  Plus,
  Target,
  Calendar,
  CheckCircle2,
  Circle,
  Flag,
  Sparkles,
  X,
  Trash2,
  Check,
  Pause,
  Play,
  Award,
  Flame,
  Clock,
  RotateCcw,
  Sliders,
  Edit2,
  BookOpen,
  Dumbbell,
  Droplets,
  Laptop,
  CheckSquare,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import {
  Goal,
  GoalType,
  getUserGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  logDailyGoalProgressQuick,
  getTodayGoalProgress,
  calculateGoalStreak,
  getGoalHistoryList,
} from '../../lib/goalService';
import { cn } from '../../lib/utils';
import { ShareModal } from '../../components/ui/ShareModal';
import { StreakShareCard } from '../../components/ui/StreakShareCard';
import { Share } from 'lucide-react';
import confetti from 'canvas-confetti';

const DAILY_PRESETS = [
  { title: 'Read 20 pages', target: 20, unit: 'pages', category: 'Study' },
  { title: 'Study 2 hours', target: 2, unit: 'hours', category: 'Study' },
  { title: 'Drink 8 glasses', target: 8, unit: 'glasses', category: 'Health' },
  { title: 'Workout 30 mins', target: 30, unit: 'mins', category: 'Fitness' },
  { title: 'Code 1 hour', target: 1, unit: 'hour', category: 'Career' },
  { title: 'Meditate 10 mins', target: 10, unit: 'mins', category: 'Personal' },
];

export default function Goals() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'daily' | 'one_time' | 'completed' | 'paused'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Form states for Create / Edit
  const [goalType, setGoalType] = useState<GoalType>('daily');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('Study');
  const [formTarget, setFormTarget] = useState(20);
  const [formDailyTarget, setFormDailyTarget] = useState(20);
  const [formUnit, setFormUnit] = useState('pages');
  const [formTargetDate, setFormTargetDate] = useState('2026-12-31');
  const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [formAddToHabit, setFormAddToHabit] = useState(true);
  const [formAddToTask, setFormAddToTask] = useState(true);
  const [formSubjects, setFormSubjects] = useState<string[]>([]);
  const [subjectInput, setSubjectInput] = useState('');
  const [formMilestones, setFormMilestones] = useState<string[]>([]);
  const [milestoneInput, setMilestoneInput] = useState('');

  const todayStr = new Date().toLocaleDateString('en-CA');

  const loadGoals = async () => {
    const list = await getUserGoals(user?.uid || 'local');
    setGoals(list);
    if (selectedGoal) {
      const refreshed = list.find((g) => g.id === selectedGoal.id);
      if (refreshed) setSelectedGoal(refreshed);
    }
  };

  useEffect(() => {
    loadGoals();

    const onGoalsUpdated = () => {
      loadGoals();
    };
    window.addEventListener('streak_goals_updated', onGoalsUpdated);
    return () => {
      window.removeEventListener('streak_goals_updated', onGoalsUpdated);
    };
  }, [user]);

  const filteredGoals = goals.filter((g) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'daily') return g.type === 'daily';
    if (activeFilter === 'one_time') return g.type !== 'daily';
    return g.status === activeFilter;
  });

  const handleApplyPreset = (preset: (typeof DAILY_PRESETS)[0]) => {
    setGoalType('daily');
    setFormTitle(preset.title);
    setFormDailyTarget(preset.target);
    setFormTarget(preset.target);
    setFormUnit(preset.unit);
    setFormCategory(preset.category);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    await createGoal(
      {
        title: formTitle.trim(),
        description: formDesc.trim() || undefined,
        category: formCategory,
        type: goalType,
        target: goalType === 'daily' ? formDailyTarget : Number(formTarget) || 100,
        dailyTarget: goalType === 'daily' ? Number(formDailyTarget) || 1 : undefined,
        currentProgress: 0,
        unit: formUnit.trim() || 'units',
        subjects: formSubjects.length > 0 ? formSubjects : undefined,
        targetDate: formTargetDate,
        priority: formPriority,
        status: 'in_progress',
        linkToHabit: goalType === 'daily' ? formAddToHabit : false,
        linkToTask: goalType === 'daily' ? formAddToTask : false,
        milestones:
          goalType !== 'daily'
            ? formMilestones.map((m, idx) => ({
                id: 'm_' + Date.now() + '_' + idx,
                title: m,
                completed: false,
                order: idx,
              }))
            : undefined,
      },
      user?.uid || 'local'
    );

    setIsCreateOpen(false);
    resetForm();
    loadGoals();
  };

  const handleStartEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalType(goal.type || 'one_time');
    setFormTitle(goal.title);
    setFormDesc(goal.description || '');
    setFormCategory(goal.category);
    setFormTarget(goal.target);
    setFormDailyTarget(goal.dailyTarget || goal.target);
    setFormUnit(goal.unit || 'units');
    setFormSubjects(goal.subjects || []);
    setFormTargetDate(goal.targetDate || '2026-12-31');
    setFormPriority(goal.priority || 'medium');
    setFormAddToHabit(Boolean(goal.linkToHabit));
    setFormAddToTask(Boolean(goal.linkToTask));
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingGoal || !formTitle.trim()) return;

    await updateGoal(
      editingGoal.id,
      {
        title: formTitle.trim(),
        description: formDesc.trim() || undefined,
        category: formCategory,
        type: goalType,
        target: goalType === 'daily' ? formDailyTarget : Number(formTarget) || 100,
        dailyTarget: goalType === 'daily' ? Number(formDailyTarget) || 1 : undefined,
        unit: formUnit.trim() || 'units',
        subjects: formSubjects.length > 0 ? formSubjects : undefined,
        targetDate: formTargetDate,
        priority: formPriority,
        linkToHabit: goalType === 'daily' ? formAddToHabit : false,
        linkToTask: goalType === 'daily' ? formAddToTask : false,
      },
      user?.uid || 'local'
    );

    setIsEditOpen(false);
    setEditingGoal(null);
    resetForm();
    loadGoals();
  };

  const resetForm = () => {
    setGoalType('daily');
    setFormTitle('');
    setFormDesc('');
    setFormCategory('Study');
    setFormTarget(20);
    setFormDailyTarget(20);
    setFormUnit('pages');
    setFormMilestones([]);
    setMilestoneInput('');
    setFormSubjects([]);
    setSubjectInput('');
  };

  // Daily Goal fast log handler
  const handleQuickLogDaily = async (goal: Goal, delta: number) => {
    await logDailyGoalProgressQuick(goal.id, todayStr, delta, user?.uid || 'local');
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(30);
    }
    loadGoals();
  };

  const handleCompleteDaily = async (goal: Goal) => {
    const dailyTarget = goal.dailyTarget || goal.target || 1;
    const todayProgress = getTodayGoalProgress(goal, todayStr);
    const needed = Math.max(0, dailyTarget - todayProgress);
    await logDailyGoalProgressQuick(goal.id, todayStr, needed > 0 ? needed : 1, user?.uid || 'local');
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
    loadGoals();
  };

  const handleToggleMilestone = async (goal: Goal, milestoneId: string) => {
    if (!goal.milestones) return;
    const updatedMilestones = goal.milestones.map((m) =>
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );
    const completedCount = updatedMilestones.filter((m) => m.completed).length;
    const totalCount = updatedMilestones.length;
    const newProgress = Math.round((completedCount / totalCount) * goal.target);

    const updated = await updateGoal(
      goal.id,
      {
        milestones: updatedMilestones,
        currentProgress: newProgress,
        status: newProgress >= goal.target ? 'completed' : goal.status,
      },
      user?.uid || 'local'
    );

    if (updated) {
      setSelectedGoal(updated);
      loadGoals();
    }
  };

  const handleUpdateOneTimeProgress = async (goal: Goal, delta: number) => {
    const nextVal = Math.max(0, Math.min(goal.target, goal.currentProgress + delta));
    const isNowComplete = nextVal >= goal.target;
    const updated = await updateGoal(
      goal.id,
      {
        currentProgress: nextVal,
        status: isNowComplete ? 'completed' : goal.status === 'completed' ? 'in_progress' : goal.status,
      },
      user?.uid || 'local'
    );
    if (updated) {
      setSelectedGoal(updated);
      loadGoals();
    }
  };

  const handleTogglePause = async (goal: Goal) => {
    const nextStatus = goal.status === 'paused' ? 'in_progress' : 'paused';
    const updated = await updateGoal(goal.id, { status: nextStatus }, user?.uid || 'local');
    if (updated) {
      setSelectedGoal(updated);
      loadGoals();
    }
  };

  const handleDelete = async (goalId: string) => {
    if (confirm('Delete this goal permanently?')) {
      await deleteGoal(goalId, user?.uid || 'local');
      setSelectedGoal(null);
      loadGoals();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-white pb-24 select-none">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-white/10 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/more')}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Goals</h1>
            <p className="text-xs text-[#7d8495]">
              {goals.filter((g) => g.status === 'in_progress').length} active goals & habits
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          className="px-3.5 py-1.5 rounded-full bg-accent-primary text-black font-semibold text-xs flex items-center gap-1.5 shadow-[0_2px_12px_rgba(140,238,40,0.3)] hover:bg-[#9eff38] active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>New Goal</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto w-full px-5 pt-4 space-y-4">
        {/* Status Filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'All' },
            { id: 'daily', label: 'Daily Goals' },
            { id: 'one_time', label: 'One-Time' },
            { id: 'completed', label: 'Completed' },
            { id: 'paused', label: 'Paused' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as any)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer',
                activeFilter === tab.id
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-[#7d8495] hover:text-white hover:bg-white/5'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Goals List */}
        {filteredGoals.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#7d8495]">
              <Target className="w-6 h-6 text-accent-primary" />
            </div>
            <h3 className="text-base font-semibold text-white">No goals in this view</h3>
            <p className="text-xs text-[#7d8495] max-w-xs mx-auto">
              Track daily habits with daily targets or set milestone-driven long term goals.
            </p>
            <button
              onClick={() => {
                resetForm();
                setIsCreateOpen(true);
              }}
              className="mt-2 px-5 py-2.5 rounded-xl bg-accent-primary text-black font-semibold text-xs inline-flex items-center gap-2 hover:bg-[#9eff38] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create Goal</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGoals.map((goal) => {
              const isDaily = goal.type === 'daily';

              if (isDaily) {
                const todayProgress = getTodayGoalProgress(goal, todayStr);
                const dailyTarget = goal.dailyTarget || goal.target || 1;
                const percent = Math.min(100, Math.round((todayProgress / dailyTarget) * 100));
                const isTodayComplete = todayProgress >= dailyTarget;
                const streak = calculateGoalStreak(goal);

                return (
                  <motion.div
                    key={goal.id}
                    layout
                    className="p-4 rounded-2xl bg-surface-card border border-white/5 hover:border-white/15 transition-all space-y-3 group cursor-pointer"
                    onClick={() => navigate(`/goals/${goal.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                            Daily Goal
                          </span>
                          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md bg-white/5 text-[#7d8495]">
                            {goal.category}
                          </span>
                          {isTodayComplete && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Target Met
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-white group-hover:text-accent-primary transition-colors truncate">
                          {goal.title}
                        </h3>
                        {goal.description && (
                          <p className="text-xs text-[#7d8495] line-clamp-1">{goal.description}</p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-extrabold text-white">{percent}%</span>
                        <p className="text-[11px] text-[#7d8495]">
                          {todayProgress} / {dailyTarget} {goal.unit}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-black/50 overflow-hidden border border-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className={cn(
                          'h-full rounded-full',
                          isTodayComplete
                            ? 'bg-accent-primary'
                            : 'bg-gradient-to-r from-accent-primary/80 to-accent-primary'
                        )}
                      />
                    </div>

                    {/* Footer Controls with Quick Log Buttons */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-3 text-xs text-[#7d8495]">
                        <span className="flex items-center gap-1 font-bold text-accent-primary">
                          <Flame className="w-3.5 h-3.5 fill-accent-primary" /> {streak}d streak
                        </span>
                        <span>
                          {isTodayComplete ? 'Completed today' : `${Math.max(0, dailyTarget - todayProgress)} ${goal.unit} left`}
                        </span>
                      </div>

                      <div
                        className="flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleQuickLogDaily(goal, 1)}
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-[11px] font-bold text-white border border-white/10 transition-colors"
                        >
                          +1
                        </button>
                        {dailyTarget >= 5 && (
                          <button
                            type="button"
                            onClick={() => handleQuickLogDaily(goal, 5)}
                            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-[11px] font-bold text-white border border-white/10 transition-colors"
                          >
                            +5
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCompleteDaily(goal)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                            isTodayComplete
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 border border-accent-primary/30'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              }

              // One-Time Goal Card
              const percent = Math.min(100, Math.round((goal.currentProgress / (goal.target || 1)) * 100));
              const isCompleted = goal.status === 'completed' || percent >= 100;

              return (
                <motion.div
                  key={goal.id}
                  layout
                  onClick={() => navigate(`/goals/${goal.id}`)}
                  className="p-4 rounded-2xl bg-surface-card border border-white/5 hover:border-white/15 transition-all cursor-pointer space-y-3 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md bg-white/5 text-[#7d8495]">
                          {goal.category}
                        </span>
                        {goal.status === 'paused' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                            Paused
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-accent-primary/10 text-accent-primary border border-accent-primary/20 flex items-center gap-1">
                            <Award className="w-3 h-3" /> Done
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-accent-primary transition-colors">
                        {goal.title}
                      </h3>
                      {goal.description && (
                        <p className="text-xs text-[#7d8495] line-clamp-1">{goal.description}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-base font-extrabold text-white">{percent}%</span>
                      <p className="text-[11px] text-[#7d8495]">
                        {goal.currentProgress}/{goal.target} {goal.unit}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-black/50 overflow-hidden border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={cn(
                        'h-full rounded-full',
                        isCompleted
                          ? 'bg-accent-primary'
                          : 'bg-gradient-to-r from-accent-primary/80 to-accent-primary'
                      )}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#7d8495] pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-accent-primary" /> Target: {goal.targetDate}
                    </span>
                    {goal.milestones && goal.milestones.length > 0 && (
                      <span>
                        {goal.milestones.filter((m) => m.completed).length}/{goal.milestones.length}{' '}
                        milestones
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Goal Detail Modal */}
      <AnimatePresence>
        {selectedGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGoal(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-surface-card border border-white/10 rounded-3xl p-5 z-10 space-y-4 max-h-[88vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                      {selectedGoal.type === 'daily' ? 'Daily Goal' : 'One-Time Goal'}
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-[#7d8495] bg-white/5 px-2 py-0.5 rounded-md">
                      {selectedGoal.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white leading-snug">{selectedGoal.title}</h3>
                  {selectedGoal.description && (
                    <p className="text-xs text-[#7d8495] mt-1">{selectedGoal.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(selectedGoal)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#7d8495] hover:text-white"
                    title="Edit Goal"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedGoal(null)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#7d8495] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Daily Goal Interactive Section */}
              {selectedGoal.type === 'daily' ? (
                <div className="space-y-4">
                  {/* Today's Progress Box */}
                  {(() => {
                    const todayProgress = getTodayGoalProgress(selectedGoal, todayStr);
                    const dailyTarget = selectedGoal.dailyTarget || selectedGoal.target || 1;
                    const pct = Math.min(100, Math.round((todayProgress / dailyTarget) * 100));
                    const isDone = todayProgress >= dailyTarget;
                    const streak = calculateGoalStreak(selectedGoal);
                    const history = getGoalHistoryList(selectedGoal);

                    return (
                      <>
                        <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                              Today's Progress
                            </span>
                            <span className="text-sm font-extrabold text-accent-primary">
                              {todayProgress} / {dailyTarget} {selectedGoal.unit} ({pct}%)
                            </span>
                          </div>

                          <div className="w-full h-2.5 rounded-full bg-[#161922] overflow-hidden border border-white/5">
                            <div
                              className="h-full bg-accent-primary transition-all duration-300 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs text-[#7d8495]">
                              {isDone ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Target Achieved
                                </span>
                              ) : (
                                <span>{Math.max(0, dailyTarget - todayProgress)} {selectedGoal.unit} remaining</span>
                              )}
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleQuickLogDaily(selectedGoal, 1)}
                                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-xs font-bold text-white border border-white/10"
                              >
                                +1
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickLogDaily(selectedGoal, 5)}
                                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-xs font-bold text-white border border-white/10"
                              >
                                +5
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCompleteDaily(selectedGoal)}
                                className="px-3 py-1.5 rounded-xl bg-accent-primary text-black font-bold text-xs"
                              >
                                Complete
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Streak & Stats */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="text-[10px] font-bold text-[#7d8495] uppercase">Streak</div>
                            <div className="text-base font-black text-white flex items-center justify-center gap-1 mt-0.5">
                              <Flame className="w-4 h-4 fill-accent-primary text-accent-primary" /> {streak}d
                            </div>
                          </div>
                          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="text-[10px] font-bold text-[#7d8495] uppercase">Best</div>
                            <div className="text-base font-black text-white mt-0.5">
                              {selectedGoal.bestStreak || streak}d
                            </div>
                          </div>
                          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="text-[10px] font-bold text-[#7d8495] uppercase">Total Days</div>
                            <div className="text-base font-black text-white mt-0.5">
                              {selectedGoal.totalCompletedDays || (isDone ? 1 : 0)}
                            </div>
                          </div>
                        </div>

                        {/* Daily History Breakdown */}
                        <div>
                          <h4 className="text-xs font-bold text-[#7d8495] uppercase tracking-wider mb-2">
                            Recent Daily History
                          </h4>
                          {history.length === 0 ? (
                            <p className="text-xs text-[#636b7c] py-2">No past history recorded yet. Start logging today!</p>
                          ) : (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {history.slice(0, 7).map((entry) => (
                                <div
                                  key={entry.date}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/5 text-xs"
                                >
                                  <span className="font-mono text-white/80">{entry.date}</span>
                                  <span className="font-semibold text-white">
                                    {entry.progress} / {entry.target} {selectedGoal.unit}
                                  </span>
                                  {entry.completed ? (
                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                      Done
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                      Partial
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                /* One-Time Goal Progress */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-[#7d8495]">Overall Progress</span>
                      <span className="font-bold text-accent-primary">
                        {selectedGoal.currentProgress} / {selectedGoal.target} {selectedGoal.unit}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-accent-primary transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.round((selectedGoal.currentProgress / selectedGoal.target) * 100))}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateOneTimeProgress(selectedGoal, -1)}
                        className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-white border border-white/10"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateOneTimeProgress(selectedGoal, 1)}
                        className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-white border border-white/10"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateOneTimeProgress(selectedGoal, 5)}
                        className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-white border border-white/10"
                      >
                        +5
                      </button>
                    </div>
                  </div>

                  {/* Milestones */}
                  {selectedGoal.milestones && selectedGoal.milestones.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-[#7d8495] uppercase tracking-wider">
                        Milestones
                      </h4>
                      <div className="space-y-1.5">
                        {selectedGoal.milestones.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleToggleMilestone(selectedGoal, m.id)}
                            className="w-full p-2.5 rounded-xl bg-black/30 border border-white/5 flex items-center gap-3 text-left hover:border-white/15 transition-all"
                          >
                            {m.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-accent-primary shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-[#7d8495] shrink-0" />
                            )}
                            <span
                              className={cn(
                                'text-xs font-medium',
                                m.completed ? 'text-white/50 line-through' : 'text-white'
                              )}
                            >
                              {m.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 cursor-pointer"
                  title="Share Goal"
                >
                  <Share className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePause(selectedGoal)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer"
                >
                  {selectedGoal.status === 'paused' ? (
                    <>
                      <Play className="w-3.5 h-3.5" /> Resume Goal
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5" /> Pause Goal
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(selectedGoal.id)}
                  className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer"
                  title="Delete Goal"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create / Edit Goal Modal */}
      <AnimatePresence>
        {(isCreateOpen || isEditOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsCreateOpen(false);
                setIsEditOpen(false);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-surface-card border border-white/10 rounded-3xl p-5 z-10 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-base font-bold text-white">
                  {isEditOpen ? 'Edit Goal' : 'Create New Goal'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setIsEditOpen(false);
                  }}
                  className="text-[#7d8495] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Goal Type Switcher */}
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setGoalType('daily')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    goalType === 'daily'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-[#8c94a6] hover:text-white'
                  }`}
                >
                  Daily Goal
                </button>
                <button
                  type="button"
                  onClick={() => setGoalType('one_time')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    goalType === 'one_time'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-[#8c94a6] hover:text-white'
                  }`}
                >
                  One-Time Goal
                </button>
              </div>

              {/* Quick Presets for Daily Goals */}
              {!isEditOpen && goalType === 'daily' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#7d8495] uppercase tracking-wider mb-2">
                    Quick Presets
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAILY_PRESETS.map((p) => (
                      <button
                        key={p.title}
                        type="button"
                        onClick={() => handleApplyPreset(p)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] text-[#b3b9c7] hover:text-white transition-all"
                      >
                        {p.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={isEditOpen ? handleSaveEdit : handleCreate} className="space-y-3.5">
                <div>
                  <label className="block text-xs text-[#7d8495] mb-1 font-medium">Goal Name</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder={goalType === 'daily' ? 'e.g. Read 20 pages, Study 4 lectures' : 'e.g. Run Half Marathon'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-accent-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#7d8495] mb-1 font-medium">Description (Optional)</label>
                  <textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    rows={2}
                    placeholder="Why this matters and how it shapes your momentum..."
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-[#7d8495] mb-1 font-medium">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-primary"
                    >
                      <option value="Study">Study & Focus</option>
                      <option value="Fitness">Fitness & Health</option>
                      <option value="Career">Career & Work</option>
                      <option value="Personal">Personal Growth</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-[#7d8495] mb-1 font-medium">
                      {goalType === 'daily' ? 'Target Date' : 'Deadline'}
                    </label>
                    <input
                      type="date"
                      value={formTargetDate}
                      onChange={(e) => setFormTargetDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-[#7d8495] mb-1 font-medium">
                      {goalType === 'daily' ? 'Daily Target' : 'Total Target'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={goalType === 'daily' ? formDailyTarget : formTarget}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (goalType === 'daily') {
                          setFormDailyTarget(val);
                          setFormTarget(val);
                        } else {
                          setFormTarget(val);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#7d8495] mb-1 font-medium">Unit</label>
                    <input
                      type="text"
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                      placeholder="e.g. pages, hours, glasses"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                </div>

                {goalType === 'daily' && (
                  <div>
                    <label className="block text-xs text-[#7d8495] mb-1 font-medium">Subjects (Optional)</label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={subjectInput}
                        onChange={(e) => setSubjectInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (subjectInput.trim()) {
                              setFormSubjects([...formSubjects, subjectInput.trim()]);
                              setSubjectInput('');
                            }
                          }
                        }}
                        placeholder="e.g. Physics, Math..."
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-primary"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (subjectInput.trim()) {
                            setFormSubjects([...formSubjects, subjectInput.trim()]);
                            setSubjectInput('');
                          }
                        }}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {formSubjects.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formSubjects.map((sub, idx) => (
                          <div key={idx} className="flex items-center gap-1 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-[11px] text-white">
                            {sub}
                            <button
                              type="button"
                              onClick={() => setFormSubjects(formSubjects.filter((_, i) => i !== idx))}
                              className="text-[#7d8495] hover:text-red-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Daily Goal Integrations (Habit & Task) */}
                {goalType === 'daily' && (
                  <div className="space-y-2 pt-1">
                    <label className="text-[11px] font-bold text-[#7d8495] uppercase tracking-wider block">
                      Integrations
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5">
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-accent-primary" />
                          <div>
                            <div className="text-xs font-semibold text-white">Track as Daily Habit</div>
                            <div className="text-[10px] text-[#7d8495]">Sync progress with your habits list</div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={formAddToHabit}
                          onChange={(e) => setFormAddToHabit(e.target.checked)}
                          className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-blue-400" />
                          <div>
                            <div className="text-xs font-semibold text-white">Add to Today's Tasks</div>
                            <div className="text-[10px] text-[#7d8495]">Appears on your daily calendar & checklist</div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={formAddToTask}
                          onChange={(e) => setFormAddToTask(e.target.checked)}
                          className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Milestones for One-Time Goal */}
                {goalType === 'one_time' && !isEditOpen && (
                  <div>
                    <label className="block text-xs text-[#7d8495] mb-1 font-medium">Milestones (Optional)</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={milestoneInput}
                        onChange={(e) => setMilestoneInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (milestoneInput.trim()) {
                              setFormMilestones([...formMilestones, milestoneInput.trim()]);
                              setMilestoneInput('');
                            }
                          }
                        }}
                        placeholder="Add milestone and press Enter"
                        className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-primary"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (milestoneInput.trim()) {
                            setFormMilestones([...formMilestones, milestoneInput.trim()]);
                            setMilestoneInput('');
                          }
                        }}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {formMilestones.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {formMilestones.map((m, i) => (
                          <div key={i} className="flex items-center justify-between bg-black/30 px-3 py-2 rounded-lg text-xs text-white/80">
                            <span>{m}</span>
                            <button
                              type="button"
                              onClick={() => setFormMilestones(formMilestones.filter((_, idx) => idx !== i))}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-accent-primary text-black font-bold text-xs tracking-wide hover:bg-[#9eff38] transition-colors cursor-pointer mt-3"
                >
                  {isEditOpen ? 'Save Changes' : 'Create Goal'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        fileName={`goal-${selectedGoal?.title?.replace(/\s+/g, '-').toLowerCase() || 'progress'}`}
      >
        {(format) => (
          <StreakShareCard
            streak={selectedGoal ? selectedGoal.currentProgress : 0}
            userName={profile?.userName?.split(' ')[0] || profile?.name?.split(' ')[0] || 'Vimlesh'}
            totalHabits={selectedGoal ? selectedGoal.target : 0}
            completedHabits={selectedGoal ? selectedGoal.currentProgress : 0}
            goalTitle={selectedGoal?.title}
            format={format}
          />
        )}
      </ShareModal>
    </div>
  );
}
