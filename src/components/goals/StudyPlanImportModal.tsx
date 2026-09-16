import React, { useState, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Upload,
  Camera,
  Sparkles,
  Check,
  Plus,
  Trash2,
  BookOpen,
  Calendar,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { createGoal, addGoalActivity, Goal } from '../../lib/goalService';
import confetti from 'canvas-confetti';

interface ExtractedActivity {
  id: string;
  title: string;
  subject: string;
  type: string;
  targetQuantity: number;
  unit: string;
}

interface ExtractedPlan {
  goalTitle: string;
  subjects: string[];
  dailyTarget: number;
  unit: string;
  activities: ExtractedActivity[];
}

interface StudyPlanImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onGoalCreated: (goalId: string) => void;
}

export function StudyPlanImportModal({
  isOpen,
  onClose,
  userId = 'local',
  onGoalCreated,
}: StudyPlanImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Extracted and editable plan state
  const [extractedPlan, setExtractedPlan] = useState<ExtractedPlan | null>(null);
  const [goalTitle, setGoalTitle] = useState('Student Study Plan');
  const [subjects, setSubjects] = useState<string[]>(['Physics', 'Chemistry', 'Biology']);
  const [dailyTarget, setDailyTarget] = useState(4);
  const [unit, setUnit] = useState('Lectures');
  const [activities, setActivities] = useState<ExtractedActivity[]>([]);
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [addToTasks, setAddToTasks] = useState(true);
  const [addToHabits, setAddToHabits] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const resetState = () => {
    setImagePreview(null);
    setIsAnalyzing(false);
    setErrorMsg(null);
    setExtractedPlan(null);
    setActivities([]);
    setIsSaving(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    setMimeType(file.type);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleExtractPlan = async () => {
    if (!imagePreview) return;
    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/ai-extract-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePreview,
          mimeType,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.plan) {
        throw new Error(data.error || 'Failed to extract study plan from image.');
      }

      const plan = data.plan;
      setExtractedPlan(plan);
      setGoalTitle(plan.goalTitle || 'Student Study Plan');
      setSubjects(Array.isArray(plan.subjects) && plan.subjects.length > 0 ? plan.subjects : ['Physics', 'Chemistry', 'Botany', 'Zoology']);
      setDailyTarget(Number(plan.dailyTarget) || 4);
      setUnit(plan.unit || 'Lectures');

      const parsedActivities: ExtractedActivity[] = (plan.activities || []).map((act: any, idx: number) => ({
        id: 'act_extract_' + idx,
        title: act.title || `Lecture ${idx + 1}`,
        subject: act.subject || 'General',
        type: act.type || 'Lecture',
        targetQuantity: Number(act.targetQuantity) || 1,
        unit: act.unit || 'unit',
      }));

      setActivities(parsedActivities);
    } catch (err: any) {
      console.error('Plan extraction error:', err);
      setErrorMsg(err.message || 'Could not analyze photo. You can still set up your plan manually below.');
      // Provide an editable default template
      const fallbackSubjects = ['Physics', 'Chemistry', 'Botany', 'Zoology'];
      setSubjects(fallbackSubjects);
      setGoalTitle('NEET / Exam Study Plan');
      setDailyTarget(4);
      setUnit('Lectures');
      setActivities([
        { id: 'act_1', title: 'Lecture 1', subject: 'Physics', type: 'Lecture', targetQuantity: 1, unit: 'lecture' },
        { id: 'act_2', title: 'DPP Practice', subject: 'Physics', type: 'DPP', targetQuantity: 1, unit: 'DPP' },
        { id: 'act_3', title: 'Lecture 14', subject: 'Chemistry', type: 'Lecture', targetQuantity: 1, unit: 'lecture' },
        { id: 'act_4', title: 'NCERT Reading', subject: 'Botany', type: 'NCERT Reading', targetQuantity: 1, unit: 'chapter' },
      ]);
      setExtractedPlan({
        goalTitle: 'NEET / Exam Study Plan',
        subjects: fallbackSubjects,
        dailyTarget: 4,
        unit: 'Lectures',
        activities: [],
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddSubject = () => {
    const trimmed = newSubjectInput.trim();
    if (trimmed && !subjects.includes(trimmed)) {
      setSubjects([...subjects, trimmed]);
      setNewSubjectInput('');
    }
  };

  const handleRemoveSubject = (sub: string) => {
    setSubjects(subjects.filter((s) => s !== sub));
  };

  const handleUpdateActivity = (index: number, field: keyof ExtractedActivity, value: any) => {
    const next = [...activities];
    next[index] = { ...next[index], [field]: value };
    setActivities(next);
  };

  const handleRemoveActivity = (index: number) => {
    setActivities(activities.filter((_, idx) => idx !== index));
  };

  const handleAddManualActivity = () => {
    const newAct: ExtractedActivity = {
      id: 'act_manual_' + Date.now(),
      title: 'New Activity',
      subject: subjects[0] || 'General',
      type: 'Lecture',
      targetQuantity: 1,
      unit: 'lecture',
    };
    setActivities([...activities, newAct]);
  };

  const handleConfirmPlan = async () => {
    if (!goalTitle.trim()) return;
    setIsSaving(true);
    const todayStr = new Date().toLocaleDateString('en-CA');

    try {
      // 1. Create the Goal
      const createdGoal = await createGoal(
        {
          title: goalTitle.trim(),
          category: 'Study',
          type: 'daily',
          target: dailyTarget,
          dailyTarget,
          currentProgress: 0,
          unit,
          subjects,
          status: 'in_progress',
          priority: 'high',
          linkToTask: addToTasks,
          linkToHabit: addToHabitOptions(),
        },
        userId
      );

      const newGoalId = createdGoal.id;

      // 2. Add each extracted activity
      for (const act of activities) {
        await addGoalActivity(
          newGoalId,
          todayStr,
          {
            title: act.title,
            subject: act.subject,
            type: act.type,
            targetQuantity: act.targetQuantity,
            progress: 0,
            unit: act.unit,
            completed: false,
          },
          userId,
          {
            addToTask: addToTasks,
            addToHabit: addToHabits,
          }
        );
      }

      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 },
      });

      onGoalCreated(newGoalId);
      handleClose();
    } catch (err: any) {
      console.error('Failed to create goal from plan:', err);
      setErrorMsg('Failed to save study plan. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const addToHabitOptions = () => addToHabits;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-xl bg-[#12151d] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Smart Study Plan Import</h2>
              <p className="text-xs text-[#7d8495]">Upload a photo of your handwritten or printed plan</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#7d8495] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Upload or Preview Image */}
          {!extractedPlan ? (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />

              {!imagePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/15 hover:border-accent-primary/50 bg-white/[0.02] hover:bg-white/[0.04] transition-all rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer group text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#7d8495] group-hover:text-accent-primary group-hover:border-accent-primary/30 transition-all">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="font-semibold text-white block text-sm mb-1">
                      Snap or upload handwritten study plan
                    </span>
                    <span className="text-xs text-[#7d8495] block max-w-xs mx-auto">
                      Supports phone snapshots, notebook lists (e.g. Physics: Lecture 1, Lecture 2, DPP)
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mt-2 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/15 text-xs font-semibold flex items-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Browse Photos
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden border border-white/10 max-h-56 bg-black/40 flex items-center justify-center">
                    <img
                      src={imagePreview}
                      alt="Study Plan Preview"
                      className="w-full h-full object-contain max-h-56"
                    />
                    <button
                      onClick={() => setImagePreview(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white text-xs flex items-center gap-1 border border-white/20"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isAnalyzing}
                    onClick={handleExtractPlan}
                    className="w-full py-3 rounded-2xl bg-accent-primary text-black font-bold text-sm hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-accent-primary/20"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        <span>Extracting Subjects & Activities...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Analyze & Extract Plan</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: Editable Preview */
            <div className="space-y-5">
              <div className="p-3.5 bg-accent-primary/10 border border-accent-primary/20 rounded-2xl flex items-center gap-2 text-xs text-accent-primary">
                <Check className="w-4 h-4 shrink-0" />
                <span>Plan extracted successfully! Review and customize before creating:</span>
              </div>

              {/* Goal Title & Target */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#7d8495] uppercase tracking-wider block mb-1">
                    Goal Name
                  </label>
                  <input
                    type="text"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-accent-primary text-xs"
                    placeholder="e.g. NEET Preparation"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-[#7d8495] uppercase tracking-wider block mb-1">
                      Daily Target
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={dailyTarget}
                      onChange={(e) => setDailyTarget(Number(e.target.value) || 1)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-accent-primary text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#7d8495] uppercase tracking-wider block mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-accent-primary text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Subjects tags */}
              <div>
                <label className="text-[11px] font-semibold text-[#7d8495] uppercase tracking-wider block mb-1.5">
                  Subjects
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {subjects.map((subj) => (
                    <span
                      key={subj}
                      className="px-2.5 py-1 rounded-lg bg-white/10 text-white text-xs font-semibold flex items-center gap-1.5 border border-white/5"
                    >
                      {subj}
                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(subj)}
                        className="text-white/40 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubjectInput}
                    onChange={(e) => setNewSubjectInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubject();
                      }
                    }}
                    placeholder="Add subject (e.g. Zoology, Math)..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubject}
                    className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/15"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Extracted Activities list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold text-[#7d8495] uppercase tracking-wider">
                    Planned Activities ({activities.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddManualActivity}
                    className="text-xs text-accent-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Plus className="w-3 h-3" /> Add item
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {activities.map((act, index) => (
                    <div
                      key={act.id || index}
                      className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2"
                    >
                      <select
                        value={act.subject}
                        onChange={(e) => handleUpdateActivity(index, 'subject', e.target.value)}
                        className="bg-white/10 text-white text-xs rounded-lg px-2 py-1 border border-white/10 focus:outline-none"
                      >
                        {subjects.map((s) => (
                          <option key={s} value={s} className="bg-[#1a1e28]">
                            {s}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={act.title}
                        onChange={(e) => handleUpdateActivity(index, 'title', e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-accent-primary"
                      />

                      <select
                        value={act.type}
                        onChange={(e) => handleUpdateActivity(index, 'type', e.target.value)}
                        className="bg-white/10 text-white text-xs rounded-lg px-2 py-1 border border-white/10 focus:outline-none"
                      >
                        <option value="Lecture" className="bg-[#1a1e28]">Lecture</option>
                        <option value="DPP" className="bg-[#1a1e28]">DPP</option>
                        <option value="Questions" className="bg-[#1a1e28]">Questions</option>
                        <option value="Notes" className="bg-[#1a1e28]">Notes</option>
                        <option value="NCERT Reading" className="bg-[#1a1e28]">NCERT</option>
                        <option value="Revision" className="bg-[#1a1e28]">Revision</option>
                        <option value="Practice" className="bg-[#1a1e28]">Practice</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveActivity(index)}
                        className="text-[#7d8495] hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task / Habit integration toggles */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addToTasks}
                    onChange={(e) => setAddToTasks(e.target.checked)}
                    className="w-4 h-4 rounded text-accent-primary focus:ring-0 cursor-pointer accent-[#a5ff36]"
                  />
                  <span className="text-xs text-white font-medium">Add activities as linked Tasks for Today</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addToHabits}
                    onChange={(e) => setAddToHabits(e.target.checked)}
                    className="w-4 h-4 rounded text-accent-primary focus:ring-0 cursor-pointer accent-[#a5ff36]"
                  />
                  <span className="text-xs text-white font-medium">Add activities as daily recurring Habits</span>
                </label>
              </div>

              {/* Confirmation Action */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setExtractedPlan(null)}
                  className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/70 hover:text-white"
                >
                  Back to Photo
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleConfirmPlan}
                  className="flex-1 py-2.5 rounded-2xl bg-accent-primary text-black font-bold text-xs hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-accent-primary/20"
                >
                  {isSaving ? (
                    <span>Creating Plan...</span>
                  ) : (
                    <>
                      <span>Confirm & Create Plan</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
