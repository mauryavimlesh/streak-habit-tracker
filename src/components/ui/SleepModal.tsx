import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Moon, Clock, Save, X, CheckCircle2 } from 'lucide-react';
import { Habit, HabitLog, logHabit, updateHabit } from '../../lib/habitService';
import { useAuth } from '../../lib/AuthContext';

interface SleepModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit: Habit;
  currentLog?: HabitLog;
  onSaved?: () => void;
}

export function SleepModal({ isOpen, onClose, habit, currentLog, onSaved }: SleepModalProps) {
  const { user } = useAuth();

  const [bedtime, setBedtime] = useState(habit.sleepBedtime || '23:00');
  const [wakeTime, setWakeTime] = useState(habit.sleepWakeTime || '07:00');
  const [targetDuration, setTargetDuration] = useState<number>(habit.targetValue || 8);
  const [actualDuration, setActualDuration] = useState<number>(currentLog?.progressValue || habit.targetValue || 8);

  useEffect(() => {
    if (isOpen) {
      setBedtime(habit.sleepBedtime || '23:00');
      setWakeTime(habit.sleepWakeTime || '07:00');
      setTargetDuration(habit.targetValue || 8);
      setActualDuration(currentLog?.progressValue || habit.targetValue || 8);
    }
  }, [isOpen, habit, currentLog]);

  const handleSave = async () => {
    // 1. Update Habit schedule and target if they changed
    if (
      bedtime !== habit.sleepBedtime || 
      wakeTime !== habit.sleepWakeTime ||
      targetDuration !== habit.targetValue
    ) {
      await updateHabit(habit.id!, {
        sleepBedtime: bedtime,
        sleepWakeTime: wakeTime,
        targetValue: targetDuration
      });
    }

    // 2. Log actual sleep
    const today = new Date().toLocaleDateString('en-CA');
    
    let status: HabitLog['status'] = 'in_progress';
    if (actualDuration >= targetDuration) {
      status = 'completed';
    } else if (actualDuration > 0) {
      status = 'partial';
    } else {
      status = 'missed';
    }

    await logHabit({
      userId: user?.uid || 'local',
      habitId: habit.id!,
      date: today,
      status,
      progressValue: actualDuration
    });

    onSaved?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          className="relative w-full max-w-sm bg-[#14161e] border border-[#232938] rounded-[28px] p-6 shadow-2xl z-10"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Moon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Sleep Tracking</h3>
              <p className="text-xs text-[#7d8495]">Record and adjust your sleep</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-[#7d8495] mb-2 block uppercase tracking-wider">Schedule</label>
              <div className="flex gap-3">
                <div className="flex-1 bg-surface-card border border-[#1f232c] rounded-xl p-3">
                  <div className="text-[10px] text-[#7d8495] mb-1 font-medium">Bedtime</div>
                  <input 
                    type="time" 
                    value={bedtime}
                    onChange={(e) => setBedtime(e.target.value)}
                    className="w-full bg-transparent text-white font-mono outline-none" 
                  />
                </div>
                <div className="flex-1 bg-surface-card border border-[#1f232c] rounded-xl p-3">
                  <div className="text-[10px] text-[#7d8495] mb-1 font-medium">Wake up</div>
                  <input 
                    type="time" 
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    className="w-full bg-transparent text-white font-mono outline-none" 
                  />
                </div>
              </div>
            </div>

            <div className="bg-surface-card border border-[#1f232c] rounded-xl p-4 space-y-5">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-white">Target Sleep</label>
                  <span className="text-xs font-mono text-[#7d8495]">{targetDuration} hrs</span>
                </div>
                <input 
                  type="range" 
                  min="4" 
                  max="12" 
                  step="0.5" 
                  value={targetDuration}
                  onChange={(e) => setTargetDuration(Number(e.target.value))}
                  className="w-full accent-indigo-500/50"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-white">Actual Sleep</label>
                  <span className="text-xs font-mono font-bold text-indigo-400">{actualDuration} hrs</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="14" 
                  step="0.5" 
                  value={actualDuration}
                  onChange={(e) => setActualDuration(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Calculation View */}
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#7d8495] uppercase tracking-wider">Completion</span>
                {actualDuration >= targetDuration ? (
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Target Met (100%+)
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                    Partial ({Math.round((actualDuration / targetDuration) * 100)}%)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3.5 rounded-xl bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" /> Save
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
