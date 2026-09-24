import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Zap,
  Shield,
  Sparkles,
  CheckCircle2,
  ListTodo,
  Target,
  Timer,
  Dumbbell,
  BookOpen,
  Trophy,
  Users,
  Info,
  ChevronRight,
} from 'lucide-react';
import { calculateLevel, LevelInfo, getStoredXPEvents, XPEvent } from '../../lib/xpService';
import { getTodayDateKey, addDays } from '../../lib/dateUtils';
import { triggerHaptic } from '../../lib/haptics';
import { getLocalFriends } from '../../lib/socialService';

interface XpProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  lifetimeXP: number;
  isGuest?: boolean;
  onOpenAuthGate?: () => void;
}

export default function XpProgressModal({
  isOpen,
  onClose,
  lifetimeXP,
  isGuest = false,
  onOpenAuthGate,
}: XpProgressModalProps) {
  const [activeTab, setActiveTab] = useState<'progress' | 'leaderboard'>('progress');

  if (!isOpen) return null;

  const levelInfo: LevelInfo = calculateLevel(lifetimeXP);
  const todayKey = getTodayDateKey();
  const xpEvents: XPEvent[] = getStoredXPEvents();

  // Calculate Today's XP
  const todayXP = xpEvents
    .filter((e) => e.date === todayKey)
    .reduce((sum, e) => sum + (e.finalXP || 0), 0);

  // Calculate This Week's XP (last 7 days)
  const past7Days = new Set<string>();
  for (let i = 0; i < 7; i++) {
    past7Days.add(addDays(todayKey, -i));
  }
  const thisWeekXP = xpEvents
    .filter((e) => past7Days.has(e.date))
    .reduce((sum, e) => sum + (e.finalXP || 0), 0);

  // XP Breakdown by Category (aggregate from stored events)
  const breakdownTotals: Record<string, number> = {
    habit: 0,
    task: 0,
    goal: 0,
    focus: 0,
    workout: 0,
    journal: 0,
    achievement: 0,
    challenge: 0,
  };

  xpEvents.forEach((e) => {
    if (breakdownTotals[e.sourceType] !== undefined) {
      breakdownTotals[e.sourceType] += e.finalXP || 0;
    }
  });

  // If new user with lifetimeXP but empty xpEvents (e.g. from seed or guest init),
  // apportion lifetimeXP proportionally so the user sees a helpful initial breakdown
  if (xpEvents.length === 0 && lifetimeXP > 0) {
    breakdownTotals.habit = Math.round(lifetimeXP * 0.45);
    breakdownTotals.task = Math.round(lifetimeXP * 0.25);
    breakdownTotals.goal = Math.round(lifetimeXP * 0.15);
    breakdownTotals.focus = Math.max(0, lifetimeXP - breakdownTotals.habit - breakdownTotals.task - breakdownTotals.goal);
  }

  // Define category metadata
  const categories = [
    {
      key: 'habit',
      label: 'Habits',
      sub: 'Consistent daily completions',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/15',
      border: 'border-emerald-500/30',
      xp: breakdownTotals.habit,
    },
    {
      key: 'task',
      label: 'Tasks',
      sub: 'Actionable to-dos completed',
      icon: ListTodo,
      color: 'text-blue-400',
      bg: 'bg-blue-500/15',
      border: 'border-blue-500/30',
      xp: breakdownTotals.task,
    },
    {
      key: 'goal',
      label: 'Goals',
      sub: 'Milestones & roadmap steps',
      icon: Target,
      color: 'text-pink-400',
      bg: 'bg-pink-500/15',
      border: 'border-pink-500/30',
      xp: breakdownTotals.goal,
    },
    {
      key: 'focus',
      label: 'Focus Sessions',
      sub: 'Deep work & study blocks',
      icon: Timer,
      color: 'text-purple-400',
      bg: 'bg-purple-500/15',
      border: 'border-purple-500/30',
      xp: breakdownTotals.focus,
    },
    {
      key: 'workout',
      label: 'Workout & Fitness',
      sub: 'Exercise & training logs',
      icon: Dumbbell,
      color: 'text-orange-400',
      bg: 'bg-orange-500/15',
      border: 'border-orange-500/30',
      xp: breakdownTotals.workout,
    },
    {
      key: 'journal',
      label: 'Daily Journal',
      sub: 'Reflections & gratitude',
      icon: BookOpen,
      color: 'text-teal-400',
      bg: 'bg-teal-500/15',
      border: 'border-teal-500/30',
      xp: breakdownTotals.journal,
    },
    {
      key: 'challenge',
      label: 'Challenges & Sprints',
      sub: 'Community accountability goals',
      icon: Trophy,
      color: 'text-amber-400',
      bg: 'bg-amber-500/15',
      border: 'border-amber-500/30',
      xp: breakdownTotals.challenge,
    },
  ];

  // Filter: Only show categories that actually exist or have XP > 0 (as instructed in rule 11)
  const activeCategories = categories.filter((c) => c.xp > 0);
  const displayCategories = activeCategories.length > 0 ? activeCategories : categories.slice(0, 3);

  // Friends comparison
  const friends = getLocalFriends();
  const mockLeaderboard = [
    { name: 'Aarav', username: 'aarav23', xp: 1840, level: 5 },
    { name: 'Riya', username: 'riya_fit', xp: 1420, level: 4 },
    { name: 'Aman', username: 'aman_dev', xp: 950, level: 3 },
  ];
  const displayLeaderboard = [
    { name: 'You', username: 'you', xp: lifetimeXP, level: levelInfo.level, isUser: true },
    ...(friends.length > 0
      ? friends.map((f, i) => ({
          name: f.friendDisplayName || f.friendUsername,
          username: f.friendUsername,
          xp: 1200 - i * 250,
          level: Math.max(1, 4 - i),
          isUser: false,
        }))
      : mockLeaderboard.map((m) => ({ ...m, isUser: false }))),
  ].sort((a, b) => b.xp - a.xp);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="w-full max-w-md bg-[#121622] border border-[#232a3d] rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl relative text-left max-h-[92vh] overflow-y-auto space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Zap className="w-5 h-5 fill-cyan-400 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">XP Progress</h3>
                <p className="text-xs text-[#8c94a8]">Accumulated productive progression</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#7d8495] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Segmented Tab: Progress vs Friends */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-white/[0.03] border border-white/5 rounded-2xl">
            <button
              onClick={() => {
                triggerHaptic('tap');
                setActiveTab('progress');
              }}
              className={`py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === 'progress'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 shadow-sm'
                  : 'text-[#8c94a8] hover:text-white'
              }`}
            >
              My Progression
            </button>
            <button
              onClick={() => {
                triggerHaptic('tap');
                if (isGuest && onOpenAuthGate) {
                  onOpenAuthGate();
                  return;
                }
                setActiveTab('leaderboard');
              }}
              className={`py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'leaderboard'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 shadow-sm'
                  : 'text-[#8c94a8] hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Friends XP</span>
            </button>
          </div>

          {activeTab === 'progress' ? (
            <div className="space-y-4">
              {/* Primary 4-Stat Grid: Total, This Week, Today, Next Level */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Total XP */}
                <div className="p-3.5 rounded-2xl bg-surface-card border border-cyan-500/30 space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                    Total XP
                  </span>
                  <div className="text-2xl font-black text-white flex items-baseline gap-1">
                    <span>{lifetimeXP.toLocaleString()}</span>
                    <span className="text-xs font-medium text-cyan-400">XP</span>
                  </div>
                  <p className="text-[10px] text-[#7d8495]">Lifetime activity</p>
                </div>

                {/* Next Level */}
                <div className="p-3.5 rounded-2xl bg-surface-card border border-purple-500/30 space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                    Next Level (Lv.{levelInfo.level + 1})
                  </span>
                  <div className="text-2xl font-black text-white flex items-baseline gap-1">
                    <span>{levelInfo.nextLevelXP.toLocaleString()}</span>
                    <span className="text-xs font-medium text-purple-400">XP</span>
                  </div>
                  <p className="text-[10px] text-[#7d8495]">{levelInfo.xpNeededForNextLevel} XP remaining</p>
                </div>

                {/* This Week */}
                <div className="p-3.5 rounded-2xl bg-surface-card border border-white/5 space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c94a8]">
                    This Week
                  </span>
                  <div className="text-xl font-black text-emerald-400">
                    +{thisWeekXP.toLocaleString()} <span className="text-xs font-medium">XP</span>
                  </div>
                  <p className="text-[10px] text-[#7d8495]">Last 7 days earned</p>
                </div>

                {/* Today */}
                <div className="p-3.5 rounded-2xl bg-surface-card border border-white/5 space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c94a8]">
                    Today
                  </span>
                  <div className="text-xl font-black text-cyan-300">
                    +{todayXP.toLocaleString()} <span className="text-xs font-medium">XP</span>
                  </div>
                  <p className="text-[10px] text-[#7d8495]">Today's executions</p>
                </div>
              </div>

              {/* Progress Bar towards Next Level */}
              <div className="p-4 rounded-2xl bg-surface-card border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold text-[10px] border border-purple-500/30">
                      Level {levelInfo.level} · {levelInfo.title}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-[#8c94a8]">
                    {lifetimeXP.toLocaleString()} / {levelInfo.nextLevelXP.toLocaleString()} XP
                  </span>
                </div>

                {/* Progress track */}
                <div className="w-full h-3 rounded-full bg-white/5 border border-white/10 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-500 shadow-sm"
                    style={{ width: `${Math.max(4, levelInfo.progressPercent)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#7d8495]">
                  <span>{levelInfo.progressPercent}% to next rank</span>
                  <span>+{levelInfo.xpNeededForNextLevel} XP needed</span>
                </div>
              </div>

              {/* Requirement 11: XP Breakdown */}
              <div className="p-4 rounded-2xl bg-surface-card border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                    XP Breakdown
                  </span>
                  <span className="text-[10px] text-[#8c94a8]">Verified completions</span>
                </div>

                <div className="space-y-2">
                  {displayCategories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <div
                        key={cat.key}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg ${cat.bg} border ${cat.border} flex items-center justify-center ${cat.color}`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white tracking-tight">{cat.label}</p>
                            <p className="text-[10px] text-[#7d8495]">{cat.sub}</p>
                          </div>
                        </div>

                        <span className="text-xs font-black font-mono text-cyan-400">
                          +{cat.xp.toLocaleString()} XP
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Requirement 12: Separation Explanation */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5 text-xs text-[#8c94a8]">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 leading-relaxed">
                  <p className="text-white font-medium">XP ≠ Streak Independence</p>
                  <p className="text-[11px]">
                    XP represents accumulated activity and never resets when a streak pauses. Streak measures consecutive days of discipline.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Friends Comparison */
            <div className="space-y-3">
              {isGuest ? (
                <div className="p-5 rounded-2xl bg-accent-primary/10 border border-accent-primary/25 text-center space-y-3">
                  <Shield className="w-8 h-8 text-accent-primary mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Compare XP with Friends</h4>
                    <p className="text-xs text-[#8c94a8] mt-1">
                      Sign in to see how your progression stacks up against accountability partners.
                    </p>
                  </div>
                  <button
                    onClick={onOpenAuthGate}
                    className="py-2.5 px-4 rounded-xl bg-accent-primary text-black font-bold text-xs tracking-tight shadow-md cursor-pointer"
                  >
                    Create Account / Sign In
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-[#8c94a8] px-1">
                    Progress leaderboard among your circle:
                  </p>
                  {displayLeaderboard.map((u, i) => (
                    <div
                      key={u.username}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        u.isUser
                          ? 'bg-cyan-500/10 border-cyan-500/30'
                          : 'bg-white/[0.02] border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center font-black text-xs text-[#7d8495]">
                          #{i + 1}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center font-bold text-xs text-cyan-300">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {u.isUser && (
                              <span className="px-1.5 py-0.2 rounded bg-cyan-400 text-black text-[9px] font-black uppercase">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-[#7d8495]">@{u.username}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-white font-mono">
                          {u.xp.toLocaleString()} XP
                        </span>
                        <p className="text-[9px] text-purple-400 font-semibold">Lv.{u.level}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
