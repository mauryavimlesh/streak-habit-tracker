import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { readAppearanceSettings, applyAppearanceSettings } from './lib/themeService';
import { initAnalytics } from './lib/analyticsService';
import { initOfflineSyncManager } from './lib/offlineSyncService';

applyAppearanceSettings(readAppearanceSettings());

// Initialize offline capabilities, background sync, and analytics
initOfflineSyncManager();
initAnalytics().catch(console.error);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
