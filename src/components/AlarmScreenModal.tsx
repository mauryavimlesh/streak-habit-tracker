import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BellRing,
  BellOff,
  Clock,
  Flame,
  Sparkles,
  Volume2,
  Check,
} from 'lucide-react';
import { 
  ReminderItem, 
  formatTimeDisplay, 
  calculateSmartSnooze,
  SmartSnoozeResult,
} from '../lib/reminderService';
import { triggerHaptic } from '../lib/haptics';

interface AlarmScreenModalProps {
  activeAlarm: ReminderItem | null;
  toneName: string;
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
}

const HOLD_DURATION_MS = 1250; // 1.25 seconds hold required to dismiss

export const AlarmScreenModal: React.FC<AlarmScreenModalProps> = ({
  activeAlarm,
  toneName,
  onDismiss,
  onSnooze,
}) => {
  // Long-press Dismiss state
  const [isHoldingDismiss, setIsHoldingDismiss] = useState(false);
  const [dismissProgress, setDismissProgress] = useState(0); // 0 to 100%
  const [releasedEarlyCue, setReleasedEarlyCue] = useState(false);
  const holdStartTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const hapticTickCountRef = useRef(0);

  // Smart Snooze calculation
  const [smartSnoozeInfo, setSmartSnoozeInfo] = useState<SmartSnoozeResult>({
    nextMinutes: 10,
    reason: 'Standard focus buffer',
    snoozeCount: 0,
    patternTag: 'Focus Buffer',
  });
  const [showManualSnoozeOptions, setShowManualSnoozeOptions] = useState(false);

  useEffect(() => {
    // Prevent background scrolling while alarm is ringing
    if (activeAlarm) {
      document.body.style.overflow = 'hidden';
      // Recalculate smart snooze interval
      const baseMins = activeAlarm.snoozeMinutes || 10;
      const count = typeof activeAlarm.snoozeCount === 'number' ? activeAlarm.snoozeCount : 0;
      setSmartSnoozeInfo(calculateSmartSnooze(baseMins, count));
    } else {
      document.body.style.overflow = '';
      setDismissProgress(0);
      setIsHoldingDismiss(false);
    }
    return () => {
      document.body.style.overflow = '';
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeAlarm]);

  const cancelHold = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (isHoldingDismiss && dismissProgress > 10 && dismissProgress < 95) {
      triggerHaptic('light');
      setReleasedEarlyCue(true);
      setTimeout(() => setReleasedEarlyCue(false), 2000);
    }
    holdStartTimeRef.current = null;
    setIsHoldingDismiss(false);
    setDismissProgress(0);
    hapticTickCountRef.current = 0;
  }, [isHoldingDismiss, dismissProgress]);

  const startHold = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    triggerHaptic('selection');
    setIsHoldingDismiss(true);
    setDismissProgress(0);
    setReleasedEarlyCue(false);
    hapticTickCountRef.current = 0;
    holdStartTimeRef.current = performance.now();

    const loop = (now: number) => {
      if (!holdStartTimeRef.current) return;
      const elapsed = now - holdStartTimeRef.current;
      const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
      setDismissProgress(pct);

      // Subtle haptic feedback pulses at progress thresholds
      if (pct >= 33 && hapticTickCountRef.current < 1) {
        hapticTickCountRef.current = 1;
        triggerHaptic('step');
      } else if (pct >= 66 && hapticTickCountRef.current < 2) {
        hapticTickCountRef.current = 2;
        triggerHaptic('step');
      }

      if (pct >= 100) {
        // Complete hold requirement
        triggerHaptic('completion');
        setIsHoldingDismiss(false);
        setDismissProgress(100);
        holdStartTimeRef.current = null;
        onDismiss();
      } else {
        animFrameRef.current = requestAnimationFrame(loop);
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);
  }, [onDismiss]);

  if (!activeAlarm) return null;

  const isSnoozeEnabled = activeAlarm.snoozeEnabled ?? true;
  const currentSnoozeCount = activeAlarm.snoozeCount || 0;

  const handleSmartSnoozeClick = () => {
    triggerHaptic('tap');
    onSnooze(smartSnoozeInfo.nextMinutes);
  };

  const handleCustomSnoozeClick = (mins: number) => {
    triggerHaptic('tap');
    onSnooze(mins);
  };

  // Circular ring math: radius 16 -> circumference 100.53
  const circumference = 100.53;
  const strokeOffset = circumference - (dismissProgress / 100) * circumference;

  return (
    <AnimatePresence>
      <div
        id="streak-alarm-screen-overlay"
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-[#090a0d]/90 backdrop-blur-xl"
      >
        {/* Pulsing ambient aura */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.25, 1],
              opacity: [0.25, 0.55, 0.25],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[480px] h-[340px] sm:h-[480px] rounded-full bg-accent-primary/20 blur-3xl pointer-events-none"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm sm:max-w-md bg-[#12151c] border border-[#232936] rounded-[32px] p-6 sm:p-8 text-center shadow-2xl overflow-hidden"
        >
          {/* Top category & entity chip */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-accent-primary/15 border border-accent-primary/30 text-accent-primary">
              <Flame className="w-3.5 h-3.5" />
              {activeAlarm.linkedEntityName || activeAlarm.category || 'Habit Alarm'}
            </span>

            {currentSnoozeCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/15 border border-yellow-500/30 text-yellow-400">
                <Clock className="w-3 h-3" />
                Snoozed {currentSnoozeCount}x
              </span>
            )}
          </div>

          {/* Animated Alarm Bell Graphic */}
          <div className="relative mx-auto w-24 h-24 mb-5 flex items-center justify-center">
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.6, 0, 0.6],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeOut',
              }}
              className="absolute inset-0 rounded-full border-2 border-accent-primary/40"
            />
            <motion.div
              animate={{
                rotate: [-12, 12, -10, 10, -5, 5, 0],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="w-20 h-20 rounded-full bg-[#1b251a] border border-accent-primary/50 flex items-center justify-center text-accent-primary shadow-lg shadow-accent-primary/20"
            >
              <BellRing className="w-10 h-10 animate-pulse" />
            </motion.div>
          </div>

          {/* Current Time Display */}
          <div className="mb-2">
            <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white font-mono">
              {formatTimeDisplay(activeAlarm.time)}
            </span>
          </div>

          {/* Habit / Reminder Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 leading-tight">
            {activeAlarm.title}
          </h2>

          {activeAlarm.description && (
            <p className="text-sm text-[#8c94a5] mb-4 max-w-xs mx-auto line-clamp-2">
              {activeAlarm.description}
            </p>
          )}

          {/* Tone indicator */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#191d26] border border-[#262c3b] text-xs font-medium text-[#9ba3b5] mb-6">
            <Volume2 className="w-3.5 h-3.5 text-accent-primary" />
            <span>Tone: {toneName}</span>
          </div>

          {/* Action Buttons: Long-Press Dismiss & Smart Snooze */}
          <div className="space-y-3">
            {/* Long-Press Dismiss Button with Progress Ring */}
            <div className="relative">
              <button
                id="streak-alarm-dismiss-btn"
                type="button"
                onPointerDown={startHold}
                onPointerUp={cancelHold}
                onPointerLeave={cancelHold}
                onPointerCancel={cancelHold}
                onContextMenu={(e) => e.preventDefault()}
                className={`relative w-full py-4 px-5 rounded-2xl font-extrabold text-base transition-all duration-150 cursor-pointer overflow-hidden select-none touch-none flex items-center justify-center gap-3 ${
                  isHoldingDismiss
                    ? 'bg-[#34c759] text-black scale-[0.98] shadow-[0_0_25px_rgba(52,199,89,0.5)]'
                    : 'bg-accent-primary hover:bg-[#34c759] text-black shadow-lg shadow-accent-primary/25'
                }`}
              >
                {/* Subtle linear background fill as secondary gauge */}
                <div
                  className="absolute inset-0 bg-white/20 pointer-events-none transition-all duration-75 ease-out origin-left"
                  style={{ width: `${dismissProgress}%` }}
                />

                {/* Subtle Circular Progress Ring */}
                <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                  <svg className="w-8 h-8 -rotate-90 transform pointer-events-none" viewBox="0 0 36 36">
                    {/* Ring background track */}
                    <circle
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="rgba(0,0,0,0.18)"
                      strokeWidth="3.5"
                    />
                    {/* Active progress stroke */}
                    <circle
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="rgba(0,0,0,0.9)"
                      strokeWidth="3.5"
                      strokeDasharray="94.25"
                      strokeDashoffset={94.25 - (dismissProgress / 100) * 94.25}
                      strokeLinecap="round"
                      className="transition-[stroke-dashoffset] duration-75 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {dismissProgress >= 100 ? (
                      <Check className="w-4 h-4 text-black stroke-[3]" />
                    ) : (
                      <BellOff className="w-4 h-4 text-black stroke-[2.5]" />
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-start text-left z-10">
                  <span className="leading-tight font-extrabold text-sm sm:text-base">
                    {isHoldingDismiss
                      ? `Hold to Dismiss... ${Math.round(dismissProgress)}%`
                      : 'Hold to Dismiss'}
                  </span>
                  <span className="text-[10px] font-semibold text-black/75 tracking-tight">
                    {isHoldingDismiss ? 'Keep holding down to confirm' : 'Press and hold to prevent accidental skip'}
                  </span>
                </div>
              </button>

              {/* Early release notification feedback */}
              {releasedEarlyCue && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[11px] text-yellow-400 font-medium mt-1 text-center"
                >
                  Hold for 1.2s to dismiss alarm
                </motion.p>
              )}
            </div>

            {/* Smart Snooze System */}
            {isSnoozeEnabled && (
              <div className="space-y-2">
                <button
                  id="streak-alarm-smart-snooze-btn"
                  type="button"
                  onClick={handleSmartSnoozeClick}
                  className="w-full py-3.5 px-5 rounded-2xl bg-[#1a1f2b] hover:bg-[#222938] text-white border border-[#2e374a] hover:border-accent-primary/40 font-semibold text-sm transition-all transform active:scale-98 cursor-pointer flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-accent-primary/10 border border-accent-primary/25 flex items-center justify-center text-accent-primary">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs sm:text-sm">
                          Smart Snooze (+{smartSnoozeInfo.nextMinutes}m)
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-accent-primary/15 text-accent-primary">
                          {smartSnoozeInfo.patternTag}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8c94a5] line-clamp-1">
                        {smartSnoozeInfo.reason}
                      </p>
                    </div>
                  </div>
                  <Clock className="w-4 h-4 text-[#8c94a5] shrink-0 ml-2" />
                </button>

                {/* Quick Interval Chips Toggle */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] text-[#7d8495]">Alternate intervals:</span>
                  <div className="flex items-center gap-1">
                    {[5, 10, 15, 20].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => handleCustomSnoozeClick(mins)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          mins === smartSnoozeInfo.nextMinutes
                            ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30'
                            : 'bg-[#181c25] hover:bg-[#202532] text-[#8c94a5] border border-[#262c3b]'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
