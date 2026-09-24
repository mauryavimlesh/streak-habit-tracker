import React, { useState, useEffect } from 'react';
import { Flame, Zap, Check, Sparkles, Shield, Trophy, Target, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function AuthVisualPanel() {
  const [habitChecks, setHabitChecks] = useState([true, true, true, false]);
  const [activeMomentum, setActiveMomentum] = useState(85);

  const habits = [
    { title: 'Morning Workout', category: 'Fitness', time: '30m', xp: 20 },
    { title: 'Deep Focus Block', category: 'Study', time: '45m', xp: 25 },
    { title: 'Read 20 Pages', category: 'Mind', time: '15m', xp: 15 },
    { title: 'Sleep at 10:30 PM', category: 'Recovery', time: '8h', xp: 15 },
  ];

  // Micro-interaction: allow clicking preview habits for a tactile feeling of STREAK
  const toggleHabit = (idx: number) => {
    const updated = [...habitChecks];
    updated[idx] = !updated[idx];
    setHabitChecks(updated);
    const count = updated.filter(Boolean).length;
    setActiveMomentum(Math.round((count / updated.length) * 100));
  };

  return (
    <div className="relative w-full h-full min-h-[640px] flex flex-col justify-between p-8 xl:p-12 overflow-hidden bg-gradient-to-br from-[#0c0f17] via-[#090b10] to-[#06080d] select-none border-r border-white/5">
      {/* Ambient background glows - subtle & performant */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Subtle background tech grid */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}
      />

      {/* Top Branding & Tagline */}
      <div className="relative z-10 space-y-3">
        <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
          <span className="text-xs font-semibold tracking-wider uppercase text-white/90">
            Consistency Engine
          </span>
        </div>

        <h2 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-[1.15]">
          Small actions.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary via-emerald-400 to-cyan-400">
            Every single day.
          </span>
        </h2>
        <p className="text-sm text-[#8c94a8] max-w-sm leading-relaxed">
          Your daily discipline dashboard. Build unbroken streaks, earn productive XP, and watch your momentum compound.
        </p>
      </div>

      {/* Center Interactive Living Dashboard Preview */}
      <div className="relative z-10 my-auto py-6 max-w-md w-full">
        {/* Floating Top Card: Live Momentum & Streak */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="rounded-[28px] bg-[#121622]/90 border border-white/10 p-5 shadow-2xl backdrop-blur-xl space-y-4"
        >
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-accent-primary/15 border border-accent-primary/30 flex items-center justify-center text-accent-primary">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7d8495]">
                  Today's Execution
                </span>
                <p className="text-xs font-bold text-white tracking-tight">Active Momentum</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xl font-black font-mono text-accent-primary">
                {activeMomentum}%
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-primary via-emerald-400 to-cyan-400 transition-all duration-500 shadow-[0_0_12px_rgba(140,238,40,0.4)]"
              style={{ width: `${activeMomentum}%` }}
            />
          </div>

          {/* Dual Pill Stats: Streak & XP */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-amber-500/20 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Flame className="w-4 h-4 fill-amber-400" />
              </div>
              <div className="truncate">
                <p className="text-xs font-black text-white">21 Days</p>
                <p className="text-[10px] text-amber-400/80 font-medium">Unbroken Streak</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-cyan-500/20 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Zap className="w-4 h-4 fill-cyan-400" />
              </div>
              <div className="truncate">
                <p className="text-xs font-black text-white">+240 XP</p>
                <p className="text-[10px] text-cyan-400/80 font-medium">Earned Today</p>
              </div>
            </div>
          </div>

          {/* Interactive Live Checklist */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-[#7d8495] px-1">
              <span>Interactive preview (tap to test)</span>
              <span className="font-mono">{habitChecks.filter(Boolean).length}/4 completed</span>
            </div>

            <div className="space-y-1.5">
              {habits.map((habit, idx) => {
                const isChecked = habitChecks[idx];
                return (
                  <div
                    key={habit.title}
                    onClick={() => toggleHabit(idx)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer text-left ${
                      isChecked
                        ? 'bg-accent-primary/[0.07] border-accent-primary/30 text-white'
                        : 'bg-white/[0.02] border-white/5 text-[#8c94a8] hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                          isChecked
                            ? 'bg-accent-primary text-black'
                            : 'border border-white/20 bg-white/5'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className={`text-xs font-medium truncate ${isChecked ? 'text-white' : 'text-[#8c94a8]'}`}>
                        {habit.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] shrink-0">
                      <span className="text-[#555f75]">{habit.time}</span>
                      <span className="font-mono font-semibold text-cyan-400">+{habit.xp} XP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Floating Secondary Mini Pill */}
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="mt-3 p-3 rounded-2xl bg-[#141824]/90 border border-white/10 shadow-lg backdrop-blur-md flex items-center justify-between text-xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Level 4 · Consistency Seeker</p>
              <p className="text-[10px] text-[#7d8495]">Next rank in 160 XP</p>
            </div>
          </div>

          <span className="text-[10px] font-semibold text-accent-primary flex items-center gap-0.5">
            Keep Going
            <ArrowUpRight className="w-3 h-3" />
          </span>
        </motion.div>
      </div>

      {/* Bottom Proof Metric / Philosophy */}
      <div className="relative z-10 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-[#7d8495]">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            <div className="w-6 h-6 rounded-full bg-accent-primary/20 border border-black text-[9px] font-bold flex items-center justify-center text-accent-primary">A</div>
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-black text-[9px] font-bold flex items-center justify-center text-cyan-400">V</div>
            <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-black text-[9px] font-bold flex items-center justify-center text-purple-400">R</div>
          </div>
          <span className="text-[11px] text-[#8c94a8]">Built for accountability</span>
        </div>

        <span className="text-[11px] text-[#555f75]">Encrypted & Synced</span>
      </div>
    </div>
  );
}
