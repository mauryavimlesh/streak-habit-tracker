import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Play, Square, Pause, ChevronLeft, Minimize2, CheckCircle2, RotateCcw } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { saveActivity } from '../../lib/activityService';
import { getUserHabits, getHabitLogs, Habit, logHabit } from '../../lib/habitService';
import { cn } from '../../lib/utils';
import { useTimer, TimerMode } from '../../lib/timer/TimerContext';
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
  const { user } = useAuth();
  const { state, elapsedMs, startTimer, pauseTimer, resumeTimer, stopTimer, resetTimer, minimizeTimer } = useTimer();

  const [selectedType, setSelectedType] = useState(ACTIVITY_TYPES[0]);
  const [customType, setCustomType] = useState('');
  const [mode, setMode] = useState<TimerMode>('stopwatch');
  const [targetDurationMs, setTargetDurationMs] = useState<number | null>(null);
  
  const [matchingHabit, setMatchingHabit] = useState<Habit | null>(null);
  
  const activeType = customType.trim() ? customType.trim() : selectedType;

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
    await saveActivity({
      userId: user?.uid || 'local',
      name: state.activityName,
      durationMinutes: Math.floor(totalSeconds / 60),
      durationSeconds: totalSeconds % 60,
      date: new Date().toLocaleDateString('en-CA'),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }, user?.uid);
    resetTimer();
    navigate(-1);
  };

  const handleAddToHabit = async () => {
    if (!matchingHabit) return;
    
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const addedValue = Math.floor(totalSeconds / 60) || 1; // At least 1 unit if under a minute
    const today = new Date().toLocaleDateString('en-CA');
    
    // Save to history too
    await saveActivity({
      userId: user?.uid || 'local',
      name: state.activityName,
      durationMinutes: Math.floor(totalSeconds / 60),
      durationSeconds: totalSeconds % 60,
      date: today,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      linkedHabitId: matchingHabit.id
    }, user?.uid);

    // Update habit log
    const logs = await getHabitLogs(user?.uid || 'local');
    const todayLog = logs.find(l => l.habitId === matchingHabit.id && l.date === today);
    const currentProgress = todayLog?.progressValue || 0;
    const newProgress = currentProgress + addedValue;
    const target = matchingHabit.targetValue || 1;
    
    await logHabit({
      userId: user?.uid || 'local',
      habitId: matchingHabit.id!,
      date: today,
      status: newProgress >= target ? 'completed' : 'in_progress',
      progressValue: newProgress
    });

    resetTimer();
    navigate(-1);
  };

  const handleDiscard = () => {
    resetTimer();
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

        {matchingHabit ? (
          <div className="bg-surface-card p-6 rounded-[28px] border border-[#1f232c] w-full max-w-sm mb-6 shadow-xl">
            <p className="text-sm font-medium mb-5 text-center text-[#dbe0ea]">
              Add this activity to your "{matchingHabit.name}" habit?
            </p>
            <div className="space-y-3">
              <button 
                onClick={handleAddToHabit}
                className="w-full py-4 bg-accent-primary text-black font-bold rounded-2xl transition-all active:scale-95 shadow-[0_0_20px_rgba(165,255,54,0.15)] hover:bg-[#a5ff36]"
              >
                Save to Habit
              </button>
              <button 
                onClick={handleSaveOnly}
                className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-2xl transition-all active:scale-95 border border-white/5"
              >
                Save as Activity Only
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm space-y-3">
            <button 
              onClick={handleSaveOnly}
              className="w-full py-4 bg-accent-primary text-black font-bold rounded-2xl transition-all active:scale-95 shadow-[0_0_20px_rgba(165,255,54,0.15)] hover:bg-[#a5ff36]"
            >
              Save Activity
            </button>
          </div>
        )}
        
        <button 
          onClick={handleDiscard}
          className="mt-6 text-sm font-semibold text-[#7d8495] hover:text-white transition-colors"
        >
          Discard
        </button>
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
        <header className="px-5 py-4 flex items-center justify-between border-b border-white/5 bg-background/95 backdrop-blur-md sticky top-0 z-10">
          <button onClick={handleMinimize} className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors">
            <Minimize2 className="w-6 h-6" />
          </button>
          <span className="font-semibold text-[15px] tracking-wide">Focus Session</span>
          <div className="w-10"></div>
        </header>

        <div className="flex-1 p-6 flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="text-lg font-bold text-[#7d8495] mb-8 uppercase tracking-[0.2em]">{state.activityName}</div>
          
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
