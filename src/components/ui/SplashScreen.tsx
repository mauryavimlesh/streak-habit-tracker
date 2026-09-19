import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete?: () => void;
}

/**
 * High-performance, compositor-accelerated STREAK Splash Screen.
 * Displays the original STREAK brand asset centered with native aspect ratio.
 * Free of any distorted containers, masks, or octagonal framing.
 * Preserves the existing smooth fade-out animation sequence.
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isRendered, setIsRendered] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Hold splash screen briefly before initiating smooth fade-out
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 600);

    // Unmount and notify completion after fade-out transition concludes
    const removeTimer = setTimeout(() => {
      setIsRendered(false);
      if (onComplete) onComplete();
    }, 880);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [onComplete]);

  if (!isRendered) return null;

  return (
    <div
      id="streak-app-splash"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#000000] select-none touch-none ${
        isFadingOut ? 'streak-splash-fadeout' : ''
      }`}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center justify-center gap-4">
        {/* Original STREAK Brand Asset - Centered, native 1:1 aspect ratio, unclipped */}
        <img
          src="/logo.png"
          alt="STREAK"
          width={104}
          height={104}
          className="w-24 h-24 sm:w-28 sm:h-28 aspect-square object-contain select-none pointer-events-none streak-splash-logo-anim drop-shadow-[0_0_24px_rgba(140,238,40,0.35)]"
          loading="eager"
          decoding="sync"
        />
        <span className="text-xs font-bold tracking-[0.25em] text-white/60 uppercase select-none font-sans">
          STREAK
        </span>
      </div>
    </div>
  );
};

export default SplashScreen;
