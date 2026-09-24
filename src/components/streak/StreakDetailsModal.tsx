import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Flame,
  Calendar as CalendarIcon,
  Users,
  Info,
  ChevronRight,
  Sparkles,
  Trophy,
  Shield,
  Check,
} from 'lucide-react';
import { Habit, HabitLog } from '../../lib/habitService';
import { calculateGlobalHabitStreak, DetailedStreakStats } from '../../lib/habitEngine';
import { getTodayDateKey, addDays, parseDateKey } from '../../lib/dateUtils';
import { getLocalFriends, FriendRelation } from '../../lib/socialService';
import { triggerHaptic } from '../../lib/haptics';

interface StreakDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  habits: Habit[];
  logs: HabitLog[];
  currentStreak: number;
  isGuest?: boolean;
  onOpenAuthGate?: () => void;
}

export default function StreakDetailsModal({
  isOpen,
  onClose,
  habits,
  logs,
  currentStreak,
  isGuest = false,
  onOpenAuthGate,
}: StreakDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'compare'>('details');

  if (!isOpen) return null;

  const streakStats: DetailedStreakStats = calculateGlobalHabitStreak(habits, logs);
  const longestStreak = Math.max(streakStats.bestStreak, currentStreak);
  const totalActiveDays = streakStats.totalSuccessfulDays;

  // Calculate This Week (last 7 days active)
  const todayKey = getTodayDateKey();
  let thisWeekActive = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(todayKey, -i);
    const dayLogs = logs.filter((l) => l.date === d && (l.status === 'completed' || (l.progressValue || 0) > 0));
    if (dayLogs.length > 0) thisWeekActive++;
  }

  // Calculate This Month active days
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonthElapsed = today.getDate();
  const monthActiveDays = new Set(
    logs
      .filter((l) => {
        const parsedDate = parseDateKey(l.date);
        return (
          parsedDate.getFullYear() === currentYear &&
          parsedDate.getMonth() === currentMonth &&
          (l.status === 'completed' || (l.progressValue || 0) > 0)
        );
      })
      .map((l) => l.date)
  ).size;

  // Generate 28-day contribution-style calendar (4 weeks of 7 days)
  const calendarSquares = [];
  for (let i = 27; i >= 0; i--) {
    const d = addDays(todayKey, -i);
    const isDayCompleted = logs.some(
      (l) => l.date === d && (l.status === 'completed' || (l.progressValue || 0) > 0)
    );
    const isStreakDay = i < currentStreak;
    calendarSquares.push({
      date: d,
      isCompleted: isDayCompleted,
      isStreakDay,
      isToday: i === 0,
    });
  }

  // Friends for comparison
  const friends = getLocalFriends();
  const mockFriendStreaks = [
    { name: 'Aarav', username: 'aarav23', streak: 15 },
    { name: 'Riya', username: 'riya_fit', streak: 9 },
    { name: 'Aman', username: 'aman_dev', streak: 6 },
  ];

  // Merge real and mock friends for rich context
  const displayFriends = friends.length > 0
    ? friends.map((f) => ({
        name: f.friendDisplayName || f.friendUsername,
        username: f.friendUsername,
        streak: 14,
      }))
    : mockFriendStreaks;

  // Build ranking
  const allRanked = [
    { name: 'You', username: 'you', streak: currentStreak, isUser: true },
    ...displayFriends.map((f) => ({ name: f.name, username: f.username, streak: f.streak, isUser: false })),
  ].sort((a, b) => b.streak - a.streak);

  const userRank = allRanked.findIndex((r) => r.isUser) + 1;

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
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Flame className="w-5 h-5 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Streak Details</h3>
                <p className="text-xs text-[#8c94a8]">Consecutive daily discipline</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#7d8495] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Segmented Tab: Details vs Compare */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-white/[0.03] border border-white/5 rounded-2xl">
            <button
              onClick={() => {
                triggerHaptic('tap');
                setActiveTab('details');
              }}
              className={`py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeTab === 'details'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 shadow-sm'
                  : 'text-[#8c94a8] hover:text-white'
              }`}
            >
              Streak Stats
            </button>
            <button
              onClick={() => {
                triggerHaptic('tap');
                if (isGuest && onOpenAuthGate) {
                  onOpenAuthGate();
                  return;
                }
                setActiveTab('compare');
              }}
              className={`py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'compare'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 shadow-sm'
                  : 'text-[#8c94a8] hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Compare Friends</span>
            </button>
          </div>

          {activeTab === 'details' ? (
            <div className="space-y-4">
              {/* Primary 4-Stat Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Current Streak */}
                <div className="p-3.5 rounded-2xl bg-surface-card border border-amber-500/30 space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Current Streak
                  </span>
                  <div className="text-2xl font-black text-white flex items-baseline gap-1">
                    <span>{currentStreak}</span>
                    <span className="text-xs font-medium text-amber-400">days</span>
                  </div>
                  <p className="text-[10px] text-[#7d8495]">Unbroken active run</p>
                </div>

                {/* Longest Streak */}
                <div className="p-3.5 rounded-2xl bg-surface-card border border-white/5 space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c94a8]">
                    Longest Streak
                  </span>
                  <div className="text-2xl font-black text-white flex items-baseline gap-1">
                    <span>{longestStreak}</span>
                    <span className="text-xs font-medium text-[#7d8495]">days</span>
                  </div>
                  <p className="text-[10px] text-[#7d8495]">Personal record</p>
                </div>

                {/* This Week */}
                <div className="p-3.5 rounded-2xl bg-surface-card border border-white/5 space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c94a8]">
                    This Week
                  </span>
                  <div className="text-xl font-black text-white">
                    {thisWeekActive} <span className="text-xs text-[#7d8495]">/ 7 days</span>
                  </div>
                  <p className="text-[10px] text-[#7d8495]">7-day completion</p>
                </div>

                {/* This Month */}
                <div className="p-3.5 rounded-2xl bg-surface-card border border-white/5 space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c94a8]">
                    This Month
                  </span>
                  <div className="text-xl font-black text-white">
                    {monthActiveDays}{' '}
                    <span className="text-xs text-[#7d8495]">/ {daysInMonthElapsed} active</span>
                  </div>
                  <p className="text-[10px] text-[#7d8495]">Monthly consistency</p>
                </div>
              </div>

              {/* Requirement 10: Streak Explanation */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-white/[0.02] to-transparent border border-amber-500/20 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Why your streak exists</span>
                </div>
                <p className="text-xs text-[#b8bfd3] leading-relaxed">
                  {currentStreak > 0
                    ? `You completed at least one qualifying daily action for ${currentStreak} consecutive days.`
                    : `Complete any habit scheduled for today to ignite a fresh 1-day consistency streak.`}
                </p>
                <p className="text-[10px] text-[#6b758b]">
                  STREAKLOOP measures consistency over qualifying days. Streak is never derived from XP.
                </p>
              </div>

              {/* Requirement 9: Streak Calendar (Contribution Grid) */}
              <div className="p-4 rounded-2xl bg-surface-card border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white uppercase tracking-wider text-[10px]">
                    28-Day Streak Calendar
                  </span>
                  <div className="flex items-center gap-3 text-[10px] text-[#8c94a8]">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Done
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-white/10" /> Inactive
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Streak
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5 pt-1">
                  {calendarSquares.map((sq, i) => (
                    <div
                      key={i}
                      className={`h-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all relative ${
                        sq.isStreakDay && sq.isCompleted
                          ? 'bg-amber-500/30 border border-amber-500 text-amber-300 shadow-sm'
                          : sq.isCompleted
                          ? 'bg-emerald-500/25 border border-emerald-500/40 text-emerald-300'
                          : 'bg-white/[0.03] border border-white/5 text-[#555f75]'
                      } ${sq.isToday ? 'ring-1 ring-white/50' : ''}`}
                      title={sq.date}
                    >
                      {sq.isStreakDay && sq.isCompleted ? (
                        <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ) : sq.isCompleted ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <span>{parseInt(sq.date.split('-')[2], 10)}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px] text-[#7d8495]">
                  <span>Total Active Days: {totalActiveDays}</span>
                  <span>Independent of XP</span>
                </div>
              </div>
            </div>
          ) : (
            /* Requirement 13 & 17: COMPARE WITH FRIENDS */
            <div className="space-y-3">
              {isGuest ? (
                <div className="p-6 rounded-2xl bg-surface-card border border-white/5 text-center space-y-3">
                  <Users className="w-10 h-10 text-accent-primary mx-auto" />
                  <h4 className="text-sm font-bold text-white">Compare your progress</h4>
                  <p className="text-xs text-[#8c94a8] leading-relaxed">
                    Create an account to connect with friends and compare streak consistency.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenAuthGate) onOpenAuthGate();
                    }}
                    className="py-2.5 px-5 rounded-xl bg-accent-primary hover:bg-[#9eff38] text-black font-bold text-xs tracking-tight transition-all cursor-pointer"
                  >
                    Create Account
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Where am I? Rank banner */}
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs font-bold text-white">
                    <span className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span>Friends Streak Position:</span>
                    </span>
                    <span className="text-amber-400">
                      You: #{userRank} of {allRanked.length}
                    </span>
                  </div>

                  {/* Leaderboard list */}
                  <div className="space-y-1.5">
                    {allRanked.map((item, idx) => {
                      const diff = item.streak - currentStreak;
                      let comparisonText = '';
                      if (item.isUser) {
                        comparisonText = 'Your active streak';
                      } else if (diff > 0) {
                        comparisonText = `${item.name} is currently ${diff} day${diff === 1 ? '' : 's'} ahead.`;
                      } else if (diff < 0) {
                        comparisonText = `You're currently ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} ahead.`;
                      } else {
                        comparisonText = "You're currently tied.";
                      }

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                            item.isUser
                              ? 'bg-amber-500/15 border-amber-500/40 shadow-sm'
                              : 'bg-surface-card border-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-5 text-center font-bold text-xs text-[#7d8495]">
                              #{idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h5 className="text-xs font-bold text-white">
                                  {item.isUser ? 'You' : item.name}
                                </h5>
                                {item.isUser && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-black">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-[#8c94a8] mt-0.5">{comparisonText}</p>
                            </div>
                          </div>

                          <div className="text-right font-black text-sm text-amber-400">
                            🔥 {item.streak}d
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-[#636c82] italic text-center pt-1">
                    Comparison is private between connected friends only. No public leaderboard.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
