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
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import {
  Goal,
  getUserGoals,
  createGoal,
  updateGoal,
  deleteGoal,
} from '../../lib/goalService';
import { cn } from '../../lib/utils';

export default function Goals() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'in_progress' | 'completed' | 'paused'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Fitness');
  const [newTarget, setNewTarget] = useState(100);
  const [newUnit, setNewUnit] = useState('%');
  const [newTargetDate, setNewTargetDate] = useState('2026-12-31');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const loadGoals = async () => {
    const list = await getUserGoals(user?.uid || 'local');
    setGoals(list);
  };

  useEffect(() => {
    loadGoals();
  }, [user]);

  const filteredGoals = goals.filter((g) => {
    if (activeFilter === 'all') return true;
    return g.status === activeFilter;
  });

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await createGoal(
      {
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        category: newCategory,
        target: Number(newTarget) || 100,
        currentProgress: 0,
        unit: newUnit.trim() || '%',
        targetDate: newTargetDate,
        priority: newPriority,
        status: 'in_progress',
        milestones: [],
      },
      user?.uid || 'local'
    );

    setIsCreateOpen(false);
    setNewTitle('');
    setNewDesc('');
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

  const handleUpdateProgress = async (goal: Goal, delta: number) => {
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
    <div className="flex flex-col min-h-screen bg-[#0d0e12] text-white pb-24 select-none">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#0d0e12]/90 backdrop-blur-xl border-b border-white/10 px-5 py-4 flex items-center justify-between">
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
              {goals.filter((g) => g.status === 'in_progress').length} milestones in flight
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-3.5 py-1.5 rounded-full bg-[#8cee28] text-black font-semibold text-xs flex items-center gap-1.5 shadow-[0_2px_12px_rgba(140,238,40,0.3)] hover:bg-[#9eff38] active:scale-95 transition-all cursor-pointer"
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
            { id: 'all', label: 'All Goals' },
            { id: 'in_progress', label: 'In Progress' },
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
              <Target className="w-6 h-6 text-[#8cee28]" />
            </div>
            <h3 className="text-base font-semibold text-white">No goals in this view</h3>
            <p className="text-xs text-[#7d8495] max-w-xs mx-auto">
              Define a high-leverage objective with milestones to direct your daily habits.
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-2 px-5 py-2.5 rounded-xl bg-[#8cee28] text-black font-semibold text-xs inline-flex items-center gap-2 hover:bg-[#9eff38] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create Goal</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGoals.map((goal) => {
              const percent = Math.min(100, Math.round((goal.currentProgress / (goal.target || 1)) * 100));
              const isCompleted = goal.status === 'completed' || percent >= 100;

              return (
                <motion.div
                  key={goal.id}
                  layout
                  onClick={() => setSelectedGoal(goal)}
                  className="p-4 rounded-2xl bg-[#13151b] border border-white/5 hover:border-white/15 transition-all cursor-pointer space-y-3 group"
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
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#8cee28]/10 text-[#8cee28] border border-[#8cee28]/20 flex items-center gap-1">
                            <Award className="w-3 h-3" /> Done
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-[#8cee28] transition-colors">
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
                        isCompleted ? 'bg-[#8cee28]' : 'bg-gradient-to-r from-[#8cee28]/80 to-[#8cee28]'
                      )}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#7d8495] pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#8cee28]" /> Target: {goal.targetDate}
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

      {/* Goal Detail / Interactive Progress Modal */}
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
              className="relative w-full max-w-md bg-[#13151b] border border-white/10 rounded-3xl p-5 z-10 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs uppercase font-semibold text-[#8cee28] tracking-wider">
                    {selectedGoal.category}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{selectedGoal.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGoal(null)}
                  className="text-[#7d8495] hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedGoal.description && (
                <p className="text-xs text-[#7d8495] leading-relaxed">{selectedGoal.description}</p>
              )}

              {/* Progress Card */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#7d8495]">Current Progress</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateProgress(selectedGoal, -1)}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white font-bold text-xs cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-sm font-bold text-white px-2">
                      {selectedGoal.currentProgress} / {selectedGoal.target} {selectedGoal.unit}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateProgress(selectedGoal, 1)}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white font-bold text-xs cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-[#8cee28] rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        (selectedGoal.currentProgress / (selectedGoal.target || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Milestones list */}
              {selectedGoal.milestones && selectedGoal.milestones.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[#7d8495] uppercase tracking-wider block">
                    Milestones
                  </span>
                  <div className="space-y-1.5">
                    {selectedGoal.milestones.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleToggleMilestone(selectedGoal, m.id)}
                        className="w-full p-2.5 rounded-xl bg-black/30 border border-white/5 hover:border-white/15 flex items-center gap-2.5 text-left transition-all cursor-pointer"
                      >
                        {m.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-[#8cee28] shrink-0" />
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

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
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

      {/* Create Goal Modal */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#13151b] border border-white/10 rounded-3xl p-5 z-10 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-base font-bold text-white">Create Long-Term Goal</h3>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="text-[#7d8495] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3.5">
                <div>
                  <label className="block text-xs text-[#7d8495] mb-1">Goal Objective</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Run Half Marathon, Read 12 Books"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-[#8cee28]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#7d8495] mb-1">Description</label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={2}
                    placeholder="Why this matters and how it shapes your discipline..."
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#8cee28]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-[#7d8495] mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#8cee28]"
                    >
                      <option value="Fitness">Fitness</option>
                      <option value="Study">Study & Focus</option>
                      <option value="Health">Health & Wellness</option>
                      <option value="Career">Career & Work</option>
                      <option value="Personal">Personal Growth</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-[#7d8495] mb-1">Target Date</label>
                    <input
                      type="date"
                      value={newTargetDate}
                      onChange={(e) => setNewTargetDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#8cee28]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-[#7d8495] mb-1">Target Amount</label>
                    <input
                      type="number"
                      min="1"
                      value={newTarget}
                      onChange={(e) => setNewTarget(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#8cee28]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#7d8495] mb-1">Unit</label>
                    <input
                      type="text"
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      placeholder="e.g. km, books, hours, %"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#8cee28]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#8cee28] text-black font-bold text-xs tracking-wide hover:bg-[#9eff38] transition-colors cursor-pointer mt-2"
                >
                  Create Goal
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
