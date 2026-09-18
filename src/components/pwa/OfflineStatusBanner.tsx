import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { isDeviceOnline, getPendingOfflineActionsCount } from '../../lib/offlineSyncService';

export const OfflineStatusBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => isDeviceOnline());
  const [pendingCount, setPendingCount] = useState<number>(() => getPendingOfflineActionsCount());
  const [isJustReconnected, setIsJustReconnected] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnlineStatusChange = (e: CustomEvent) => {
      const { online, pendingCount: newPendingCount } = e.detail || {};
      if (typeof online === 'boolean') {
        if (!isOnline && online) {
          setIsJustReconnected(true);
          const t = setTimeout(() => setIsJustReconnected(false), 3000);
          return () => clearTimeout(t);
        }
        setIsOnline(online);
      }
      if (typeof newPendingCount === 'number') {
        setPendingCount(newPendingCount);
      }
    };

    const onOnline = () => {
      setIsOnline(true);
      setIsJustReconnected(true);
      setTimeout(() => setIsJustReconnected(false), 3000);
    };

    const onOffline = () => {
      setIsOnline(false);
      setIsJustReconnected(false);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('streak_offline_status_changed' as any, handleOnlineStatusChange);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('streak_offline_status_changed' as any, handleOnlineStatusChange);
    };
  }, [isOnline]);

  if (isOnline && !isJustReconnected) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="fixed top-2 left-1/2 -translate-x-1/2 z-[9990] pointer-events-none px-3 w-full max-w-sm"
      >
        <div
          className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium backdrop-blur-md shadow-lg border ${
            isJustReconnected
              ? 'bg-[#1b381e]/90 text-[#a5ff36] border-[#2e5e33]'
              : 'bg-[#221a15]/90 text-amber-300 border-amber-500/30'
          }`}
        >
          {isJustReconnected ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#a5ff36]" />
              <span>Back Online • Data synced</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Offline Mode • Saved locally
                {pendingCount > 0 ? ` (${pendingCount} queued)` : ''}
              </span>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
