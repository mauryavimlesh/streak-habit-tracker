import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  Plus,
  Flame,
  CheckCircle2,
  Circle,
  Archive,
  Trash2,
  Edit2,
  Calendar as CalendarIcon,
  Tag,
  Clock,
  Sparkles,
  X,
  Check,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import {
  Habit,
  getUserHabits,
  updateHabit,
  deleteHabit,
  readLocalHabits,
  readLocalLogs,
  logHabit,
} from '../../lib/habitService';
import { HABIT_ICONS, HABIT_COLORS } from '../../lib/constants';
import { cn } from '../../lib/utils';

export default function MyHabits() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [todayLogs, setTodayLogs] = useState<Record<string, boolean>>({});

  const todayStr = new Date().toISOString().split('T')[0];

  const loadHabits = async () => {
    const list = await getUserHabits(user?.uid || 'local');
    setHabits(list);

    // Compute today's completions
    const logs = readLocalLogs();
    const map: Record<string, boolean> = {};
    logs.forEach((l) => {
      if (l.date === todayStr && (l.status === 'completed' || (l.progressValue && l.progressValue > 0))) {
        map[l.habitId] = true;
      }
    });
    setTodayLogs(map);
  };

  useEffect(() => {
    loadHabits();
  }, [user]);

  const categories = ['All', ...Array.from(new Set(habits.map((h) => h.category || 'General')))];

  const displayedHabits = habits.filter((h) => {
    if (activeTab === 'active' && h.archived) return false;
    if (activeTab === 'archived' && !h.archived) return false;
    if (selectedCategory !== 'All' && (h.category || 'General') !== selectedCategory) return false;
    return true;
  });

  const handleToggleToday = async (habit: Habit) => {
    if (!habit.id) return;
    const isDone = Boolean(todayLogs[habit.id]);
    const nextDone = !isDone;

    setTodayLogs((prev) => ({ ...prev, [habit.id!]: nextDone }));

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(nextDone ? [40, 60, 40] : 15);
      } catch {
        // ignore
      }
    }

    await logHabit({
      userId: user?.uid || 'local',
      habitId: habit.id,
      date: todayStr,
      status: nextDone ? 'completed' : 'missed',
      progressValue: nextDone ? habit.targetValue || 1 : 0,
    });
  };

  const handleToggleArchive = async (habit: Habit) => {
    if (!habit.id) return;
    const nextArchived = !habit.archived;
    await updateHabit(habit.id, { archived: nextArchived });
    loadHabits();
    if (editingHabit) setEditingHabit(null);
  };

  const handleDelete = async (habitId: string) => {
    if (confirm('Are you sure you want to delete this habit?')) {
      await deleteHabit(habitId);
      loadHabits();
      if (editingHabit) setEditingHabit(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingHabit?.id || !editingHabit.name.trim()) return;
    await updateHabit(editingHabit.id, {
      name: editingHabit.name.trim(),
      description: editingHabit.description?.trim(),
      category: editingHabit.category,
      targetValue: editingHabit.targetValue,
      targetUnit: editingHabit.targetUnit,
      reminderTime: editingHabit.reminderTime,
    });
    setEditingHabit(null);
    loadHabits();
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0d0e12] text-white pb-24 select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-[#0d0e12]/90 backdrop-blur-xl border-b border-white/10 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/more')}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">My Habits</h1>
            <p className="text-xs text-[#7d8495]">
              {habits.filter((h) => !h.archived).length} active routines
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/habits/new')}
          className="px-3.5 py-1.5 rounded-full bg-[#8cee28] text-black font-semibold text-xs flex items-center gap-1.5 shadow-[0_2px_12px_rgba(140,238,40,0.3)] hover:bg-[#9eff38] active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>New Habit</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-md mx-auto w-full px-5 pt-4 space-y-4">
        {/* Active vs Archived Segmented Control */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-black/40 border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={cn(
              'py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer',
              activeTab === 'active'
                ? 'bg-white/15 text-white shadow'
                : 'text-[#7d8495] hover:text-white'
            )}
          >
            Active Habits ({habits.filter((h) => !h.archived).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('archived')}
            className={cn(
              'py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer',
              activeTab === 'archived'
                ? 'bg-white/15 text-white shadow'
                : 'text-[#7d8495] hover:text-white'
            )}
          >
            Archived ({habits.filter((h) => h.archived).length})
          </button>
        </div>

        {/* Category Pills */}
        {categories.length > 2 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer',
                  selectedCategory === cat
                    ? 'bg-[#8cee28]/20 border border-[#8cee28]/50 text-[#8cee28]'
                    : 'bg-white/5 text-[#7d8495] hover:text-white border border-transparent'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Habit List */}
        {displayedHabits.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#7d8495]">
              <Sparkles className="w-6 h-6 text-[#8cee28]" />
            </div>
            <h3 className="text-base font-semibold text-white">
              {activeTab === 'active' ? 'No active habits found' : 'No archived habits'}
            </h3>
            <p className="text-xs text-[#7d8495] max-w-xs mx-auto">
              {activeTab === 'active'
                ? 'Start building your routine by creating your first daily or weekly habit.'
                : 'Habits you archive will appear here safely for future reference.'}
            </p>
            {activeTab === 'active' && (
              <button
                onClick={() => navigate('/habits/new')}
                className="mt-2 px-5 py-2.5 rounded-xl bg-[#8cee28] text-black font-semibold text-xs inline-flex items-center gap-2 hover:bg-[#9eff38] cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Create Habit</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedHabits.map((habit) => {
              const isCompletedToday = Boolean(habit.id && todayLogs[habit.id]);
              const IconObj = HABIT_ICONS.find((i) => i.id === habit.icon);
              const IconComp = IconObj ? IconObj.icon : Sparkles;

              return (
                <motion.div
                  key={habit.id}
                  layout
                  className="p-4 rounded-2xl bg-[#13151b] border border-white/5 hover:border-white/10 transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    {/* Completion Toggle button */}
                    <button
                      type="button"
                      onClick={() => handleToggleToday(habit)}
                      className={cn(
                        'w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0',
                        isCompletedToday
                          ? 'bg-[#8cee28] text-black shadow-[0_2px_12px_rgba(140,238,40,0.4)]'
                          : 'bg-black/40 border border-white/10 text-[#7d8495] hover:text-white hover:border-white/30'
                      )}
                    >
                      {isCompletedToday ? (
                        <Check className="w-5 h-5 stroke-[3]" />
                      ) : (
                        <IconComp className="w-5 h-5" />
                      )}
                    </button>

                    {/* Habit Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4
                          className={cn(
                            'text-sm font-semibold truncate',
                            isCompletedToday ? 'text-white/60 line-through' : 'text-white'
                          )}
                        >
                          {habit.name}
                        </h4>
                        {habit.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-[#7d8495] border border-white/5 font-medium">
                            {habit.category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#7d8495] mt-0.5">
                        <span>{habit.frequencyType || 'Daily'}</span>
                        {habit.targetValue && habit.targetValue > 1 && (
                          <span>
                            • {habit.targetValue} {habit.targetUnit || 'times'}
                          </span>
                        )}
                        {habit.reminderTime && (
                          <span className="flex items-center gap-0.5">
                            • <Clock className="w-3 h-3" /> {habit.reminderTime}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions (Edit / Archive) */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingHabit(habit)}
                      className="p-2 rounded-xl text-[#7d8495] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                      title="Edit Habit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleArchive(habit)}
                      className="p-2 rounded-xl text-[#7d8495] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                      title={habit.archived ? 'Unarchive Habit' : 'Archive Habit'}
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Edit Habit Modal */}
      <AnimatePresence>
        {editingHabit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingHabit(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#13151b] border border-white/10 rounded-3xl p-5 z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-base font-bold text-white">Edit Habit</h3>
                <button
                  type="button"
                  onClick={() => setEditingHabit(null)}
                  className="text-[#7d8495] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[#7d8495] mb-1">Habit Title</label>
                  <input
                    type="text"
                    value={editingHabit.name}
                    onChange={(e) =>
                      setEditingHabit({ ...editingHabit, name: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-[#8cee28]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#7d8495] mb-1">Category</label>
                  <input
                    type="text"
                    value={editingHabit.category || ''}
                    onChange={(e) =>
                      setEditingHabit({ ...editingHabit, category: e.target.value })
                    }
                    placeholder="e.g. Health, Work, Fitness"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-[#8cee28]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-[#7d8495] mb-1">Target Amount</label>
                    <input
                      type="number"
                      min="1"
                      value={editingHabit.targetValue || 1}
                      onChange={(e) =>
                        setEditingHabit({
                          ...editingHabit,
                          targetValue: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-[#8cee28]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#7d8495] mb-1">Unit</label>
                    <input
                      type="text"
                      value={editingHabit.targetUnit || ''}
                      onChange={(e) =>
                        setEditingHabit({ ...editingHabit, targetUnit: e.target.value })
                      }
                      placeholder="glasses, mins"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-[#8cee28]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDelete(editingHabit.id!)}
                  className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-xs font-semibold flex items-center justify-center cursor-pointer"
                  title="Delete Habit"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="flex-1 py-2.5 rounded-xl bg-[#8cee28] text-black font-bold text-xs hover:bg-[#9eff38] transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
