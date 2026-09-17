import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Flag, Trophy, Sparkles, Target, Zap, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import confetti from 'canvas-confetti';

interface MilestoneIndicatorProps {
  goalTitle: string;
  unit: string;
  currentQuantity: number;
  targetQuantity: number;
  dailyQuantity?: number;
  dailyTarget?: number;
  className?: string;
}

interface MilestoneNode {
  percent: number;
  label: string;
  icon: typeof Flag;
  description: string;
  celebrationTitle: string;
}

const MILESTONES: MilestoneNode[] = [
  {
    percent: 25,
    label: 'First Quarter',
    icon: Flag,
    description: 'Great start! Momentum established.',
    celebrationTitle: '25% Milestone Unlocked! 🚀',
  },
  {
    percent: 50,
    label: 'Halfway Mark',
    icon: Zap,
    description: 'Halfway to victory. Keep pressing forward.',
    celebrationTitle: '50% Halfway Milestone! ⚡',
  },
  {
    percent: 75,
    label: 'Final Stretch',
    icon: Sparkles,
    description: 'Over the hill. The summit is in sight!',
    celebrationTitle: '75% Final Stretch Reached! 🌟',
  },
  {
    percent: 100,
    label: 'Goal Achieved',
    icon: Trophy,
    description: 'Complete mastery. You finished the target!',
    celebrationTitle: '100% Target Crushed! 🏆',
  },
];

export function MilestoneIndicator({
  goalTitle,
  unit,
  currentQuantity,
  targetQuantity,
  dailyQuantity,
  dailyTarget,
  className,
}: MilestoneIndicatorProps) {
  // Support toggling between Overall target milestones and Daily target milestones if available
  const hasDaily = typeof dailyTarget === 'number' && dailyTarget > 0;
  const [mode, setMode] = useState<'overall' | 'daily'>(hasDaily && targetQuantity <= 1 ? 'daily' : 'overall');

  const effectiveCurrent = mode === 'daily' && typeof dailyQuantity === 'number' ? dailyQuantity : currentQuantity;
  const effectiveTarget = mode === 'daily' && hasDaily ? (dailyTarget as number) : targetQuantity;

  const progressPercent = effectiveTarget > 0 ? Math.min(100, Math.round((effectiveCurrent / effectiveTarget) * 100)) : 0;

  // Identify next upcoming milestone
  const nextMilestone = MILESTONES.find((m) => progressPercent < m.percent);
  const highestReached = [...MILESTONES].reverse().find((m) => progressPercent >= m.percent);

  const handleMilestoneClick = (node: MilestoneNode, isReached: boolean) => {
    if (isReached) {
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.6 },
      });
    }
  };

  return (
    <section
      id="goal-milestone-indicator"
      aria-label="Milestone Progress Indicator"
      className={cn(
        'p-5 rounded-[28px] glass-effect border border-white/10 space-y-5 select-none relative overflow-hidden',
        className
      )}
    >
      {/* Background ambient gradient glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary shrink-0">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Milestone Tracker
              {progressPercent >= 100 ? (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Completed
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
                  {progressPercent}% Achieved
                </span>
              )}
            </h3>
            <p className="text-[11px] text-[#7d8495]">
              Visual quantitative thresholds at 25%, 50%, 75%, and 100%
            </p>
          </div>
        </div>

        {hasDaily && (
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setMode('overall')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                mode === 'overall'
                  ? 'bg-accent-primary text-black shadow-sm'
                  : 'text-[#7d8495] hover:text-white'
              )}
            >
              Overall
            </button>
            <button
              type="button"
              onClick={() => setMode('daily')}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                mode === 'daily'
                  ? 'bg-accent-primary text-black shadow-sm'
                  : 'text-[#7d8495] hover:text-white'
              )}
            >
              Daily
            </button>
          </div>
        )}
      </div>

      {/* Progress Track with Highlighted Milestone Nodes */}
      <div className="relative pt-6 pb-2 px-3">
        {/* Track Background */}
        <div className="h-3 w-full bg-[#141720] rounded-full overflow-hidden border border-white/5 relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-accent-primary/80 via-accent-primary to-[#a8ff3e] rounded-full relative"
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </motion.div>
        </div>

        {/* Milestone Pin Points */}
        <div className="relative w-full -mt-4 flex justify-between pointer-events-none">
          {MILESTONES.map((node) => {
            const isReached = progressPercent >= node.percent;
            const isNext = nextMilestone?.percent === node.percent;
            const thresholdQty = Math.round((effectiveTarget * (node.percent / 100)) * 10) / 10;
            const NodeIcon = node.icon;

            return (
              <div
                key={node.percent}
                className="flex flex-col items-center pointer-events-auto"
                style={{
                  transform: 'translateX(0)',
                }}
              >
                {/* Node Circle */}
                <button
                  type="button"
                  onClick={() => handleMilestoneClick(node, isReached)}
                  title={`${node.percent}% - ${thresholdQty} ${unit} (${isReached ? 'Reached' : 'Upcoming'})`}
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-300 cursor-pointer relative shadow-lg',
                    isReached
                      ? 'bg-accent-primary text-black border-white/30 scale-110 shadow-[0_0_14px_rgba(140,238,40,0.5)]'
                      : isNext
                      ? 'bg-[#1b202c] text-white border-accent-primary/70 ring-2 ring-accent-primary/30 animate-pulse'
                      : 'bg-[#11131a] text-[#555c6e] border-[#222836]'
                  )}
                >
                  {isReached ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <NodeIcon className="w-3.5 h-3.5 stroke-[2.2]" />
                  )}

                  {/* Pulsing indicator for next milestone */}
                  {isNext && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent-primary animate-ping" />
                  )}
                </button>

                {/* Milestone Label */}
                <div className="text-center mt-2 flex flex-col items-center">
                  <span
                    className={cn(
                      'text-xs font-black tracking-tight leading-none',
                      isReached
                        ? 'text-accent-primary'
                        : isNext
                        ? 'text-white'
                        : 'text-[#616879]'
                    )}
                  >
                    {node.percent}%
                  </span>
                  <span className="text-[10px] text-[#7d8495] font-medium mt-0.5 whitespace-nowrap">
                    {thresholdQty} {unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Milestone Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
        {MILESTONES.map((node) => {
          const isReached = progressPercent >= node.percent;
          const isNext = nextMilestone?.percent === node.percent;
          const milestoneTarget = Math.round((effectiveTarget * (node.percent / 100)) * 10) / 10;
          const remainingForMilestone = Math.max(0, Math.round((milestoneTarget - effectiveCurrent) * 10) / 10);
          const NodeIcon = node.icon;

          return (
            <div
              key={node.percent}
              onClick={() => handleMilestoneClick(node, isReached)}
              className={cn(
                'p-3 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer',
                isReached
                  ? 'bg-accent-primary/[0.07] border-accent-primary/30 hover:border-accent-primary/50'
                  : isNext
                  ? 'bg-white/[0.04] border-accent-primary/40 hover:border-accent-primary/60'
                  : 'bg-[#101218] border-white/5 opacity-65 hover:opacity-90'
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div
                    className={cn(
                      'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold',
                      isReached
                        ? 'bg-accent-primary text-black'
                        : isNext
                        ? 'bg-accent-primary/20 text-accent-primary'
                        : 'bg-white/5 text-[#636a7b]'
                    )}
                  >
                    <NodeIcon className="w-3.5 h-3.5" />
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md',
                      isReached
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : isNext
                        ? 'bg-accent-primary/20 text-accent-primary font-bold'
                        : 'bg-white/5 text-[#636a7b]'
                    )}
                  >
                    {isReached ? 'Done' : isNext ? 'Next' : 'Locked'}
                  </span>
                </div>

                <div className="text-xs font-bold text-white flex items-baseline gap-1">
                  <span>{node.percent}%</span>
                  <span className="text-[11px] font-normal text-[#7d8495] truncate">
                    ({milestoneTarget} {unit})
                  </span>
                </div>

                <p className="text-[10px] text-[#7d8495] mt-1 line-clamp-2 leading-relaxed">
                  {node.description}
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 mt-2 text-[10px]">
                {isReached ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" /> Milestone Met
                  </span>
                ) : isNext ? (
                  <span className="text-accent-primary font-bold flex items-center gap-0.5">
                    Need {remainingForMilestone} {unit}
                  </span>
                ) : (
                  <span className="text-[#596070]">
                    Need {remainingForMilestone} {unit}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Motivational Milestone Callout */}
      <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {progressPercent >= 100 ? (
            <Trophy className="w-4 h-4 text-accent-primary shrink-0" />
          ) : highestReached ? (
            <Sparkles className="w-4 h-4 text-accent-primary shrink-0" />
          ) : (
            <Flag className="w-4 h-4 text-[#7d8495] shrink-0" />
          )}
          <span className="text-white font-semibold">
            {progressPercent >= 100
              ? 'All milestones reached! Outstanding achievement!'
              : nextMilestone
              ? `Next Milestone: Reach ${nextMilestone.percent}% (${Math.round(effectiveTarget * (nextMilestone.percent / 100))} ${unit})`
              : 'Keep logging your progress every day!'}
          </span>
        </div>

        <div className="text-right text-[#7d8495] font-medium text-[11px] shrink-0 ml-2">
          {effectiveCurrent} of {effectiveTarget} {unit}
        </div>
      </div>
    </section>
  );
}
