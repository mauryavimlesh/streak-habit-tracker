import { db } from './firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { readLocalHabits, saveLocalHabits, Habit, HabitLog, logHabit, updateHabit, readLocalLogs, saveLocalLogs } from './habitService';
import { readLocalReminders, saveLocalReminders, ReminderItem } from './reminderService';

export interface SleepSettings {
  enabled: boolean;
  bedtime: string; // "HH:mm" 24h e.g. "23:00"
  wakeTime: string; // "HH:mm" 24h e.g. "07:00"
  targetDuration: number; // in hours, e.g. 8
  repeatDays: string[]; // ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  bedtimeReminderEnabled: boolean;
  bedtimeReminderTime: string; // "HH:mm" 24h e.g. "22:30"
  wakeReminderEnabled: boolean;
  wakeReminderTime: string; // "HH:mm" 24h e.g. "07:00"
  windDownMinutes: number; // e.g. 15, 30
}

export interface SleepRecord {
  id: string;
  userId?: string;
  date: string; // YYYY-MM-DD
  targetBedtime: string;
  targetWakeTime: string;
  targetDuration: number; // hours
  actualBedtime: string;
  actualWakeTime: string;
  actualDuration: number; // hours
  status: 'achieved' | 'under' | 'over';
  quality: 'Great' | 'Good' | 'Fair' | 'Poor';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SleepAnalysisData {
  hasEnoughData: boolean;
  totalDaysTracked: number;
  averageSleepDuration: number; // in hours
  targetSleepDuration: number; // in hours
  currentSleepStreak: number;
  longestSleepStreak: number;
  daysTargetAchieved: number;
  daysBelowTarget: number;
  daysAboveTarget: number;
  sleepConsistencyPercent: number;
  bestSleepDay: { date: string; duration: number } | null;
  lowestSleepDay: { date: string; duration: number } | null;
  weeklySleep: Array<{ day: string; date: string; actualDuration: number; targetDuration: number; status: string }>;
  monthlySleep: Array<{ date: string; dayNumber: number; actualDuration: number; targetDuration: number; achieved: boolean }>;
}

const LOCAL_SLEEP_SETTINGS_KEY = 'streak_sleep_settings_v2';
const LOCAL_SLEEP_RECORDS_KEY = 'streak_sleep_records_v2';

export const DEFAULT_SLEEP_SETTINGS: SleepSettings = {
  enabled: true,
  bedtime: '23:00',
  wakeTime: '07:00',
  targetDuration: 8,
  repeatDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  bedtimeReminderEnabled: true,
  bedtimeReminderTime: '22:30',
  wakeReminderEnabled: true,
  wakeReminderTime: '07:00',
  windDownMinutes: 30,
};

// --- Time Parsing & Midnight Calculation Helpers ---

export function parseTimeTo24(timeStr: string): [number, number] {
  if (!timeStr) return [23, 0];
  const cleaned = timeStr.trim();
  // Check if contains AM/PM
  if (/am|pm/i.test(cleaned)) {
    const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const meridian = match[3].toUpperCase();
      if (meridian === 'PM' && h < 12) h += 12;
      if (meridian === 'AM' && h === 12) h = 0;
      return [h, m];
    }
  }

  const parts = cleaned.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  return [isNaN(h) ? 0 : Math.min(23, Math.max(0, h)), isNaN(m) ? 0 : Math.min(59, Math.max(0, m))];
}

export function format24To12(timeStr: string): string {
  const [h, m] = parseTimeTo24(timeStr);
  const meridian = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = String(m).padStart(2, '0');
  return `${displayH}:${displayM} ${meridian}`;
}

export function formatMinutesToTime24(totalMinutes: number): string {
  let norm = totalMinutes % (24 * 60);
  if (norm < 0) norm += 24 * 60;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Accurately calculates duration between bedtime and wake-up time,
 * fully supporting cross-midnight times (e.g. 11:00 PM to 07:00 AM = 8 hours).
 */
export function calculateSleepDuration(
  bedtime: string,
  wakeTime: string
): { hours: number; minutes: number; totalHours: number; formatted: string } {
  if (!bedtime || !wakeTime) {
    return { hours: 8, minutes: 0, totalHours: 8, formatted: '8h 00m' };
  }

  const [bH, bM] = parseTimeTo24(bedtime);
  const [wH, wM] = parseTimeTo24(wakeTime);
  const bedTotal = bH * 60 + bM;
  const wakeTotal = wH * 60 + wM;

  let diff = wakeTotal - bedTotal;
  if (diff <= 0) {
    // Crosses midnight (e.g. 23:00 to 07:00: 420 - 1380 = -960 + 1440 = 480 min = 8h)
    diff += 24 * 60;
  }

  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  const totalHours = Math.round((diff / 60) * 10) / 10;
  const formatted = `${hours}h ${minutes > 0 ? `${minutes}m` : '00m'}`;

  return { hours, minutes, totalHours, formatted };
}

export function calculateSleepDifference(
  actualHours: number,
  targetHours: number
): { diffHours: number; diffMinutes: number; formatted: string; status: 'achieved' | 'under' | 'over' } {
  const diffMinutes = Math.round((actualHours - targetHours) * 60);
  const diffHours = Math.round((actualHours - targetHours) * 10) / 10;
  const absMinutes = Math.abs(diffMinutes);
  const absH = Math.floor(absMinutes / 60);
  const absM = absMinutes % 60;

  let formatted = '';
  if (absMinutes === 0) {
    formatted = 'Exact target';
  } else {
    const sign = diffMinutes > 0 ? '+' : '-';
    formatted = absH > 0 ? `${sign}${absH}h ${absM > 0 ? `${absM}m` : ''}`.trim() : `${sign}${absM}m`;
  }

  let status: 'achieved' | 'under' | 'over' = 'achieved';
  if (diffMinutes < -15) {
    status = 'under';
  } else if (diffMinutes > 45) {
    status = 'over';
  }

  return { diffHours, diffMinutes, formatted, status };
}

// --- Sleep Settings Persistence ---

export function readLocalSleepSettings(): SleepSettings {
  try {
    const raw = localStorage.getItem(LOCAL_SLEEP_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SLEEP_SETTINGS, ...parsed };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SLEEP_SETTINGS };
}

export function saveLocalSleepSettings(settings: SleepSettings): void {
  try {
    localStorage.setItem(LOCAL_SLEEP_SETTINGS_KEY, JSON.stringify(settings));
    // Broadcast event for immediate real-time sync across components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('streak_sleep_updated', { detail: settings }));
    }
  } catch {
    // ignore
  }
}

export async function getSleepSettings(userId?: string): Promise<SleepSettings> {
  const local = readLocalSleepSettings();
  if (!userId || userId === 'local' || userId === 'default') {
    return local;
  }

  try {
    const docRef = doc(db, 'users', userId, 'settings', 'sleep');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const remote = snap.data() as SleepSettings;
      const merged = { ...DEFAULT_SLEEP_SETTINGS, ...remote };
      saveLocalSleepSettings(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Failed to fetch sleep settings from Firestore:', err);
  }
  return local;
}

/**
 * Updates sleep settings everywhere:
 * 1. Local storage & in-memory cache
 * 2. Firestore user settings
 * 3. Sleep habit in habitService (bedtime, wake-up, duration)
 * 4. Reminders in reminderService (bedtime & wake-up reminders)
 * 5. Broadcasts event for instant UI re-render
 */
export async function updateSleepSettings(
  updates: Partial<SleepSettings>,
  userId?: string
): Promise<SleepSettings> {
  console.log('[SleepService] --- updateSleepSettings START ---');
  console.log('[SleepService] Payload:', updates);
  console.log('[SleepService] userId:', userId);

  let docRef: any = null;
  if (userId && userId !== 'local' && userId !== 'default') {
    docRef = doc(db, 'users', userId, 'settings', 'sleep');
    try {
      const snapBefore = await getDoc(docRef);
      console.log('[SleepService] DB Record BEFORE update:', snapBefore.exists() ? snapBefore.data() : '(Not found)');
    } catch (err) {
      console.error('[SleepService] API Error fetching DB Record BEFORE update:', err);
    }
  }

  const current = readLocalSleepSettings();
  let updated: SleepSettings = {
    ...current,
    ...updates,
  };

  try {
    // Recalculate target duration if bedtime or wakeTime changed and target not manually specified
    if (updates.bedtime || updates.wakeTime) {
      if (!updates.targetDuration) {
        const calc = calculateSleepDuration(updated.bedtime, updated.wakeTime);
        updated.targetDuration = calc.totalHours;
      }
      // Update bedtime reminder time based on wind-down buffer if needed
      if (!updates.bedtimeReminderTime) {
        const [bH, bM] = parseTimeTo24(updated.bedtime);
        const bedMin = bH * 60 + bM;
        updated.bedtimeReminderTime = formatMinutesToTime24(bedMin - (updated.windDownMinutes || 30));
      }
    }
  } catch (err) {
    console.error('[SleepService] State transition error during calculation:', err);
  }

  try {
    saveLocalSleepSettings(updated);
    console.log('[SleepService] Local state transition saved:', updated);
  } catch (err) {
    console.error('[SleepService] Local state transition error during save:', err);
  }

  // 1. Sync to Firestore
  if (docRef) {
    try {
      console.log(`[SleepService] Syncing to Firestore API with payload:`, updated);
      await setDoc(docRef, { ...updated, updatedAt: serverTimestamp() }, { merge: true });
      console.log('[SleepService] Successfully merged to Firestore API.');
      
      const snapAfter = await getDoc(docRef);
      console.log('[SleepService] DB Record AFTER update:', snapAfter.exists() ? snapAfter.data() : '(Not found)');
    } catch (err) {
      console.error('[SleepService] API Error syncing sleep settings to Firestore:', err);
    }
  } else {
    console.log(`[SleepService] Skipping Firestore API sync because userId is invalid or local: ${userId}`);
  }

  // 2. Synchronize with Sleep Habit in habitService
  try {
    const habits = readLocalHabits();
    const sleepHabit = habits.find((h) => h.name.toLowerCase().includes('sleep') || h.icon === 'moon');
    if (sleepHabit && sleepHabit.id) {
      await updateHabit(sleepHabit.id, {
        sleepBedtime: updated.bedtime,
        sleepWakeTime: updated.wakeTime,
        targetValue: updated.targetDuration,
        reminderTime: updated.bedtimeReminderTime,
      });
    } else {
      // If default habits haven't been saved yet, seed them and update
      const seeded = habits.map((h) =>
        h.name.toLowerCase().includes('sleep')
          ? {
              ...h,
              sleepBedtime: updated.bedtime,
              sleepWakeTime: updated.wakeTime,
              targetValue: updated.targetDuration,
              reminderTime: updated.bedtimeReminderTime,
            }
          : h
      );
      saveLocalHabits(seeded);
    }
  } catch (err) {
    console.warn('Failed to sync sleep settings with habitService:', err);
  }

  // 3. Synchronize with Reminder system (bedtime reminder & wake-up reminder)
  try {
    await syncSleepReminders(updated, userId);
  } catch (err) {
    console.warn('Failed to sync sleep reminders:', err);
  }

  return updated;
}

/**
 * Synchronizes Bedtime and Wake-up reminders with the latest sleep schedule.
 * Modifies existing reminders or adds them so no stale reminders linger.
 */
export async function syncSleepReminders(settings: SleepSettings, userId?: string): Promise<void> {
  const reminders = readLocalReminders();
  const formattedBedtime = format24To12(settings.bedtimeReminderTime || settings.bedtime);
  const formattedWakeTime = format24To12(settings.wakeReminderTime || settings.wakeTime);

  let bedtimeRem = reminders.find(
    (r) =>
      r.title.toLowerCase().includes('wind down') ||
      r.title.toLowerCase().includes('bedtime') ||
      r.linkedEntityName?.toLowerCase().includes('sleep')
  );

  let wakeRem = reminders.find(
    (r) =>
      r.title.toLowerCase().includes('wake up') ||
      r.title.toLowerCase().includes('morning alarm') ||
      r.title.toLowerCase().includes('rise and shine')
  );

  const updatedList = [...reminders];

  if (bedtimeRem) {
    bedtimeRem.time = formattedBedtime;
    bedtimeRem.enabled = settings.bedtimeReminderEnabled;
    bedtimeRem.days = settings.repeatDays;
    bedtimeRem.repeat = settings.repeatDays.length === 7 ? 'daily' : 'custom';
  } else if (settings.bedtimeReminderEnabled) {
    const newBedRem: ReminderItem = {
      id: 'rem-sleep-bedtime-' + Date.now(),
      userId,
      title: 'Wind Down & Sleep Prep',
      description: 'Prepare for restful recovery',
      time: formattedBedtime,
      repeat: 'daily',
      days: settings.repeatDays,
      enabled: settings.bedtimeReminderEnabled,
      notificationEnabled: true,
      category: 'night',
      linkedEntityName: 'Sleep',
      createdAt: new Date().toISOString(),
    };
    updatedList.push(newBedRem);
  }

  if (wakeRem) {
    wakeRem.time = formattedWakeTime;
    wakeRem.enabled = settings.wakeReminderEnabled;
    wakeRem.days = settings.repeatDays;
    wakeRem.repeat = settings.repeatDays.length === 7 ? 'daily' : 'custom';
  } else if (settings.wakeReminderEnabled) {
    const newWakeRem: ReminderItem = {
      id: 'rem-sleep-wake-' + Date.now(),
      userId,
      title: 'Wake Up & Morning Momentum',
      description: 'Rise and begin your peak daily focus',
      time: formattedWakeTime,
      repeat: 'daily',
      days: settings.repeatDays,
      enabled: settings.wakeReminderEnabled,
      notificationEnabled: true,
      category: 'morning',
      linkedEntityName: 'Sleep',
      createdAt: new Date().toISOString(),
    };
    updatedList.push(newWakeRem);
  }

  saveLocalReminders(updatedList);
}

// --- Sleep Records Persistence & CRUD ---

export function readLocalSleepRecords(): SleepRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_SLEEP_RECORDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => b.date.localeCompare(a.date));
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveLocalSleepRecords(records: SleepRecord[]): void {
  try {
    localStorage.setItem(LOCAL_SLEEP_RECORDS_KEY, JSON.stringify(records));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('streak_sleep_records_updated', { detail: records }));
    }
  } catch {
    // ignore
  }
}

export async function getSleepRecords(userId?: string): Promise<SleepRecord[]> {
  const local = readLocalSleepRecords();
  if (!userId || userId === 'local' || userId === 'default') {
    return local;
  }

  try {
    const q = query(
      collection(db, 'users', userId, 'sleep_records'),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    const remote: SleepRecord[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SleepRecord));
    if (remote.length > 0) {
      saveLocalSleepRecords(remote);
      return remote;
    }
  } catch (err) {
    console.warn('Failed to fetch sleep records from Firestore:', err);
  }
  return local;
}

export async function getSleepRecordForDate(
  date: string,
  userId?: string
): Promise<SleepRecord | null> {
  const records = await getSleepRecords(userId);
  return records.find((r) => r.date === date) || null;
}

export async function saveSleepRecord(
  recordData: Omit<SleepRecord, 'id' | 'createdAt' | 'updatedAt'>,
  userId?: string
): Promise<SleepRecord> {
  const records = readLocalSleepRecords();
  const existingIndex = records.findIndex((r) => r.date === recordData.date);

  const id = existingIndex !== -1 ? records[existingIndex].id : 'sleep_rec_' + recordData.date + '_' + Date.now();
  const fullRecord: SleepRecord = {
    ...recordData,
    id,
    userId,
    createdAt: existingIndex !== -1 ? records[existingIndex].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex !== -1) {
    records[existingIndex] = fullRecord;
  } else {
    records.unshift(fullRecord);
  }

  saveLocalSleepRecords(records);

  // Sync to Firestore
  if (userId && userId !== 'local' && userId !== 'default') {
    try {
      const docRef = doc(db, 'users', userId, 'sleep_records', id);
      await setDoc(docRef, { ...fullRecord, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.warn('Failed to save sleep record to Firestore:', err);
    }
  }

  // Also synchronize with habitLog for the Sleep habit
  try {
    const habits = readLocalHabits();
    const sleepHabit = habits.find((h) => h.name.toLowerCase().includes('sleep') || h.icon === 'moon');
    if (sleepHabit) {
      const status: HabitLog['status'] =
        fullRecord.actualDuration >= fullRecord.targetDuration
          ? 'completed'
          : fullRecord.actualDuration > 0
          ? 'partial'
          : 'missed';

      await logHabit({
        userId: userId || 'local',
        habitId: sleepHabit.id!,
        date: fullRecord.date,
        status,
        progressValue: fullRecord.actualDuration,
        note: fullRecord.notes,
      });
    }
  } catch (err) {
    console.warn('Failed to log sleep record into habitLog:', err);
  }

  return fullRecord;
}

// --- Sleep Analysis Computation ---

export function getSleepAnalysis(records: SleepRecord[], settings: SleepSettings): SleepAnalysisData {
  const validRecords = records.filter((r) => r.actualDuration > 0);
  if (validRecords.length === 0) {
    return {
      hasEnoughData: false,
      totalDaysTracked: 0,
      averageSleepDuration: 0,
      targetSleepDuration: settings.targetDuration || 8,
      currentSleepStreak: 0,
      longestSleepStreak: 0,
      daysTargetAchieved: 0,
      daysBelowTarget: 0,
      daysAboveTarget: 0,
      sleepConsistencyPercent: 0,
      bestSleepDay: null,
      lowestSleepDay: null,
      weeklySleep: [],
      monthlySleep: [],
    };
  }

  const totalActual = validRecords.reduce((acc, r) => acc + r.actualDuration, 0);
  const averageSleepDuration = Math.round((totalActual / validRecords.length) * 10) / 10;
  const targetSleepDuration = settings.targetDuration || 8;

  let daysTargetAchieved = 0;
  let daysBelowTarget = 0;
  let daysAboveTarget = 0;

  validRecords.forEach((r) => {
    if (r.actualDuration >= r.targetDuration) {
      daysTargetAchieved++;
      if (r.actualDuration > r.targetDuration + 0.5) {
        daysAboveTarget++;
      }
    } else {
      daysBelowTarget++;
    }
  });

  const sleepConsistencyPercent = Math.round((daysTargetAchieved / validRecords.length) * 100);

  // Best and lowest days
  let best: SleepRecord = validRecords[0];
  let lowest: SleepRecord = validRecords[0];
  validRecords.forEach((r) => {
    if (r.actualDuration > best.actualDuration) best = r;
    if (r.actualDuration < lowest.actualDuration) lowest = r;
  });

  // Streaks calculation based on dates sorted chronologically
  const sortedRecords = [...validRecords].sort((a, b) => a.date.localeCompare(b.date));
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const r of sortedRecords) {
    const isSuccess = r.actualDuration >= r.targetDuration;
    const rDate = new Date(r.date + 'T00:00:00');

    if (isSuccess) {
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((rDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays === 0) {
          // same day duplicate guard
        } else {
          tempStreak = 1;
        }
      }
      prevDate = rDate;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else {
      tempStreak = 0;
      prevDate = null;
    }
  }

  // Current streak checking today/yesterday
  const todayStr = new Date().toLocaleDateString('en-CA');
  const todayRec = records.find((r) => r.date === todayStr);
  const todaySuccess = todayRec && todayRec.actualDuration >= todayRec.targetDuration;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA');
  const yRec = records.find((r) => r.date === yesterdayStr);
  const ySuccess = yRec && yRec.actualDuration >= yRec.targetDuration;

  if (todaySuccess || ySuccess) {
    currentStreak = tempStreak;
  } else {
    currentStreak = 0;
  }

  // Weekly Sleep (Last 7 Days)
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklySleep: Array<{ day: string; date: string; actualDuration: number; targetDuration: number; status: string }> = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dStr = d.toLocaleDateString('en-CA');
    const dayLabel = daysOfWeek[d.getDay()];
    const rec = records.find((r) => r.date === dStr);

    weeklySleep.push({
      day: dayLabel,
      date: dStr,
      actualDuration: rec?.actualDuration || 0,
      targetDuration: rec?.targetDuration || targetSleepDuration,
      status: !rec ? 'none' : rec.actualDuration >= (rec.targetDuration || targetSleepDuration) ? 'achieved' : 'under',
    });
  }

  // Monthly Sleep (Last 30 Days)
  const monthlySleep: Array<{ date: string; dayNumber: number; actualDuration: number; targetDuration: number; achieved: boolean }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dStr = d.toLocaleDateString('en-CA');
    const rec = records.find((r) => r.date === dStr);
    const actual = rec?.actualDuration || 0;
    const target = rec?.targetDuration || targetSleepDuration;

    monthlySleep.push({
      date: dStr,
      dayNumber: d.getDate(),
      actualDuration: actual,
      targetDuration: target,
      achieved: actual >= target,
    });
  }

  return {
    hasEnoughData: true,
    totalDaysTracked: validRecords.length,
    averageSleepDuration,
    targetSleepDuration,
    currentSleepStreak: currentStreak,
    longestSleepStreak: longestStreak,
    daysTargetAchieved,
    daysBelowTarget,
    daysAboveTarget,
    sleepConsistencyPercent,
    bestSleepDay: { date: best.date, duration: best.actualDuration },
    lowestSleepDay: { date: lowest.date, duration: lowest.actualDuration },
    weeklySleep,
    monthlySleep,
  };
}
