import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { isCloudSyncableUser } from '../../lib/authUtils';
import {
  Goal,
  GoalActivity,
  DailyGoalEntry,
  calculateGoalStreak,
  getUserGoals,
  addGoalActivity,
  updateGoalActivity,
  deleteGoalActivity,
  rescheduleGoalActivity,
  readLocalGoals,
  deleteGoal,
} from '../../lib/goalService';
import { calculateGoalProgress } from '../../lib/goalProgressEngine';
import {
  ChevronLeft,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  Target,
  BookOpen,
  Trash2,
  Calendar as CalendarIcon,
  X,
  Play,
  Sparkles,
  Calendar,
  Check,
  Edit2,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import confetti from 'canvas-confetti';
import { calculateSmartStudySchedule, SmartScheduleSlot, createGoogleCalendarEventUrl } from '../../lib/googleCalendarService';
import { MilestoneIndicator } from '../../components/goals/MilestoneIndicator';
import { getTodayDateKey } from '../../lib/dateUtils';

export default function GoalDetail() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);

  const todayStr = getTodayDateKey();
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Add Activity Modal states
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [actTitle, setActTitle] = useState('');
  const [actSubject, setActSubject] = useState('');
  const [actType, setActType] = useState('Lecture');
  const [actTargetQty, setActTargetQty] = useState(1);
  const [actUnit, setActUnit] = useState('lecture');
  const [actDuration, setActDuration] = useState(45);
  const [actAddToTask, setActAddToTask] = useState(true);
  const [actAddToHabit, setActAddToHabit] = useState(false);

  // Manual Quantity Edit modal/input state
  const [editingActivityQty, setEditingActivityQty] = useState<{ id: string; val: number } | null>(null);

  // Smart Scheduling Modal state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [suggestedSchedule, setSuggestedSchedule] = useState<SmartScheduleSlot[]>([]);
  const [scheduleStartHour, setScheduleStartHour] = useState(10);

  // Reschedule single activity
  const [reschedulingActId, setReschedulingActId] = useState<string | null>(null);
  const [rescheduleTargetDate, setRescheduleTargetDate] = useState(todayStr);

  // Goal deletion modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteGoal = async () => {
    if (!goal) return;
    setIsDeleting(true);
    try {
      await deleteGoal(goal.id, user?.uid || 'local');
      navigate('/goals');
    } catch (err) {
      console.error('Failed to delete goal', err);
      setIsDeleting(false);
    }
  };

  // Load and subscribe to Goal
  const loadGoal = async () => {
    if (!goalId) return;
    const goals = await getUserGoals(user?.uid || 'local');
    const matched = goals.find((g) => g.id === goalId);
    if (matched) {
      setGoal(matched);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!goalId) return;

    loadGoal();

    // Setup Firestore realtime listener if available
    const isCloud = isCloudSyncableUser(user?.uid);
    let unsub = () => {};
    if (isCloud) {
      try {
        unsub = onSnapshot(
          doc(db, 'goals', goalId),
          (snap) => {
            if (snap.exists()) {
              setGoal({ id: snap.id, ...snap.data() } as Goal);
            }
            setLoading(false);
          },
          (err) => {
            console.warn('Firestore goal sub error:', err);
            loadGoal();
          }
        );
      } catch {
        loadGoal();
      }
    }

    const onUpdate = () => loadGoal();
    window.addEventListener('streak_goals_updated', onUpdate);
    return () => {
      unsub();
      window.removeEventListener('streak_goals_updated', onUpdate);
    };
  }, [goalId, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0e12] flex justify-center items-center">
        <div className="w-8 h-8 border-t-2 border-accent-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="min-h-screen bg-[#0d0e12] text-white p-6 flex flex-col items-center justify-center">
        <p className="text-base font-semibold mb-3">Goal not found.</p>
        <button
          onClick={() => navigate('/goals')}
          className="px-4 py-2 bg-white/10 rounded-xl text-xs font-semibold text-white"
        >
          Return to Goals
        </button>
      </div>
    );
  }

  const dailyHistory = goal.dailyHistory || {};
  const currentDayEntry = dailyHistory[selectedDate] || {
    date: selectedDate,
    target: goal.dailyTarget || goal.target || 1,
    progress: 0,
    completed: false,
    activities: [],
  };

  const activities = currentDayEntry.activities || [];
  const subjects = goal.subjects || [];

  const goalProgress = calculateGoalProgress(goal, selectedDate);
  const totalActs = activities.length;
  const streakStats = {
    currentStreak: goalProgress.currentStreak,
    bestStreak: goalProgress.bestStreak,
    completedDaysCount: goalProgress.completedDaysCount,
  };

  // Group activities by subject
  const groupedActivities = activities.reduce((acc, act) => {
    const subj = act.subject || 'General';
    if (!acc[subj]) acc[subj] = [];
    acc[subj].push(act);
    return acc;
  }, {} as Record<string, GoalActivity[]>);

  // Check for missed past entries
  const unhandledPastEntries = (Object.values(dailyHistory) as DailyGoalEntry[]).filter(
    (entry) =>
      entry.date < todayStr &&
      !entry.missedHandled &&
      entry.activities &&
      entry.activities.some((a) => !a.completed)
  );
  const missedPastActs = unhandledPastEntries.flatMap((entry) =>
    entry.activities!.filter((a) => !a.completed)
  );
  const hasMissedPast = missedPastActs.length > 0;

  // Handlers
  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitle.trim() || !goal) return;

    await addGoalActivity(
      goal.id,
      selectedDate,
      {
        title: actTitle.trim(),
        subject: actSubject || undefined,
        type: actType,
        targetQuantity: actTargetQty,
        progress: 0,
        unit: actUnit.trim() || 'lecture',
        estimatedDuration: actDuration,
        completed: false,
      },
      user?.uid || 'local',
      {
        addToTask: actAddToTask,
        addToHabit: actAddToHabit,
      }
    );

    setIsAddActivityOpen(false);
    setActTitle('');
    setActSubject('');
    loadGoal();
  };

  const handleUpdateProgress = async (act: GoalActivity, delta: number) => {
    if (!goal) return;
    const newProg = Math.max(0, Math.min(act.targetQuantity, act.progress + delta));
    const wasCompleted = act.completed;

    await updateGoalActivity(
      goal.id,
      selectedDate,
      act.id,
      {
        progress: newProg,
        completed: newProg >= act.targetQuantity,
      },
      user?.uid || 'local'
    );

    if (newProg >= act.targetQuantity && !wasCompleted) {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    }
    loadGoal();
  };

  const handleSetManualProgress = async (actId: string, value: number) => {
    if (!goal) return;
    const act = activities.find((a) => a.id === actId);
    if (!act) return;

    const newProg = Math.max(0, Math.min(act.targetQuantity, value));
    await updateGoalActivity(
      goal.id,
      selectedDate,
      act.id,
      {
        progress: newProg,
        completed: newProg >= act.targetQuantity,
      },
      user?.uid || 'local'
    );
    setEditingActivityQty(null);
    loadGoal();
  };

  const handleDeleteAct = async (actId: string) => {
    if (!goal) return;
    await deleteGoalActivity(goal.id, selectedDate, actId, user?.uid || 'local');
    loadGoal();
  };

  const handleRescheduleSingle = async (actId: string) => {
    if (!goal || !rescheduleTargetDate) return;
    await rescheduleGoalActivity(goal.id, selectedDate, actId, rescheduleTargetDate, user?.uid || 'local');
    setReschedulingActId(null);
    loadGoal();
  };

  const handleLaunchFocus = (act: GoalActivity) => {
    const params = new URLSearchParams({
      name: act.title,
      subject: act.subject || '',
      goalId: goal.id,
      activityId: act.id,
      duration: String(act.estimatedDuration || 30),
    });
    navigate(`/activity?${params.toString()}`);
  };

  const handleOpenSmartSchedule = () => {
    if (activities.length === 0) return;
    const schedule = calculateSmartStudySchedule(activities, {
      startHour: scheduleStartHour,
      bufferMinutes: 10,
    });
    setSuggestedSchedule(schedule);
    setIsScheduleModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] text-white pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 bg-[#0d0e12]/90 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/goals')}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-base font-bold truncate max-w-[200px] sm:max-w-xs text-white">
              {goal.title}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-accent-primary uppercase tracking-widest">
                {goal.category}
              </span>
              <span className="text-white/20">•</span>
              <span className="text-[10px] text-[#7d8495]">
                {goal.dailyTarget || goal.target} {goal.unit || 'units'} / day
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activities.length > 0 && (
            <button
              onClick={handleOpenSmartSchedule}
              className="px-2.5 py-1.5 rounded-xl bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Generate Smart Schedule"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Schedule</span>
            </button>
          )}
          <button
            id="delete-goal-btn"
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex items-center justify-center transition-colors cursor-pointer"
            title="Delete Goal"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Missed Targets Notice */}
        {hasMissedPast && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
              <Clock className="w-4 h-4" />
              <span>Unfinished targets from previous days ({missedPastActs.length})</span>
            </div>
            <p className="text-xs text-[#a1a8b9]">
              STREAK preserves your accurate history. You can roll these targets forward or mark them handled.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  for (const entry of unhandledPastEntries) {
                    for (const act of entry.activities || []) {
                      if (!act.completed) {
                        await rescheduleGoalActivity(goal.id, entry.date, act.id, todayStr, user?.uid || 'local');
                      }
                    }
                  }
                  loadGoal();
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 font-bold text-xs hover:bg-amber-500/30"
              >
                Continue Unfinished Today
              </button>
            </div>
          </div>
        )}

        {/* Date Selector Strip */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-accent-primary" />
            <span className="text-xs font-bold text-white">
              {selectedDate === todayStr ? 'Today' : selectedDate}
            </span>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-accent-primary"
          />
        </div>

        {/* Goal Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-4 bg-surface-card rounded-2xl border border-white/5">
            <span className="text-[10px] font-bold text-[#7d8495] uppercase tracking-wider block mb-1">
              Target Status
            </span>
            <div className="text-2xl font-black text-white flex items-center gap-1.5">
              <span>{goalProgress.todayProgress} / {goalProgress.todayTarget}</span>
              {goalProgress.isTodayComplete && (
                <CheckCircle2 className="w-5 h-5 text-accent-primary shrink-0" />
              )}
            </div>
            <span className="text-[11px] text-[#7d8495] block mt-0.5">
              {goalProgress.isTodayComplete
                ? 'Target Crushed! 🔥'
                : `${goalProgress.todayRemaining} ${goal.unit || 'units'} needed`}
            </span>
          </div>

          <div className="p-4 bg-surface-card rounded-2xl border border-white/5">
            <span className="text-[10px] font-bold text-[#7d8495] uppercase tracking-wider block mb-1">
              Active Streak
            </span>
            <div className="text-2xl font-black text-white flex items-center gap-1.5">
              <Flame className="w-5 h-5 fill-accent-primary text-accent-primary" />
              <span>{goalProgress.currentStreak}d</span>
            </div>
            <span className="text-[11px] text-[#7d8495] block mt-0.5">
              Best: {goalProgress.bestStreak} days ({goalProgress.completedDaysCount} total)
            </span>
          </div>

          <div className="p-4 bg-surface-card rounded-2xl border border-white/5 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-[#7d8495] uppercase tracking-wider block mb-1">
              Daily Progress
            </span>
            <div className="text-2xl font-black text-accent-primary">
              {goalProgress.todayPercent}%
            </div>
            <span className="text-[11px] text-[#7d8495] block mt-0.5">
              {totalActs > 0 ? `${goalProgress.todayCompletedActivityCount}/${totalActs} activities finished` : `${goalProgress.todayProgress} ${goal.unit || 'units'} logged`}
            </span>
          </div>
        </div>

        {/* Pace and Target Date Banner */}
        {goalProgress.paceStatus !== 'no_deadline' && (
          <div
            className={cn(
              'p-3.5 rounded-2xl border flex items-center justify-between text-xs',
              goalProgress.paceStatus === 'ahead' || goalProgress.paceStatus === 'completed'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : goalProgress.paceStatus === 'on_track'
                ? 'bg-accent-primary/10 border-accent-primary/20 text-accent-primary'
                : goalProgress.paceStatus === 'at_risk'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            )}
          >
            <div className="flex items-center gap-2.5">
              <Target className="w-4 h-4 shrink-0" />
              <div>
                <span className="font-bold block">{goalProgress.paceMessage}</span>
                <span className="text-[11px] opacity-80">
                  Target Date: {goal.targetDate} ({goalProgress.remainingDays} days remaining)
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="font-extrabold text-sm block">
                {goalProgress.overallPercent}%
              </span>
              <span className="text-[10px] opacity-75">
                {goalProgress.overallProgress}/{goalProgress.overallTarget} {goal.unit || 'units'}
              </span>
            </div>
          </div>
        )}

        {/* Visual Milestone Indicator (25%, 50%, 75%, 100%) */}
        <MilestoneIndicator
          goalTitle={goal.title}
          unit={goal.unit || 'units'}
          currentQuantity={goalProgress.overallProgress}
          targetQuantity={goalProgress.overallTarget}
          dailyQuantity={goalProgress.todayProgress}
          dailyTarget={goalProgress.todayTarget}
        />

        {/* Subjects Filter Chips */}
        {subjects.length > 0 && (
          <div>
            <span className="text-[11px] font-semibold text-[#7d8495] uppercase tracking-wider block mb-2">
              Assigned Subjects
            </span>
            <div className="flex flex-wrap gap-1.5">
              {subjects.map((subj) => (
                <span
                  key={subj}
                  className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-white/90"
                >
                  {subj}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Today's Target Activities Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
              <Target className="w-4 h-4 text-accent-primary" />
              Daily Study Activities ({totalActs})
            </h2>
            <button
              onClick={() => setIsAddActivityOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-accent-primary text-black hover:brightness-110 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-accent-primary/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Activity</span>
            </button>
          </div>

          {totalActs === 0 ? (
            <div className="py-12 px-6 rounded-3xl border border-dashed border-white/10 bg-white/[0.01] flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-[#7d8495]">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-1">No study activities added for this date</h3>
                <p className="text-xs text-[#7d8495] max-w-xs mx-auto">
                  Add specific lectures, notes, question sets, or NCERT reading blocks.
                </p>
              </div>
              <button
                onClick={() => setIsAddActivityOpen(true)}
                className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/15 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Target
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedActivities).map(([subj, acts]: [string, GoalActivity[]]) => (
                <div key={subj} className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-[#7d8495] uppercase tracking-wider">
                      {subj}
                    </span>
                    <span className="text-[11px] text-[#7d8495]">
                      {acts.filter((a) => a.completed).length} / {acts.length} completed
                    </span>
                  </div>

                  <div className="space-y-2">
                    {acts.map((act) => (
                      <div
                        key={act.id}
                        className={cn(
                          'p-3.5 rounded-2xl border transition-all flex flex-col gap-2',
                          act.completed
                            ? 'bg-white/[0.02] border-white/5 opacity-80'
                            : 'bg-surface-card border-white/10 hover:border-white/20'
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateProgress(act, act.completed ? -act.targetQuantity : act.targetQuantity)}
                              className="shrink-0 cursor-pointer"
                            >
                              {act.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-accent-primary" />
                              ) : (
                                <Circle className="w-5 h-5 text-[#7d8495] hover:text-white" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <h4
                                className={cn(
                                  'text-sm font-bold truncate',
                                  act.completed ? 'text-white/60 line-through' : 'text-white'
                                )}
                              >
                                {act.title}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/5 text-[#7d8495]">
                                  {act.type}
                                </span>
                                {act.estimatedDuration && (
                                  <span className="text-[10px] text-[#7d8495] flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {act.estimatedDuration}m
                                  </span>
                                )}
                                {act.linkedTaskId && (
                                  <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                    Linked Task
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions & Counter */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleLaunchFocus(act)}
                              title="Start Focus Session"
                              className="w-8 h-8 rounded-xl bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-accent-primary" />
                            </button>

                            {/* Quantity Editor */}
                            <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-1.5 py-1">
                              <button
                                onClick={() => handleUpdateProgress(act, -1)}
                                className="w-5 h-5 flex items-center justify-center text-[#7d8495] hover:text-white font-bold text-xs"
                              >
                                -
                              </button>

                              {editingActivityQty?.id === act.id ? (
                                <input
                                  type="number"
                                  autoFocus
                                  defaultValue={act.progress}
                                  onBlur={(e) => handleSetManualProgress(act.id, Number(e.target.value))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSetManualProgress(act.id, Number((e.target as any).value));
                                    }
                                  }}
                                  className="w-10 text-center bg-white/10 rounded text-xs text-white focus:outline-none"
                                />
                              ) : (
                                <button
                                  onClick={() => setEditingActivityQty({ id: act.id, val: act.progress })}
                                  className="px-1.5 text-xs font-bold text-white hover:underline cursor-pointer"
                                  title="Click to edit quantity manually"
                                >
                                  {act.progress}/{act.targetQuantity}
                                </button>
                              )}

                              <button
                                onClick={() => handleUpdateProgress(act, 1)}
                                className="w-5 h-5 flex items-center justify-center text-[#7d8495] hover:text-white font-bold text-xs"
                              >
                                +
                              </button>
                            </div>

                            <button
                              onClick={() => setReschedulingActId(act.id)}
                              className="text-[#7d8495] hover:text-amber-400 p-1 transition-colors"
                              title="Reschedule Activity"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteAct(act.id)}
                              className="text-[#7d8495] hover:text-red-400 p-1 transition-colors"
                              title="Delete Activity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Inline Reschedule Form */}
                        {reschedulingActId === act.id && (
                          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
                            <span className="text-amber-400 font-medium">Reschedule to:</span>
                            <input
                              type="date"
                              value={rescheduleTargetDate}
                              min={todayStr}
                              onChange={(e) => setRescheduleTargetDate(e.target.value)}
                              className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-white text-xs"
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleRescheduleSingle(act.id)}
                                className="px-2 py-1 rounded-lg bg-accent-primary text-black font-bold text-xs"
                              >
                                Move
                              </button>
                              <button
                                onClick={() => setReschedulingActId(null)}
                                className="px-2 py-1 rounded-lg bg-white/10 text-white text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Target Activity Modal */}
      <AnimatePresence>
        {isAddActivityOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#12151d] border border-white/10 rounded-3xl p-6 z-10 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                    <Target className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-white">Add Study Target Activity</h3>
                </div>
                <button
                  onClick={() => setIsAddActivityOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#7d8495] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddActivity} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#7d8495] font-semibold mb-1 uppercase tracking-wider text-[10px]">
                    Activity Title
                  </label>
                  <input
                    type="text"
                    required
                    value={actTitle}
                    onChange={(e) => setActTitle(e.target.value)}
                    placeholder="e.g. Physics Lec-1 or DPP 25 Questions"
                    className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-accent-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#7d8495] font-semibold mb-1 uppercase tracking-wider text-[10px]">
                      Subject
                    </label>
                    <select
                      value={actSubject}
                      onChange={(e) => setActSubject(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-primary"
                    >
                      <option value="">No specific subject</option>
                      {subjects.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                      {!subjects.includes('Physics') && <option value="Physics">Physics</option>}
                      {!subjects.includes('Chemistry') && <option value="Chemistry">Chemistry</option>}
                      {!subjects.includes('Botany') && <option value="Botany">Botany</option>}
                      {!subjects.includes('Zoology') && <option value="Zoology">Zoology</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#7d8495] font-semibold mb-1 uppercase tracking-wider text-[10px]">
                      Type
                    </label>
                    <select
                      value={actType}
                      onChange={(e) => setActType(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-primary"
                    >
                      <option value="Lecture">Lecture</option>
                      <option value="Notes">Notes Review</option>
                      <option value="Revision">Revision</option>
                      <option value="DPP">DPP Practice</option>
                      <option value="Questions">Questions / Problem Solving</option>
                      <option value="NCERT Reading">NCERT Reading</option>
                      <option value="Practice">Practice Test</option>
                      <option value="Preparation">Preparation</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[#7d8495] font-semibold mb-1 uppercase tracking-wider text-[10px]">
                      Target Qty
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={actTargetQty}
                      onChange={(e) => setActTargetQty(Number(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[#7d8495] font-semibold mb-1 uppercase tracking-wider text-[10px]">
                      Unit
                    </label>
                    <input
                      type="text"
                      required
                      value={actUnit}
                      onChange={(e) => setActUnit(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[#7d8495] font-semibold mb-1 uppercase tracking-wider text-[10px]">
                      Est. Mins
                    </label>
                    <input
                      type="number"
                      min="5"
                      value={actDuration}
                      onChange={(e) => setActDuration(Number(e.target.value) || 30)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                </div>

                {/* Linking Checkboxes */}
                <div className="p-3 bg-white/[0.02] border border-white/10 rounded-2xl space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={actAddToTask}
                      onChange={(e) => setActAddToTask(e.target.checked)}
                      className="w-4 h-4 rounded text-accent-primary focus:ring-0 cursor-pointer accent-[#a5ff36]"
                    />
                    <span className="text-white font-medium">Add to Daily Tasks for {selectedDate}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={actAddToHabit}
                      onChange={(e) => setActAddToHabit(e.target.checked)}
                      className="w-4 h-4 rounded text-accent-primary focus:ring-0 cursor-pointer accent-[#a5ff36]"
                    />
                    <span className="text-white font-medium">Add as recurring Habit</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-accent-primary text-black font-bold text-xs hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-accent-primary/20"
                >
                  Save Activity
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Smart Calendar Scheduling Modal */}
      <AnimatePresence>
        {isScheduleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#12151d] border border-white/10 rounded-3xl p-6 z-10 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Smart Study Schedule</h3>
                    <span className="text-[10px] text-[#7d8495]">Suggested chronological time blocks</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#7d8495] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 text-xs">
                {suggestedSchedule.map((slot) => {
                  const gcalUrl = createGoogleCalendarEventUrl({
                    title: `${slot.subject ? `[${slot.subject}] ` : ''}${slot.title}`,
                    date: selectedDate,
                    startTime: slot.startTime,
                    durationMinutes: slot.durationMinutes,
                  });

                  return (
                    <div
                      key={slot.id}
                      className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-accent-primary block">
                          {slot.startTime} – {slot.endTime} ({slot.durationMinutes}m)
                        </span>
                        <span className="font-semibold text-white block truncate max-w-[200px]">
                          {slot.title}
                        </span>
                        {slot.subject && (
                          <span className="text-[10px] text-[#7d8495] block">{slot.subject}</span>
                        )}
                      </div>

                      <a
                        href={gcalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[11px] font-medium flex items-center gap-1 shrink-0"
                      >
                        <Calendar className="w-3 h-3 text-blue-400" />
                        <span>Google Cal</span>
                      </a>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-accent-primary text-black font-bold text-xs hover:brightness-110 transition-all cursor-pointer"
                >
                  Accept Schedule
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Goal Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#16181f] border border-white/10 rounded-2xl p-5 z-10 space-y-4 shadow-xl"
            >
              <div className="flex items-center gap-3 text-red-400">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Delete Goal</h3>
                  <p className="text-xs text-[#7d8495]">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                Are you sure you want to permanently delete <span className="font-semibold text-white">"{goal.title}"</span>? All associated activities and linkages will be removed.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 font-medium text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-delete-goal-btn"
                  disabled={isDeleting}
                  onClick={handleDeleteGoal}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors shadow-lg shadow-red-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Goal'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
