import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type PWAUserPlatform = 'ios' | 'android' | 'desktop' | 'other';
export type PWABrowser = 'safari' | 'chrome' | 'edge' | 'firefox' | 'samsung' | 'other';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<PWAUserPlatform>('other');
  const [browser, setBrowser] = useState<PWABrowser>('other');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect standalone mode (already installed on Home Screen)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Browser and Platform Detection
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    const isAndroidDevice = /android/.test(ua);

    if (isIOSDevice) {
      setPlatform('ios');
      if (/crios/.test(ua)) setBrowser('chrome');
      else if (/fxios/.test(ua)) setBrowser('firefox');
      else setBrowser('safari');
    } else if (isAndroidDevice) {
      setPlatform('android');
      if (/samsungbrowser/.test(ua)) setBrowser('samsung');
      else if (/edg\//.test(ua)) setBrowser('edge');
      else if (/firefox/.test(ua)) setBrowser('firefox');
      else setBrowser('chrome');
    } else {
      setPlatform('desktop');
      if (/edg\//.test(ua)) setBrowser('edge');
      else if (/chrome/.test(ua)) setBrowser('chrome');
      else if (/firefox/.test(ua)) setBrowser('firefox');
      else if (/safari/.test(ua)) setBrowser('safari');
    }

    // Capture Android/Chromium beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.warn('[PWA] Error triggering install prompt:', err);
    }
    return false;
  }, [deferredPrompt]);

  return {
    isInstallable: Boolean(deferredPrompt) || (platform === 'ios' && !isInstalled),
    hasNativePrompt: Boolean(deferredPrompt),
    isInstalled,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    platform,
    browser,
    install,
  };
}
