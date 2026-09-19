import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StreakLogo } from './StreakLogo';

interface SplashScreenProps {
  onComplete?: () => void;
}

const SPLASH_SESSION_KEY = 'streak_splash_shown_v1';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Show on initial launch per browser session
    try {
      return !sessionStorage.getItem(SPLASH_SESSION_KEY);
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!isVisible) {
      if (onComplete) onComplete();
      return;
    }

    // Fast, subtle display duration (450ms), then trigger fade-out
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(SPLASH_SESSION_KEY, 'true');
      } catch {
        // Ignore
      }
      setIsVisible(false);
      if (onComplete) onComplete();
    }, 450);

    return () => clearTimeout(timer);
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="streak-splash-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#000000] select-none touch-none"
          aria-hidden="true"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.35,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="flex flex-col items-center justify-center gap-4"
          >
            {/* Provided Original STREAK Branding Asset retaining authentic aspect ratio and design */}
            <img
              src="/logo.png"
              alt="STREAK Logo"
              width={104}
              height={104}
              className="w-24 h-24 sm:w-28 sm:h-28 aspect-square object-contain select-none pointer-events-none drop-shadow-2xl"
              loading="eager"
              decoding="sync"
            />
            <span className="text-xs font-bold tracking-[0.25em] text-white/50 uppercase select-none">
              STREAK
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
