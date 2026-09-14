import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

export type TimerMode = 'stopwatch' | 'countdown' | 'pomodoro';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface TimerState {
  mode: TimerMode;
  activityName: string;
  activityCategory: string;
  activityIcon?: string;
  
  status: TimerStatus;
  
  startedAt: number | null;
  pausedAt: number | null;
  accumulatedMs: number;
  
  // For countdown / pomodoro
  targetDurationMs: number | null;
}

interface TimerContextType {
  state: TimerState;
  elapsedMs: number;
  startTimer: (mode: TimerMode, activityName: string, targetDurationMs?: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  minimizeTimer: () => void;
  maximizeTimer: () => void;
  isMinimized: boolean;
}

const defaultState: TimerState = {
  mode: 'stopwatch',
  activityName: '',
  activityCategory: '',
  status: 'idle',
  startedAt: null,
  pausedAt: null,
  accumulatedMs: 0,
  targetDurationMs: null,
};

const TimerContext = createContext<TimerContextType | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TimerState>(() => {
    const saved = localStorage.getItem('streak_active_timer');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return defaultState;
      }
    }
    return defaultState;
  });

  const [elapsedMs, setElapsedMs] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const reqRef = useRef<number>();

  useEffect(() => {
    localStorage.setItem('streak_active_timer', JSON.stringify(state));
  }, [state]);

  const updateElapsed = () => {
    if (state.status === 'running' && state.startedAt) {
      const now = Date.now();
      let currentElapsed = state.accumulatedMs + (now - state.startedAt);
      
      if (state.targetDurationMs !== null) {
        if (state.mode === 'countdown' || state.mode === 'pomodoro') {
            if (currentElapsed >= state.targetDurationMs) {
                currentElapsed = state.targetDurationMs;
                setState(prev => ({ ...prev, status: 'completed' }));
            }
        }
      }
      
      setElapsedMs(currentElapsed);
      reqRef.current = requestAnimationFrame(updateElapsed);
    } else if (state.status === 'paused' || state.status === 'completed') {
      let finalElapsed = state.accumulatedMs;
      if (state.targetDurationMs !== null && finalElapsed > state.targetDurationMs) {
          finalElapsed = state.targetDurationMs;
      }
      setElapsedMs(finalElapsed);
    } else {
      setElapsedMs(0);
    }
  };

  useEffect(() => {
    if (state.status === 'running') {
      reqRef.current = requestAnimationFrame(updateElapsed);
    } else {
      updateElapsed();
    }
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [state.status, state.startedAt, state.accumulatedMs, state.targetDurationMs]);

  const startTimer = (mode: TimerMode, activityName: string, targetDurationMs: number | null = null) => {
    setState({
      mode,
      activityName,
      activityCategory: '',
      status: 'running',
      startedAt: Date.now(),
      pausedAt: null,
      accumulatedMs: 0,
      targetDurationMs,
    });
    setIsMinimized(false);
  };

  const pauseTimer = () => {
    if (state.status !== 'running' || !state.startedAt) return;
    const now = Date.now();
    setState(prev => ({
      ...prev,
      status: 'paused',
      pausedAt: now,
      accumulatedMs: prev.accumulatedMs + (now - prev.startedAt!)
    }));
  };

  const resumeTimer = () => {
    if (state.status !== 'paused') return;
    setState(prev => ({
      ...prev,
      status: 'running',
      startedAt: Date.now(),
      pausedAt: null,
    }));
  };

  const stopTimer = () => {
    if (state.status === 'running' && state.startedAt) {
      const now = Date.now();
      setState(prev => ({
        ...prev,
        status: 'completed',
        accumulatedMs: prev.accumulatedMs + (now - prev.startedAt!)
      }));
    } else {
      setState(prev => ({ ...prev, status: 'completed' }));
    }
  };

  const resetTimer = () => {
    setState(defaultState);
    setIsMinimized(false);
  };

  const minimizeTimer = () => setIsMinimized(true);
  const maximizeTimer = () => setIsMinimized(false);

  return (
    <TimerContext.Provider value={{
      state, elapsedMs, startTimer, pauseTimer, resumeTimer, stopTimer, resetTimer,
      minimizeTimer, maximizeTimer, isMinimized
    }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within TimerProvider");
  return ctx;
}
