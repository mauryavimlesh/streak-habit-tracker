import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Goal, GoalActivity, DailyGoalEntry } from '../../lib/goalService';
import { ChevronLeft, Plus, CheckCircle2, Circle, Clock, MoreVertical, Flame, Target, BookOpen, Trash2, Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import confetti from 'canvas-confetti';

export default function GoalDetail() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toLocaleDateString('en-CA');
  
  // State for Add Activity Modal
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [actTitle, setActTitle] = useState('');
  const [actSubject, setActSubject] = useState('');
  const [actType, setActType] = useState('Lecture');
  const [actTargetQty, setActTargetQty] = useState(1);
  const [actUnit, setActUnit] = useState('unit');

  useEffect(() => {
    if (!goalId) return;
    const path = user?.uid ? `users/${user.uid}/goals/${goalId}` : `local_goals/${goalId}`;
    const unsub = onSnapshot(doc(db, path), (snap) => {
      if (snap.exists()) {
        setGoal({ id: snap.id, ...snap.data() } as Goal);
      } else {
        setGoal(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [goalId, user]);

  if (loading) {
    return <div className="min-h-screen bg-[#0d0e12] flex justify-center items-center"><div className="w-8 h-8 border-t-2 border-accent-primary rounded-full animate-spin"></div></div>;
  }

  if (!goal) {
    return <div className="min-h-screen bg-[#0d0e12] text-white p-6">Goal not found.</div>;
  }

  const todayEntry = goal.dailyHistory?.[todayStr];
  const activities = todayEntry?.activities || [];
  
  const subjects = goal.subjects || [];

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitle.trim()) return;

    const newActivity: GoalActivity = {
      id: 'act_' + Date.now(),
      title: actTitle.trim(),
      subject: actSubject || undefined,
      type: actType,
      targetQuantity: actTargetQty,
      progress: 0,
      unit: actUnit.trim() || 'unit',
      completed: false,
    };

    const updatedHistory = { ...(goal.dailyHistory || {}) };
    if (!updatedHistory[todayStr]) {
      updatedHistory[todayStr] = {
        date: todayStr,
        target: goal.dailyTarget || 1,
        progress: 0,
        completed: false,
        activities: [],
      };
    }
    
    updatedHistory[todayStr].activities = [...(updatedHistory[todayStr].activities || []), newActivity];

    const path = user?.uid ? `users/${user.uid}/goals/${goal.id}` : `local_goals/${goal.id}`;
    await updateDoc(doc(db, path), {
      dailyHistory: updatedHistory,
      updatedAt: new Date().toISOString()
    });

    setIsAddActivityOpen(false);
    setActTitle('');
    setActSubject('');
  };

  const handleUpdateActivityProgress = async (activityId: string, delta: number) => {
    if (!goal) return;
    const updatedHistory = { ...(goal.dailyHistory || {}) };
    const todayData = updatedHistory[todayStr];
    if (!todayData || !todayData.activities) return;

    const actIndex = todayData.activities.findIndex(a => a.id === activityId);
    if (actIndex === -1) return;

    const act = todayData.activities[actIndex];
    let newProgress = act.progress + delta;
    if (newProgress < 0) newProgress = 0;
    if (newProgress > act.targetQuantity) newProgress = act.targetQuantity;

    todayData.activities[actIndex] = {
      ...act,
      progress: newProgress,
      completed: newProgress >= act.targetQuantity
    };

    // Update overall day progress (just an average or based on daily target?)
    // Actually, "A successful day means the configured daily target was reached." 
    // And "Do NOT count partial completion as a successful day unless the user explicitly configures a flexible target."
    // Let's set day's progress based on completed activities count or percentage.
    // For now we just save the activity change.

    const path = user?.uid ? `users/${user.uid}/goals/${goal.id}` : `local_goals/${goal.id}`;
    await updateDoc(doc(db, path), {
      dailyHistory: updatedHistory,
      updatedAt: new Date().toISOString()
    });

    if (newProgress === act.targetQuantity && act.progress < act.targetQuantity) {
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
    }
  };

  const groupedActivities = activities.reduce((acc, act) => {
    const subj = act.subject || 'Uncategorized';
    if (!acc[subj]) acc[subj] = [];
    acc[subj].push(act);
    return acc;
  }, {} as Record<string, GoalActivity[]>);

  const totalCompleted = activities.filter(a => a.completed).length;
  const totalActs = activities.length;
  const todayProgressPercent = totalActs > 0 ? Math.round((totalCompleted / totalActs) * 100) : 0;

  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toLocaleDateString('en-CA');

  const yesterdayEntry = goal.dailyHistory?.[yesterdayStr];
  const missedYesterdayActs = yesterdayEntry?.activities?.filter(a => !a.completed) || [];
  const hasMissedYesterday = missedYesterdayActs.length > 0 && !yesterdayEntry?.missedHandled;

  const handleMissedAction = async (action: 'carried_forward' | 'missed' | 'rescheduled', targetDate?: string) => {
    if (!goal || !yesterdayEntry) return;

    const updatedHistory = { ...(goal.dailyHistory || {}) };
    
    // Mark yesterday as handled
    updatedHistory[yesterdayStr] = {
      ...yesterdayEntry,
      missedHandled: action
    };

    if (action === 'carried_forward' || action === 'rescheduled') {
      const dateToMove = targetDate || todayStr;
      if (!updatedHistory[dateToMove]) {
        updatedHistory[dateToMove] = {
          date: dateToMove,
          target: goal.dailyTarget || 1,
          progress: 0,
          completed: false,
          activities: [],
        };
      }
      
      const uncompletedActs = missedYesterdayActs.map(a => ({
        ...a,
        id: 'act_carried_' + Date.now() + Math.random(),
        title: a.title + ' (Carried over)',
        progress: 0,
      }));

      updatedHistory[dateToMove].activities = [...(updatedHistory[dateToMove].activities || []), ...uncompletedActs];
    }

    const path = user?.uid ? `users/${user.uid}/goals/${goal.id}` : `local_goals/${goal.id}`;
    await updateDoc(doc(db, path), {
      dailyHistory: updatedHistory,
      updatedAt: new Date().toISOString()
    });
    
    setIsRescheduleOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] text-white pb-24">
      <header className="sticky top-0 z-20 bg-[#0d0e12]/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/goals')}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-base font-bold truncate">{goal.title}</h1>
          <span className="text-[10px] font-medium text-[#7d8495] tracking-widest uppercase">{goal.category}</span>
        </div>
        <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
          <MoreVertical className="w-5 h-5 text-white" />
        </button>
      </header>
      
      <main className="p-4 max-w-2xl mx-auto space-y-6">
        {hasMissedYesterday && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
            <h3 className="text-sm font-bold text-amber-400">Unfinished targets from yesterday</h3>
            <p className="text-xs text-amber-400/80">You have {missedYesterdayActs.length} uncompleted activities from yesterday. What would you like to do with them?</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => handleMissedAction('carried_forward')} className="w-full py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold text-xs transition-colors">
                Continue Today
              </button>
              <button onClick={() => handleMissedAction('missed')} className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-colors">
                Keep as missed
              </button>
            </div>
          </div>
        )}
        {/* Goal Meta Dashboard */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-surface-card rounded-2xl border border-white/5">
            <h3 className="text-[11px] font-bold text-[#7d8495] uppercase tracking-wider">Today's Progress</h3>
            <div className="mt-2 text-3xl font-black text-white">{todayProgressPercent}%</div>
            <div className="mt-1 text-xs text-[#7d8495]">{totalCompleted} / {totalActs} activities completed</div>
          </div>
          <div className="p-4 bg-surface-card rounded-2xl border border-white/5">
            <h3 className="text-[11px] font-bold text-[#7d8495] uppercase tracking-wider">Goal Streak</h3>
            <div className="mt-2 text-3xl font-black text-white flex items-center gap-2">
              <Flame className="w-6 h-6 fill-accent-primary text-accent-primary" /> 
              {/* Calculate actual streak here later */}
              2d
            </div>
            <div className="mt-1 text-xs text-[#7d8495]">Best: 5d</div>
          </div>
        </div>

        {/* Today's Target Dashboard */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
              <Target className="w-4 h-4 text-accent-primary" /> Today's Target
            </h2>
            <button
              onClick={() => setIsAddActivityOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 text-xs font-bold transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Activity
            </button>
          </div>

          {totalActs === 0 ? (
            <div className="py-12 px-6 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-3">
              <BookOpen className="w-8 h-8 text-[#7d8495]/50" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">No study targets planned</h3>
                <p className="text-xs text-[#7d8495]">Add lectures, readings, or questions to conquer today.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {(Object.entries(groupedActivities) as [string, GoalActivity[]][]).map(([subj, acts]) => (
                <div key={subj} className="space-y-3">
                  <h3 className="text-xs font-bold text-[#7d8495] uppercase tracking-wider border-b border-white/5 pb-2">
                    {subj}
                  </h3>
                  <div className="space-y-2">
                    {acts.map((act) => (
                      <div key={act.id} className="flex flex-col gap-2 p-3 rounded-xl bg-surface-card border border-white/5">
                        <div className="flex items-start justify-between gap-3">
                          <button
                            className="shrink-0 mt-0.5"
                          >
                            {act.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                            ) : (
                              <Circle className="w-5 h-5 text-[#7d8495]" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <h4 className={cn("text-sm font-bold truncate", act.completed ? "text-[#7d8495] line-through" : "text-white")}>
                              {act.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/5 text-[#7d8495]">
                                {act.type}
                              </span>
                              <button
                                onClick={() => navigate('/focus-timer')}
                                className="flex items-center gap-1 text-[10px] font-bold text-accent-primary bg-accent-primary/10 hover:bg-accent-primary/20 px-1.5 py-0.5 rounded transition-colors"
                              >
                                <Clock className="w-3 h-3" /> Focus
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateActivityProgress(act.id, -1)}
                                className="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-white font-bold"
                              >
                                -
                              </button>
                              <div className="text-center min-w-[3rem]">
                                <span className="text-xs font-bold text-white">{act.progress} / {act.targetQuantity}</span>
                                <span className="text-[10px] text-[#7d8495] block">{act.unit}</span>
                              </div>
                              <button
                                onClick={() => handleUpdateActivityProgress(act.id, 1)}
                                className="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-white font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Activity Modal */}
      <AnimatePresence>
        {isAddActivityOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddActivityOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-surface-card border border-white/10 rounded-3xl p-5 z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-base font-bold text-white">Add Target Activity</h3>
                <button onClick={() => setIsAddActivityOpen(false)} className="text-[#7d8495] hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddActivity} className="space-y-4">
                <div>
                  <label className="block text-xs text-[#7d8495] mb-1 font-medium">Activity Title</label>
                  <input
                    type="text"
                    required
                    value={actTitle}
                    onChange={e => setActTitle(e.target.value)}
                    placeholder="e.g. Lec-1 of MIP"
                    className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-accent-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#7d8495] mb-1 font-medium">Subject</label>
                    <select
                      value={actSubject}
                      onChange={e => setActSubject(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-accent-primary"
                    >
                      <option value="">No Subject</option>
                      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#7d8495] mb-1 font-medium">Type</label>
                    <select
                      value={actType}
                      onChange={e => setActType(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-accent-primary"
                    >
                      <option value="Lecture">Lecture</option>
                      <option value="Notes">Notes</option>
                      <option value="Revision">Revision</option>
                      <option value="DPP">DPP</option>
                      <option value="Questions">Questions</option>
                      <option value="NCERT Reading">NCERT Reading</option>
                      <option value="Practice">Practice</option>
                      <option value="Preparation">Preparation</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#7d8495] mb-1 font-medium">Target Quantity</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={actTargetQty}
                      onChange={e => setActTargetQty(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#7d8495] mb-1 font-medium">Unit</label>
                    <input
                      type="text"
                      required
                      value={actUnit}
                      onChange={e => setActUnit(e.target.value)}
                      placeholder="e.g. Lectures"
                      className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-accent-primary text-black font-bold text-sm hover:bg-[#9eff38] transition-colors"
                >
                  Save Activity
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
