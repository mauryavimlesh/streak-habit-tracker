import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../lib/pwa/usePWAInstall';
import { AddToHomeScreenModal } from './AddToHomeScreenModal';

const BANNER_DISMISSED_KEY = 'streak_pwa_banner_dismissed_v1';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, hasNativePrompt, isIOS, isAndroid } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (isInstalled) {
      setIsVisible(false);
      return;
    }

    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (!dismissed && isInstallable) {
      // Delay slightly for smooth initial rendering
      const timer = setTimeout(() => setIsVisible(true), 2500);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
  };

  const handleOpenInstall = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && !isInstalled && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-20 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:max-w-sm z-40"
          >
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#0d0e12]/95 border border-[#232733] shadow-2xl backdrop-blur-md text-white">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-[#232733] p-1.5 shrink-0 flex items-center justify-center">
                <img src="/icon-192.png" alt="STREAK" className="w-full h-full object-contain rounded-lg" />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white tracking-tight truncate">Install STREAK</h4>
                <p className="text-[11px] text-zinc-400 truncate">
                  {isIOS ? 'Add to Home Screen for iOS' : 'Fast, offline habit & streak tracking'}
                </p>
              </div>

              <button
                onClick={handleOpenInstall}
                className="px-3 py-1.5 rounded-xl bg-[#a5ff36] text-black text-xs font-bold shrink-0 hover:bg-[#b8ff5c] active:scale-95 transition cursor-pointer"
              >
                Install
              </button>

              <button
                onClick={handleDismiss}
                className="p-1 text-zinc-500 hover:text-zinc-300 rounded-lg shrink-0 transition"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AddToHomeScreenModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
