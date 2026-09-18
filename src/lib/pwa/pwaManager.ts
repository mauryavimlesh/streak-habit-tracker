/**
 * Centralized Service Worker Lifecycle and PWA Update Manager for STREAK
 * Handles registration, background update checks, controlled skipWaiting, and safe reload.
 */

import { useState, useEffect, useCallback } from 'react';

export interface PWAUpdateState {
  updateAvailable: boolean;
  isUpdating: boolean;
  registration: ServiceWorkerRegistration | null;
}

let globalRegistration: ServiceWorkerRegistration | null = null;
let waitingWorker: ServiceWorker | null = null;
const updateListeners = new Set<(available: boolean) => void>();

export function isUpdateAvailable(): boolean {
  return Boolean(waitingWorker);
}

export function registerPWA(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }

  return navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((reg) => {
      globalRegistration = reg;
      console.info('[PWA] STREAK Service Worker registered successfully, scope:', reg.scope);

      // Check if there is an existing waiting worker (e.g., loaded before page reload)
      if (reg.waiting && navigator.serviceWorker.controller) {
        waitingWorker = reg.waiting;
        notifyUpdateListeners(true);
      }

      // Track new workers discovered by the browser
      reg.addEventListener('updatefound', () => {
        const installingWorker = reg.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.info('[PWA] New version of STREAK installed and waiting to activate.');
            waitingWorker = installingWorker;
            notifyUpdateListeners(true);
            window.dispatchEvent(new CustomEvent('streak_pwa_update_available'));
          }
        });
      });

      // Periodically check for updates (every 30 minutes)
      setInterval(() => {
        reg.update().catch((err) => console.debug('[PWA] Background update check notice:', err));
      }, 30 * 60 * 1000);

      // Check for updates when user returns to the tab/app
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          reg.update().catch((err) => console.debug('[PWA] Tab focus update check notice:', err));
        }
      });

      return reg;
    })
    .catch((err) => {
      console.warn('[PWA] Service Worker registration failed:', err);
      return null;
    });
}

function notifyUpdateListeners(available: boolean) {
  updateListeners.forEach((listener) => {
    try {
      listener(available);
    } catch (e) {
      console.error('[PWA] Error in update listener:', e);
    }
  });
}

/**
 * Safely applies the waiting update:
 * Sends SKIP_WAITING to the waiting service worker and reloads the application
 * only after the new service worker has taken control (controllerchange).
 */
export function applyPWAUpdate(): Promise<void> {
  return new Promise((resolve) => {
    if (!waitingWorker) {
      console.warn('[PWA] No waiting worker found to activate.');
      window.location.reload();
      return resolve();
    }

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.info('[PWA] Service worker controller changed. Refreshing app...');
        window.location.reload();
      }
    });

    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    resolve();
  });
}

/**
 * React hook for consuming PWA update lifecycle state
 */
export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(Boolean(waitingWorker));
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    const handleUpdate = (available: boolean) => {
      setUpdateAvailable(available);
    };

    updateListeners.add(handleUpdate);
    // Sync current state
    if (waitingWorker) {
      setUpdateAvailable(true);
    }

    const onCustomEvent = () => {
      setUpdateAvailable(true);
    };
    window.addEventListener('streak_pwa_update_available', onCustomEvent);

    return () => {
      updateListeners.delete(handleUpdate);
      window.removeEventListener('streak_pwa_update_available', onCustomEvent);
    };
  }, []);

  const applyUpdate = useCallback(async () => {
    setIsUpdating(true);
    await applyPWAUpdate();
  }, []);

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  return {
    updateAvailable,
    isUpdating,
    applyUpdate,
    dismissUpdate,
  };
}
