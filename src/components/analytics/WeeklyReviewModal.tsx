import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  BookOpen,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Save,
  Award,
  ChevronRight,
} from 'lucide-react';
import { Habit, HabitLog } from '../../lib/habitService';
import { Goal } from '../../lib/goalService';
import { Activity, calculateStudyStatistics } from '../../lib/activityService';
import { createJournalEntry } from '../../lib/journalService';
import confetti from 'canvas-confetti';
import { triggerHaptic } from '../../lib/haptics';

interface WeeklyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  habits: Habit[];
  logs: HabitLog[];
  goals: Goal[];
  activities: Activity[];
}

export function WeeklyReviewModal({
  isOpen,
  onClose,
  userId,
  habits,
  logs,
  goals,
  activities,
}: WeeklyReviewModalProps) {
  // Reflection question states
  const [wentWell, setWentWell] = useState('');
  const [distractions, setDistractions] = useState('');
  const [adjustments, setAdjustments] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Compute 7-day date window
  const now = new Date();
  const past7Days = useMemo(() => {
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      dates.push(d.toLocaleDateString('en-CA'));
    }
    return dates;
  }, []);

  // Calculate real week data
  const weekStats = useMemo(() => {
    // 1. Study time in past 7 days
    const weekActivities = activities.filter((a) => past7Days.includes(a.date));
    const totalMinutes = weekActivities.reduce(
      (acc, a) => acc + (a.durationMinutes || 0) + Math.floor((a.durationSeconds || 0) / 60),
      0
    );
    const studyHours = (totalMinutes / 60).toFixed(1);

    // 2. Goal activities / lectures completed
    let plannedLectures = 0;
    let completedLectures = 0;
    goals.forEach((g) => {
      past7Days.forEach((dateStr) => {
        const entry = g.dailyHistory?.[dateStr];
        if (entry) {
          if (entry.activities) {
            plannedLectures += entry.activities.length;
            completedLectures += entry.activities.filter((a) => a.completed).length;
          } else if (g.type === 'daily' && g.dailyTarget) {
            plannedLectures += g.dailyTarget;
            completedLectures += entry.progress || 0;
          }
        }
      });
    });

    // 3. Habits consistency
    const activeHabits = habits.filter((h) => !h.archived);
    const possibleHabitCompletions = activeHabits.length * 7;
    const weekLogs = logs.filter((l) => past7Days.includes(l.date) && l.status === 'completed');
    const habitConsistencyPct =
      possibleHabitCompletions > 0
        ? Math.min(100, Math.round((weekLogs.length / possibleHabitCompletions) * 100))
        : 100;

    // 4. Subject breakdown & strongest/weakest subject
    const subjectMins: Record<string, number> = {};
    weekActivities.forEach((a) => {
      const sub = a.subject || a.category || 'General';
      subjectMins[sub] = (subjectMins[sub] || 0) + (a.durationMinutes || 0);
    });

    const sortedSubjects = Object.entries(subjectMins).sort((a, b) => b[1] - a[1]);
    const strongestSubject = sortedSubjects.length > 0 ? sortedSubjects[0][0] : 'Study';
    const weakestSubject =
      sortedSubjects.length > 1 ? sortedSubjects[sortedSubjects.length - 1][0] : null;

    return {
      totalMinutes,
      studyHours,
      plannedLectures,
      completedLectures,
      habitConsistencyPct,
      weekLogsCount: weekLogs.length,
      strongestSubject,
      weakestSubject,
      subjectBreakdown: subjectMins,
    };
  }, [activities, goals, habits, logs, past7Days]);

  const handleSaveToJournal = async () => {
    if (isSaving) return;
    setIsSaving(true);
    triggerHaptic('tap');

    const entryText = `WEEKLY REVIEW & ACADEMIC REFLECTION
Dates: ${past7Days[0]} to ${past7Days[6]}

METRICS SUMMARY:
- Total Focus Time: ${weekStats.studyHours} hours (${weekStats.totalMinutes} minutes)
- Topics/Lectures: ${weekStats.completedLectures} of ${weekStats.plannedLectures || weekStats.completedLectures} completed
- Habits Consistency: ${weekStats.habitConsistencyPct}% (${weekStats.weekLogsCount} habits logged)
- Strongest Focus: ${weekStats.strongestSubject}
${weekStats.weakestSubject ? `- Needs More Focus: ${weekStats.weakestSubject}` : ''}

STUDENT REFLECTIONS:
1. What went well this week?
${wentWell || 'Maintained steady momentum across key priorities.'}

2. What distracted me or broke my focus?
${distractions || 'Addressed minor interruptions and maintained study routine.'}

3. What needs adjustment for next week?
${adjustments || 'Plan study blocks earlier in the day and stick to scheduled breaks.'}`;

    try {
      await createJournalEntry(
        {
          date: new Date().toLocaleDateString('en-CA'),
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          mood: weekStats.habitConsistencyPct >= 70 ? 'great' : 'good',
          title: `Weekly Review: ${past7Days[0]} – ${past7Days[6]}`,
          text: entryText,
          tags: ['Weekly Review', 'Academic Reflection', weekStats.strongestSubject],
        },
        userId || 'local'
      );

      setSavedSuccess(true);
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => {
        setIsSaving(false);
        onClose();
        setSavedSuccess(false);
      }, 1500);
    } catch (e) {
      console.error('Error saving weekly review', e);
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-[#12151e] border border-white/10 shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center text-accent-primary">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Weekly Review</h3>
                <span className="text-[11px] text-[#7d8495]">
                  {past7Days[0]} to {past7Days[6]}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Real Data KPI Cards */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-2xl bg-surface-card border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#7d8495] tracking-wider block">
                  Focus Time
                </span>
                <span className="text-xl font-black text-accent-primary">{weekStats.studyHours}h</span>
                <span className="text-[10px] text-[#7d8495] block">{weekStats.totalMinutes} mins</span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-card border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#7d8495] tracking-wider block">
                  Topics / Done
                </span>
                <span className="text-xl font-black text-white">{weekStats.completedLectures}</span>
                <span className="text-[10px] text-[#7d8495] block">
                  of {weekStats.plannedLectures || weekStats.completedLectures} planned
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-card border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#7d8495] tracking-wider block">
                  Habits
                </span>
                <span className="text-xl font-black text-white">{weekStats.habitConsistencyPct}%</span>
                <span className="text-[10px] text-[#7d8495] block">{weekStats.weekLogsCount} logged</span>
              </div>
            </div>

            {/* Subject Highlights */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
              <div>
                <span className="text-[#7d8495] block text-[10px] uppercase font-bold">Strongest Focus</span>
                <span className="text-white font-bold text-sm">{weekStats.strongestSubject}</span>
              </div>
              {weekStats.weakestSubject && (
                <div className="text-right">
                  <span className="text-[#7d8495] block text-[10px] uppercase font-bold">Needs Focus</span>
                  <span className="text-amber-400 font-bold text-sm">{weekStats.weakestSubject}</span>
                </div>
              )}
            </div>

            {/* Reflection Questions */}
            <div className="space-y-4 pt-1">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent-primary" />
                Academic Reflection
              </h4>

              {/* Question 1 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/90">
                  1. What went well this week?
                </label>
                <textarea
                  value={wentWell}
                  onChange={(e) => setWentWell(e.target.value)}
                  placeholder="Completed physics kinematics notes on time, attended all daily live lectures..."
                  rows={2}
                  className="w-full bg-[#161a24] border border-white/10 focus:border-accent-primary rounded-xl p-3 text-xs text-white placeholder-[#7d8495] focus:outline-none resize-none transition-colors"
                />
              </div>

              {/* Question 2 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/90">
                  2. What distracted me or broke my focus?
                </label>
                <textarea
                  value={distractions}
                  onChange={(e) => setDistractions(e.target.value)}
                  placeholder="Late night phone browsing, skipped Thursday 30-minute revision slot..."
                  rows={2}
                  className="w-full bg-[#161a24] border border-white/10 focus:border-accent-primary rounded-xl p-3 text-xs text-white placeholder-[#7d8495] focus:outline-none resize-none transition-colors"
                />
              </div>

              {/* Question 3 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/90">
                  3. What needs adjustment for next week?
                </label>
                <textarea
                  value={adjustments}
                  onChange={(e) => setAdjustments(e.target.value)}
                  placeholder="Schedule Botany questions in the morning when energy is highest..."
                  rows={2}
                  className="w-full bg-[#161a24] border border-white/10 focus:border-accent-primary rounded-xl p-3 text-xs text-white placeholder-[#7d8495] focus:outline-none resize-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-4 border-t border-white/10 bg-white/[0.01] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-[#7d8495] hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveToJournal}
              disabled={isSaving}
              className="px-5 py-2 rounded-full bg-accent-primary hover:bg-[#9eff38] active:scale-95 text-black font-bold text-xs flex items-center gap-1.5 shadow-[0_2px_12px_rgba(140,238,40,0.3)] transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savedSuccess ? 'Saved to Journal!' : isSaving ? 'Saving...' : 'Save Review to Journal'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
