export type ThemeMode = 'system' | 'light' | 'dark' | 'amoled' | 'emerald' | 'midnight';
export type AccentColor = 'lime' | 'cyan' | 'emerald' | 'violet' | 'amber';

export interface AppearanceSettings {
  theme: ThemeMode;
  accent: AccentColor;
  glassEffect: boolean;
  ambientGlow: boolean;
  compactMode: boolean;
}

const LOCAL_THEME_KEY = 'streak_appearance_v1';

export const ACCENT_COLOR_MAP: Record<AccentColor, { hex: string; name: string; bgClass: string }> = {
  lime: { hex: '#8cee28', name: 'Signature Lime', bgClass: 'bg-[#8cee28]' },
  cyan: { hex: '#22d3ee', name: 'Electric Cyan', bgClass: 'bg-[#22d3ee]' },
  emerald: { hex: '#10b981', name: 'Vibrant Jade', bgClass: 'bg-[#10b981]' },
  violet: { hex: '#a855f7', name: 'Amethyst', bgClass: 'bg-[#a855f7]' },
  amber: { hex: '#f59e0b', name: 'Solar Gold', bgClass: 'bg-[#f59e0b]' },
};

export const THEME_MODE_MAP: Record<ThemeMode, { name: string; bg: string; cardBg: string; desc: string; textPrimary?: string; textSecondary?: string; textMuted?: string; border?: string; surfaceSecondary?: string }> = {
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
};

const DEFAULT_SETTINGS: AppearanceSettings = {
  theme: 'dark',
  accent: 'lime',
  glassEffect: true,
  ambientGlow: true,
  compactMode: false,
};

export function readAppearanceSettings(): AppearanceSettings {
  try {
    const raw = localStorage.getItem(LOCAL_THEME_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveAppearanceSettings(settings: AppearanceSettings): void {
  try {
    localStorage.setItem(LOCAL_THEME_KEY, JSON.stringify(settings));
    applyAppearanceSettings(settings);
  } catch {
    // Ignore
  }
}

export function applyAppearanceSettings(settings: AppearanceSettings): void {
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
}

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    const settings = readAppearanceSettings();
    if (settings.theme === 'system') {
      applyAppearanceSettings(settings);
    }
  });
}
