import React from 'react';
import { Clock, Focus, Target } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface StudySessionShareCardProps {
  durationMinutes: number;
  durationSeconds?: number;
  activityName: string;
  userName: string;
  streak?: number;
  format?: 'story' | 'square';
}

export function StudySessionShareCard({
  durationMinutes,
  durationSeconds = 0,
  activityName,
  userName,
  streak,
  format = 'story'
}: StudySessionShareCardProps) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const isSquare = format === 'square';
  
  const h = Math.floor(durationMinutes / 60);
  const m = durationMinutes % 60;
  
  let timeStr = '';
  if (h > 0) timeStr += `${h}h `;
  if (m > 0) timeStr += `${m}m`;
  if (h === 0 && m === 0) timeStr = `${durationSeconds}s`;

  return (
    <div 
      className={cn(
        "share-card relative rounded-3xl overflow-hidden shadow-2xl flex flex-col bg-gradient-to-br from-[#121820] to-[#0a0c10] border border-[#2a303c]",
        isSquare ? "w-[320px] min-h-[320px]" : "w-[280px] min-h-[480px] pb-6"
      )}
      style={{ padding: '24px' }}
    >
      <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent-primary/10 blur-[60px] rounded-full translate-y-1/2 -translate-x-1/2"></div>
      
      <div className="flex-1 flex flex-col z-10">
        <div className="flex justify-between items-center mb-4">
          <span className="font-bold tracking-tight text-white flex items-center gap-1.5 text-sm">
            <span className="w-2 h-2 rounded-full bg-accent-primary"></span>
            STREAK
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7d8495]">{today}</span>
        </div>
        
        <div className={cn("flex-1 flex flex-col items-center justify-center text-center", isSquare ? "mt-0" : "-mt-4")}>
          <div className={cn("rounded-full bg-[#182030] border border-[#243048] flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.15)] relative", isSquare ? "w-16 h-16 mb-4" : "w-20 h-20 mb-6")}>
            <div className="absolute inset-0 rounded-full border border-indigo-500/30 animate-ping opacity-20"></div>
            <Clock className={cn("text-indigo-400", isSquare ? "w-8 h-8" : "w-10 h-10")} />
          </div>
          
          <h3 className={cn("leading-none font-bold text-white mb-2 tracking-tighter", isSquare ? "text-4xl" : "text-[54px]")}>
            {timeStr.trim()}
          </h3>
          <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest mb-4">
            Deep Work
          </p>
          
          <p className="text-[#a1a8b9] text-xs leading-relaxed max-w-[200px]">
            <span className="font-semibold text-white">{userName || 'I'}</span> completed a focus session for <span className="text-white font-semibold">{activityName}</span>.
          </p>
        </div>
        
        {!isSquare && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex justify-around mt-auto backdrop-blur-md">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-[#7d8495] uppercase font-bold tracking-wider mb-1">Status</span>
              <span className="text-white font-bold text-sm flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                Completed
              </span>
            </div>
            {streak !== undefined && streak > 0 && (
              <>
                <div className="w-[1px] bg-white/10"></div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-[#7d8495] uppercase font-bold tracking-wider mb-1">Streak</span>
                  <span className="text-white font-bold text-sm flex items-center gap-1">
                    <span className="text-accent-primary">🔥</span>
                    {streak} Days
                  </span>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Footer with QR and Brand */}
        <div className={cn("flex items-center justify-center gap-3", isSquare ? "mt-4" : "mt-5")}>
          <div className="bg-white p-1 rounded-xl shadow-lg">
            <img src="/streakloop_qr.png" alt="STREAK QR Code" className="w-14 h-14 object-contain" crossOrigin="anonymous" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-white font-black tracking-tighter text-xl leading-none mb-0.5">STREAK</span>
            <span className="text-[#a1a8b9] text-[11px] font-semibold tracking-wide">streakloop.vercel.app</span>
          </div>
        </div>
      </div>
    </div>
  );
}
