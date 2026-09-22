import {
  StreakFreezeConfig,
  getFreezeStatus,
  planStreakFreeze,
  unplanStreakFreeze,
  consumeStreakFreeze,
  refundStreakFreeze,
  FreezeStatus,
} from './streakEngine';
import { getTodayDateKey } from './dateUtils';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const DEFAULT_FREEZE_CAPACITY = 2;
const LOCAL_FREEZE_KEY_PREFIX = 'streak_freeze_config_';

/**
 * Retrieves the user's StreakFreezeConfig from local storage or cloud fallback.
 */
export function getStoredFreezeConfig(userId?: string): StreakFreezeConfig {
  const key = `${LOCAL_FREEZE_KEY_PREFIX}${userId || 'guest'}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        totalAvailable: typeof parsed.totalAvailable === 'number' ? parsed.totalAvailable : DEFAULT_FREEZE_CAPACITY,
        usedFreezes: Array.isArray(parsed.usedFreezes) ? parsed.usedFreezes : [],
        plannedDates: Array.isArray(parsed.plannedDates) ? parsed.plannedDates : [],
        autoConsume: parsed.autoConsume ?? true,
        maxFreezesPerPeriod: parsed.maxFreezesPerPeriod ?? DEFAULT_FREEZE_CAPACITY,
      };
    }
  } catch (err) {
    console.error('Failed to read streak freeze configuration:', err);
  }

  // Default initial configuration
  const defaultConfig: StreakFreezeConfig = {
    totalAvailable: DEFAULT_FREEZE_CAPACITY,
    usedFreezes: [],
    plannedDates: [],
    autoConsume: true,
    maxFreezesPerPeriod: DEFAULT_FREEZE_CAPACITY,
  };

  try {
    localStorage.setItem(key, JSON.stringify(defaultConfig));
  } catch (_) {}

  return defaultConfig;
}

/**
 * Fetches the user's StreakFreezeConfig from Firestore and synchronizes local storage.
 */
export async function syncUserFreezeConfigFromCloud(userId: string): Promise<StreakFreezeConfig> {
  if (!userId || userId === 'guest') {
    return getStoredFreezeConfig();
  }

  try {
    const freezeDocRef = doc(db, 'users', userId, 'freeze_config', 'default');
    const snap = await getDoc(freezeDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const config: StreakFreezeConfig = {
        totalAvailable: typeof data.totalAvailable === 'number' ? data.totalAvailable : DEFAULT_FREEZE_CAPACITY,
        usedFreezes: Array.isArray(data.usedFreezes) ? data.usedFreezes : [],
        plannedDates: Array.isArray(data.plannedDates) ? data.plannedDates : [],
        autoConsume: data.autoConsume ?? true,
        maxFreezesPerPeriod: data.maxFreezesPerPeriod ?? DEFAULT_FREEZE_CAPACITY,
      };
      saveStoredFreezeConfig(config, userId, false);
      return config;
    }
  } catch (err) {
    console.warn('Failed to load freeze config from cloud, using local cache:', err);
  }

  const local = getStoredFreezeConfig(userId);
  await saveStoredFreezeConfig(local, userId, true);
  return local;
}

/**
 * Persists the StreakFreezeConfig to storage and dispatches a reactive update event.
 */
export function saveStoredFreezeConfig(
  config: StreakFreezeConfig,
  userId?: string,
  syncToCloud: boolean = true
): StreakFreezeConfig {
  const key = `${LOCAL_FREEZE_KEY_PREFIX}${userId || 'guest'}`;
  try {
    localStorage.setItem(key, JSON.stringify(config));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('streak_freeze_updated', {
          detail: { config, userId },
        })
      );
    }
  } catch (err) {
    console.error('Failed to save streak freeze configuration locally:', err);
  }

  if (syncToCloud && userId && userId !== 'guest') {
    const freezeDocRef = doc(db, 'users', userId, 'freeze_config', 'default');
    setDoc(freezeDocRef, {
      totalAvailable: config.totalAvailable,
      usedFreezes: config.usedFreezes || [],
      plannedDates: config.plannedDates || [],
      autoConsume: config.autoConsume ?? true,
      maxFreezesPerPeriod: config.maxFreezesPerPeriod ?? DEFAULT_FREEZE_CAPACITY,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch((err) => {
      console.warn('Asynchronous cloud sync of freeze config failed:', err);
    });
  }

  return config;
}

/**
 * Plans a day off / absence ahead of time, reserving a freeze slot.
 */
export function planDayOff(
  dateStr: string,
  userId?: string
): { success: boolean; config: StreakFreezeConfig; reason?: string } {
  const current = getStoredFreezeConfig(userId);
  const result = planStreakFreeze(current, dateStr);
  if (result.success) {
    saveStoredFreezeConfig(result.updatedConfig, userId);
  }
  return {
    success: result.success,
    config: result.updatedConfig,
    reason: result.reason,
  };
}

/**
 * Cancels a previously planned day off, releasing the reserved freeze slot.
 */
export function unplanDayOff(
  dateStr: string,
  userId?: string
): StreakFreezeConfig {
  const current = getStoredFreezeConfig(userId);
  const updated = unplanStreakFreeze(current, dateStr);
  saveStoredFreezeConfig(updated, userId);
  return updated;
}

/**
 * Manually or automatically consumes a freeze for a missed day.
 */
export function consumeFreezeForDate(
  dateStr: string,
  userId?: string
): { success: boolean; config: StreakFreezeConfig; reason?: string } {
  const current = getStoredFreezeConfig(userId);
  const result = consumeStreakFreeze(current, dateStr);
  if (result.success) {
    saveStoredFreezeConfig(result.updatedConfig, userId);
  }
  return {
    success: result.success,
    config: result.updatedConfig,
    reason: result.reason,
  };
}

/**
 * Refunds a freeze if the user logged their habit on that date.
 */
export function refundFreezeForDate(
  dateStr: string,
  userId?: string
): StreakFreezeConfig {
  const current = getStoredFreezeConfig(userId);
  const updated = refundStreakFreeze(current, dateStr);
  saveStoredFreezeConfig(updated, userId);
  return updated;
}

/**
 * Returns reactive freeze status.
 */
export function getStoredFreezeStatus(userId?: string, targetDateStr?: string): FreezeStatus {
  const config = getStoredFreezeConfig(userId);
  return getFreezeStatus(config, targetDateStr || getTodayDateKey());
}
