import React from 'react';
import { Flame, Snowflake, Share2 } from 'lucide-react';
import { MomentumResult } from '../../lib/momentumService';
import { cn } from '../../lib/utils';

export interface MomentumCardProps {
  momentum: MomentumResult;
  globalStreak: number;
  freezeStatus: {
    isProtectedToday: boolean;
    availableCount: number;
  };
  onOpenFreezeModal: () => void;
  onOpenShareModal: () => void;
}

export const MomentumCard: React.FC<MomentumCardProps> = ({
  momentum,
  globalStreak,
  freezeStatus,
  onOpenFreezeModal,
  onOpenShareModal,
}) => {
  const { score, isZeroPlanDay, stateMessage, breakdown } = momentum;

  return (
    <div className="bg-[#12141c] border border-[#1f2433] rounded-[28px] p-6 space-y-5 shadow-sm">
      <div className="flex items-center gap-5">
        {/* Circular Momentum Widget */}
        <div className="w-[114px] h-[114px] rounded-full bg-[#161922] border border-[#212633] flex items-center justify-center relative p-1 shrink-0">
          <svg className="w-[96px] h-[96px] transform -rotate-90" viewBox="0 0 96 96">
            {/* Background Track */}
            <circle
              cx="48"
              cy="48"
              r="38"
              stroke="#1c222b"
              strokeWidth="9"
              fill="none"
            />
            {/* Active Momentum Arc */}
            {!isZeroPlanDay && score > 0 && (
              <circle
                cx="48"
                cy="48"
                r="38"
                stroke="var(--app-accent, #22c55e)"
                strokeWidth="9"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 38}`}
                strokeDashoffset={`${2 * Math.PI * 38 * (1 - score / 100)}`}
                className="transition-all duration-700 ease-out"
              />
            )}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
            {isZeroPlanDay ? (
              <span className="text-[11px] font-semibold text-[#7a8192] leading-tight">
                No Plans
              </span>
            ) : (
              <>
                <span className="text-[26px] font-bold text-white tracking-tight leading-none">
                  {score}%
                </span>
                <span className="text-[11px] font-medium text-[#7a8192] mt-0.5 tracking-tight">
                  Momentum
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Info Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <p className="text-[13px] font-medium text-[#7d8495]">Today's Momentum</p>
            <span
              className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                score === 100
                  ? 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary'
                  : score >= 50
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                  : 'bg-white/5 border-white/10 text-[#9ca2b2]'
              )}
            >
              {isZeroPlanDay ? 'Unscheduled' : `${score}%`}
            </span>
          </div>

          <h3 className="text-lg font-bold text-white tracking-tight truncate mb-2">
            {stateMessage}
          </h3>

          {/* Badges strip */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Streak badge */}
            <div className="bg-[#1e3419] border border-[#2d5025] text-accent-primary px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-semibold">
              <Flame className="w-3.5 h-3.5 fill-accent-primary/25 stroke-accent-primary" />
              <span>
                {globalStreak} {globalStreak === 1 ? 'day' : 'days'}
              </span>
            </div>

            {/* Streak Freeze button */}
            <button
              onClick={onOpenFreezeModal}
              className={cn(
                'px-2.5 py-1 rounded-full flex items-center gap-1.5 text-xs font-semibold border transition-all cursor-pointer',
                freezeStatus.isProtectedToday
                  ? 'bg-[#162736] border-[#3b82f6] text-[#60a5fa] shadow-[0_0_12px_rgba(96,165,250,0.25)]'
                  : freezeStatus.availableCount > 0
                  ? 'bg-[#16202c] border-[#22394d] text-[#60a5fa] hover:border-[#3b82f6]'
                  : 'bg-white/5 border-white/10 text-[#828b9e] hover:text-white'
              )}
              title="Streak Freeze: Protect your streak during days off"
            >
              <Snowflake className="w-3 h-3 text-[#60a5fa]" />
              <span>
                {freezeStatus.isProtectedToday
                  ? 'Frozen'
                  : `${freezeStatus.availableCount} Freeze`}
              </span>
            </button>

            {/* Share button */}
            <button
              onClick={onOpenShareModal}
              className="bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 hover:text-white px-2.5 py-1 rounded-full flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer"
              title="Share Momentum Card"
            >
              <Share2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Real Category Contribution Bars */}
      {!isZeroPlanDay && (
        <div className="pt-2 border-t border-[#1f2433] grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          {/* Habits */}
          <div className="bg-[#161923] p-2.5 rounded-xl border border-[#212635]">
            <div className="flex items-center justify-between text-[#7d8495] mb-1">
              <span>Habits (35%)</span>
              <span className="font-semibold text-white">
                {breakdown.habits.available ? `${Math.round(breakdown.habits.score * 100)}%` : '—'}
              </span>
            </div>
            <div className="w-full bg-[#202533] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-accent-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round(breakdown.habits.score * 100)}%` }}
              />
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-[#161923] p-2.5 rounded-xl border border-[#212635]">
            <div className="flex items-center justify-between text-[#7d8495] mb-1">
              <span>Tasks (25%)</span>
              <span className="font-semibold text-white">
                {breakdown.tasks.available ? `${Math.round(breakdown.tasks.score * 100)}%` : '—'}
              </span>
            </div>
            <div className="w-full bg-[#202533] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-sky-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round(breakdown.tasks.score * 100)}%` }}
              />
            </div>
          </div>

          {/* Daily Goals */}
          <div className="bg-[#161923] p-2.5 rounded-xl border border-[#212635]">
            <div className="flex items-center justify-between text-[#7d8495] mb-1">
              <span>Goals (25%)</span>
              <span className="font-semibold text-white">
                {breakdown.goals.available ? `${Math.round(breakdown.goals.score * 100)}%` : '—'}
              </span>
            </div>
            <div className="w-full bg-[#202533] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round(breakdown.goals.score * 100)}%` }}
              />
            </div>
          </div>

          {/* Focus */}
          <div className="bg-[#161923] p-2.5 rounded-xl border border-[#212635]">
            <div className="flex items-center justify-between text-[#7d8495] mb-1">
              <span>Focus (15%)</span>
              <span className="font-semibold text-white">
                {breakdown.focus.available ? `${Math.round(breakdown.focus.score * 100)}%` : '—'}
              </span>
            </div>
            <div className="w-full bg-[#202533] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-purple-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round(breakdown.focus.score * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
