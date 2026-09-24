import React, { useState } from 'react';
import { Flame, Zap, Shield, Sparkles, Info, X, ChevronRight, HelpCircle } from 'lucide-react';
import { triggerHaptic } from '../../lib/haptics';
import { calculateLevel, LevelInfo } from '../../lib/xpService';
import { MomentumResult } from '../../lib/momentumService';
import { Habit, HabitLog } from '../../lib/habitService';
import StreakDetailsModal from '../streak/StreakDetailsModal';
import XpProgressModal from '../xp/XpProgressModal';

interface HomeMetricsBarProps {
  streakDays: number;
  lifetimeXP: number;
  momentum: MomentumResult;
  onOpenShareModal?: (type: 'streak' | 'xp' | 'momentum') => void;
  habits?: Habit[];
  logs?: HabitLog[];
  isGuest?: boolean;
  onOpenAuthGate?: () => void;
}

export default function HomeMetricsBar({
  streakDays,
  lifetimeXP,
  momentum,
  onOpenShareModal,
  habits = [],
  logs = [],
  isGuest = false,
  onOpenAuthGate,
}: HomeMetricsBarProps) {
  const [activeExplainMetric, setActiveExplainMetric] = useState<
    'streak' | 'xp' | 'level' | 'momentum' | null
  >(null);
  const [isStreakDetailsOpen, setIsStreakDetailsOpen] = useState(false);
  const [isXpProgressOpen, setIsXpProgressOpen] = useState(false);

  const levelInfo: LevelInfo = calculateLevel(lifetimeXP);

  const handleMetricClick = (type: 'streak' | 'xp' | 'level' | 'momentum') => {
    triggerHaptic('tap');
    if (type === 'streak') {
      setIsStreakDetailsOpen(true);
      return;
    }
    if (type === 'xp') {
      setIsXpProgressOpen(true);
      return;
    }
    setActiveExplainMetric(type);
  };

  return (
    <>
      {/* 4-Metric Grid Hierarchy */}
      <div className="grid grid-cols-4 gap-2">
        {/* 1. STREAK (Consistency) */}
        <button
          onClick={() => handleMetricClick('streak')}
          className="p-3 rounded-2xl bg-surface-card border border-[#1e2330] hover:border-amber-500/40 hover:bg-[#161b26] transition-all text-left flex flex-col justify-between relative group cursor-pointer active:scale-[0.98]"
        >
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-[10px] font-bold text-[#8c94a8] tracking-wider uppercase">
              STREAK
            </span>
            <Flame className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <div className="text-lg font-black text-white leading-none">
              {streakDays}
              <span className="text-[10px] font-medium text-white/50 ml-0.5">d</span>
            </div>
            <p className="text-[9px] text-[#7d8495] truncate mt-0.5">Consistency</p>
          </div>
        </button>

        {/* 2. XP (Progression) */}
        <button
          onClick={() => handleMetricClick('xp')}
          className="p-3 rounded-2xl bg-surface-card border border-[#1e2330] hover:border-cyan-500/40 hover:bg-[#161b26] transition-all text-left flex flex-col justify-between relative group cursor-pointer active:scale-[0.98]"
        >
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-[10px] font-bold text-[#8c94a8] tracking-wider uppercase">
              XP
            </span>
            <Zap className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <div className="text-lg font-black text-white leading-none">
              {lifetimeXP.toLocaleString()}
            </div>
            <p className="text-[9px] text-[#7d8495] truncate mt-0.5">Progression</p>
          </div>
        </button>

        {/* 3. LEVEL (Rank) */}
        <button
          onClick={() => handleMetricClick('level')}
          className="p-3 rounded-2xl bg-surface-card border border-[#1e2330] hover:border-purple-500/40 hover:bg-[#161b26] transition-all text-left flex flex-col justify-between relative group cursor-pointer active:scale-[0.98]"
        >
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-[10px] font-bold text-[#8c94a8] tracking-wider uppercase">
              LEVEL
            </span>
            <Shield className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <div className="text-lg font-black text-white leading-none">
              Lv.{levelInfo.level}
            </div>
            <p className="text-[9px] text-[#7d8495] truncate mt-0.5">Rank</p>
          </div>
        </button>

        {/* 4. MOMENTUM (Execution) */}
        <button
          onClick={() => handleMetricClick('momentum')}
          className="p-3 rounded-2xl bg-surface-card border border-[#1e2330] hover:border-accent-primary/40 hover:bg-[#161b26] transition-all text-left flex flex-col justify-between relative group cursor-pointer active:scale-[0.98]"
        >
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-[10px] font-bold text-[#8c94a8] tracking-wider uppercase">
              MOMENTUM
            </span>
            <Sparkles className="w-3.5 h-3.5 text-accent-primary group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <div className="text-lg font-black text-white leading-none">
              {momentum.isZeroPlanDay ? '—' : `${momentum.score}%`}
            </div>
            <p className="text-[9px] text-[#7d8495] truncate mt-0.5">Today's Exec</p>
          </div>
        </button>
      </div>

      {/* Streak Details Modal (Interactive Streak System) */}
      <StreakDetailsModal
        isOpen={isStreakDetailsOpen}
        onClose={() => setIsStreakDetailsOpen(false)}
        habits={habits}
        logs={logs}
        currentStreak={streakDays}
        isGuest={isGuest}
        onOpenAuthGate={onOpenAuthGate}
      />

      {/* XP Progress Modal (Interactive XP System) */}
      <XpProgressModal
        isOpen={isXpProgressOpen}
        onClose={() => setIsXpProgressOpen(false)}
        lifetimeXP={lifetimeXP}
        isGuest={isGuest}
        onOpenAuthGate={onOpenAuthGate}
      />

      {/* Metric Explanation Modal / Bottom Sheet for Level & Momentum */}
      {activeExplainMetric && (activeExplainMetric === 'level' || activeExplainMetric === 'momentum') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-[28px] bg-[#121622] border border-[#232a3d] p-5 shadow-2xl relative text-left">
            <button
              onClick={() => setActiveExplainMetric(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {activeExplainMetric === 'level' && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Level {levelInfo.level} — {levelInfo.title}</h4>
                    <p className="text-[11px] text-[#8c94a8]">Based on cumulative XP</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 my-3 text-xs space-y-2 text-[#a6adc2]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white font-medium">Next: Level {levelInfo.level + 1}</span>
                    <span>{levelInfo.xpNeededForNextLevel} XP needed</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{ width: `${levelInfo.progressPercent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[#7d8495] pt-1">
                    Formula: <span className="font-mono">XP_required(n) = 100 × n^1.5</span>
                  </p>
                </div>

                <button
                  onClick={() => setActiveExplainMetric(null)}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}

            {activeExplainMetric === 'momentum' && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Today's Momentum: {momentum.score}%</h4>
                    <p className="text-[11px] text-[#8c94a8]">{momentum.stateMessage}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 my-3 text-xs space-y-1.5 text-[#a6adc2]">
                  <p className="font-medium text-white">Execution Formula Breakdown:</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                      <span className="text-[#8c94a8]">Habits (35%):</span>
                      <p className="font-bold text-white">{momentum.breakdown.habits.completed}/{momentum.breakdown.habits.target}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                      <span className="text-[#8c94a8]">Tasks (25%):</span>
                      <p className="font-bold text-white">{momentum.breakdown.tasks.completed}/{momentum.breakdown.tasks.target}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                      <span className="text-[#8c94a8]">Daily Goals (25%):</span>
                      <p className="font-bold text-white">{momentum.breakdown.goals.completed}/{momentum.breakdown.goals.target}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                      <span className="text-[#8c94a8]">Focus (15%):</span>
                      <p className="font-bold text-white">{momentum.breakdown.focus.completed}/{momentum.breakdown.focus.target}m</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActiveExplainMetric(null);
                    onOpenShareModal?.('momentum');
                  }}
                  className="w-full py-2.5 rounded-xl bg-accent-primary/15 border border-accent-primary/30 text-accent-primary hover:bg-accent-primary/20 text-xs font-semibold transition-all cursor-pointer"
                >
                  Share Momentum Card
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
