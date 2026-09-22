import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Clock,
  Calendar,
  Volume2,
  VolumeX,
  Play,
  Square,
  Upload,
  Trash2,
  Smartphone,
  Check,
  Bell,
  AlertCircle,
  FileAudio,
} from 'lucide-react';
import {
  ReminderItem,
  ReminderRepeat,
  ReminderCategory,
  toInputTimeValue,
  formatTimeDisplay,
} from '../lib/reminderService';
import {
  BUILT_IN_TONES,
  previewAlarmTone,
  stopPreviewTone,
  VibrationPatternType,
  VIBRATION_PATTERN_OPTIONS,
  previewVibrationPattern,
} from '../lib/alarmAudio';
import {
  saveCustomAudioTone,
  getCustomAudioBlob,
  deleteCustomAudioTone,
} from '../lib/customAudioStorage';
import { triggerHaptic } from '../lib/haptics';
import { readLocalHabits, Habit } from '../lib/habitService';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const REPEAT_OPTIONS: { id: ReminderRepeat; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekdays', label: 'Weekdays (Mon-Fri)' },
  { id: 'weekends', label: 'Weekends (Sat-Sun)' },
  { id: 'once', label: 'One-time' },
  { id: 'custom', label: 'Custom Days' },
];

const SNOOZE_PRESETS = [5, 10, 15];

const TIME_PRESET_BUTTONS = [
  { label: '6:00 AM', val: '06:00' },
  { label: '8:00 AM', val: '08:00' },
  { label: '12:00 PM', val: '12:00' },
  { label: '6:00 PM', val: '18:00' },
  { label: '9:00 PM', val: '21:00' },
];

interface AlarmReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reminderData: Omit<ReminderItem, 'id' | 'createdAt'>, existingId?: string) => Promise<void>;
  initialData?: ReminderItem | null;
  habitContext?: { id: string; name: string };
}

export const AlarmReminderModal: React.FC<AlarmReminderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  habitContext,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeValue, setTimeValue] = useState('08:00'); // 24h for input
  const [repeat, setRepeat] = useState<ReminderRepeat>('daily');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const [date, setDate] = useState('');
  const [enabled, setEnabled] = useState(true);

  // Linked items states
  const [habits, setHabits] = useState<Habit[]>([]);
  const [linkedHabitId, setLinkedHabitId] = useState<string>('');

  // Native time selector states
  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedAmPm, setSelectedAmPm] = useState<'AM' | 'PM'>('AM');

  // Progressive Disclosure states
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showToneSelector, setShowToneSelector] = useState(false);

  const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const handlePartChange = (h12: string, m: string, ampm: 'AM' | 'PM') => {
    let h24 = parseInt(h12, 10);
    if (ampm === 'PM') {
      if (h24 < 12) h24 += 12;
    } else {
      if (h24 === 12) h24 = 0;
    }
    const h24Str = String(h24).padStart(2, '0');
    setTimeValue(`${h24Str}:${m}`);
  };

  // Keep part states synced with timeValue
  useEffect(() => {
    if (timeValue && timeValue.includes(':')) {
      const [h24Str, mStr] = timeValue.split(':');
      const h24 = parseInt(h24Str, 10) || 0;
      const m = mStr || '00';
      let ampm: 'AM' | 'PM' = 'AM';
      let h12 = h24;
      if (h24 >= 12) {
        ampm = 'PM';
        if (h24 > 12) h12 = h24 - 12;
      }
      if (h12 === 0) {
        h12 = 12;
      }
      const h12Str = String(h12).padStart(2, '0');
      setSelectedHour(h12Str);
      setSelectedMinute(m);
      setSelectedAmPm(ampm);
    }
  }, [timeValue]);

  // Tone & Sound State
  const [soundTone, setSoundTone] = useState<string>('streak-pulse');
  const [customAudioId, setCustomAudioId] = useState<string | undefined>();
  const [customAudioName, setCustomAudioName] = useState<string | undefined>();
  const [customBlob, setCustomBlob] = useState<Blob | null>(null);
  const [previewingToneId, setPreviewingToneId] = useState<string | null>(null);

  // Settings
  const [volume, setVolume] = useState<number>(0.85);
  const [vibrate, setVibrate] = useState<boolean>(true);
  const [vibrationPattern, setVibrationPattern] = useState<VibrationPatternType>('default');
  const [snoozeEnabled, setSnoozeEnabled] = useState<boolean>(true);
  const [snoozeMinutes, setSnoozeMinutes] = useState<number>(10);
  const [isCustomSnooze, setIsCustomSnooze] = useState<boolean>(false);

  const [saving, setSaving] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial data when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopPreviewTone();
      setPreviewingToneId(null);
      return;
    }

    // Load list of available habits
    setHabits(readLocalHabits());

    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setTimeValue(toInputTimeValue(initialData.time));
      setRepeat(initialData.repeat || 'daily');
      setSelectedDays(initialData.days?.length ? initialData.days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
      setDate(initialData.date || '');
      setEnabled(initialData.enabled ?? true);
      setLinkedHabitId(initialData.linkedHabitId || '');
      setSoundTone(initialData.soundTone || 'streak-pulse');
      setCustomAudioId(initialData.customAudioId);
      setCustomAudioName(initialData.customAudioName);
      setVolume(typeof initialData.volume === 'number' ? initialData.volume : 0.85);
      const pat = initialData.vibrationPattern || (initialData.vibrate === false ? 'off' : 'default');
      setVibrationPattern(pat);
      setVibrate(pat !== 'off');
      setSnoozeEnabled(initialData.snoozeEnabled ?? true);
      const sMins = initialData.snoozeMinutes ?? 10;
      setSnoozeMinutes(sMins);
      setIsCustomSnooze(!SNOOZE_PRESETS.includes(sMins));

      // Load custom blob if present
      if (initialData.customAudioId) {
        getCustomAudioBlob(initialData.customAudioId).then((blob) => {
          setCustomBlob(blob);
        });
      } else {
        setCustomBlob(null);
      }
    } else {
      // New reminder defaults
      const defaultTitle = habitContext ? `${habitContext.name} Alarm` : '';
      setTitle(defaultTitle);
      setDescription('');
      setTimeValue('08:00');
      setRepeat('daily');
      setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
      setDate('');
      setEnabled(true);
      setLinkedHabitId(habitContext?.id || '');
      setSoundTone('streak-pulse');
      setCustomAudioId(undefined);
      setCustomAudioName(undefined);
      setCustomBlob(null);
      setVolume(0.85);
      setVibrate(true);
      setVibrationPattern('default');
      setSnoozeEnabled(true);
      setSnoozeMinutes(10);
      setIsCustomSnooze(false);
    }
    setAudioError(null);
  }, [isOpen, initialData, habitContext]);

  // Clean up audio on unmount or close
  useEffect(() => {
    return () => {
      stopPreviewTone();
    };
  }, []);

  const handleDayToggle = (day: string) => {
    triggerHaptic('tap');
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleRepeatChange = (newRepeat: ReminderRepeat) => {
    triggerHaptic('tap');
    setRepeat(newRepeat);
    if (newRepeat === 'daily') {
      setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    } else if (newRepeat === 'weekdays') {
      setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    } else if (newRepeat === 'weekends') {
      setSelectedDays(['Sat', 'Sun']);
    }
  };

  const handlePreviewTone = async (toneId: string) => {
    triggerHaptic('tap');
    if (previewingToneId === toneId) {
      stopPreviewTone();
      setPreviewingToneId(null);
      return;
    }

    setPreviewingToneId(toneId);
    try {
      await previewAlarmTone(toneId, toneId === 'custom' ? customBlob : null, volume);
    } catch {
      setPreviewingToneId(null);
    }
  };

  const handleCustomAudioSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioError(null);
    try {
      const generatedId = 'tone_' + Date.now();
      const saved = await saveCustomAudioTone(generatedId, file);
      setCustomAudioId(saved.id);
      setCustomAudioName(saved.name);
      setCustomBlob(file);
      setSoundTone('custom');
      triggerHaptic('completion');
    } catch (err: any) {
      setAudioError(err?.message || 'Failed to process audio file.');
      triggerHaptic('error');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveCustomAudio = async () => {
    triggerHaptic('light');
    if (customAudioId) {
      await deleteCustomAudioTone(customAudioId);
    }
    setCustomAudioId(undefined);
    setCustomAudioName(undefined);
    setCustomBlob(null);
    if (soundTone === 'custom') {
      setSoundTone('streak-pulse');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setAudioError('Please enter a title or label for this alarm.');
      triggerHaptic('error');
      return;
    }

    stopPreviewTone();
    setSaving(true);
    setAudioError(null);
    triggerHaptic('tap');

    try {
      const formattedTime = formatTimeDisplay(timeValue);

      let effectiveDays = selectedDays;
      if (repeat === 'daily') effectiveDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      if (repeat === 'weekdays') effectiveDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      if (repeat === 'weekends') effectiveDays = ['Sat', 'Sun'];

      const selectedHabit = habits.find(h => h.id === linkedHabitId);

      const payload: Omit<ReminderItem, 'id' | 'createdAt'> = {
        title: title.trim(),
        description: description.trim() || undefined,
        time: formattedTime,
        repeat,
        days: effectiveDays,
        date: repeat === 'once' ? date || new Date().toISOString().split('T')[0] : undefined,
        enabled,
        notificationEnabled: true,
        category: (habitContext ? 'habit' : initialData?.category || 'general') as ReminderCategory,
        linkedHabitId: habitContext?.id || linkedHabitId || undefined,
        linkedEntityName: habitContext?.name || (selectedHabit ? selectedHabit.name : undefined),
        soundTone,
        customAudioId,
        customAudioName,
        volume,
        vibrate: vibrationPattern !== 'off',
        vibrationPattern,
        snoozeEnabled,
        snoozeMinutes: isCustomSnooze ? (snoozeMinutes || 10) : (snoozeMinutes || 10),
      };

      await onSave(payload, initialData?.id);
      onClose();
    } catch (err: any) {
      console.error('Failed to save reminder:', err);
      setAudioError(err?.message || 'Failed to save alarm. Your changes have been preserved.');
      triggerHaptic('error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-[#12151c] border border-[#232936] rounded-[28px] p-5 sm:p-6 shadow-2xl my-6 text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#1f2430] mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-accent-primary/15 border border-accent-primary/30 flex items-center justify-center text-accent-primary">
                <Bell className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white">
                {initialData ? 'Edit Reminder / Alarm' : 'Set New Alarm'}
              </h2>
            </div>
            <button
              onClick={() => {
                stopPreviewTone();
                onClose();
              }}
              className="p-2 rounded-xl text-[#7d8495] hover:text-white hover:bg-[#1a1f2b] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Title & Description */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#8c94a5] uppercase tracking-wider mb-1.5">
                  Alarm Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Morning Workout Alarm"
                  required
                  className="w-full bg-[#181c25] border border-[#262c3b] rounded-xl px-4 py-3 text-sm text-white placeholder-[#606778] outline-none focus:border-accent-primary/60 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8c94a5] uppercase tracking-wider mb-1.5">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Focus on hydration and core sets"
                  className="w-full bg-[#181c25] border border-[#262c3b] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#606778] outline-none focus:border-accent-primary/60 transition-colors"
                />
              </div>
            </div>

            {/* Time Picker Card */}
            <div className="bg-[#181c25] border border-[#262c3b] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-xl bg-accent-primary/10 border border-accent-primary/25 flex items-center justify-center text-accent-primary shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-xs text-[#8c94a5] uppercase tracking-wider">Alarm Time</span>
                  <span className="text-xl font-mono font-bold text-white">
                    {formatTimeDisplay(timeValue)}
                  </span>
                </div>
              </div>

              {/* Native-feeling Interactive Selects */}
              <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
                <div className="flex items-center gap-1.5 bg-[#101217] border border-[#2b3345] rounded-xl px-2.5 py-1.5">
                  <select
                    value={selectedHour}
                    onChange={(e) => {
                      triggerHaptic('tap');
                      handlePartChange(e.target.value, selectedMinute, selectedAmPm);
                    }}
                    className="bg-transparent text-sm font-bold text-white font-mono outline-none cursor-pointer text-center"
                    style={{ minWidth: '2.5rem' }}
                  >
                    {HOUR_OPTIONS.map((h) => (
                      <option key={h} value={h} className="bg-[#12151c] text-white">
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className="text-[#8c94a5] font-mono">:</span>
                  <select
                    value={selectedMinute}
                    onChange={(e) => {
                      triggerHaptic('tap');
                      handlePartChange(selectedHour, e.target.value, selectedAmPm);
                    }}
                    className="bg-transparent text-sm font-bold text-white font-mono outline-none cursor-pointer text-center"
                    style={{ minWidth: '2.5rem' }}
                  >
                    {MINUTE_OPTIONS.map((m) => (
                      <option key={m} value={m} className="bg-[#12151c] text-white">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex bg-[#101217] border border-[#2b3345] p-1 rounded-xl shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      handlePartChange(selectedHour, selectedMinute, 'AM');
                    }}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      selectedAmPm === 'AM'
                        ? 'bg-accent-primary text-black font-extrabold'
                        : 'text-[#8c94a5] hover:text-white'
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      handlePartChange(selectedHour, selectedMinute, 'PM');
                    }}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      selectedAmPm === 'PM'
                        ? 'bg-accent-primary text-black font-extrabold'
                        : 'text-[#8c94a5] hover:text-white'
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Time Presets */}
            <div>
              <span className="block text-[11px] font-semibold text-[#8c94a5] uppercase tracking-wider mb-1.5">
                Quick Time Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TIME_PRESET_BUTTONS.map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setTimeValue(p.val);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      timeValue === p.val
                        ? 'bg-accent-primary text-black font-bold shadow-sm'
                        : 'bg-[#181c25] text-[#8c94a5] border border-[#262c3b] hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Repeat Presets */}
            <div>
              <label className="block text-xs font-semibold text-[#8c94a5] uppercase tracking-wider mb-2">
                Repeat Schedule
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {REPEAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleRepeatChange(opt.id)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                      repeat === opt.id
                        ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40'
                        : 'bg-[#181c25] text-[#8c94a5] border border-[#262c3b] hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Day of Week Selector for Custom Days */}
              {(repeat === 'custom' || repeat === 'weekly') && (
                <div className="mt-3 flex gap-1 justify-between">
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = selectedDays.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleDayToggle(d)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-accent-primary text-black font-extrabold'
                            : 'bg-[#181c25] text-[#7d8495] border border-[#262c3b] hover:text-white'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              )}

              {repeat === 'once' && (
                <div className="mt-3">
                  <label className="block text-xs text-[#8c94a5] mb-1">Select Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#181c25] border border-[#262c3b] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-accent-primary/50"
                  />
                </div>
              )}
            </div>

            {/* Link to Habit Option */}
            {!habitContext && (
              <div>
                <label className="block text-xs font-semibold text-[#8c94a5] uppercase tracking-wider mb-1.5">
                  Link to Habit (Optional)
                </label>
                <select
                  value={linkedHabitId}
                  onChange={(e) => {
                    triggerHaptic('tap');
                    setLinkedHabitId(e.target.value);
                  }}
                  className="w-full bg-[#181c25] border border-[#262c3b] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-accent-primary/60 transition-colors cursor-pointer"
                >
                  <option value="" className="bg-[#12151c] text-[#7d8495]">No Habit Linked</option>
                  {habits.map((h) => (
                    <option key={h.id} value={h.id} className="bg-[#12151c] text-white">
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sound Selection Section */}
            <div className="bg-[#181c25] border border-[#262c3b] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs text-[#8c94a5] uppercase tracking-wider mb-0.5">Alarm Tone</span>
                  <span className="text-sm font-semibold text-white">
                    {soundTone === 'custom' ? customAudioName || 'Custom Tone' : BUILT_IN_TONES.find((t) => t.id === soundTone)?.name || 'STREAK Pulse'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowToneSelector(!showToneSelector)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#1e232f] hover:bg-[#282f3f] text-accent-primary border border-accent-primary/20 transition-colors cursor-pointer"
                >
                  {showToneSelector ? 'Hide Tones' : 'Change'}
                </button>
              </div>

              {showToneSelector && (
                <div className="space-y-3 pt-3 border-t border-[#232836] animate-none">
                  {/* Built-in Tones List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {BUILT_IN_TONES.map((tone) => {
                      const isSelected = soundTone === tone.id;
                      const isPreviewing = previewingToneId === tone.id;

                      return (
                        <div
                          key={tone.id}
                          onClick={() => {
                            triggerHaptic('tap');
                            setSoundTone(tone.id);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-accent-primary/15 border-accent-primary/50 text-white'
                              : 'bg-[#12151c] border-[#232836] text-[#9ba3b5] hover:border-[#30384a]'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-semibold truncate text-white">{tone.name}</div>
                            <div className="text-[10px] text-[#717a8c] truncate">{tone.description}</div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewTone(tone.id);
                            }}
                            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                              isPreviewing
                                ? 'bg-accent-primary text-black animate-pulse'
                                : 'bg-[#1e232f] hover:bg-[#282f3f] text-[#8c94a5] hover:text-white'
                            }`}
                            title={isPreviewing ? 'Stop' : 'Preview'}
                          >
                            {isPreviewing ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Device Custom Audio Tone */}
                  <div className="pt-2 border-t border-[#232836]">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleCustomAudioSelected}
                      className="hidden"
                    />

                    {customAudioId && customAudioName ? (
                      <div
                        onClick={() => setSoundTone('custom')}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                          soundTone === 'custom'
                            ? 'bg-accent-primary/15 border-accent-primary/50'
                            : 'bg-[#12151c] border-[#232836]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <FileAudio className="w-4 h-4 text-accent-primary shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">
                              {customAudioName}
                            </div>
                            <div className="text-[10px] text-accent-primary">Local Device Audio</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewTone('custom');
                            }}
                            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                              previewingToneId === 'custom'
                                ? 'bg-accent-primary text-black animate-pulse'
                                : 'bg-[#1e232f] hover:bg-[#282f3f] text-[#8c94a5]'
                            }`}
                            title={previewingToneId === 'custom' ? 'Stop' : 'Play'}
                          >
                            {previewingToneId === 'custom' ? (
                              <Square className="w-3 h-3 fill-current" />
                            ) : (
                              <Play className="w-3 h-3 fill-current" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                            className="px-2 py-1 rounded-lg text-[10px] bg-[#1e232f] hover:bg-[#282f3f] text-white transition-colors"
                          >
                            Change
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCustomAudio();
                            }}
                            className="p-1.5 rounded-lg text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[#30384a] hover:border-accent-primary/50 text-[#8c94a5] hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer bg-[#12151c]"
                      >
                        <Upload className="w-3.5 h-3.5 text-accent-primary" />
                        <span>Choose tone from device (MP3, WAV, OGG, M4A)</span>
                      </button>
                    )}

                    {audioError && (
                      <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {audioError}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* More Options Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full py-2.5 rounded-xl border border-dashed border-[#262c3b] hover:border-accent-primary/40 text-[#8c94a5] hover:text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer bg-[#181c25]/45"
            >
              <span>{showAdvanced ? 'Hide Advanced Settings ▴' : 'More Options / Alarm Settings ▾'}</span>
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-1 animate-none">
                {/* Alarm Settings: Volume, Vibration, Snooze */}
                <div className="bg-[#181c25] border border-[#262c3b] rounded-2xl p-4 space-y-4">
                  <span className="block text-xs font-semibold text-[#8c94a5] uppercase tracking-wider">
                    Alarm Settings
                  </span>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setVolume(volume === 0 ? 0.85 : 0)}
                      className="text-[#8c94a5] hover:text-white"
                    >
                      {volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-accent-primary" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="flex-1 accent-accent-primary cursor-pointer"
                    />
                    <span className="text-xs font-mono text-[#8c94a5] w-9 text-right">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>

                  {/* Vibration Pattern Selector */}
                  <div className="pt-3 border-t border-[#232836] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-accent-primary" />
                        <div>
                          <span className="text-xs font-semibold text-white block leading-none">Vibration Pattern</span>
                          <span className="text-[11px] text-[#8c94a5]">Tactile rhythm for habit alarm</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('tap');
                          if (vibrationPattern === 'off') {
                            setVibrationPattern('default');
                            setVibrate(true);
                            previewVibrationPattern('default');
                          } else {
                            setVibrationPattern('off');
                            setVibrate(false);
                          }
                        }}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                          vibrationPattern !== 'off' ? 'bg-accent-primary' : 'bg-[#282f3f]'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                            vibrationPattern !== 'off' ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Pattern Choices Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {VIBRATION_PATTERN_OPTIONS.map((option) => {
                        const isSelected = vibrationPattern === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              triggerHaptic('selection');
                              setVibrationPattern(option.id);
                              setVibrate(option.id !== 'off');
                              if (option.id !== 'off') {
                                previewVibrationPattern(option.id);
                              }
                            }}
                            className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between cursor-pointer relative ${
                              isSelected
                                ? 'bg-accent-primary/15 border-accent-primary/50 text-white shadow-sm'
                                : 'bg-[#12151c] border-[#252b3a] text-[#8c94a5] hover:border-[#353d52] hover:text-[#c4cad4]'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs font-bold ${isSelected ? 'text-accent-primary' : 'text-white'}`}>
                                {option.name}
                              </span>
                              {isSelected && (
                                <div className="w-4 h-4 rounded-full bg-accent-primary text-black flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] text-[#7d8495] line-clamp-1 leading-tight">
                              {option.description}
                            </p>

                            {/* Test Vibe Button if active and not off */}
                            {isSelected && option.id !== 'off' && (
                              <div className="mt-2 pt-1 border-t border-accent-primary/20 flex items-center justify-between">
                                <span className="text-[9px] text-accent-primary font-medium">Active pattern</span>
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerHaptic('selection');
                                    previewVibrationPattern(option.id);
                                  }}
                                  className="text-[10px] font-bold text-accent-primary hover:underline"
                                >
                                  Feel vibe
                                </span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Snooze Settings */}
                  <div className="pt-2 border-t border-[#232836] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white">Allow Snooze</span>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('tap');
                          setSnoozeEnabled(!snoozeEnabled);
                        }}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                          snoozeEnabled ? 'bg-accent-primary' : 'bg-[#282f3f]'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                            snoozeEnabled ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    {snoozeEnabled && (
                      <div className="flex items-center gap-1.5 pt-1">
                        {SNOOZE_PRESETS.map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => {
                              triggerHaptic('tap');
                              setSnoozeMinutes(mins);
                              setIsCustomSnooze(false);
                            }}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              !isCustomSnooze && snoozeMinutes === mins
                                ? 'bg-accent-primary/20 border border-accent-primary/40 text-accent-primary'
                                : 'bg-[#12151c] border border-[#232836] text-[#8c94a5]'
                            }`}
                          >
                            {mins} min
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('tap');
                            setIsCustomSnooze(true);
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            isCustomSnooze
                              ? 'bg-accent-primary/20 border border-accent-primary/40 text-accent-primary'
                              : 'bg-[#12151c] border border-[#232836] text-[#8c94a5]'
                          }`}
                        >
                          Custom
                        </button>
                      </div>
                    )}

                    {snoozeEnabled && isCustomSnooze && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={snoozeMinutes}
                          onChange={(e) => setSnoozeMinutes(Math.max(1, Math.min(60, parseInt(e.target.value, 10) || 5)))}
                          className="w-20 bg-[#12151c] border border-[#2b3345] rounded-xl px-3 py-1.5 text-xs text-white text-center outline-none focus:border-accent-primary"
                        />
                        <span className="text-xs text-[#8c94a5]">minutes (1 - 60)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Toggle Switch */}
                <div className="flex items-center justify-between p-3 bg-[#181c25] border border-[#262c3b] rounded-2xl">
                  <span className="text-xs font-semibold text-white">Enable Alarm</span>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setEnabled(!enabled);
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      enabled ? 'bg-accent-primary' : 'bg-[#282f3f]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                        enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* Submit & Cancel Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  stopPreviewTone();
                  onClose();
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-[#181c25] hover:bg-[#202532] text-[#8c94a5] hover:text-white font-semibold text-sm transition-colors cursor-pointer border border-[#262c3b]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="flex-1 py-3 px-4 rounded-xl bg-accent-primary hover:bg-[#34c759] text-black font-extrabold text-sm transition-all disabled:opacity-40 cursor-pointer shadow-lg shadow-accent-primary/20"
              >
                {saving ? 'Saving...' : initialData ? 'Update Alarm' : 'Save Alarm'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
