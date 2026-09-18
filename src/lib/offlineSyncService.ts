/**
 * STREAK Offline & Background Synchronization Engine
 * Ensures all core habit, task, and journal data is fully available offline,
 * and prioritizes background synchronization when connection is restored.
 */

import { registerPWA } from './pwa/pwaManager';

export interface OfflineAction {
  id: string;
  type: 'LOG_HABIT' | 'CREATE_TASK' | 'UPDATE_TASK' | 'SAVE_JOURNAL' | 'LOG_GOAL';
  payload: any;
  timestamp: number;
}

const OFFLINE_QUEUE_KEY = 'streak_offline_mutation_queue_v1';
const LAST_SYNC_KEY = 'streak_last_background_sync_v1';

let isSyncing = false;
let isInitialized = false;

export function getPendingOfflineActionsCount(): number {
  return getOfflineQueue().length;
}

export function isDeviceOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function getOfflineQueue(): OfflineAction[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineAction[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    notifyStatusChange();
  } catch (err) {
    console.warn('[OfflineSync] Failed to save offline queue:', err);
  }
}

export function enqueueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp'>): void {
  const queue = getOfflineQueue();
  const fullAction: OfflineAction = {
    ...action,
    id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: Date.now(),
  };
  queue.push(fullAction);
  saveOfflineQueue(queue);

  // Attempt to register a background sync event with the service worker
  requestServiceWorkerSync();
}

/**
 * Attempts to register a Background Sync event with the Service Worker
 */
export async function requestServiceWorkerSync(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await (registration as any).sync.register('streak-background-sync');
      console.info('[OfflineSync] Background sync registered with Service Worker.');
    }
  } catch (err) {
    console.debug('[OfflineSync] Background Sync API not supported or failed:', err);
  }
}

/**
 * Prioritizes flushing offline actions and executing cloud sync across habits, tasks, and journals
 */
export async function flushOfflineSync(userId?: string): Promise<{ success: boolean; syncedCount: number }> {
  if (isSyncing || !isDeviceOnline()) {
    return { success: false, syncedCount: 0 };
  }

  isSyncing = true;
  notifyStatusChange();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('streak_offline_sync_started'));
  }

  let syncedCount = 0;
  try {
    const queue = getOfflineQueue();

    // 1. Process queued offline actions
    if (queue.length > 0) {
      console.info(`[OfflineSync] Processing ${queue.length} offline mutations...`);
      // We process mutations in chronological order
      const remainingQueue: OfflineAction[] = [];
      for (const item of queue) {
        try {
          if (item.type === 'LOG_HABIT') {
            const { logHabit } = await import('./habitService');
            await logHabit(item.payload, false);
            syncedCount++;
          } else if (item.type === 'CREATE_TASK') {
            const { createTask } = await import('./taskService');
            await createTask(item.payload, item.payload.userId);
            syncedCount++;
          } else if (item.type === 'UPDATE_TASK') {
            const { updateTask } = await import('./taskService');
            await updateTask(item.payload.id, item.payload.updates, item.payload.userId);
            syncedCount++;
          } else if (item.type === 'SAVE_JOURNAL') {
            const { createJournalEntry, updateJournalEntry } = await import('./journalService');
            if (item.payload?.id && !item.payload.id.startsWith('local_') && !item.payload.id.startsWith('entry-seed-')) {
              await updateJournalEntry(item.payload.id, item.payload, item.payload.userId);
            } else {
              await createJournalEntry(item.payload, item.payload?.userId);
            }
            syncedCount++;
          } else if (item.type === 'LOG_GOAL') {
            const { logDailyGoalProgressQuick } = await import('./goalService');
            await logDailyGoalProgressQuick(
              item.payload.goalId,
              item.payload.date,
              item.payload.amount,
              item.payload.userId,
              false
            );
            syncedCount++;
          }
        } catch (itemErr) {
          console.warn('[OfflineSync] Failed to process action, retaining in queue:', item, itemErr);
          remainingQueue.push(item);
        }
      }
      saveOfflineQueue(remainingQueue);
    }

    // 2. Prioritize core cloud sync for authenticated users
    const effectiveUserId = userId || getStoredUserId();
    if (effectiveUserId && effectiveUserId !== 'local' && effectiveUserId !== 'guest') {
      try {
        const { syncLocalToCloud } = await import('./habitService');
        await syncLocalToCloud(effectiveUserId);

        const { syncLocalTasksToCloud } = await import('./taskService');
        await syncLocalTasksToCloud(effectiveUserId);

        const { syncLocalJournalToCloud } = await import('./journalService');
        await syncLocalJournalToCloud(effectiveUserId);

        const { syncLocalGoalsToCloud } = await import('./goalService');
        await syncLocalGoalsToCloud(effectiveUserId);

        const { syncLocalRemindersToCloud } = await import('./reminderService');
        await syncLocalRemindersToCloud(effectiveUserId);
      } catch (cloudSyncErr) {
        console.warn('[OfflineSync] Cloud sync error:', cloudSyncErr);
      }
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('streak_offline_sync_completed', { detail: { syncedCount } }));
      window.dispatchEvent(new CustomEvent('streak_habits_updated'));
      window.dispatchEvent(new CustomEvent('streak_tasks_updated'));
      window.dispatchEvent(new CustomEvent('streak_journal_updated'));
      window.dispatchEvent(new CustomEvent('streak_goals_updated'));
    }

    return { success: true, syncedCount };
  } catch (error) {
    console.error('[OfflineSync] Sync failed:', error);
    return { success: false, syncedCount };
  } finally {
    isSyncing = false;
    notifyStatusChange();
  }
}

function getStoredUserId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const rawProfile = localStorage.getItem('streak_local_profile_v1');
    if (rawProfile) {
      const parsed = JSON.parse(rawProfile);
      return parsed.uid || null;
    }
  } catch {}
  return null;
}

function notifyStatusChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('streak_offline_status_changed', {
        detail: {
          online: isDeviceOnline(),
          isSyncing,
          pendingCount: getOfflineQueue().length,
        },
      })
    );
  }
}

/**
 * Initializes listeners for online / offline events and Service Worker background sync triggers
 */
export function initOfflineSyncManager(): () => void {
  if (isInitialized || typeof window === 'undefined') {
    return () => {};
  }
  isInitialized = true;

  // Register service worker if not already registered
  if ('serviceWorker' in navigator) {
    registerPWA().catch((err) => {
      console.debug('[OfflineSync] Service Worker registration skipped or failed:', err);
    });

    // Listen for background sync triggers sent by the service worker
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'STREAK_BACKGROUND_SYNC_TRIGGER') {
        console.info('[OfflineSync] Received background sync trigger from Service Worker.');
        flushOfflineSync();
      }
    };
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
  }

  // Network state listeners
  const handleOnline = () => {
    console.info('[OfflineSync] Connection restored, initiating priority background sync.');
    notifyStatusChange();
    flushOfflineSync();
  };

  const handleOffline = () => {
    console.warn('[OfflineSync] Connection lost, operating in offline-first mode.');
    notifyStatusChange();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Initial check on startup: if online and pending items exist, flush immediately
  if (isDeviceOnline() && getOfflineQueue().length > 0) {
    flushOfflineSync();
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
