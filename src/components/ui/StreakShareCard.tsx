import React from 'react';
import { Flame, CheckCircle2, Award, Clock, Target, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface StreakShareCardProps {
  studyHours?: number;
  studyMinutes?: number;
  completedTasks?: number;
  totalTasks?: number;
  completedGoals?: number;
  activeGoals?: number;
  streak: number;
  userName: string;
  totalHabits: number;
  completedHabits: number;
  goalTitle?: string;
  format?: 'story' | 'square';
}

export function StreakShareCard({
  streak,
  userName,
  totalHabits,
  completedHabits,
  goalTitle,
  studyHours = 0,
  studyMinutes = 0,
  completedTasks = 0,
  totalTasks = 0,
  completedGoals = 0,
  activeGoals = 0,
  format = 'story'
}: StreakShareCardProps) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const isSquare = format === 'square';

  return (
    <div 
      className={cn(
        "relative rounded-3xl overflow-hidden shadow-2xl flex flex-col bg-gradient-to-br from-[#121820] to-[#0a0c10] border border-[#2a303c]",
        isSquare ? "w-[320px] min-h-[320px]" : "w-[280px] min-h-[480px] pb-6"
      )}
      style={{ padding: '24px' }}
    >
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent-primary/20 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/10 blur-[60px] rounded-full translate-y-1/2 -translate-x-1/2"></div>
      
      <div className="flex-1 flex flex-col z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <span className="font-bold tracking-tight text-white flex items-center gap-1.5 text-sm">
            <span className="w-2 h-2 rounded-full bg-accent-primary"></span>
            STREAK
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7d8495]">{today}</span>
        </div>
        
        {/* Main Content */}
        <div className={cn("flex-1 flex flex-col items-center justify-center text-center", isSquare ? "mt-0" : "-mt-4")}>
          <div className={cn("rounded-full bg-[#1e3419] border border-[#2d5025] flex items-center justify-center shadow-[0_0_30px_rgba(165,255,54,0.15)] relative", isSquare ? "w-16 h-16 mb-4" : "w-20 h-20 mb-6")}>
            <div className="absolute inset-0 rounded-full border border-accent-primary/50 animate-ping opacity-20"></div>
            {goalTitle ? (
              <Award className={cn("text-accent-primary", isSquare ? "w-8 h-8" : "w-10 h-10")} />
            ) : (
              <Flame className={cn("fill-accent-primary stroke-accent-primary", isSquare ? "w-8 h-8" : "w-10 h-10")} />
            )}
          </div>
          
          <h3 className={cn("leading-none font-bold text-white mb-2 tracking-tighter", goalTitle ? (isSquare ? "text-2xl" : "text-[28px]") : (isSquare ? "text-4xl" : "text-[54px]"))}>
            {goalTitle || streak}
          </h3>
          <p className="text-sm font-semibold text-accent-primary uppercase tracking-widest mb-4">
            {goalTitle ? 'Goal Target' : 'Day Streak'}
          </p>
          
          <p className="text-[#a1a8b9] text-xs leading-relaxed max-w-[200px]">
            <span className="font-semibold text-white">{userName || 'I'}</span> is {goalTitle ? 'making solid progress on their goals.' : 'building momentum and crushing daily habits.'}
          </p>
        </div>
        
        {/* Bottom Stats - only show on story format to save space or adjust for square */}
        {!isSquare && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col gap-3 mt-auto backdrop-blur-md">
            <div className="flex justify-around">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-[#7d8495] uppercase font-bold tracking-wider mb-1">Completed</span>
              <span className="text-white font-bold text-sm flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {completedHabits}/{totalHabits}
              </span>
            </div>
            <div className="w-[1px] bg-white/10"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-[#7d8495] uppercase font-bold tracking-wider mb-1">Score</span>
              <span className="text-white font-bold text-sm flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                {streak * 10}
              </span>
            </div>
            </div>
            
            {/* New Stats Row */}
            <div className="flex justify-around pt-2 border-t border-white/10">
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-[#7d8495] uppercase font-bold tracking-wider mb-1">Focus Time</span>
                <span className="text-white font-bold text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-400" />
                  {studyHours}h {studyMinutes}m
                </span>
              </div>
              <div className="w-[1px] bg-white/10"></div>
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-[#7d8495] uppercase font-bold tracking-wider mb-1">Tasks Done</span>
                <span className="text-white font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {completedTasks}/{totalTasks}
                </span>
              </div>
              <div className="w-[1px] bg-white/10"></div>
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-[#7d8495] uppercase font-bold tracking-wider mb-1">Goals</span>
                <span className="text-white font-bold text-xs flex items-center gap-1">
                  <Target className="w-3 h-3 text-purple-400" />
                  {completedGoals} / {activeGoals + completedGoals}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Footer with QR and Brand */}
        <div className={cn("flex items-center justify-center gap-3", isSquare ? "mt-4" : "mt-5")}>
          <div className="bg-white p-1 rounded-xl shadow-lg">
            <img src="/streakloop_qr.png" alt="STREAK QR Code" className="w-14 h-14 object-contain" crossOrigin="anonymous" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-white font-black tracking-tighter text-xl leading-none mb-0.5">STREAK</span>
            <span className="text-[#a1a8b9] text-[11px] font-semibold tracking-wide">streakloop.vercel.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
