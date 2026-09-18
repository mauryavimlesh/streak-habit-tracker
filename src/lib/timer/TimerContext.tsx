import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';

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

  useEffect(() => {
    localStorage.setItem('streak_active_timer', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
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

    updateElapsed();

    if (state.status === 'running') {
      const interval = setInterval(updateElapsed, 500);
      return () => clearInterval(interval);
    }
  }, [state.status, state.startedAt, state.accumulatedMs, state.targetDurationMs, state.mode]);

  const startTimer = useCallback((mode: TimerMode, activityName: string, targetDurationMs: number | null = null) => {
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
  }, []);

  const pauseTimer = useCallback(() => {
    setState(prev => {
      if (prev.status !== 'running' || !prev.startedAt) return prev;
      const now = Date.now();
      return {
        ...prev,
        status: 'paused',
        pausedAt: now,
        accumulatedMs: prev.accumulatedMs + (now - prev.startedAt)
      };
    });
  }, []);

  const resumeTimer = useCallback(() => {
    setState(prev => {
      if (prev.status !== 'paused') return prev;
      return {
        ...prev,
        status: 'running',
        startedAt: Date.now(),
        pausedAt: null,
      };
    });
  }, []);

  const stopTimer = useCallback(() => {
    setState(prev => {
      if (prev.status === 'running' && prev.startedAt) {
        const now = Date.now();
        return {
          ...prev,
          status: 'completed',
          accumulatedMs: prev.accumulatedMs + (now - prev.startedAt)
        };
      }
      return { ...prev, status: 'completed' };
    });
  }, []);

  const resetTimer = useCallback(() => {
    setState(defaultState);
    setIsMinimized(false);
  }, []);

  const minimizeTimer = useCallback(() => setIsMinimized(true), []);
  const maximizeTimer = useCallback(() => setIsMinimized(false), []);

  const contextValue = useMemo(() => ({
    state,
    elapsedMs,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    minimizeTimer,
    maximizeTimer,
    isMinimized
  }), [state, elapsedMs, startTimer, pauseTimer, resumeTimer, stopTimer, resetTimer, minimizeTimer, maximizeTimer, isMinimized]);

  return (
    <TimerContext.Provider value={contextValue}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within TimerProvider");
  return ctx;
}

export function formatTimerDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
