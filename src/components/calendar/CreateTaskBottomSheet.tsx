import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckSquare,
  Users,
  Calendar as CalendarIcon,
  Bell,
  X,
  Sparkles,
  Clock,
  Calendar,
  Tag,
  Flag,
  ChevronRight,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { TaskItem } from '../../lib/taskService';
import { cn } from '../../lib/utils';

interface CreateTaskBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (taskData: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  defaultDate: string; // YYYY-MM-DD
  initialType?: 'task' | 'meeting' | 'event' | 'reminder';
}

const TYPES: {
  id: 'task' | 'meeting' | 'event' | 'reminder';
  label: string;
  icon: typeof CheckSquare;
  activeColor: string;
  activeBorder: string;
  badgeBg: string;
}[] = [
  {
    id: 'task',
    label: 'Task',
    icon: CheckSquare,
    activeColor: 'text-[#8cee28]',
    activeBorder: 'border-[#8cee28]/50',
    badgeBg: 'bg-[#8cee28]/10 text-[#8cee28]',
  },
  {
    id: 'meeting',
    label: 'Meeting',
    icon: Users,
    activeColor: 'text-[#818cf8]',
    activeBorder: 'border-[#818cf8]/50',
    badgeBg: 'bg-[#818cf8]/10 text-[#818cf8]',
  },
  {
    id: 'event',
    label: 'Event',
    icon: CalendarIcon,
    activeColor: 'text-[#c084fc]',
    activeBorder: 'border-[#c084fc]/50',
    badgeBg: 'bg-[#c084fc]/10 text-[#c084fc]',
  },
  {
    id: 'reminder',
    label: 'Reminder',
    icon: Bell,
    activeColor: 'text-[#fbbf24]',
    activeBorder: 'border-[#fbbf24]/50',
    badgeBg: 'bg-[#fbbf24]/10 text-[#fbbf24]',
  },
];

const CATEGORIES: ('Work' | 'Health' | 'Fitness' | 'Personal' | 'General')[] = [
  'Work',
  'Health',
  'Fitness',
  'Personal',
  'General',
];

const TIME_PRESETS = [
  { label: '9:00 AM', value: '9:00 AM' },
  { label: '1:00 PM', value: '1:00 PM' },
  { label: '4:00 PM', value: '4:00 PM' },
  { label: '7:00 PM', value: '7:00 PM' },
];

const QUICK_PRESETS = [
  { title: '⚡ Deep Work Sprint', category: 'Work' as const, time: '9:00 AM', priority: 'high' as const, type: 'task' as const },
  { title: '🏃 Zone-2 Cardio Run', category: 'Fitness' as const, time: '7:00 AM', priority: 'medium' as const, type: 'task' as const },
  { title: '🧘 Mobility & Recovery', category: 'Health' as const, time: '8:00 PM', priority: 'low' as const, type: 'task' as const },
  { title: '🤝 Team Alignment', category: 'Work' as const, time: '2:00 PM', priority: 'high' as const, type: 'meeting' as const },
];

export function CreateTaskBottomSheet({
  isOpen,
  onClose,
  onSaveTask,
  defaultDate,
  initialType = 'task',
}: CreateTaskBottomSheetProps) {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<'task' | 'meeting' | 'event' | 'reminder'>(initialType);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('9:00 AM');
  const [category, setCategory] = useState<'Work' | 'Health' | 'Fitness' | 'Personal' | 'General'>('Work');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setSelectedType(initialType);
      setDate(defaultDate);
      setTime('9:00 AM');
      setCategory('Work');
      setPriority('medium');
      setShowMoreOptions(false);
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, defaultDate, initialType]);

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const handleApplyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setTime(preset.time);
    setPriority(preset.priority);
    setSelectedType(preset.type);
    if (navigator.vibrate) {
      navigator.vibrate(12);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Please enter a title');
      return;
    }

    setIsSubmitting(true);
    setError('');

    // Trigger haptic feedback
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([15, 30, 15]);
      } catch {
        // Safe ignore
      }
    }

    try {
      await onSaveTask({
        title: cleanTitle,
        description: description.trim() || undefined,
        date: date || defaultDate,
        time: time.trim() || undefined,
        category,
        priority,
        type: selectedType,
        completed: false,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create task');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center select-none">
        {/* Backdrop blur overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Glass-effect Bottom Sheet */}
        <motion.div
          initial={{ y: '100%', opacity: 0.6 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={{ top: 0, bottom: 0.6 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 100 || info.velocity.y > 400) {
              onClose();
            }
          }}
          className="relative w-full max-w-lg glass-effect rounded-t-[36px] sm:rounded-[36px] p-5 sm:p-6 pb-28 sm:pb-6 z-10 max-h-[92vh] overflow-y-auto"
        >
          {/* Top Drag Handle */}
          <div className="flex justify-center pb-2 cursor-grab active:cursor-grabbing">
            <div className="w-12 h-1.5 rounded-full bg-white/30 hover:bg-white/50 transition-colors" />
          </div>

          {/* Header Row */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#8cee28]/15 text-[#8cee28] border border-[#8cee28]/25">
                  STREAK Calendar
                </span>
                <span className="text-xs text-[#7d8495]">
                  {date === todayStr ? 'Today' : date}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight mt-1">Create Schedule Item</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#7d8495] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Schedule Type Selector */}
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/5">
              {TYPES.map((t) => {
                const isSelected = selectedType === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedType(t.id);
                      if (navigator.vibrate) navigator.vibrate(8);
                    }}
                    className={cn(
                      'flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer',
                      isSelected
                        ? `${t.badgeBg} border ${t.activeBorder} shadow-[0_2px_12px_rgba(0,0,0,0.5)]`
                        : 'text-[#7d8495] hover:text-white hover:bg-white/5'
                    )}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Title Input Field */}
            <div>
              <label htmlFor="task-title-input" className="block text-xs font-medium text-[#7d8495] mb-1.5">
                Title & Activity
              </label>
              <input
                id="task-title-input"
                type="text"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Zone 2 Cardio Run, Architecture Review"
                className="w-full px-4 py-3 rounded-2xl bg-black/50 border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-[#8cee28] focus:ring-1 focus:ring-[#8cee28] text-sm transition-all"
              />
              {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
            </div>

            {/* Quick Inspiration Presets */}
            <div>
              <span className="text-[11px] font-medium text-[#7d8495] uppercase tracking-wider block mb-1.5">
                Quick Add Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-2.5 py-1 rounded-full text-xs bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5 hover:border-white/15 transition-all cursor-pointer"
                  >
                    {preset.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Selection Pills */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#7d8495] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#8cee28]" />
                  <span>Scheduled Date</span>
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDate(todayStr)}
                  className={cn(
                    'py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer',
                    date === todayStr
                      ? 'bg-[#8cee28]/15 border-[#8cee28]/50 text-[#8cee28]'
                      : 'bg-black/30 border-white/10 text-white/70 hover:bg-white/5'
                  )}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setDate(tomorrowStr)}
                  className={cn(
                    'py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer',
                    date === tomorrowStr
                      ? 'bg-[#8cee28]/15 border-[#8cee28]/50 text-[#8cee28]'
                      : 'bg-black/30 border-white/10 text-white/70 hover:bg-white/5'
                  )}
                >
                  Tomorrow
                </button>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="py-2 px-2 rounded-xl text-xs font-medium bg-black/30 border border-white/10 text-white text-center focus:outline-none focus:border-[#8cee28]"
                />
              </div>
            </div>

            {/* Time Shortcuts */}
            <div>
              <label className="text-xs font-medium text-[#7d8495] flex items-center gap-1.5 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-[#8cee28]" />
                <span>Time of Day</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="grid grid-cols-4 gap-1.5 flex-1">
                  {TIME_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setTime(preset.value)}
                      className={cn(
                        'py-1.5 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer',
                        time === preset.value
                          ? 'bg-white/15 border-white/40 text-white font-semibold'
                          : 'bg-black/30 border-white/5 text-white/60 hover:text-white hover:bg-white/5'
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="Custom"
                  className="w-24 px-2 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white text-center focus:outline-none focus:border-[#8cee28]"
                />
              </div>
            </div>

            {/* Category Chips */}
            <div>
              <label className="text-xs font-medium text-[#7d8495] flex items-center gap-1.5 mb-1.5">
                <Tag className="w-3.5 h-3.5 text-[#8cee28]" />
                <span>Category</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer',
                      category === cat
                        ? 'bg-[#8cee28]/20 border-[#8cee28]/60 text-[#8cee28]'
                        : 'bg-black/30 border-white/5 text-white/60 hover:text-white hover:bg-white/5'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority & More Details Toggle */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1">
                <span className="text-xs text-[#7d8495] mr-1">Priority:</span>
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer',
                      priority === p
                        ? p === 'high'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : p === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        : 'text-white/40 hover:text-white'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowMoreOptions(!showMoreOptions)}
                className="text-xs text-[#7d8495] hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>{showMoreOptions ? 'Less' : 'Notes'}</span>
              </button>
            </div>

            {/* Extra Description / Notes if expanded */}
            {showMoreOptions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details, link, or preparation notes..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#8cee28]"
                />
              </motion.div>
            )}

            {/* Primary Action Button */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#8cee28] text-[#0d0e12] font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(140,238,40,0.4)] hover:bg-[#9eff38] hover:shadow-[0_4px_32px_rgba(140,238,40,0.6)] active:scale-[0.985] transition-all cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isSubmitting ? 'Creating Item...' : 'Create Item'}</span>
              </button>

              {/* Add Recurring Habit Alternative */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/habits/new');
                }}
                className="flex items-center justify-center gap-1.5 text-xs text-[#7d8495] hover:text-white py-1 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#8cee28]" />
                <span>Want to build a repeating habit streak instead?</span>
                <ChevronRight className="w-3 h-3 text-[#7d8495]" />
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
