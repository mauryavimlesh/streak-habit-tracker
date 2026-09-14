import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { readAppearanceSettings, applyAppearanceSettings } from './lib/themeService';
import { initAnalytics } from './lib/analyticsService';

applyAppearanceSettings(readAppearanceSettings());

// Initialize analytics asynchronously so it doesn't block rendering
initAnalytics().catch(console.error);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
