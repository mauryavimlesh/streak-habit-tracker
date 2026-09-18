import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { readAppearanceSettings, applyAppearanceSettings } from './lib/themeService';
import { initAnalytics } from './lib/analyticsService';
import { initOfflineSyncManager } from './lib/offlineSyncService';
import { registerPWA } from './lib/pwa/pwaManager';

applyAppearanceSettings(readAppearanceSettings());

// Initialize offline capabilities, background sync, and analytics
initOfflineSyncManager();
initAnalytics().catch(console.error);

// Safely register PWA Service Worker after window load so initial render remains instantaneous,
// and gracefully track update lifecycle events without interrupting active user workflows.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const registerServiceWorker = () => {
    registerPWA().catch((error) => {
      console.warn('[PWA] Service Worker registration notice:', error);
    });
  };

  if (document.readyState === 'complete') {
    registerServiceWorker();
  } else {
    window.addEventListener('load', registerServiceWorker, { once: true });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
