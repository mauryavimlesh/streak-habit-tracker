import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone, Share2, Apple, Laptop, Check } from 'lucide-react';
import { usePWAInstall } from '../../lib/pwa/usePWAInstall';
import { AddToHomeScreenModal } from './AddToHomeScreenModal';

const BANNER_DISMISSED_KEY = 'streak_pwa_banner_dismissed_v1';

export const PWAInstallBanner: React.FC = () => {
  const {
    isInstallable,
    isInstalled,
    hasNativePrompt,
    isIOS: hookIsIOS,
    isAndroid: hookIsAndroid,
    install,
  } = usePWAInstall();

  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // Explicit device & browser detection logic
  const deviceInfo = useMemo(() => {
    if (typeof window === 'undefined') {
      return { isIOS: false, isAndroid: false, isIOSSafari: false, isDesktop: true, browserName: 'other' };
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(ua);

    let browserName: 'safari' | 'chrome' | 'firefox' | 'edge' | 'samsung' | 'other' = 'other';
    if (/samsungbrowser/.test(ua)) browserName = 'samsung';
    else if (/edg\/|edgios\/|edga\//.test(ua)) browserName = 'edge';
    else if (/crios/.test(ua) || (/chrome/.test(ua) && !/edg\//.test(ua))) browserName = 'chrome';
    else if (/fxios|firefox/.test(ua)) browserName = 'firefox';
    else if (/safari/.test(ua) && !/chrome/.test(ua)) browserName = 'safari';

    const isIOSSafari = isIOSDevice && browserName === 'safari';

    return {
      isIOS: isIOSDevice,
      isAndroid: isAndroidDevice,
      isIOSSafari,
      isDesktop: !isIOSDevice && !isAndroidDevice,
      browserName,
    };
  }, []);

  const isIOS = deviceInfo.isIOS || hookIsIOS;
  const isAndroid = deviceInfo.isAndroid || hookIsAndroid;

  useEffect(() => {
    if (isInstalled) {
      setIsVisible(false);
      return;
    }

    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    if (pathname.includes('/login') || pathname.includes('/onboarding')) {
      setIsVisible(false);
      return;
    }

    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (!dismissed && (isInstallable || isIOS || isAndroid)) {
      // Gentle delay for seamless entry without jarring initial page load
      const timer = setTimeout(() => {
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        if (!currentPath.includes('/login') && !currentPath.includes('/onboarding')) {
          setIsVisible(true);
        }
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, isIOS, isAndroid]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
  };

  const handleActionClick = async () => {
    if (hasNativePrompt) {
      setIsInstalling(true);
      try {
        const accepted = await install();
        if (accepted) {
          setInstallSuccess(true);
          setTimeout(() => {
            setIsVisible(false);
          }, 1400);
          return;
        }
      } catch (err) {
        console.warn('[PWA] Banner install prompt error:', err);
      } finally {
        setIsInstalling(false);
      }
    }
    // For iOS or Android fallback without direct prompt, launch the guidance modal
    setIsVisible(false);
    setIsModalOpen(true);
  };

  // Dedicated prompt content tailored specifically for iOS vs Android vs Desktop
  const promptDetails = useMemo(() => {
    if (isIOS) {
      return {
        targetOS: 'ios' as const,
        badgeText: deviceInfo.isIOSSafari ? 'iOS • Safari' : 'iOS Device',
        badgeIcon: <Apple className="w-3 h-3 text-[#a5ff36]" />,
        title: 'Add STREAK to iPhone',
        description: deviceInfo.isIOSSafari
          ? 'Tap Share (↑) and select "Add to Home Screen" for instant fullscreen tracking.'
          : 'Open in Safari & tap Share to add STREAK directly to your Home Screen.',
        buttonLabel: 'How to Add',
        buttonIcon: <Share2 className="w-3.5 h-3.5" />,
      };
    }

    if (isAndroid) {
      return {
        targetOS: 'android' as const,
        badgeText: hasNativePrompt ? 'Android • 1-Tap' : 'Android • Web App',
        badgeIcon: <Smartphone className="w-3 h-3 text-[#a5ff36]" />,
        title: 'Install STREAK on Android',
        description: hasNativePrompt
          ? 'One-tap install for offline habit logging, instant sync, and zero app store bloat.'
          : 'Tap the Chrome menu (⋮) & select "Install app" for offline streak tracking.',
        buttonLabel: hasNativePrompt ? 'Install App' : 'Instructions',
        buttonIcon: <Download className="w-3.5 h-3.5" />,
      };
    }

    // Desktop
    return {
      targetOS: 'desktop' as const,
      badgeText: 'Desktop App',
      badgeIcon: <Laptop className="w-3 h-3 text-[#a5ff36]" />,
      title: 'Install STREAK App',
      description: 'Run STREAK in an isolated distraction-free window with offline sync.',
      buttonLabel: hasNativePrompt ? 'Install App' : 'Add App',
      buttonIcon: <Download className="w-3.5 h-3.5" />,
    };
  }, [isIOS, isAndroid, deviceInfo, hasNativePrompt]);

  return (
    <>
      <AnimatePresence>
        {isVisible && !isInstalled && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="fixed top-3 left-3 right-3 sm:top-4 sm:left-auto sm:right-6 sm:max-w-md z-40"
          >
            {/* STREAK Signature Dark Theme & Vibrant Accent */}
            <div className="relative overflow-hidden rounded-2xl bg-[#0d0e12]/95 border border-[#232733] shadow-[0_12px_36px_rgba(0,0,0,0.7)] backdrop-blur-xl p-3.5 text-white">
              {/* Subtle Lime Ambient Highlight */}
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#a5ff36]/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative flex items-center gap-3">
                {/* Brand App Icon with 192x192 asset & active pulse */}
                <div className="relative w-11 h-11 rounded-xl bg-zinc-900 border border-[#232733] p-1.5 shrink-0 flex items-center justify-center shadow-inner">
                  <img
                    src="/icon-192.png"
                    alt="STREAK"
                    className="w-full h-full object-contain rounded-lg"
                  />
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#0d0e12] border border-[#232733] flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-[#a5ff36] animate-pulse" />
                  </div>
                </div>

                {/* Targeted Information */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#a5ff36]/10 border border-[#a5ff36]/25 text-[10px] font-bold text-[#a5ff36] tracking-wide uppercase">
                      {promptDetails.badgeIcon}
                      <span>{promptDetails.badgeText}</span>
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white tracking-tight truncate">
                    {promptDetails.title}
                  </h4>
                  <p className="text-[11px] text-zinc-400 line-clamp-1 leading-normal">
                    {promptDetails.description}
                  </p>
                </div>

                {/* Primary Action Button */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {installSuccess ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#a5ff36]/20 text-[#a5ff36] border border-[#a5ff36]/30 text-xs font-bold">
                      <Check className="w-3.5 h-3.5" />
                      <span>Added!</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleActionClick}
                      disabled={isInstalling}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#a5ff36] text-black text-xs font-bold shrink-0 hover:bg-[#b8ff5c] active:scale-95 shadow-[0_2px_10px_rgba(165,255,54,0.25)] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {promptDetails.buttonIcon}
                      <span>{isInstalling ? 'Installing…' : promptDetails.buttonLabel}</span>
                    </button>
                  )}

                  {/* Dismiss Button */}
                  <button
                    onClick={handleDismiss}
                    className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-lg transition shrink-0"
                    aria-label="Dismiss installation banner"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
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
