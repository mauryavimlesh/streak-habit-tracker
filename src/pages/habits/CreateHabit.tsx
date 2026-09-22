import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  ChevronLeft,
  Plus,
  Clock,
  Bell,
  BellRing,
  Volume2,
  Smartphone,
  Edit2,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import {
  createHabit,
  updateHabit,
  getUserHabits,
  HabitFrequency,
  TargetType,
} from '../../lib/habitService';
import {
  ReminderItem,
  readLocalReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  toggleReminder,
  formatTimeDisplay,
} from '../../lib/reminderService';
import { BUILT_IN_TONES } from '../../lib/alarmAudio';
import { HABIT_ICONS, HABIT_COLORS } from '../../lib/constants';
import { AlarmReminderModal } from '../../components/AlarmReminderModal';
import { triggerHaptic } from '../../lib/haptics';
import { cn } from '../../lib/utils';

export default function CreateHabit() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const editId = searchParams.get('edit');
  const [initialLoading, setInitialLoading] = useState(!!editId);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(HABIT_ICONS[0].id);
  const [selectedColor, setSelectedColor] = useState(HABIT_COLORS[0].id);

  const [frequencyType, setFrequencyType] = useState<HabitFrequency>('daily');
  const [scheduleDays, setScheduleDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const [targetType, setTargetType] = useState<TargetType>('binary');
  const [targetValue, setTargetValue] = useState(1);
  const [targetUnit, setTargetUnit] = useState('');
  const [minimumTarget, setMinimumTarget] = useState<number | ''>('');

  // Multiple Alarms / Reminders state
  const [habitReminders, setHabitReminders] = useState<ReminderItem[]>([]);
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderItem | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editId && user) {
      getUserHabits(user.uid).then((habits) => {
        const habit = habits.find((h) => h.id === editId);
        if (habit) {
          setName(habit.name || '');
          setDescription(habit.description || '');
          setSelectedIcon(habit.icon || 'star');
          setSelectedColor(habit.color || 'blue');
          setTargetType(habit.targetType || 'binary');
          setTargetValue(habit.targetValue || 1);
          setTargetUnit(habit.targetUnit || '');
          setMinimumTarget(habit.minimumTarget !== undefined ? habit.minimumTarget : (habit.targetValue || 1));
          setFrequencyType(habit.frequencyType || 'daily');
          if (habit.frequencyValue && habit.frequencyValue.length > 0) {
            setScheduleDays(habit.frequencyValue);
          }

          // Load linked reminders
          const allReminders = readLocalReminders();
          const linked = allReminders.filter((r) => r.linkedHabitId === editId);

          if (linked.length > 0) {
            setHabitReminders(linked);
          } else if (habit.reminderTime) {
            // Seed a reminder for legacy habits that only had reminderTime string
            const legacyTime = formatTimeDisplay(habit.reminderTime);
            const initialItem: ReminderItem = {
              id: 'temp_legacy_' + Date.now(),
              title: `${habit.name} Alarm`,
              time: legacyTime,
              repeat: 'daily',
              days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              enabled: true,
              notificationEnabled: true,
              category: 'habit',
              linkedHabitId: editId,
              linkedEntityName: habit.name,
              soundTone: 'streak-pulse',
              volume: 0.85,
              vibrate: true,
              snoozeEnabled: true,
              snoozeMinutes: 10,
              createdAt: new Date().toISOString(),
            };
            setHabitReminders([initialItem]);
          }
        }
        setInitialLoading(false);
      });
    }
  }, [editId, user]);

  const handleOpenNewAlarm = () => {
    triggerHaptic('tap');
    setEditingReminder(null);
    setIsAlarmModalOpen(true);
  };

  const handleOpenEditAlarm = (reminder: ReminderItem) => {
    triggerHaptic('tap');
    setEditingReminder(reminder);
    setIsAlarmModalOpen(true);
  };

  const handleToggleAlarm = async (reminderId: string) => {
    triggerHaptic('tap');
    if (editId) {
      const updated = await toggleReminder(reminderId, user?.uid);
      setHabitReminders(updated.filter((r) => r.linkedHabitId === editId));
    } else {
      setHabitReminders((prev) =>
        prev.map((r) => (r.id === reminderId ? { ...r, enabled: !r.enabled } : r))
      );
    }
  };

  const handleDeleteAlarm = async (reminderId: string) => {
    triggerHaptic('light');
    if (editId && !reminderId.startsWith('temp_')) {
      const updated = await deleteReminder(reminderId, user?.uid);
      setHabitReminders(updated.filter((r) => r.linkedHabitId === editId));
    } else {
      setHabitReminders((prev) => prev.filter((r) => r.id !== reminderId));
    }
  };

  const handleTestAlarm = (reminder: ReminderItem) => {
    triggerHaptic('selection');
    window.dispatchEvent(
      new CustomEvent('STREAK_TRIGGER_TEST_ALARM', { detail: reminder })
    );
  };

  const handleSaveAlarmModal = async (
    data: Omit<ReminderItem, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    if (editId) {
      if (existingId && !existingId.startsWith('temp_')) {
        const updated = await updateReminder(existingId, data, user?.uid);
        setHabitReminders(updated.filter((r) => r.linkedHabitId === editId));
      } else {
        const created = await createReminder(
          {
            ...data,
            linkedHabitId: editId,
            linkedEntityName: name.trim() || 'Habit',
          },
          user?.uid
        );
        setHabitReminders((prev) => [created, ...prev.filter((r) => r.id !== existingId)]);
      }
    } else {
      // In new habit mode, store in local state until habit is created
      if (existingId) {
        setHabitReminders((prev) =>
          prev.map((r) => (r.id === existingId ? { ...r, ...data } : r))
        );
      } else {
        const newTemp: ReminderItem = {
          ...data,
          id: 'temp_rem_' + Date.now(),
          linkedEntityName: name.trim() || 'Habit',
          createdAt: new Date().toISOString(),
        };
        setHabitReminders((prev) => [newTemp, ...prev]);
      }
    }
  };

  const handleSaveHabit = async () => {
    if (!name.trim()) {
      setError('Habit name is required.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      // Primary reminder time for legacy compatibility
      const primaryReminder = habitReminders.find((r) => r.enabled) || habitReminders[0];
      const primaryReminderTime = primaryReminder ? primaryReminder.time : '';

      const finalMinTarget = targetType === 'binary' ? 1 : (typeof minimumTarget === 'number' && minimumTarget > 0 ? minimumTarget : targetValue);
      const finalTargetVal = targetType === 'binary' ? 1 : Math.max(1, targetValue);
      const finalUnit = targetType === 'binary' ? 'times' : (targetUnit.trim() || 'times');

      if (editId) {
        await updateHabit(editId, {
          name: name.trim(),
          description: description.trim(),
          category: 'general',
          icon: selectedIcon,
          color: selectedColor,
          frequencyType,
          frequencyValue: scheduleDays,
          targetType,
          targetValue: finalTargetVal,
          targetUnit: finalUnit,
          minimumTarget: finalMinTarget,
          reminderTime: primaryReminderTime,
        });

        // Ensure all reminders have updated habit title and settings
        for (const rem of habitReminders) {
          if (rem.id.startsWith('temp_')) {
            await createReminder(
              {
                ...rem,
                linkedHabitId: editId,
                linkedEntityName: name.trim(),
              },
              user?.uid
            );
          } else {
            await updateReminder(
              rem.id,
              {
                title: rem.title,
                time: rem.time,
                repeat: rem.repeat,
                days: rem.days,
                enabled: rem.enabled,
                soundTone: rem.soundTone,
                customAudioId: rem.customAudioId,
                customAudioName: rem.customAudioName,
                volume: rem.volume,
                vibrate: rem.vibrate,
                vibrationPattern: rem.vibrationPattern,
                snoozeEnabled: rem.snoozeEnabled,
                snoozeMinutes: rem.snoozeMinutes,
                linkedEntityName: name.trim(),
              },
              user?.uid
            );
          }
        }
      } else {
        const newHabitId = await createHabit({
          userId: user?.uid || 'local',
          name: name.trim(),
          description: description.trim(),
          category: 'general',
          icon: selectedIcon,
          color: selectedColor,
          frequencyType,
          frequencyValue: scheduleDays,
          targetType,
          targetValue: finalTargetVal,
          targetUnit: finalUnit,
          minimumTarget: finalMinTarget,
          reminderTime: primaryReminderTime,
        });

        // Save all configured alarms linked to this newly created habit
        for (const rem of habitReminders) {
          await createReminder(
            {
              title: rem.title || `${name.trim()} Alarm`,
              description: rem.description,
              time: rem.time,
              repeat: rem.repeat,
              days: rem.days,
              date: rem.date,
              enabled: rem.enabled,
              notificationEnabled: rem.notificationEnabled ?? true,
              category: 'habit',
              linkedHabitId: newHabitId,
              linkedEntityName: name.trim(),
              soundTone: rem.soundTone,
              customAudioId: rem.customAudioId,
              customAudioName: rem.customAudioName,
              volume: rem.volume,
              vibrate: rem.vibrate,
              vibrationPattern: rem.vibrationPattern,
              snoozeEnabled: rem.snoozeEnabled,
              snoozeMinutes: rem.snoozeMinutes,
            },
            user?.uid
          );
        }
      }

      navigate(-1);
    } catch (err: any) {
      console.error('Failed to save habit:', err);
      setError(err?.message || 'Failed to save habit. Please check your inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  const getToneName = (rem: ReminderItem) => {
    if (rem.soundTone === 'custom') {
      return rem.customAudioName || 'Custom Device Tone';
    }
    const found = BUILT_IN_TONES.find((t) => t.id === rem.soundTone);
    return found ? found.name : 'STREAK Pulse';
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-t-2 border-accent-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-white">
      {/* Top Header */}
      <header className="flex items-center justify-between p-6 pb-4 sticky top-0 bg-background/90 backdrop-blur-xl z-10 border-b border-[#1f232c]">
        <button
          onClick={() => navigate(-1)}
          className="text-[#7d8495] hover:text-white transition-colors cursor-pointer text-sm font-medium"
        >
          Cancel
        </button>
        <h1 className="text-base font-semibold text-white">
          {editId ? 'Edit Habit' : 'New Habit'}
        </h1>
        <button
          onClick={handleSaveHabit}
          disabled={!name.trim() || loading}
          className="text-accent-primary font-bold text-sm disabled:opacity-40 transition-opacity cursor-pointer"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32 max-w-md mx-auto w-full">
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <Plus className="w-4 h-4 shrink-0 rotate-45 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#7d8495] uppercase tracking-wider mb-2 ml-1">
              Habit Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning Workout"
              className="w-full bg-surface-card border border-[#1f232c] rounded-2xl px-5 py-3.5 outline-none focus:border-accent-primary/50 transition-colors text-base text-white placeholder-[#7d8495]"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#7d8495] uppercase tracking-wider mb-2 ml-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why is this habit important to you?"
              className="w-full bg-surface-card border border-[#1f232c] rounded-2xl px-5 py-3.5 outline-none focus:border-accent-primary/50 transition-colors text-sm text-white placeholder-[#7d8495]"
            />
          </div>
        </div>

        {/* Visual Identity: Icon & Color */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#7d8495] uppercase tracking-wider mb-2 ml-1">
              Icon
            </label>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {HABIT_ICONS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = selectedIcon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setSelectedIcon(item.id);
                    }}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-accent-primary text-black scale-105 shadow-md shadow-accent-primary/20'
                        : 'bg-surface-card border border-[#1f232c] text-[#7d8495] hover:text-white'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#7d8495] uppercase tracking-wider mb-2 ml-1">
              Color Accent
            </label>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {HABIT_COLORS.map((item) => {
                const isSelected = selectedColor === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setSelectedColor(item.id);
                    }}
                    className={cn(
                      'w-10 h-10 rounded-full shrink-0 transition-transform cursor-pointer flex items-center justify-center border',
                      item.class,
                      isSelected ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-background' : ''
                    )}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Goal Type & Frequency */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#7d8495] uppercase tracking-wider mb-2 ml-1">
              Goal Tracking
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  setTargetType('binary');
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  targetType === 'binary'
                    ? 'bg-[#182415] border-accent-primary/50 text-white'
                    : 'bg-surface-card border-[#1f232c] text-[#7d8495]'
                }`}
              >
                <span className="block text-sm font-bold text-white mb-1">Yes / No</span>
                <span className="text-xs">Complete or incomplete</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  setTargetType('numeric');
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  targetType === 'numeric'
                    ? 'bg-[#182415] border-accent-primary/50 text-white'
                    : 'bg-surface-card border-[#1f232c] text-[#7d8495]'
                }`}
              >
                <span className="block text-sm font-bold text-white mb-1">Numeric Target</span>
                <span className="text-xs">Count, distance, time</span>
              </button>
            </div>

            {targetType === 'numeric' && (
              <div className="mt-3 space-y-3">
                <div className="flex gap-3">
                  <div className="w-1/2">
                    <label className="block text-[11px] font-semibold text-[#7d8495] mb-1.5 ml-1">
                      Target Value
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={targetValue}
                      onChange={(e) => setTargetValue(parseInt(e.target.value, 10) || 1)}
                      placeholder="Target (e.g. 30)"
                      className="w-full bg-surface-card border border-[#1f232c] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-accent-primary/50"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-[11px] font-semibold text-[#7d8495] mb-1.5 ml-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={targetUnit}
                      onChange={(e) => setTargetUnit(e.target.value)}
                      placeholder="e.g. min, hours, glasses"
                      className="w-full bg-surface-card border border-[#1f232c] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-accent-primary/50"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 ml-1">
                    <label className="text-[11px] font-semibold text-[#7d8495]">
                      Minimum Required Target
                    </label>
                    <span className="text-[10px] text-accent-primary">Streak Requirement</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={targetValue}
                    value={minimumTarget}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                      setMinimumTarget(val);
                    }}
                    placeholder={`Defaults to full target (${targetValue} ${targetUnit || 'units'})`}
                    className="w-full bg-surface-card border border-[#1f232c] rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-accent-primary/50"
                  />
                  <p className="text-[11px] text-[#7d8495] mt-1.5 ml-1 leading-relaxed">
                    A day counts toward your streak ONLY when this minimum requirement is met (e.g. at least 20 min of a 30 min workout).
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#7d8495] uppercase tracking-wider mb-2 ml-1">
              Repeat Frequency
            </label>
            <div className="flex rounded-2xl bg-surface-card border border-[#1f232c] p-1 mb-2">
              {[
                { id: 'daily', label: 'Daily' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' },
              ].map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setFrequencyType(type.id as HabitFrequency);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    frequencyType === type.id
                      ? 'bg-[#23381c] text-accent-primary border border-[#345228]'
                      : 'text-[#7d8495] hover:text-white'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {frequencyType === 'weekly' && (
              <div className="mt-2.5">
                <label className="block text-[11px] font-semibold text-[#7d8495] mb-2 ml-1">
                  Active Schedule Days
                </label>
                <div className="flex gap-1.5">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                    const isSelected = scheduleDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          triggerHaptic('tap');
                          setScheduleDays((prev) =>
                            isSelected ? prev.filter((d) => d !== day) : [...prev, day]
                          );
                        }}
                        className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#182415] border-accent-primary/60 text-accent-primary'
                            : 'bg-surface-card border-[#1f232c] text-[#7d8495] hover:text-white'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile-Style Alarms & Reminders Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between ml-1">
            <label className="text-xs font-semibold text-[#7d8495] uppercase tracking-wider">
              Habit Alarms & Reminders
            </label>
            <span className="text-[11px] text-[#7d8495]">
              {habitReminders.length === 0
                ? 'No alarms set'
                : `${habitReminders.length} alarm${habitReminders.length > 1 ? 's' : ''}`}
            </span>
          </div>

          {/* List of configured alarms */}
          {habitReminders.length > 0 && (
            <div className="space-y-2.5">
              {habitReminders.map((rem) => {
                const toneTitle = getToneName(rem);
                return (
                  <div
                    key={rem.id}
                    className={cn(
                      'p-4 rounded-2xl bg-surface-card border transition-all space-y-2.5',
                      rem.enabled ? 'border-[#262c3b]' : 'border-[#1b1f28] opacity-60'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-9 h-9 rounded-xl flex items-center justify-center border',
                            rem.enabled
                              ? 'bg-accent-primary/15 border-accent-primary/30 text-accent-primary'
                              : 'bg-white/5 border-white/10 text-[#7d8495]'
                          )}
                        >
                          <BellRing className="w-4 h-4" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-mono font-bold text-white">
                              {formatTimeDisplay(rem.time)}
                            </span>
                            <span className="text-[11px] text-[#7d8495] capitalize">
                              • {rem.repeat}
                            </span>
                          </div>

                          <div className="text-xs text-white/80 font-medium">
                            {rem.title}
                          </div>
                        </div>
                      </div>

                      {/* Active toggle switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleAlarm(rem.id)}
                        className={cn(
                          'w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0',
                          rem.enabled ? 'bg-accent-primary' : 'bg-white/10'
                        )}
                        aria-label="Toggle alarm"
                      >
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full top-0.5 absolute shadow transition-transform',
                            rem.enabled ? 'translate-x-5 bg-black' : 'translate-x-0.5 bg-white/60'
                          )}
                        />
                      </button>
                    </div>

                    {/* Sound tone & settings tags */}
                    <div className="flex items-center gap-2 flex-wrap text-[11px] pt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#13161d] border border-[#232836] text-[#9ba3b5]">
                        <Volume2 className="w-3 h-3 text-accent-primary" />
                        <span className="truncate max-w-[130px]">{toneTitle}</span>
                      </span>

                      {rem.vibrate && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#13161d] border border-[#232836] text-[#9ba3b5]">
                          <Smartphone className="w-3 h-3 text-accent-primary" />
                          <span>Vibrate</span>
                        </span>
                      )}

                      {rem.snoozeEnabled && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#13161d] border border-[#232836] text-[#9ba3b5]">
                          <RotateCcw className="w-3 h-3 text-[#7d8495]" />
                          <span>{rem.snoozeMinutes || 10}m snooze</span>
                        </span>
                      )}
                    </div>

                    {/* Actions: Test, Edit, Delete */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleTestAlarm(rem)}
                        className="text-[11px] font-semibold text-accent-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <BellRing className="w-3 h-3" />
                        <span>Test Alarm</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditAlarm(rem)}
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-white/80 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAlarm(rem.id)}
                          className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-[11px] font-semibold text-red-400 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Alarm Button */}
          <button
            type="button"
            onClick={handleOpenNewAlarm}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#161a22] hover:bg-[#1f2532] border border-dashed border-[#2d3444] hover:border-accent-primary/60 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer mb-6"
          >
            <Plus className="w-4 h-4 text-accent-primary" />
            <span>Add Alarm / Reminder</span>
          </button>

          {/* Bottom Save Button for Mobile Accessibility */}
          <div className="pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={handleSaveHabit}
              disabled={loading}
              className="w-full py-4 px-4 rounded-2xl bg-accent-primary hover:bg-[#9eff38] text-background font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(140,238,40,0.3)] active:scale-[0.985] transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Saving Habit...' : editId ? 'Update Habit' : 'Create Habit'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reusable Alarm & Tone Modal */}
      <AlarmReminderModal
        isOpen={isAlarmModalOpen}
        onClose={() => setIsAlarmModalOpen(false)}
        onSave={handleSaveAlarmModal}
        initialData={editingReminder}
        habitContext={name.trim() ? { id: editId || 'new', name: name.trim() } : undefined}
      />
    </div>
  );
}
