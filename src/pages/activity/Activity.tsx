import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Play, Square, Pause, ChevronLeft, Minimize2, CheckCircle2, RotateCcw } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { saveActivity } from '../../lib/activityService';
import { getUserHabits, getHabitLogs, Habit, logHabit } from '../../lib/habitService';
import { updateGoalActivity } from '../../lib/goalService';
import { formatDateKey, getTodayDateKey } from '../../lib/dateUtils';
import { cn } from '../../lib/utils';
import { useTimer, TimerMode } from '../../lib/timer/TimerContext';
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';
import { ShareModal } from '../../components/ui/ShareModal';
import { StudySessionShareCard } from '../../components/ui/StudySessionShareCard';
import { Share, X, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ACTIVITY_TYPES = [
  'Study', 'Deep Work', 'Reading', 'Running', 
  'Walking', 'Workout', 'Meditation', 'Writing', 'Coding'
];

const PRESETS = [
  { label: '10 min', ms: 10 * 60 * 1000 },
  { label: '20 min', ms: 20 * 60 * 1000 },
  { label: '25 min', ms: 25 * 60 * 1000 },
  { label: '30 min', ms: 30 * 60 * 1000 },
  { label: '45 min', ms: 45 * 60 * 1000 },
  { label: '60 min', ms: 60 * 60 * 1000 },
];

export default function Activity() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { state, elapsedMs, startTimer, pauseTimer, resumeTimer, stopTimer, resetTimer, minimizeTimer } = useTimer();

  const navState = (location.state as any) || {};
  const initialType = navState.activityTitle || navState.subject || ACTIVITY_TYPES[0];

  const [selectedType, setSelectedType] = useState(ACTIVITY_TYPES.includes(initialType) ? initialType : ACTIVITY_TYPES[0]);
  const [customType, setCustomType] = useState(ACTIVITY_TYPES.includes(initialType) ? '' : initialType);
  const [mode, setMode] = useState<TimerMode>(navState.plannedMinutes ? 'countdown' : 'stopwatch');
  const [targetDurationMs, setTargetDurationMs] = useState<number | null>(navState.plannedMinutes ? navState.plannedMinutes * 60 * 1000 : null);
  
  const [matchingHabit, setMatchingHabit] = useState<Habit | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const activeType = customType.trim() ? customType.trim() : selectedType;

  useEffect(() => {
    // If navigated with direct goal/activity intent, pre-set custom type if needed
    if (navState.activityTitle && !customType && !ACTIVITY_TYPES.includes(navState.activityTitle)) {
      setCustomType(navState.activityTitle);
    }
  }, [navState.activityTitle]);

  useEffect(() => {
    // If the timer is complete, look for a matching habit
    if (state.status === 'completed' && state.activityName) {
      findMatchingHabit(state.activityName);
    }
  }, [state.status, state.activityName]);

  const findMatchingHabit = async (activityName: string) => {
    try {
      const habits = await getUserHabits(user?.uid || 'local');
      const activeTypeLower = activityName.toLowerCase();
      const match = habits.find(h => 
        h.name.toLowerCase() === activeTypeLower || 
        h.name.toLowerCase().includes(activeTypeLower) ||
        activeTypeLower.includes(h.name.toLowerCase())
      );
      if (match) {
        setMatchingHabit(match);
        setShowMatchModal(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStart = () => {
    startTimer(mode, activeType, targetDurationMs);
  };

  const handleMinimize = () => {
    minimizeTimer();
    navigate(-1);
  };

  const handleSaveOnly = async () => {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const endTime = new Date();
    const startTime = state.startedAt ? new Date(state.startedAt) : new Date(endTime.getTime() - elapsedMs);
    const canonicalDate = formatDateKey(startTime);
    
    await saveActivity({
      userId: user?.uid || 'local',
      name: state.activityName,
      durationMinutes: Math.floor(totalSeconds / 60),
      durationSeconds: totalSeconds % 60,
      date: canonicalDate,
      time: endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      subject: navState.subject,
      goalId: navState.goalId,
      activityId: navState.activityId,
    }, user?.uid);

    if (navState.goalId && navState.activityId) {
      try {
        await updateGoalActivity(navState.goalId, canonicalDate, navState.activityId, { completed: true }, user?.uid);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('streak_goals_updated'));
        }
      } catch (e) {
        console.warn('Could not mark goal activity complete', e);
      }
    }

    resetTimer();
    navigate(-1);
  };

  const handleAddToHabit = async () => {
    if (!matchingHabit) return;
    
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const addedValue = Math.floor(totalSeconds / 60) || 1; // At least 1 unit if under a minute
    const endTime = new Date();
    const startTime = state.startedAt ? new Date(state.startedAt) : new Date(endTime.getTime() - elapsedMs);
    const canonicalDate = formatDateKey(startTime);
    
    // Save to history too
    await saveActivity({
      userId: user?.uid || 'local',
      name: state.activityName,
      durationMinutes: Math.floor(totalSeconds / 60),
      durationSeconds: totalSeconds % 60,
      date: canonicalDate,
      time: endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      linkedHabitId: matchingHabit.id,
      subject: navState.subject,
      goalId: navState.goalId,
      activityId: navState.activityId,
    }, user?.uid);

    if (navState.goalId && navState.activityId) {
      try {
        await updateGoalActivity(navState.goalId, canonicalDate, navState.activityId, { completed: true }, user?.uid);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('streak_goals_updated'));
        }
      } catch (e) {
        console.warn('Could not mark goal activity complete', e);
      }
    }

    // Update habit log
    const logs = await getHabitLogs(user?.uid || 'local');
    const todayLog = logs.find(l => l.habitId === matchingHabit.id && l.date === canonicalDate);
    const currentProgress = todayLog?.progressValue || 0;
    const newProgress = currentProgress + addedValue;
    const target = matchingHabit.targetValue || 1;
    
    await logHabit({
      userId: user?.uid || 'local',
      habitId: matchingHabit.id!,
      date: canonicalDate,
      status: newProgress >= target ? 'completed' : 'in_progress',
      progressValue: newProgress
    });

    resetTimer();
    navigate(-1);
  };

  const handleDiscard = () => {
    setShowDiscardConfirm(true);
  };
  
  const confirmDiscard = () => {
    resetTimer();
    setShowDiscardConfirm(false);
    navigate(-1);
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (state.status === 'completed') {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    return (
      <div className="min-h-screen bg-background text-white p-6 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-accent-primary/20 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-accent-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-2 tracking-tight">Session Complete</h2>
        <p className="text-[#7d8495] mb-8 font-medium">{state.activityName}</p>
        
        <div className="text-6xl font-mono mb-12 font-bold tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
          {formatTime(totalSeconds)}
        </div>

        <div className="w-full max-w-sm space-y-3 relative z-10">
          <button 
            onClick={() => {
              if (matchingHabit) {
                setShowMatchModal(true);
              } else {
                handleSaveOnly();
              }
            }}
            className="w-full py-4 bg-accent-primary text-black font-bold rounded-2xl transition-all active:scale-95 shadow-[0_0_20px_rgba(165,255,54,0.15)] hover:bg-[#a5ff36]"
          >
            Save Activity
          </button>
        </div>
        
        <div className="flex items-center gap-4 mt-6 relative z-10">
          <button 
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 text-sm font-semibold text-white hover:text-accent-primary transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl"
          >
            <Share className="w-4 h-4" /> Share
          </button>
          <button 
            onClick={handleDiscard}
            className="text-sm font-semibold text-[#7d8495] hover:text-red-400 transition-colors px-4 py-2"
          >
            Discard
          </button>
        </div>

        <AnimatePresence>
          {showMatchModal && matchingHabit && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[#12141a] p-6 rounded-[28px] border border-[#1f232c] w-full max-w-sm shadow-2xl"
              >
                <div className="w-12 h-12 bg-accent-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-6 h-6 text-accent-primary" />
                </div>
                <h3 className="text-xl font-bold text-center mb-2">Matching Habit Found</h3>
                <p className="text-sm font-medium mb-6 text-center text-[#7d8495] leading-relaxed">
                  Would you like to log this <span className="text-white font-bold">{Math.floor(totalSeconds / 60) || 1} min</span> session to your <span className="text-white font-bold">"{matchingHabit.name}"</span> habit?
                </p>
                <div className="space-y-3">
                  <button 
                    onClick={handleAddToHabit}
                    className="w-full py-3.5 bg-accent-primary text-black font-bold rounded-xl transition-all active:scale-95 hover:bg-[#a5ff36]"
                  >
                    Log to Habit
                  </button>
                  <button 
                    onClick={() => {
                      setShowMatchModal(false);
                      handleSaveOnly();
                    }}
                    className="w-full py-3.5 bg-[#1a1d25] hover:bg-[#262b36] text-white font-semibold rounded-xl transition-all active:scale-95 border border-[#2d323f]"
                  >
                    Save as Activity Only
                  </button>
                  <button 
                    onClick={() => setShowMatchModal(false)}
                    className="w-full py-2.5 text-[#7d8495] hover:text-white font-medium rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <DeleteConfirmModal
          isOpen={showDiscardConfirm}
          onClose={() => setShowDiscardConfirm(false)}
          onConfirm={confirmDiscard}
          title="Discard this session"
          itemType="session"
          description="Are you sure you want to discard this session? It will not be saved to your history."
        />
        
        <ShareModal 
          isOpen={showShareModal} 
          onClose={() => setShowShareModal(false)}
          fileName={`${state.activityName}-session`}
        >
          {(format) => (
            <StudySessionShareCard
              durationMinutes={Math.floor(totalSeconds / 60)}
              durationSeconds={totalSeconds % 60}
              activityName={state.activityName}
              userName={user?.displayName || user?.email?.split('@')[0] || 'I'}
              format={format}
            />
          )}
        </ShareModal>
      </div>
    );
  }

  // Running or paused state
  if (state.status === 'running' || state.status === 'paused') {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const targetSeconds = state.targetDurationMs ? Math.floor(state.targetDurationMs / 1000) : 0;
    
    let displaySeconds = totalSeconds;
    if (state.mode === 'countdown' && state.targetDurationMs) {
      displaySeconds = Math.max(0, targetSeconds - totalSeconds);
    }
    
    const progress = state.targetDurationMs ? Math.min(1, elapsedMs / state.targetDurationMs) : 0;
    
    return (
      <div className="min-h-screen bg-background text-white flex flex-col select-none">
        <AnimatePresence>
          {!isMaximized && (
            <motion.header 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-5 py-4 flex items-center justify-between border-b border-white/5 bg-background/95 backdrop-blur-md sticky top-0 z-10"
            >
              <button onClick={handleMinimize} className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors">
                <Minimize2 className="w-6 h-6" />
              </button>
              <span className="font-semibold text-[15px] tracking-wide line-clamp-1 max-w-[150px] text-center">{state.activityName}</span>
              <button onClick={handleDiscard} className="p-2 -mr-2 rounded-full hover:bg-white/5 text-[#7d8495] hover:text-red-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </motion.header>
          )}
        </AnimatePresence>
        
        {isMaximized && (
          <div className="absolute top-6 right-6 z-20 flex gap-2">
            <button onClick={handleDiscard} className="p-3 rounded-full bg-black/20 hover:bg-red-500/20 text-[#7d8495] hover:text-red-400 transition-colors">
              <X className="w-6 h-6" />
            </button>
            <button onClick={() => setIsMaximized(false)} className="p-3 rounded-full bg-black/20 hover:bg-white/10 text-white transition-colors">
              <Minimize2 className="w-6 h-6" />
            </button>
          </div>
        )}
        
        {!isMaximized && (
          <div className="absolute top-20 right-6 z-20 hidden md:block">
            <button onClick={() => setIsMaximized(true)} className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors">
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className={cn("flex-1 p-6 flex flex-col items-center justify-center animate-in fade-in duration-500", isMaximized ? "scale-110 md:scale-150" : "")}>
          {!isMaximized && (
            <div className="text-lg font-bold text-[#7d8495] mb-8 uppercase tracking-[0.2em] text-center max-w-sm truncate">{state.activityName}</div>
          )}
          {isMaximized && (
             <div className="text-xl md:text-2xl font-bold text-white mb-12 uppercase tracking-[0.2em] text-center drop-shadow-md">{state.activityName}</div>
          )}
          
          <div className="relative w-72 h-72 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle cx="144" cy="144" r="136" className="stroke-[#1f232c]" strokeWidth="8" fill="none" />
              {state.mode === 'countdown' ? (
                <circle 
                  cx="144" cy="144" r="136" 
                  className={cn(
                    "stroke-accent-primary transition-all duration-1000",
                    state.status === 'paused' ? "opacity-50" : "opacity-100 drop-shadow-[0_0_15px_rgba(165,255,54,0.3)]"
                  )}
                  strokeWidth="8" 
                  strokeLinecap="round"
                  strokeDasharray="855"
                  strokeDashoffset={855 - (progress * 855)}
                  fill="none" 
                />
              ) : (
                <circle 
                  cx="144" cy="144" r="136" 
                  className={cn(
                    "stroke-accent-primary transition-all duration-1000",
                    state.status === 'paused' ? "opacity-50" : "opacity-100 drop-shadow-[0_0_15px_rgba(165,255,54,0.3)]"
                  )}
                  strokeWidth="8" 
                  strokeLinecap="round"
                  strokeDasharray="855"
                  strokeDashoffset={855 - ((elapsedMs % 60000) / 60000) * 855}
                  fill="none" 
                />
              )}
            </svg>
            <div className="text-[5.5rem] font-mono font-bold tracking-tighter text-white tabular-nums drop-shadow-md">
              {formatTime(displaySeconds)}
            </div>
          </div>

          <div className="flex items-center gap-8 mt-16">
            {state.status === 'paused' ? (
              <button
                onClick={resumeTimer}
                className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-95 transition-all"
              >
                <Play className="w-8 h-8 fill-black ml-1" />
              </button>
            ) : (
              <button
                onClick={pauseTimer}
                className="w-20 h-20 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/20 hover:bg-white/15 active:scale-95 transition-all"
              >
                <Pause className="w-8 h-8 fill-white" />
              </button>
            )}
            
            <button
              onClick={stopTimer}
              className="w-20 h-20 rounded-full bg-[#3d1c1c] border border-red-500/30 hover:bg-[#4a2222] text-red-500 flex items-center justify-center shadow-lg active:scale-95 transition-all"
            >
              <Square className="w-7 h-7 fill-red-500" />
            </button>
          </div>
          
          <div className="flex gap-20 mt-4 text-xs font-bold text-[#7d8495] uppercase tracking-wider">
            <span className="ml-1">{state.status === 'paused' ? 'Resume' : 'Pause'}</span>
            <span className="mr-1">Finish</span>
          </div>
        </div>
          
          <DeleteConfirmModal
            isOpen={showDiscardConfirm}
            onClose={() => setShowDiscardConfirm(false)}
            onConfirm={confirmDiscard}
            title="Discard this session"
            itemType="session"
            description="Are you sure you want to discard this active session? All progress will be lost."
          />
      </div>
    );
  }

  // Setup state
  return (
    <div className="min-h-screen bg-background text-white flex flex-col select-none">
      <header className="px-5 py-4 flex items-center justify-between border-b border-white/5 sticky top-0 bg-background/95 backdrop-blur-md z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="font-semibold text-[15px]">Focus Session</span>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="p-6 max-w-md mx-auto space-y-8">
          <div>
            <h2 className="text-xl font-bold mb-4">What are you working on?</h2>
            <div className="flex flex-wrap gap-2.5">
              {ACTIVITY_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => { setSelectedType(type); setCustomType(''); }}
                  className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all active:scale-95 border",
                    selectedType === type && !customType
                      ? "bg-accent-primary text-black border-accent-primary shadow-[0_0_15px_rgba(165,255,54,0.15)]"
                      : "bg-surface-card border-[#1f232c] text-[#dbe0ea] hover:border-white/20"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
            
            <input
              type="text"
              placeholder="Or type a custom activity..."
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              className="w-full mt-4 px-5 py-4 rounded-2xl bg-surface-card border border-[#1f232c] focus:border-accent-primary focus:outline-none text-sm transition-colors placeholder:text-[#7d8495]"
            />
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">Timer Mode</h2>
            <div className="flex gap-3 mb-5 p-1 bg-surface-card rounded-2xl border border-[#1f232c]">
              <button
                onClick={() => { setMode('stopwatch'); setTargetDurationMs(null); }}
                className={cn(
                  "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
                  mode === 'stopwatch' ? "bg-[#2a2f3d] text-white shadow-sm" : "text-[#7d8495] hover:text-white"
                )}
              >
                Stopwatch
              </button>
              <button
                onClick={() => setMode('countdown')}
                className={cn(
                  "flex-1 py-2.5 text-sm font-bold rounded-xl transition-all",
                  mode === 'countdown' ? "bg-[#2a2f3d] text-white shadow-sm" : "text-[#7d8495] hover:text-white"
                )}
              >
                Countdown
              </button>
            </div>

            <AnimatePresence mode="popLayout">
              {mode === 'countdown' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <label className="text-sm font-semibold text-[#7d8495]">Duration</label>
                  <div className="grid grid-cols-3 gap-3">
                    {PRESETS.map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => setTargetDurationMs(preset.ms)}
                        className={cn(
                          "py-3 rounded-2xl text-sm font-bold border transition-all active:scale-95",
                          targetDurationMs === preset.ms
                            ? "bg-white/10 text-white border-white/20"
                            : "bg-surface-card text-[#7d8495] border-[#1f232c] hover:border-white/10 hover:text-white"
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      <div className="p-6 bg-background/95 backdrop-blur-md border-t border-white/5 sticky bottom-0 z-10">
        <button
          onClick={handleStart}
          disabled={mode === 'countdown' && !targetDurationMs}
          className="w-full py-4 bg-accent-primary text-black font-bold rounded-2xl text-[16px] flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 shadow-[0_0_20px_rgba(165,255,54,0.15)] hover:bg-[#a5ff36]"
        >
          <Play className="w-5 h-5 fill-black" /> 
          Start Focus
        </button>
      </div>
    </div>
  );
}
