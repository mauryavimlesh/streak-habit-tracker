import fs from 'fs';
let code = fs.readFileSync('src/lib/themeService.ts', 'utf8');

// Replace ThemeMode
code = code.replace(
  "export type ThemeMode = 'dark' | 'amoled' | 'emerald' | 'midnight';",
  "export type ThemeMode = 'system' | 'light' | 'dark' | 'amoled' | 'emerald' | 'midnight';"
);

// Define theme map correctly
const searchMap = `export const THEME_MODE_MAP: Record<ThemeMode, { name: string; bg: string; cardBg: string; desc: string }> = {
  dark: {
    name: 'Onyx Dark',
    bg: '#0d0e12',
    cardBg: '#13151b',
    desc: 'Default calm & high-contrast dark space',
  },
  amoled: {
    name: 'True Black',
    bg: '#000000',
    cardBg: '#0a0a0a',
    desc: 'Pure pitch black for OLED displays & battery saving',
  },
  emerald: {
    name: 'Emerald Night',
    bg: '#060f09',
    cardBg: '#0c1a11',
    desc: 'Deep organic forest night atmosphere',
  },
  midnight: {
    name: 'Midnight Navy',
    bg: '#080d16',
    cardBg: '#0f1726',
    desc: 'Deep cosmic indigo slate aesthetic',
  },
};`;

const replaceMap = `export const THEME_MODE_MAP: Record<ThemeMode, { name: string; bg: string; cardBg: string; desc: string; textPrimary?: string; textSecondary?: string; textMuted?: string; border?: string; surfaceSecondary?: string }> = {
  system: {
    name: 'System',
    bg: '#0d0e12',
    cardBg: '#13151b',
    desc: 'Follows your device settings',
  },
  light: {
    name: 'Clean Light',
    bg: '#f8fafc',
    cardBg: '#ffffff',
    desc: 'High contrast light mode',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    border: '#e2e8f0',
    surfaceSecondary: '#f1f5f9'
  },
  dark: {
    name: 'Onyx Dark',
    bg: '#0d0e12',
    cardBg: '#13151b',
    desc: 'Default calm & high-contrast dark space',
  },
  amoled: {
    name: 'True Black',
    bg: '#000000',
    cardBg: '#0a0a0a',
    desc: 'Pure pitch black for OLED displays & battery saving',
  },
  emerald: {
    name: 'Emerald Night',
    bg: '#060f09',
    cardBg: '#0c1a11',
    desc: 'Deep organic forest night atmosphere',
  },
  midnight: {
    name: 'Midnight Navy',
    bg: '#080d16',
    cardBg: '#0f1726',
    desc: 'Deep cosmic indigo slate aesthetic',
  },
};`;

code = code.replace(searchMap, replaceMap);

const applySearch = `export function applyAppearanceSettings(settings: AppearanceSettings): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  
  // Set theme class / attribute
  root.setAttribute('data-theme', settings.theme);
  root.setAttribute('data-accent', settings.accent);

  const themeInfo = THEME_MODE_MAP[settings.theme];
  const accentInfo = ACCENT_COLOR_MAP[settings.accent];

  if (themeInfo) {
    root.style.setProperty('--app-bg', themeInfo.bg);
    root.style.setProperty('--app-card-bg', themeInfo.cardBg);
    document.body.style.backgroundColor = themeInfo.bg;
  }
  if (accentInfo) {
    root.style.setProperty('--app-accent', accentInfo.hex);
  }
}`;

const applyReplace = `export function applyAppearanceSettings(settings: AppearanceSettings): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  
  root.setAttribute('data-theme', settings.theme);
  root.setAttribute('data-accent', settings.accent);

  let activeTheme = settings.theme;
  if (activeTheme === 'system') {
    activeTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  const themeInfo = THEME_MODE_MAP[activeTheme] || THEME_MODE_MAP.dark;
  const accentInfo = ACCENT_COLOR_MAP[settings.accent];

  if (themeInfo) {
    root.style.setProperty('--app-bg', themeInfo.bg);
    root.style.setProperty('--app-card-bg', themeInfo.cardBg);
    root.style.setProperty('--app-text-primary', themeInfo.textPrimary || '#FFFFFF');
    root.style.setProperty('--app-text-secondary', themeInfo.textSecondary || '#7d8495');
    root.style.setProperty('--app-text-muted', themeInfo.textMuted || '#5c6272');
    root.style.setProperty('--app-surface-border', themeInfo.border || '#1f232c');
    root.style.setProperty('--app-surface-secondary', themeInfo.surfaceSecondary || '#1a1d25');
    
    document.body.style.backgroundColor = themeInfo.bg;
    document.body.style.color = themeInfo.textPrimary || '#FFFFFF';
  }
  if (accentInfo) {
    root.style.setProperty('--app-accent', accentInfo.hex);
  }
}`;

code = code.replace(applySearch, applyReplace);

fs.writeFileSync('src/lib/themeService.ts', code);
