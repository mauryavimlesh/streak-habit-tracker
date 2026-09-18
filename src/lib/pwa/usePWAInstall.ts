import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type PWAUserPlatform = 'ios' | 'android' | 'desktop' | 'other';
export type PWABrowser = 'safari' | 'chrome' | 'edge' | 'firefox' | 'samsung' | 'other';

export const PWA_INSTALLED_STORAGE_KEY = 'streak_app_installed';

export function checkIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  const standaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const overlayMedia = window.matchMedia('(display-mode: window-controls-overlay)').matches;
  const navStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const androidAppReferrer = typeof document !== 'undefined' && typeof document.referrer === 'string' ? document.referrer.includes('android-app://') : false;

  return standaloneMedia || overlayMedia || navStandalone || androidAppReferrer;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => checkIsStandalone());
  const [platform, setPlatform] = useState<PWAUserPlatform>('other');
  const [browser, setBrowser] = useState<PWABrowser>('other');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect standalone mode initially
    const standalone = checkIsStandalone();
    setIsInstalled(standalone);

    // If running in standalone, mark installation in local storage
    if (standalone) {
      try {
        localStorage.setItem(PWA_INSTALLED_STORAGE_KEY, 'true');
      } catch {}
    }

    // Dynamic display-mode change listener
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setDeferredPrompt(null);
        try {
          localStorage.setItem(PWA_INSTALLED_STORAGE_KEY, 'true');
        } catch {}
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    // Platform and Browser Detection
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(ua);

    if (isIOSDevice) {
      setPlatform('ios');
      if (/crios/.test(ua)) setBrowser('chrome');
      else if (/fxios/.test(ua)) setBrowser('firefox');
      else if (/edgios/.test(ua)) setBrowser('edge');
      else setBrowser('safari');
    } else if (isAndroidDevice) {
      setPlatform('android');
      if (/samsungbrowser/.test(ua)) setBrowser('samsung');
      else if (/edg\/|edga\//.test(ua)) setBrowser('edge');
      else if (/firefox/.test(ua)) setBrowser('firefox');
      else if (/chrome/.test(ua)) setBrowser('chrome');
      else setBrowser('other');
    } else {
      setPlatform('desktop');
      if (/edg\//.test(ua)) setBrowser('edge');
      else if (/chrome/.test(ua)) setBrowser('chrome');
      else if (/firefox/.test(ua)) setBrowser('firefox');
      else if (/safari/.test(ua) && !/chrome/.test(ua)) setBrowser('safari');
      else setBrowser('other');
    }

    // Capture Android/Chromium beforeinstallprompt event safely
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser default mini-infobar on mobile
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Track app installation completion
    const handleAppInstalled = () => {
      console.info('[PWA] STREAK app was successfully installed on the device.');
      setIsInstalled(true);
      setDeferredPrompt(null);
      try {
        localStorage.setItem(PWA_INSTALLED_STORAGE_KEY, 'true');
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.info('[PWA] No native install prompt event available.');
      return false;
    }
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        try {
          localStorage.setItem(PWA_INSTALLED_STORAGE_KEY, 'true');
        } catch {}
        return true;
      }
    } catch (err) {
      console.warn('[PWA] Error during native install prompt execution:', err);
    }
    return false;
  }, [deferredPrompt]);

  const isIOSSafari = platform === 'ios' && browser === 'safari';

  return {
    isInstallable: Boolean(deferredPrompt) || (platform === 'ios' && !isInstalled),
    hasNativePrompt: Boolean(deferredPrompt),
    isInstalled,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    isIOSSafari,
    platform,
    browser,
    install,
  };
}
