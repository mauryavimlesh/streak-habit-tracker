import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { usePWAUpdate } from '../../lib/pwa/pwaManager';

export const PWAUpdateToast: React.FC = () => {
  const { updateAvailable, isUpdating, applyUpdate, dismissUpdate } = usePWAUpdate();

  if (!updateAvailable) return null;

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="App update available"
        role="region"
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.96 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[9999] pointer-events-auto"
      >
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#141720]/95 backdrop-blur-xl border border-[#2b3345] shadow-2xl shadow-black/60 text-white">
          <div className="w-9 h-9 rounded-xl bg-[#a5ff36]/15 border border-[#a5ff36]/30 flex items-center justify-center text-[#a5ff36] shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-xs font-bold text-white tracking-tight leading-snug">
              STREAK Update Ready
            </h4>
            <p className="text-[11px] text-[#8e96a8] leading-tight mt-0.5 truncate">
              A newer, faster version is available.
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={applyUpdate}
              disabled={isUpdating}
              className="px-3 py-1.5 rounded-xl bg-[#a5ff36] text-black font-bold text-xs hover:bg-[#b8ff5c] active:scale-95 transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>{isUpdating ? 'Updating…' : 'Update'}</span>
            </button>

            <button
              onClick={dismissUpdate}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
              aria-label="Dismiss update banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};
