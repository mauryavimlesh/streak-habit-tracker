import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, Flame, Bell, Target, BookOpen, X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { triggerHaptic } from '../../lib/haptics';

interface AddActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (actionType: 'task' | 'meeting' | 'event' | 'reminder') => void;
}

export function AddActionMenu({ isOpen, onClose, onSelectAction }: AddActionMenuProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const actions = [
    {
      id: 'task',
      label: '+ New Task',
      subtitle: 'Schedule actionable to-do with priority & time',
      icon: CheckSquare,
      iconColor: 'text-accent-primary',
      iconBg: 'bg-[#23381c] border-[#385e28]',
      handler: () => {
        triggerHaptic('selection');
        onClose();
        onSelectAction('task');
      },
    },
    {
      id: 'habit',
      label: '+ New Habit',
      subtitle: 'Build a recurring discipline & daily streak',
      icon: Flame,
      iconColor: 'text-accent-primary',
      iconBg: 'bg-[#182813] border-[#29421e]',
      handler: () => {
        triggerHaptic('tap');
        onClose();
        navigate('/habits/new');
      },
    },
    {
      id: 'reminder',
      label: '+ Reminder',
      subtitle: 'Set lock screen alert for habits or tasks',
      icon: Bell,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/15 border-amber-500/30',
      handler: () => {
        triggerHaptic('tap');
        onClose();
        navigate('/reminders');
      },
    },
    {
      id: 'goal',
      label: '+ Goal',
      subtitle: 'Set a long-term milestone & target date',
      icon: Target,
      iconColor: 'text-pink-400',
      iconBg: 'bg-pink-500/15 border-pink-500/30',
      handler: () => {
        triggerHaptic('tap');
        onClose();
        navigate('/goals');
      },
    },
    {
      id: 'journal',
      label: '+ Journal Entry',
      subtitle: 'Record daily reflection, mood & photos',
      icon: BookOpen,
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/15 border-purple-500/30',
      handler: () => {
        triggerHaptic('tap');
        onClose();
        navigate('/journal');
      },
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Bottom Sheet Modal */}
        <motion.div
          initial={{ opacity: 0, y: 120 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 120 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-md bg-surface-card border-t sm:border border-[#212634] rounded-t-[32px] sm:rounded-[32px] p-5 shadow-[0_-12px_40px_rgba(0,0,0,0.6)] z-10 overflow-hidden mb-[74px] sm:mb-0 bottom-sheet action-sheet"
        >
          {/* Top Pull Indicator on mobile */}
          <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3 sm:hidden" />

          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Create New</h3>
              <p className="text-xs text-[#7d8495]">Add an item to your daily operating system</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#7d8495] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {actions.map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={act.handler}
                className="w-full flex items-center gap-3.5 p-3 rounded-2xl bg-[#0a0c10]/60 hover:bg-[#181c25] border border-white/5 hover:border-white/10 transition-all text-left group cursor-pointer active:scale-[0.985]"
              >
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${act.iconBg} ${act.iconColor}`}
                >
                  <act.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white group-hover:text-accent-primary transition-colors">
                    {act.label}
                  </h4>
                  <p className="text-xs text-[#7d8495] truncate">{act.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

