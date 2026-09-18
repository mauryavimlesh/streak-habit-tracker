import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Moon,
  Clock,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Bell,
  Calendar,
  Sparkles,
  Sliders,
  Check,
} from 'lucide-react';
import { Habit } from '../../lib/habitService';
import { useAuth } from '../../lib/AuthContext';
import {
  SleepSettings,
  readLocalSleepSettings,
  updateSleepSettings,
  saveSleepRecord,
  getSleepRecordForDate,
  calculateSleepDuration,
  calculateSleepDifference,
  format24To12,
} from '../../lib/sleepService';

interface SleepModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit?: Habit;
  onSaved?: () => void;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const QUALITY_OPTIONS: Array<'Great' | 'Good' | 'Fair' | 'Poor'> = ['Great', 'Good', 'Fair', 'Poor'];

export function SleepModal({ isOpen, onClose, habit, onSaved }: SleepModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'log' | 'schedule'>('log');

  // Sleep Settings State
  const [settings, setSettings] = useState<SleepSettings>(readLocalSleepSettings());
  const [bedtime, setBedtime] = useState(settings.bedtime);
  const [wakeTime, setWakeTime] = useState(settings.wakeTime);
  const [targetDuration, setTargetDuration] = useState<number>(settings.targetDuration);
  const [repeatDays, setRepeatDays] = useState<string[]>(settings.repeatDays || DAYS_OF_WEEK);
  const [bedtimeReminderEnabled, setBedtimeReminderEnabled] = useState(settings.bedtimeReminderEnabled);
  const [bedtimeReminderTime, setBedtimeReminderTime] = useState(settings.bedtimeReminderTime || '22:30');
  const [wakeReminderEnabled, setWakeReminderEnabled] = useState(settings.wakeReminderEnabled);
  const [wakeReminderTime, setWakeReminderTime] = useState(settings.wakeReminderTime || '07:00');
  const [windDownMinutes, setWindDownMinutes] = useState(settings.windDownMinutes || 30);
  const [enabled, setEnabled] = useState(settings.enabled);

  // Actual Sleep Logging State for Today
  const todayStr = new Date().toLocaleDateString('en-CA');
  const [actualBedtime, setActualBedtime] = useState(settings.bedtime);
  const [actualWakeTime, setActualWakeTime] = useState(settings.wakeTime);
  const [actualDuration, setActualDuration] = useState<number>(settings.targetDuration);
  const [sleepQuality, setSleepQuality] = useState<'Great' | 'Good' | 'Fair' | 'Poor'>('Good');
  const [sleepNotes, setSleepNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Load latest settings and today's record on open
  useEffect(() => {
    if (isOpen) {
      const current = readLocalSleepSettings();
      setSettings(current);
      setBedtime(habit?.sleepBedtime || current.bedtime);
      setWakeTime(habit?.sleepWakeTime || current.wakeTime);
      setTargetDuration(habit?.targetValue || current.targetDuration);
      setRepeatDays(current.repeatDays || DAYS_OF_WEEK);
      setBedtimeReminderEnabled(current.bedtimeReminderEnabled);
      setBedtimeReminderTime(current.bedtimeReminderTime || '22:30');
      setWakeReminderEnabled(current.wakeReminderEnabled);
      setWakeReminderTime(current.wakeReminderTime || '07:00');
      setWindDownMinutes(current.windDownMinutes || 30);
      setEnabled(current.enabled);

      // Load today's existing sleep record if present
      getSleepRecordForDate(todayStr, user?.uid).then((record) => {
        if (record) {
          setActualBedtime(record.actualBedtime || current.bedtime);
          setActualWakeTime(record.actualWakeTime || current.wakeTime);
          setActualDuration(record.actualDuration);
          setSleepQuality(record.quality || 'Good');
          setSleepNotes(record.notes || '');
        } else {
          setActualBedtime(habit?.sleepBedtime || current.bedtime);
          setActualWakeTime(habit?.sleepWakeTime || current.wakeTime);
          const calc = calculateSleepDuration(
            habit?.sleepBedtime || current.bedtime,
            habit?.sleepWakeTime || current.wakeTime
          );
          setActualDuration(calc.totalHours);
        }
      });
    }
  }, [isOpen, habit, user?.uid, todayStr]);

  // Recalculate scheduled target duration when bedtime or wake time changes
  useEffect(() => {
    const calc = calculateSleepDuration(bedtime, wakeTime);
    setTargetDuration(calc.totalHours);
  }, [bedtime, wakeTime]);

  // Recalculate actual sleep duration when actual bedtime or wake time changes
  const handleActualTimeChange = (newBed: string, newWake: string) => {
    setActualBedtime(newBed);
    setActualWakeTime(newWake);
    const calc = calculateSleepDuration(newBed, newWake);
    setActualDuration(calc.totalHours);
  };

  const toggleDay = (day: string) => {
    if (repeatDays.includes(day)) {
      if (repeatDays.length > 1) {
        setRepeatDays(repeatDays.filter((d) => d !== day));
      }
    } else {
      setRepeatDays([...repeatDays, day]);
    }
  };

  const scheduledCalc = calculateSleepDuration(bedtime, wakeTime);
  const diff = calculateSleepDifference(actualDuration, targetDuration);

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // 1. Update Sleep Settings (also synchronizes with habitService, reminderService, and Firestore)
      const updatedSettings = await updateSleepSettings(
        {
          enabled,
          bedtime,
          wakeTime,
          targetDuration,
          repeatDays,
          bedtimeReminderEnabled,
          bedtimeReminderTime,
          wakeReminderEnabled,
          wakeReminderTime,
          windDownMinutes,
        },
        user?.uid
      );

      // 2. Save Today's Sleep Record
      const status =
        actualDuration >= targetDuration ? 'achieved' : actualDuration > targetDuration + 0.75 ? 'over' : 'under';

      await saveSleepRecord(
        {
          date: todayStr,
          targetBedtime: bedtime,
          targetWakeTime: wakeTime,
          targetDuration,
          actualBedtime,
          actualWakeTime,
          actualDuration,
          status,
          quality: sleepQuality,
          notes: sleepNotes.trim() || undefined,
        },
        user?.uid
      );

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([40, 50, 40]);
      }

      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Error saving sleep details:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-[#14161e] border border-[#232938] rounded-[24px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl z-10 max-h-[92vh] flex flex-col text-white my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                  Sleep Experience
                  {enabled ? (
                    <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/30">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-bold text-[#7d8495] bg-white/5 px-2 py-0.5 rounded-full">
                      Paused
                    </span>
                  )}
                </h3>
                <p className="text-xs text-[#7d8495]">Schedule, actual sleep, and reminders</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#7d8495] hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-[#1a1d27] p-1 rounded-xl border border-[#232938] mb-5">
            <button
              type="button"
              onClick={() => setActiveTab('log')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'log'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-[#8c94a6] hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Log Sleep Today
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'schedule'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-[#8c94a6] hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Schedule & Reminders
            </button>
          </div>

          {/* Scrollable Form Content */}
          <div className="overflow-y-auto space-y-4 pr-1 scrollbar-thin">
            {activeTab === 'log' ? (
              <div className="space-y-4">
                {/* Actual Sleep Time Pickers */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-[#8c94a6] uppercase tracking-wider">
                      Actual Sleep Times
                    </label>
                    <span className="text-[11px] text-indigo-400 font-medium">
                      Target: {format24To12(bedtime)} → {format24To12(wakeTime)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-[#1a1d27] border border-[#262c3d] rounded-xl p-3">
                      <div className="text-[10px] text-[#7d8495] uppercase font-bold tracking-wider mb-1">
                        Went to bed
                      </div>
                      <input
                        type="time"
                        value={actualBedtime}
                        onChange={(e) => handleActualTimeChange(e.target.value, actualWakeTime)}
                        className="w-full bg-transparent text-white font-mono text-sm outline-none cursor-pointer"
                      />
                      <div className="text-[10px] text-[#7d8495] mt-1 font-mono">
                        {format24To12(actualBedtime)}
                      </div>
                    </div>

                    <div className="bg-[#1a1d27] border border-[#262c3d] rounded-xl p-3">
                      <div className="text-[10px] text-[#7d8495] uppercase font-bold tracking-wider mb-1">
                        Woke up
                      </div>
                      <input
                        type="time"
                        value={actualWakeTime}
                        onChange={(e) => handleActualTimeChange(actualBedtime, e.target.value)}
                        className="w-full bg-transparent text-white font-mono text-sm outline-none cursor-pointer"
                      />
                      <div className="text-[10px] text-[#7d8495] mt-1 font-mono">
                        {format24To12(actualWakeTime)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actual Duration Slider */}
                <div className="bg-[#1a1d27] border border-[#262c3d] rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-white">Actual Sleep Duration</label>
                    <span className="text-sm font-mono font-bold text-indigo-400">
                      {actualDuration} hrs
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="14"
                    step="0.25"
                    value={actualDuration}
                    onChange={(e) => setActualDuration(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#6c7485]">
                    <span>0h</span>
                    <span>Target: {targetDuration}h</span>
                    <span>14h</span>
                  </div>

                  {/* Target vs Actual Comparison Card */}
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#7d8495] uppercase font-bold tracking-wider block">
                        Target Status
                      </span>
                      <span className="text-xs font-semibold text-white">
                        {diff.formatted} vs {targetDuration}h goal
                      </span>
                    </div>

                    {actualDuration >= targetDuration ? (
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Target Achieved
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        Under Target ({Math.round((actualDuration / (targetDuration || 8)) * 100)}%)
                      </span>
                    )}
                  </div>
                </div>

                {/* Sleep Quality */}
                <div>
                  <label className="text-xs font-semibold text-[#8c94a6] uppercase tracking-wider block mb-2">
                    Sleep Quality
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {QUALITY_OPTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setSleepQuality(q)}
                        className={`py-2 px-1 text-xs font-semibold rounded-xl border transition-all text-center ${
                          sleepQuality === q
                            ? 'bg-indigo-500/20 border-indigo-500 text-white shadow-sm'
                            : 'bg-[#1a1d27] border-[#262c3d] text-[#8c94a6] hover:text-white'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sleep Notes */}
                <div>
                  <label className="text-xs font-semibold text-[#8c94a6] uppercase tracking-wider block mb-1.5">
                    Sleep Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={sleepNotes}
                    onChange={(e) => setSleepNotes(e.target.value)}
                    placeholder="E.g., Deep recovery, read 20 mins before bed..."
                    className="w-full bg-[#1a1d27] border border-[#262c3d] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#5a6275] outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Tracking Enable / Disable */}
                <div className="flex items-center justify-between bg-[#1a1d27] border border-[#262c3d] rounded-xl p-3.5">
                  <div>
                    <div className="text-xs font-bold text-white">Sleep Tracking</div>
                    <div className="text-[11px] text-[#7d8495]">Enable daily sleep monitoring</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnabled(!enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      enabled ? 'bg-indigo-600' : 'bg-[#2a3042]'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Bedtime & Wake Schedule */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-[#8c94a6] uppercase tracking-wider">
                      Planned Schedule
                    </label>
                    <span className="text-[11px] font-mono text-indigo-400 font-medium">
                      Duration: {scheduledCalc.formatted} ({scheduledCalc.totalHours}h)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-[#1a1d27] border border-[#262c3d] rounded-xl p-3">
                      <div className="text-[10px] text-[#7d8495] uppercase font-bold tracking-wider mb-1">
                        Target Bedtime
                      </div>
                      <input
                        type="time"
                        value={bedtime}
                        onChange={(e) => setBedtime(e.target.value)}
                        className="w-full bg-transparent text-white font-mono text-sm outline-none cursor-pointer"
                      />
                      <div className="text-[10px] text-[#7d8495] mt-1 font-mono">
                        {format24To12(bedtime)}
                      </div>
                    </div>

                    <div className="bg-[#1a1d27] border border-[#262c3d] rounded-xl p-3">
                      <div className="text-[10px] text-[#7d8495] uppercase font-bold tracking-wider mb-1">
                        Target Wake Up
                      </div>
                      <input
                        type="time"
                        value={wakeTime}
                        onChange={(e) => setWakeTime(e.target.value)}
                        className="w-full bg-transparent text-white font-mono text-sm outline-none cursor-pointer"
                      />
                      <div className="text-[10px] text-[#7d8495] mt-1 font-mono">
                        {format24To12(wakeTime)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Target Sleep Duration Override */}
                <div className="bg-[#1a1d27] border border-[#262c3d] rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-white">Daily Sleep Target</label>
                    <span className="text-xs font-mono font-bold text-indigo-400">
                      {targetDuration} hrs
                    </span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="12"
                    step="0.5"
                    value={targetDuration}
                    onChange={(e) => setTargetDuration(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#6c7485]">
                    <span>4h</span>
                    <span>Calculated: {scheduledCalc.totalHours}h</span>
                    <span>12h</span>
                  </div>
                </div>

                {/* Repeat Days */}
                <div>
                  <label className="text-xs font-semibold text-[#8c94a6] uppercase tracking-wider block mb-2">
                    Repeat Days
                  </label>
                  <div className="flex gap-1.5">
                    {DAYS_OF_WEEK.map((d) => {
                      const isSelected = repeatDays.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDay(d)}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                              : 'bg-[#1a1d27] border-[#262c3d] text-[#6b7282] hover:text-white'
                          }`}
                        >
                          {d[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reminders Integration */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-[#8c94a6] uppercase tracking-wider block">
                    Reminders & Alarms
                  </label>

                  {/* Bedtime Reminder */}
                  <div className="bg-[#1a1d27] border border-[#262c3d] rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold text-white">Bedtime Reminder</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBedtimeReminderEnabled(!bedtimeReminderEnabled)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          bedtimeReminderEnabled ? 'bg-indigo-600' : 'bg-[#2a3042]'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            bedtimeReminderEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    {bedtimeReminderEnabled && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[11px] text-[#7d8495]">Alert Time:</span>
                        <input
                          type="time"
                          value={bedtimeReminderTime}
                          onChange={(e) => setBedtimeReminderTime(e.target.value)}
                          className="bg-[#202534] border border-[#2e364a] text-white text-xs px-2 py-1 rounded-lg font-mono outline-none"
                        />
                        <span className="text-[11px] text-indigo-400 font-mono">
                          ({format24To12(bedtimeReminderTime)})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Wake-up Reminder */}
                  <div className="bg-[#1a1d27] border border-[#262c3d] rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-white">Wake-up Alarm & Reminder</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWakeReminderEnabled(!wakeReminderEnabled)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          wakeReminderEnabled ? 'bg-amber-600' : 'bg-[#2a3042]'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            wakeReminderEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    {wakeReminderEnabled && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[11px] text-[#7d8495]">Alert Time:</span>
                        <input
                          type="time"
                          value={wakeReminderTime}
                          onChange={(e) => setWakeReminderTime(e.target.value)}
                          className="bg-[#202534] border border-[#2e364a] text-white text-xs px-2 py-1 rounded-lg font-mono outline-none"
                        />
                        <span className="text-[11px] text-amber-400 font-mono">
                          ({format24To12(wakeReminderTime)})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 mt-5 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-[#8c94a6] hover:text-white font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAll}
              className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-lg shadow-indigo-600/25"
            >
              {isSaving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Everywhere
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
