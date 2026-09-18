import React from 'react';
import { useNavigate } from 'react-router';
import { useTimer, formatTimerDuration } from '../../lib/timer/TimerContext';
import { Play, Pause, Maximize2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export function ActiveTimerWidget() {
  const navigate = useNavigate();
  const { state: timerState, elapsedMs: timerElapsed, pauseTimer, resumeTimer } = useTimer();

  const handleFocusClick = () => {
    navigate('/activity');
  };

  if (timerState.status === 'idle' || timerState.status === 'completed') {
    return (
      <div 
        onClick={handleFocusClick}
        className="glass-effect-interactive rounded-[28px] p-5 flex items-center justify-between cursor-pointer group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#1a1d25] border border-[#262b36] flex items-center justify-center group-hover:border-accent-primary/30 transition-colors">
            <Play className="w-5 h-5 fill-accent-primary text-accent-primary ml-1" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-white mb-0.5 group-hover:text-accent-primary transition-colors">Start Focus Session</h3>
            <p className="text-[13px] font-medium text-[#7d8495]">Study, Workout, Reading & more</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-effect rounded-[28px] p-5 relative overflow-hidden group">
      <div className="absolute inset-0 bg-accent-primary/5"></div>
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={handleFocusClick}>
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle cx="24" cy="24" r="22" className="stroke-[#1f232c]" strokeWidth="4" fill="none" />
              <circle 
                cx="24" cy="24" r="22" 
                className={cn("stroke-accent-primary transition-all duration-1000", timerState.status === 'paused' ? 'opacity-50' : 'opacity-100')} 
                strokeWidth="4" 
                strokeLinecap="round"
                strokeDasharray="138"
                strokeDashoffset={timerState.mode === 'countdown' && timerState.targetDurationMs ? 138 - (Math.min(1, timerElapsed / timerState.targetDurationMs) * 138) : 138 - ((timerElapsed % 60000) / 60000) * 138}
                fill="none" 
              />
            </svg>
            {timerState.status === 'running' ? (
              <div className="w-3 h-3 rounded-full bg-accent-primary animate-pulse" />
            ) : (
              <div className="w-3 h-3 rounded-sm bg-accent-primary/50" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-accent-primary uppercase tracking-wider mb-0.5">
              {timerState.activityName}
            </span>
            <span className="text-2xl font-mono font-bold text-white tabular-nums tracking-tighter leading-none">
              {formatTimerDuration(
                timerState.mode === 'countdown' && timerState.targetDurationMs
                  ? Math.max(0, timerState.targetDurationMs - timerElapsed)
                  : timerElapsed
              )}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {timerState.status === 'running' ? (
            <button 
              onClick={(e) => { e.stopPropagation(); pauseTimer(); }}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors border border-white/10"
            >
              <Pause className="w-4 h-4 fill-white text-white" />
            </button>
          ) : (
            <button 
              onClick={(e) => { e.stopPropagation(); resumeTimer(); }}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center transition-transform hover:scale-105"
            >
              <Play className="w-4 h-4 fill-black text-black ml-0.5" />
            </button>
          )}
          <button 
            onClick={handleFocusClick}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-[#7d8495] hover:text-white"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
