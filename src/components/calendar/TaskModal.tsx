import React, { useState, useEffect } from 'react';
import { TaskItem } from '../../lib/taskService';
import { X, Calendar, Clock, Tag, Flag, Layers, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  initialTask?: TaskItem | null;
  defaultDate: string; // YYYY-MM-DD
  initialType?: 'task' | 'meeting' | 'event' | 'reminder';
}

const CATEGORIES: ('Work' | 'Health' | 'Fitness' | 'Personal' | 'General')[] = [
  'Work',
  'Health',
  'Fitness',
  'Personal',
  'General',
];

const PRIORITIES: { label: string; value: 'low' | 'medium' | 'high'; color: string }[] = [
  { label: 'Low', value: 'low', color: 'text-blue-400' },
  { label: 'Medium', value: 'medium', color: 'text-yellow-400' },
  { label: 'High', value: 'high', color: 'text-red-400' },
];

const TYPES: { label: string; value: 'task' | 'meeting' | 'event' | 'reminder' }[] = [
  { label: 'Task', value: 'task' },
  { label: 'Meeting', value: 'meeting' },
  { label: 'Event', value: 'event' },
  { label: 'Reminder', value: 'reminder' },
];

export function TaskModal({
  isOpen,
  onClose,
  onSave,
  initialTask,
  defaultDate,
  initialType = 'task',
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [category, setCategory] = useState<'Work' | 'Health' | 'Fitness' | 'Personal' | 'General'>('Work');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [type, setType] = useState<'task' | 'meeting' | 'event' | 'reminder'>(initialType);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description || '');
      setDate(initialTask.date);
      setTime(initialTask.time || '');
      setTimeEnd(initialTask.timeEnd || '');
      setCategory(initialTask.category || 'Work');
      setPriority(initialTask.priority || 'medium');
      setType(initialTask.type || 'task');
    } else {
      setTitle('');
      setDescription('');
      setDate(defaultDate);
      setTime('');
      setTimeEnd('');
      setCategory('Work');
      setPriority('medium');
      setType(initialType);
    }
    setError('');
    setIsSubmitting(false);
  }, [initialTask, defaultDate, initialType, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Please enter a title');
      return;
    }

    if (!date) {
      setError('Please select a valid date');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSave({
        title: cleanTitle,
        description: description.trim() || undefined,
        date,
        time: time.trim() || undefined,
        timeEnd: timeEnd.trim() || undefined,
        category,
        priority,
        type,
        completed: initialTask ? initialTask.completed : false,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save item');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          className="relative w-full max-w-lg glass-effect rounded-[32px] p-6 shadow-[0_16px_48px_rgba(0,0,0,0.6)] z-10 overflow-hidden"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {initialTask ? 'Edit Task' : type === 'meeting' ? 'New Meeting' : type === 'event' ? 'New Event' : 'New Task'}
              </h3>
              <p className="text-xs text-[#7d8495] mt-0.5">
                {initialTask ? 'Update item details and schedule' : 'Add to your daily agenda'}
              </p>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#7d8495] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Type selector */}
            <div>
              <label className="block text-xs font-semibold text-[#8b93a6] mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Type
              </label>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#0a0c10] border border-[#1d222e] rounded-2xl">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={cn(
                      'py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer capitalize',
                      type === t.value
                        ? 'bg-[#23381c] text-accent-primary border border-[#375a27] shadow-sm'
                        : 'text-[#7d8495] hover:text-white'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-[#8b93a6] mb-1.5">
                Title <span className="text-accent-primary">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Outdoor run, Apply to YC..."
                required
                className="w-full px-4 py-3 bg-[#0a0c10] border border-[#202532] rounded-2xl text-sm text-white placeholder-[#525766] focus:outline-none focus:border-accent-primary/60 transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-[#8b93a6] mb-1.5">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Notes, agenda details, or subtasks..."
                className="w-full px-4 py-2.5 bg-[#0a0c10] border border-[#202532] rounded-2xl text-sm text-white placeholder-[#525766] focus:outline-none focus:border-accent-primary/60 transition-colors resize-none"
              />
            </div>

            {/* Date and Time Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#8b93a6] mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Date <span className="text-accent-primary">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-[#0a0c10] border border-[#202532] rounded-2xl text-sm text-white focus:outline-none focus:border-accent-primary/60 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8b93a6] mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Time (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="1:30 PM"
                    className="w-1/2 px-3 py-2.5 bg-[#0a0c10] border border-[#202532] rounded-2xl text-xs text-white placeholder-[#525766] focus:outline-none focus:border-accent-primary/60 transition-colors"
                  />
                  <span className="text-[#525766] text-xs">–</span>
                  <input
                    type="text"
                    value={timeEnd}
                    onChange={(e) => setTimeEnd(e.target.value)}
                    placeholder="2:00 PM"
                    className="w-1/2 px-3 py-2.5 bg-[#0a0c10] border border-[#202532] rounded-2xl text-xs text-white placeholder-[#525766] focus:outline-none focus:border-accent-primary/60 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-[#8b93a6] mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#0a0c10] border border-[#202532] rounded-2xl text-xs text-white focus:outline-none focus:border-accent-primary/60 transition-colors"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#12141b] text-white">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-[#8b93a6] mb-1.5 flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5" /> Priority
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 bg-[#0a0c10] border border-[#1d222e] rounded-2xl">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value)}
                      className={cn(
                        'py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer',
                        priority === p.value
                          ? 'bg-white/10 text-white border border-white/20'
                          : 'text-[#7d8495] hover:text-white'
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-3 rounded-2xl text-sm font-semibold text-[#7d8495] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-2xl bg-accent-primary hover:bg-[#9eff38] active:scale-95 text-background text-sm font-bold shadow-[0_4px_16px_rgba(140,238,40,0.25)] transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : initialTask ? 'Update Task' : 'Save Task'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
