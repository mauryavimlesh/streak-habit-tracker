import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  Plus,
  Bell,
  BellOff,
  BellRing,
  Clock,
  Calendar,
  Check,
  X,
  Trash2,
  Sparkles,
  AlertCircle,
  Edit2,
  CheckCircle2,
  Send,
  SunMedium,
  Moon,
  ListTodo,
  Flame,
} from 'lucide-react';
import {
  ReminderItem,
  ReminderRepeat,
  ReminderCategory,
  readLocalReminders,
  getUserReminders,
  saveLocalReminders,
  toggleReminder,
  createReminder,
  updateReminder,
  deleteReminder,
  requestNotificationPermission,
  sendSystemNotification,
} from '../../lib/reminderService';
import { readLocalHabits, getUserHabits, Habit } from '../../lib/habitService';
import { useAuth } from '../../lib/AuthContext';
import { triggerHaptic } from '../../lib/haptics';
import { DeveloperFooter } from '../../components/layout/DeveloperFooter';
import { cn } from '../../lib/utils';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const REPEAT_OPTIONS: { id: ReminderRepeat; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekdays', label: 'Weekdays (Mon-Fri)' },
  { id: 'weekends', label: 'Weekends (Sat-Sun)' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'once', label: 'Once' },
  { id: 'custom', label: 'Custom Days' },
];

const CATEGORY_CONFIG: Record<
  ReminderCategory,
  { label: string; icon: any; color: string; bg: string }
> = {
  habit: { label: 'Habit Cue', icon: Flame, color: 'text-accent-primary', bg: 'bg-accent-primary/15 border-accent-primary/30' },
  task: { label: 'Task Item', icon: ListTodo, color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30' },
  morning: { label: 'Morning Plan', icon: SunMedium, color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
  night: { label: 'Night Review', icon: Moon, color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/30' },
  general: { label: 'General', icon: Bell, color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' },
};

export default function Reminders() {
  const navigate = useNavigate();

  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderItem | null>(null);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [testSentToast, setTestSentToast] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [time, setTime] = useState('08:00 AM');
  const [date, setDate] = useState('');
  const [repeat, setRepeat] = useState<ReminderRepeat>('daily');
  const [category, setCategory] = useState<ReminderCategory>('habit');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [linkedHabitId, setLinkedHabitId] = useState('');
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [habits, setHabits] = useState<Habit[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    async function loadData() {
      setReminders(readLocalReminders());
      setHabits(readLocalHabits());
      if (user) {
        const [fetchedReminders, fetchedHabits] = await Promise.all([
          getUserReminders(user.uid),
          getUserHabits(user.uid)
        ]);
        setReminders(fetchedReminders);
        setHabits(fetchedHabits);
      }
    }
    loadData();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }
  }, [user]);

  const handleToggle = async (id: string) => {
    triggerHaptic('tap');
    const updated = await toggleReminder(id, user?.uid);
    setReminders(updated);
  };

  const handleDelete = async (id: string) => {
    triggerHaptic('light');
    const updated = await deleteReminder(id, user?.uid);
    setReminders(updated);
  };

  const handleOpenEdit = (rem: ReminderItem) => {
    triggerHaptic('tap');
    setEditingReminder(rem);
    setTitle(rem.title);
    setDescription(rem.description || '');
    setTime(rem.time);
    setDate(rem.date || '');
    setRepeat(rem.repeat || 'daily');
    setCategory(rem.category || 'habit');
    setSelectedDays(rem.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    setLinkedHabitId(rem.linkedHabitId || '');
    setNotificationEnabled(rem.notificationEnabled ?? true);
    setIsNewOpen(true);
  };

  const handleOpenCreate = () => {
    triggerHaptic('tap');
    setEditingReminder(null);
    setTitle('');
    setDescription('');
    setTime('08:00 AM');
    setDate('');
    setRepeat('daily');
    setCategory('habit');
    setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    setLinkedHabitId('');
    setNotificationEnabled(true);
    setIsNewOpen(true);
  };

  const handleRequestPermission = async () => {
    setShowPermissionPrompt(false);
    triggerHaptic('selection');
    const status = await requestNotificationPermission();
    setPermissionState(status);

    if (status === 'granted') {
      triggerHaptic('completion');
      await sendSystemNotification('STREAK Notifications Enabled', {
        body: 'You will receive timely habit cues and task alerts.',
      });
      setTestSentToast('Notifications enabled! Test notification sent.');
      setTimeout(() => setTestSentToast(null), 4000);
    } else if (status === 'denied') {
      setTestSentToast('Notifications blocked. Enable in your browser/device settings.');
      setTimeout(() => setTestSentToast(null), 5000);
    }
  };

  const handleSendTestNotification = async () => {
    triggerHaptic('selection');
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted') {
        setShowPermissionPrompt(true);
        return;
      }
    }

    const sent = await sendSystemNotification('STREAK Habit Cue', {
      body: 'Time to drink water and complete your morning workout! (Test Alert)',
    });

    if (sent) {
      triggerHaptic('completion');
      setTestSentToast('Test notification delivered to your device!');
    } else {
      setTestSentToast('Notification sent. If not visible, check browser focus & permissions.');
    }
    setTimeout(() => setTestSentToast(null), 4000);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    triggerHaptic('completion');

    const habitObj = habits.find((h) => h.id === linkedHabitId);

    // Compute effective days based on repeat pattern
    let effectiveDays = selectedDays;
    if (repeat === 'daily') {
      effectiveDays = DAYS_OF_WEEK;
    } else if (repeat === 'weekdays') {
      effectiveDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    } else if (repeat === 'weekends') {
      effectiveDays = ['Sat', 'Sun'];
    }

    if (editingReminder) {
      const updated = updateReminder(editingReminder.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        time,
        date: date || undefined,
        repeat,
        days: effectiveDays,
        category,
        linkedHabitId: linkedHabitId || undefined,
        linkedEntityName: habitObj ? habitObj.name : undefined,
        notificationEnabled,
      });
      setReminders(updated);
    } else {
      createReminder({
        title: title.trim(),
        description: description.trim() || undefined,
        time,
        date: date || undefined,
        repeat,
        days: effectiveDays,
        category,
        enabled: true,
        notificationEnabled,
        linkedHabitId: linkedHabitId || undefined,
        linkedEntityName: habitObj ? habitObj.name : undefined,
      });
      setReminders(readLocalReminders());
    }

    setIsNewOpen(false);
  };

  const toggleDay = (day: string) => {
    triggerHaptic('light');
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-white pb-24 select-none">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-white/10 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/more')}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Reminders</h1>
            <p className="text-xs text-[#7d8495]">Actionable cues for daily consistency</p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-3.5 py-1.5 rounded-full bg-accent-primary text-black font-semibold text-xs flex items-center gap-1.5 shadow-[0_2px_12px_rgba(140,238,40,0.3)] hover:bg-[#9eff38] active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>New Alert</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto w-full px-5 pt-4 space-y-4">
        {/* Toast Notification */}
        {testSentToast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 rounded-2xl bg-accent-primary/20 border border-accent-primary/40 text-accent-primary text-xs font-semibold flex items-center gap-2.5 shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{testSentToast}</span>
          </motion.div>
        )}

        {/* Permission Banner & Test Notification Action */}
        <div className="p-4 rounded-3xl bg-surface-card border border-white/10 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border',
                  permissionState === 'granted'
                    ? 'bg-accent-primary/15 border-accent-primary/30 text-accent-primary'
                    : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                )}
              >
                {permissionState === 'granted' ? (
                  <BellRing className="w-4 h-4" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">
                  {permissionState === 'granted'
                    ? 'Device Notifications Active'
                    : permissionState === 'denied'
                    ? 'Notifications Blocked'
                    : 'Enable Device Alerts'}
                </h4>
                <p className="text-[11px] text-[#7d8495]">
                  {permissionState === 'granted'
                    ? 'Alerts will chime on lock screen & watch'
                    : permissionState === 'denied'
                    ? 'Enable permissions in browser settings'
                    : 'Get prompted for habit cues & scheduled tasks'}
                </p>
              </div>
            </div>

            {permissionState !== 'granted' ? (
              <button
                onClick={() => setShowPermissionPrompt(true)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/10 transition-colors cursor-pointer shrink-0"
              >
                Enable
              </button>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-primary/15 text-accent-primary font-bold border border-accent-primary/30">
                Active
              </span>
            )}
          </div>

          {/* Test Notification Button */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <span className="text-[11px] text-[#7d8495]">Verify alerts on this device:</span>
            <button
              onClick={handleSendTestNotification}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
            >
              <Send className="w-3 h-3 text-accent-primary" />
              <span>Send test notification</span>
            </button>
          </div>
        </div>

        {/* Reminders List */}
        {reminders.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#7d8495]">
              <BellOff className="w-6 h-6 text-accent-primary" />
            </div>
            <h3 className="text-base font-semibold text-white">No reminders scheduled</h3>
            <p className="text-xs text-[#7d8495] max-w-xs mx-auto">
              Automate nudges for high-friction habits and critical tasks to maintain momentum.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-2 px-5 py-2.5 rounded-xl bg-accent-primary text-black font-semibold text-xs inline-flex items-center gap-2 hover:bg-[#9eff38] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create Alert</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((r) => {
              const catConfig = CATEGORY_CONFIG[r.category] || CATEGORY_CONFIG.general;
              const Icon = catConfig.icon;

              return (
                <div
                  key={r.id}
                  className={cn(
                    'p-4 rounded-3xl bg-surface-card border transition-all space-y-2.5',
                    r.enabled ? 'border-white/10' : 'border-white/5 opacity-60'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-all mt-0.5',
                          r.enabled ? catConfig.bg : 'bg-black/30 border-white/5 text-[#7d8495]'
                        )}
                      >
                        <Icon className={cn('w-4 h-4', r.enabled ? catConfig.color : 'text-[#7d8495]')} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white truncate">{r.title}</h4>
                          <span
                            className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase',
                              catConfig.bg,
                              catConfig.color
                            )}
                          >
                            {catConfig.label}
                          </span>
                        </div>

                        {r.description && (
                          <p className="text-xs text-[#7d8495] mt-0.5 line-clamp-1">{r.description}</p>
                        )}

                        <div className="flex items-center gap-2 text-xs text-[#7d8495] mt-1 flex-wrap">
                          <span className="font-semibold text-white/90 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-accent-primary" />
                            {r.time}
                          </span>
                          <span>•</span>
                          <span className="capitalize">{r.repeat}</span>
                          {r.repeat === 'custom' && (
                            <span className="text-[11px] text-[#5c6272]">({r.days.join(', ')})</span>
                          )}
                          {r.linkedEntityName && (
                            <>
                              <span>•</span>
                              <span className="text-accent-primary/80 text-[11px] truncate">
                                Linked: {r.linkedEntityName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Switch */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggle(r.id)}
                        className={cn(
                          'w-12 h-6 rounded-full transition-colors relative cursor-pointer',
                          r.enabled ? 'bg-accent-primary' : 'bg-white/10'
                        )}
                        aria-label="Toggle reminder"
                      >
                        <motion.div
                          animate={{ x: r.enabled ? 26 : 2 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className={cn(
                            'w-5 h-5 rounded-full top-0.5 absolute shadow-md',
                            r.enabled ? 'bg-black' : 'bg-white/60'
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Actions: Edit & Delete */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(r)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-white/70 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-[11px] font-semibold text-red-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DeveloperFooter />
      </main>

      {/* Permission Explainer Modal */}
      <AnimatePresence>
        {showPermissionPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPermissionPrompt(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-surface-card border border-white/10 rounded-3xl p-6 z-10 space-y-4 text-center shadow-2xl"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent-primary/15 border border-accent-primary/30 flex items-center justify-center text-accent-primary mx-auto">
                <Bell className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white tracking-tight">Enable Reminders</h3>
                <p className="text-xs text-[#7d8495] leading-relaxed">
                  STREAK needs notification access to remind you about your habits and tasks at your scheduled times.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="w-full py-3 rounded-2xl bg-accent-primary text-black font-bold text-xs tracking-wide hover:bg-[#9eff38] transition-colors cursor-pointer shadow-[0_2px_12px_rgba(140,238,40,0.3)]"
                >
                  Allow Notifications
                </button>
                <button
                  type="button"
                  onClick={() => setShowPermissionPrompt(false)}
                  className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Not Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create / Edit Reminder Modal */}
      <AnimatePresence>
        {isNewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-surface-card border border-white/10 rounded-3xl p-5 z-10 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-base font-bold text-white">
                  {editingReminder ? 'Edit Reminder' : 'Create Reminder'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsNewOpen(false)}
                  className="text-[#7d8495] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-3.5">
                {/* Title */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#7d8495] uppercase tracking-wider mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Morning Movement, Hydration Check"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-primary"
                  />
                </div>

                {/* Description / Optional Note */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#7d8495] uppercase tracking-wider mb-1">
                    Description / Note <span className="text-[#5c6272] lowercase font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Specific intention or cue"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-primary"
                  />
                </div>

                {/* Time & Category */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#7d8495] uppercase tracking-wider mb-1">
                      Time
                    </label>
                    <input
                      type="text"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      placeholder="e.g. 07:30 AM"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#7d8495] uppercase tracking-wider mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ReminderCategory)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-primary"
                    >
                      <option value="habit">Habit Cue</option>
                      <option value="task">Calendar Task</option>
                      <option value="morning">Morning Planning</option>
                      <option value="night">Night Review</option>
                      <option value="general">General Alert</option>
                    </select>
                  </div>
                </div>

                {/* Repeat Pattern */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#7d8495] uppercase tracking-wider mb-1">
                    Repeat Pattern
                  </label>
                  <select
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value as ReminderRepeat)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-primary"
                  >
                    {REPEAT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Days if 'custom' */}
                {repeat === 'custom' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#7d8495] uppercase tracking-wider mb-1.5">
                      Select Days
                    </label>
                    <div className="grid grid-cols-7 gap-1">
                      {DAYS_OF_WEEK.map((day) => {
                        const isSelected = selectedDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={cn(
                              'py-2 rounded-xl text-[11px] font-semibold border text-center transition-all cursor-pointer',
                              isSelected
                                ? 'bg-accent-primary border-accent-primary text-black'
                                : 'bg-black/30 border-white/5 text-[#7d8495] hover:text-white'
                            )}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Linked Habit */}
                {habits.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#7d8495] uppercase tracking-wider mb-1">
                      Linked Habit <span className="text-[#5c6272] lowercase font-normal">(optional)</span>
                    </label>
                    <select
                      value={linkedHabitId}
                      onChange={(e) => setLinkedHabitId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-primary"
                    >
                      <option value="">None (Independent Reminder)</option>
                      {habits.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} ({h.category})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-accent-primary text-black font-bold text-xs tracking-wide hover:bg-[#9eff38] transition-colors cursor-pointer shadow-[0_2px_12px_rgba(140,238,40,0.3)] mt-2"
                >
                  {editingReminder ? 'Update Reminder' : 'Save Reminder'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
