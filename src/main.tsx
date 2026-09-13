import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { readAppearanceSettings, applyAppearanceSettings } from './lib/themeService';

applyAppearanceSettings(readAppearanceSettings());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
