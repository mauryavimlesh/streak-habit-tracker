import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  Plus,
  Bell,
  BellOff,
  BellRing,
  Clock,
  Trash2,
  Edit2,
  CheckCircle2,
  Send,
  SunMedium,
  Moon,
  ListTodo,
  Flame,
  Volume2,
  Smartphone,
  Play,
  RotateCcw,
  Timer,
  XCircle,
} from 'lucide-react';
import {
  ReminderItem,
  ReminderCategory,
  readLocalReminders,
  getUserReminders,
  toggleReminder,
  createReminder,
  updateReminder,
  deleteReminder,
  requestNotificationPermission,
  sendSystemNotification,
  formatTimeDisplay,
} from '../../lib/reminderService';
import { reconcileAlarmsState } from '../../lib/alarmService';
import { readLocalHabits, getUserHabits, Habit } from '../../lib/habitService';
import { BUILT_IN_TONES } from '../../lib/alarmAudio';
import { useAuth } from '../../lib/AuthContext';
import { triggerHaptic } from '../../lib/haptics';
import { DeveloperFooter } from '../../components/layout/DeveloperFooter';
import { AlarmReminderModal } from '../../components/AlarmReminderModal';
import { cn } from '../../lib/utils';

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
  const { user } = useAuth();

  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<ReminderItem | null>(null);

  // 5-second simulated alarm test state
  const [testCountdown, setTestCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    async function loadData() {
      setReminders(readLocalReminders());
      setHabits(readLocalHabits());
      if (user) {
        const [fetchedReminders, fetchedHabits] = await Promise.all([
          getUserReminders(user.uid),
          getUserHabits(user.uid),
        ]);
        setReminders(fetchedReminders);
        setHabits(fetchedHabits);
      }
      reconcileAlarmsState();
    }
    loadData();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }

    const handleSync = () => {
      loadData();
    };

    window.addEventListener('streak_sleep_updated', handleSync);
    window.addEventListener('streak_reminders_updated', handleSync);
    return () => {
      window.removeEventListener('streak_sleep_updated', handleSync);
      window.removeEventListener('streak_reminders_updated', handleSync);
    };
  }, [user]);

  const handleToggle = async (id: string) => {
    triggerHaptic('tap');
    try {
      const updated = await toggleReminder(id, user?.uid);
      setReminders(updated);
    } catch (err: any) {
      console.error('Failed to toggle reminder:', err);
      setReminders(readLocalReminders());
      setToastMessage('Failed to update alarm status.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    triggerHaptic('light');
    try {
      const updated = await deleteReminder(id, user?.uid);
      setReminders(updated);
      setToastMessage('Alarm removed.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to delete reminder:', err);
      setReminders(readLocalReminders());
      setToastMessage('Failed to delete alarm.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleOpenCreate = () => {
    triggerHaptic('tap');
    setModalInitialData(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rem: ReminderItem) => {
    triggerHaptic('tap');
    setModalInitialData(rem);
    setIsModalOpen(true);
  };

  const handleModalSave = async (
    payload: Omit<ReminderItem, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    try {
      if (existingId) {
        const updated = await updateReminder(existingId, payload, user?.uid);
        setReminders(updated);
        setToastMessage('Alarm updated successfully.');
      } else {
        await createReminder(payload, user?.uid);
        const refreshed = readLocalReminders();
        setReminders(refreshed);
        setToastMessage('New alarm scheduled.');
      }
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to save reminder in Reminders page:', err);
      throw err;
    }
  };

  const handleTestAlarm = (reminder: ReminderItem) => {
    triggerHaptic('selection');
    window.dispatchEvent(
      new CustomEvent('STREAK_TRIGGER_TEST_ALARM', { detail: reminder })
    );
  };

  const handleRequestPermission = async () => {
    setShowPermissionPrompt(false);
    triggerHaptic('selection');
    const status = await requestNotificationPermission();
    setPermissionState(status);

    if (status === 'granted') {
      triggerHaptic('completion');
      await sendSystemNotification('STREAK Notifications Enabled', {
        body: 'You will receive timely habit cues and alarm alerts.',
      });
      setToastMessage('Notifications enabled! Test notification sent.');
    } else if (status === 'denied') {
      setToastMessage('Notifications blocked in browser/device settings.');
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleTrigger5sAlarmSimulation = async () => {
    triggerHaptic('selection');

    // Verify / request permission if not yet decided
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const res = await requestNotificationPermission();
        setPermissionState(res);
      }
    }

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    let seconds = 5;
    setTestCountdown(5);
    setToastMessage('Test Alarm scheduled: Ringing in 5 seconds...');

    countdownTimerRef.current = setInterval(() => {
      seconds -= 1;
      if (seconds > 0) {
        setTestCountdown(seconds);
        triggerHaptic('tap');
      } else {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setTestCountdown(null);

        // 1. Send simulated device push notification
        sendSystemNotification('⏰ STREAK Alarm: Habit Cue (5s Test)', {
          body: '5-second test alarm fired! Audio playback, vibration pattern, and full-screen alarm active.',
          tag: 'streak-alarm-simulation-test',
        });

        // 2. Dispatch simulated alarm event to trigger HabitNotificationEngine
        const testAlarm: ReminderItem = {
          id: 'test_alarm_sim_' + Date.now(),
          title: 'Daily Mindfulness & Hydration',
          description: '5-second test alarm. Long-press Dismiss to cancel or try Smart Snooze.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          repeat: 'daily',
          days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          enabled: true,
          notificationEnabled: true,
          category: 'habit',
          linkedEntityName: 'Daily Habit Routine',
          soundTone: 'streak-pulse',
          volume: 0.85,
          vibrate: true,
          vibrationPattern: 'default',
          snoozeEnabled: true,
          snoozeMinutes: 10,
          createdAt: new Date().toISOString(),
        };

        window.dispatchEvent(new CustomEvent('STREAK_TRIGGER_TEST_ALARM', { detail: testAlarm }));
        triggerHaptic('completion');
        setToastMessage('Simulated alarm triggered! Testing sound playback, vibration, and display.');
        setTimeout(() => setToastMessage(null), 5000);
      }
    }, 1000);
  };

  const handleCancel5sAlarmSimulation = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setTestCountdown(null);
    triggerHaptic('light');
    setToastMessage('Alarm test simulation cancelled.');
    setTimeout(() => setToastMessage(null), 2500);
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
      setToastMessage('Test notification delivered to your device!');
    } else {
      setToastMessage('Notification sent. Check device focus & permissions.');
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  const getToneName = (rem: ReminderItem) => {
    if (rem.soundTone === 'custom') {
      return rem.customAudioName || 'Custom Device Tone';
    }
    const found = BUILT_IN_TONES.find((t) => t.id === rem.soundTone);
    return found ? found.name : 'STREAK Pulse';
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-white pb-24">
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
            <h1 className="text-lg font-bold text-white tracking-tight">Reminders & Alarms</h1>
            <p className="text-xs text-[#7d8495]">Actionable cues & mobile-style alarms</p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-3.5 py-1.5 rounded-full bg-accent-primary text-black font-semibold text-xs flex items-center gap-1.5 shadow-[0_2px_12px_rgba(140,238,40,0.3)] hover:bg-[#9eff38] active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>New Alarm</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto w-full px-5 pt-4 space-y-4">
        {/* Toast Notification */}
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 rounded-2xl bg-accent-primary/20 border border-accent-primary/40 text-accent-primary text-xs font-semibold flex items-center gap-2.5 shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}

        {/* Permission Banner & Notification Status */}
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
                    ? 'Audio & alarms will trigger at scheduled times'
                    : permissionState === 'denied'
                    ? 'Enable permissions in browser settings'
                    : 'Receive habit cues and timely alarm prompts'}
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

          {/* Test System & Alarm Notification Verification */}
          <div className="pt-3 border-t border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">Alarm & Audio Verification</span>
                <span className="text-[11px] text-[#7d8495]">Verify permissions, audio playback & trigger screen</span>
              </div>
            </div>

            {testCountdown !== null ? (
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-black flex items-center justify-center font-bold text-xs shrink-0">
                    {testCountdown}s
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-amber-300">Simulating Alarm...</p>
                    <p className="text-[10px] text-amber-200/80 truncate">Triggering sound, vibration & screen in {testCountdown}s</p>
                  </div>
                </div>
                <button
                  onClick={handleCancel5sAlarmSimulation}
                  className="px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 text-xs font-semibold text-white border border-white/10 flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  id="test-notification-button"
                  onClick={handleTrigger5sAlarmSimulation}
                  className="flex-1 py-2 px-3.5 rounded-xl bg-accent-primary text-black text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#9eff38] active:scale-95 transition-all shadow-[0_2px_10px_rgba(140,238,40,0.25)] cursor-pointer"
                >
                  <Timer className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Test Notification (5s Alarm)</span>
                </button>

                <button
                  onClick={handleSendTestNotification}
                  title="Send immediate standard system push alert"
                  className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium flex items-center justify-center gap-1.5 border border-white/10 transition-colors cursor-pointer shrink-0"
                >
                  <Send className="w-3 h-3 text-accent-primary" />
                  <span>Instant Push</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Reminders List */}
        {reminders.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#7d8495]">
              <BellOff className="w-6 h-6 text-accent-primary" />
            </div>
            <h3 className="text-base font-semibold text-white">No alarms scheduled</h3>
            <p className="text-xs text-[#7d8495] max-w-xs mx-auto">
              Automate audio alarms and timely prompts for habits and critical tasks.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-2 px-5 py-2.5 rounded-xl bg-accent-primary text-black font-semibold text-xs inline-flex items-center gap-2 hover:bg-[#9eff38] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create Alarm</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((r) => {
              const catConfig = CATEGORY_CONFIG[r.category] || CATEGORY_CONFIG.general;
              const Icon = catConfig.icon;
              const toneTitle = getToneName(r);

              return (
                <div
                  key={r.id}
                  className={cn(
                    'p-4 rounded-3xl bg-surface-card border transition-all space-y-3',
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

                        <div className="flex items-center gap-2 text-xs text-[#7d8495] mt-1.5 flex-wrap">
                          <span className="font-mono font-bold text-white flex items-center gap-1">
                            <Clock className="w-3 h-3 text-accent-primary" />
                            {formatTimeDisplay(r.time)}
                          </span>
                          <span>•</span>
                          <span className="capitalize">{r.repeat}</span>
                          {(r.repeat === 'custom' || r.repeat === 'weekly') && r.days && (
                            <span className="text-[11px] text-[#5c6272]">({r.days.join(', ')})</span>
                          )}
                          {r.linkedEntityName && (
                            <>
                              <span>•</span>
                              <span className="text-accent-primary/80 text-[11px] truncate">
                                Habit: {r.linkedEntityName}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Tone and Settings Badges */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px]">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#161a23] border border-[#232836] text-[#9ba3b5]">
                            <Volume2 className="w-3 h-3 text-accent-primary" />
                            <span className="truncate max-w-[120px]">{toneTitle}</span>
                          </span>

                          {r.vibrate && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#161a23] border border-[#232836] text-[#9ba3b5]">
                              <Smartphone className="w-3 h-3 text-accent-primary" />
                              <span>
                                {r.vibrationPattern === 'double-pulse'
                                  ? 'Double Pulse'
                                  : r.vibrationPattern === 'long-persistent'
                                  ? 'Long Alert'
                                  : r.vibrationPattern === 'off'
                                  ? 'Silent'
                                  : 'Vibrate'}
                              </span>
                            </span>
                          )}

                          {r.snoozeEnabled && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#161a23] border border-[#232836] text-[#9ba3b5]">
                              <RotateCcw className="w-3 h-3 text-[#7d8495]" />
                              <span>{r.snoozeMinutes || 10}m snooze</span>
                            </span>
                          )}

                          {r.snoozeUntil && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 font-semibold">
                              <span>Snoozed</span>
                            </span>
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

                  {/* Bottom Actions: Test Alarm, Edit, Delete */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTestAlarm(r)}
                      className="px-2.5 py-1 rounded-lg bg-accent-primary/10 hover:bg-accent-primary/20 text-[11px] font-semibold text-accent-primary transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <BellRing className="w-3 h-3" />
                      <span>Test Alarm</span>
                    </button>

                    <div className="flex items-center gap-1.5">
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
                </div>
              );
            })}
          </div>
        )}

        <DeveloperFooter />
      </main>

      {/* Alarm / Reminder Editor Modal */}
      <AlarmReminderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleModalSave}
        initialData={modalInitialData}
      />

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
                <h3 className="text-base font-bold text-white tracking-tight">Enable Reminders & Alarms</h3>
                <p className="text-xs text-[#7d8495] leading-relaxed">
                  STREAK requires notification access to ring alarms and prompt your habit routines at scheduled times.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="w-full py-3 rounded-xl bg-accent-primary text-black font-bold text-xs uppercase tracking-wider hover:bg-[#9eff38] cursor-pointer"
                >
                  Allow Notifications
                </button>
                <button
                  type="button"
                  onClick={() => setShowPermissionPrompt(false)}
                  className="w-full py-2.5 rounded-xl bg-white/5 text-white/60 hover:text-white font-medium text-xs cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
