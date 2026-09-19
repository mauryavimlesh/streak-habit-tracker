export type ThemeMode =
  | 'system'
  | 'dark'
  | 'light'
  | 'glass'
  | 'oled'
  | 'aurora'
  | 'midnight'
  | 'soft-light'
  | 'forest'
  | 'cosmic';

export type AccentColor =
  | 'lime'
  | 'cyan'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'violet'
  | 'pink'
  | 'orange'
  | 'amber'
  | 'red'
  | 'teal';

export interface AppearanceSettings {
  theme: ThemeMode;
  accent: AccentColor;
  glassEffect?: boolean;
  ambientGlow?: boolean;
  compactMode?: boolean;
}

const LOCAL_THEME_KEY = 'streak_appearance_v1';

export const ACCENT_COLOR_MAP: Record<
  AccentColor,
  { hex: string; contrast: string; name: string; bgClass: string }
> = {
  lime: { hex: '#8cee28', contrast: '#0a1003', name: 'Signature', bgClass: 'bg-[#8cee28]' },
  cyan: { hex: '#22d3ee', contrast: '#021a22', name: 'Cyan', bgClass: 'bg-[#22d3ee]' },
  teal: { hex: '#10b981', contrast: '#011714', name: 'Teal', bgClass: 'bg-[#10b981]' },
  indigo: { hex: '#6366f1', contrast: '#ffffff', name: 'Indigo', bgClass: 'bg-[#6366f1]' },
  violet: { hex: '#c084fc', contrast: '#0a0515', name: 'Violet', bgClass: 'bg-[#c084fc]' },
  purple: { hex: '#a855f7', contrast: '#ffffff', name: 'Purple', bgClass: 'bg-[#a855f7]' },
  blue: { hex: '#3b82f6', contrast: '#ffffff', name: 'Ocean', bgClass: 'bg-[#3b82f6]' },
  pink: { hex: '#ec4899', contrast: '#ffffff', name: 'Neon', bgClass: 'bg-[#ec4899]' },
  amber: { hex: '#f59e0b', contrast: '#0a0800', name: 'Golden', bgClass: 'bg-[#f59e0b]' },
  orange: { hex: '#f97316', contrast: '#ffffff', name: 'Amber', bgClass: 'bg-[#f97316]' },
  red: { hex: '#ef4444', contrast: '#ffffff', name: 'Crimson', bgClass: 'bg-[#ef4444]' },
};

export interface ThemeTokens {
  name: string;
  desc: string;
  bg: string;
  surface: string;
  surfaceElevated: string;
  surfaceGlass: string;
  surfaceGlassSubtle: string;
  surfaceGlassBorder: string;
  surfaceGlassElevated?: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  shadow: string;
  overlay: string;
  backdropBlur?: string;
  isLight?: boolean;
}

export const THEME_CONFIGS: Record<Exclude<ThemeMode, 'system'>, ThemeTokens> = {
  dark: {
    name: 'Obsidian Dark',
    desc: 'Default calm & high-contrast dark',
    bg: '#0d0e12',
    surface: '#13151b',
    surfaceElevated: '#1a1d25',
    surfaceGlass: 'rgba(19, 21, 27, 0.85)',
    surfaceGlassSubtle: 'rgba(19, 21, 27, 0.55)',
    surfaceGlassElevated: '#1e222c',
    surfaceGlassBorder: 'rgba(255, 255, 255, 0.08)',
    border: '#1f232c',
    textPrimary: '#ffffff',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    shadow: '0 8px 32px -4px rgba(0, 0, 0, 0.5)',
    overlay: 'rgba(0, 0, 0, 0.75)',
  },
  light: {
    name: 'Clean Light',
    desc: 'High contrast light mode',
    bg: '#f5f5f7',
    surface: '#ffffff',
    surfaceElevated: '#f9fafb',
    surfaceGlass: 'rgba(255, 255, 255, 0.88)',
    surfaceGlassSubtle: 'rgba(255, 255, 255, 0.65)',
    surfaceGlassElevated: '#ffffff',
    surfaceGlassBorder: 'rgba(0, 0, 0, 0.08)',
    border: '#e2e8f0',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',
    shadow: '0 4px 20px -2px rgba(0, 0, 0, 0.07)',
    overlay: 'rgba(15, 23, 42, 0.45)',
    isLight: true,
  },
  glass: {
    name: 'Frosted Glass',
    desc: 'Translucent layered depth',
    bg: '#07090e',
    surface: 'rgba(20, 24, 33, 0.70)',
    surfaceElevated: 'rgba(28, 34, 48, 0.78)',
    surfaceGlass: 'rgba(20, 24, 33, 0.68)',
    surfaceGlassSubtle: 'rgba(255, 255, 255, 0.04)',
    surfaceGlassElevated: 'rgba(28, 34, 48, 0.78)',
    surfaceGlassBorder: 'rgba(255, 255, 255, 0.14)',
    border: 'rgba(255, 255, 255, 0.12)',
    textPrimary: '#ffffff',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    shadow: '0 12px 36px 0 rgba(0, 0, 0, 0.55)',
    overlay: 'rgba(0, 0, 0, 0.75)',
    backdropBlur: 'blur(20px) saturate(180%)',
  },
  oled: {
    name: 'OLED Black',
    desc: 'Pure pitch black for OLED battery saving',
    bg: '#000000',
    surface: '#090a0d',
    surfaceElevated: '#121318',
    surfaceGlass: 'rgba(9, 10, 13, 0.92)',
    surfaceGlassSubtle: 'rgba(255, 255, 255, 0.03)',
    surfaceGlassElevated: '#121318',
    surfaceGlassBorder: 'rgba(255, 255, 255, 0.07)',
    border: '#1a1c24',
    textPrimary: '#ffffff',
    textSecondary: '#94a3b8',
    textMuted: '#525e75',
    shadow: '0 8px 32px -4px rgba(0, 0, 0, 0.95)',
    overlay: 'rgba(0, 0, 0, 0.88)',
  },
  aurora: {
    name: 'Aurora Arctic',
    desc: 'Atmospheric northern glow',
    bg: '#061016',
    surface: '#0b1c24',
    surfaceElevated: '#112732',
    surfaceGlass: 'rgba(11, 28, 36, 0.85)',
    surfaceGlassSubtle: 'rgba(126, 192, 204, 0.08)',
    surfaceGlassElevated: '#112732',
    surfaceGlassBorder: 'rgba(126, 192, 204, 0.18)',
    border: '#163342',
    textPrimary: '#e6f7f9',
    textSecondary: '#7ec0cc',
    textMuted: '#4d828d',
    shadow: '0 8px 32px -4px rgba(4, 20, 26, 0.7)',
    overlay: 'rgba(6, 16, 22, 0.8)',
  },
  midnight: {
    name: 'Midnight Blue',
    desc: 'Calm deep indigo navy',
    bg: '#080c18',
    surface: '#0f152b',
    surfaceElevated: '#161e3d',
    surfaceGlass: 'rgba(15, 21, 43, 0.85)',
    surfaceGlassSubtle: 'rgba(147, 163, 214, 0.08)',
    surfaceGlassElevated: '#161e3d',
    surfaceGlassBorder: 'rgba(147, 163, 214, 0.16)',
    border: '#1e284f',
    textPrimary: '#eef2ff',
    textSecondary: '#93a3d6',
    textMuted: '#5b6999',
    shadow: '0 8px 32px -4px rgba(4, 7, 18, 0.7)',
    overlay: 'rgba(8, 12, 24, 0.8)',
  },
  'soft-light': {
    name: 'Soft Parchment',
    desc: 'Warm paper eye-comfort',
    bg: '#f9f8f6',
    surface: '#ffffff',
    surfaceElevated: '#f2efe9',
    surfaceGlass: 'rgba(255, 255, 255, 0.92)',
    surfaceGlassSubtle: 'rgba(0, 0, 0, 0.03)',
    surfaceGlassElevated: '#ffffff',
    surfaceGlassBorder: 'rgba(0, 0, 0, 0.08)',
    border: '#e6e2d8',
    textPrimary: '#1c1917',
    textSecondary: '#57534e',
    textMuted: '#857f77',
    shadow: '0 4px 20px -2px rgba(44, 38, 30, 0.06)',
    overlay: 'rgba(28, 25, 23, 0.45)',
    isLight: true,
  },
  forest: {
    name: 'Forest Night',
    desc: 'Deep organic forest night',
    bg: '#07120a',
    surface: '#0d1e13',
    surfaceElevated: '#132b1c',
    surfaceGlass: 'rgba(13, 30, 19, 0.85)',
    surfaceGlassSubtle: 'rgba(133, 185, 149, 0.08)',
    surfaceGlassElevated: '#132b1c',
    surfaceGlassBorder: 'rgba(133, 185, 149, 0.18)',
    border: '#1a3b26',
    textPrimary: '#eaf5ee',
    textSecondary: '#85b995',
    textMuted: '#4e7b5c',
    shadow: '0 8px 32px -4px rgba(3, 15, 8, 0.7)',
    overlay: 'rgba(7, 18, 10, 0.8)',
  },
  cosmic: {
    name: 'Cosmic Slate',
    desc: 'Deep cosmic indigo slate',
    bg: '#0c0716',
    surface: '#170e28',
    surfaceElevated: '#21143a',
    surfaceGlass: 'rgba(23, 14, 40, 0.85)',
    surfaceGlassSubtle: 'rgba(183, 158, 220, 0.08)',
    surfaceGlassElevated: '#21143a',
    surfaceGlassBorder: 'rgba(183, 158, 220, 0.18)',
    border: '#2e1c50',
    textPrimary: '#f5eefc',
    textSecondary: '#b79edc',
    textMuted: '#786299',
    shadow: '0 8px 32px -4px rgba(10, 5, 20, 0.75)',
    overlay: 'rgba(12, 7, 22, 0.82)',
  },
};

export const THEME_MODE_MAP: Record<ThemeMode, { name: string; desc: string; bg: string; cardBg: string }> = {
  system: {
    name: 'System',
    desc: 'Follows your device settings',
    bg: '#0d0e12',
    cardBg: '#13151b',
  },
  dark: {
    name: 'Obsidian Dark',
    desc: 'Default calm & high-contrast dark',
    bg: THEME_CONFIGS.dark.bg,
    cardBg: THEME_CONFIGS.dark.surface,
  },
  light: {
    name: 'Clean Light',
    desc: 'High contrast light mode',
    bg: THEME_CONFIGS.light.bg,
    cardBg: THEME_CONFIGS.light.surface,
  },
  glass: {
    name: 'Frosted Glass',
    desc: 'Translucent layered depth',
    bg: THEME_CONFIGS.glass.bg,
    cardBg: THEME_CONFIGS.glass.surface,
  },
  oled: {
    name: 'OLED Black',
    desc: 'Pure pitch black for OLED battery saving',
    bg: THEME_CONFIGS.oled.bg,
    cardBg: THEME_CONFIGS.oled.surface,
  },
  forest: {
    name: 'Forest Night',
    desc: 'Deep organic forest night',
    bg: THEME_CONFIGS.forest.bg,
    cardBg: THEME_CONFIGS.forest.surface,
  },
  cosmic: {
    name: 'Cosmic Slate',
    desc: 'Deep cosmic indigo slate',
    bg: THEME_CONFIGS.cosmic.bg,
    cardBg: THEME_CONFIGS.cosmic.surface,
  },
  aurora: {
    name: 'Aurora Arctic',
    desc: 'Atmospheric northern glow',
    bg: THEME_CONFIGS.aurora.bg,
    cardBg: THEME_CONFIGS.aurora.surface,
  },
  midnight: {
    name: 'Midnight Blue',
    desc: 'Calm deep indigo navy',
    bg: THEME_CONFIGS.midnight.bg,
    cardBg: THEME_CONFIGS.midnight.surface,
  },
  'soft-light': {
    name: 'Soft Parchment',
    desc: 'Warm paper eye-comfort',
    bg: THEME_CONFIGS['soft-light'].bg,
    cardBg: THEME_CONFIGS['soft-light'].surface,
  },
};

const DEFAULT_SETTINGS: AppearanceSettings = {
  theme: 'dark',
  accent: 'lime',
  glassEffect: true,
  ambientGlow: true,
  compactMode: false,
};

const VALID_THEMES: ThemeMode[] = [
  'system',
  'dark',
  'light',
  'glass',
  'oled',
  'aurora',
  'midnight',
  'soft-light',
  'forest',
  'cosmic',
];

const VALID_ACCENTS: AccentColor[] = [
  'lime',
  'cyan',
  'blue',
  'indigo',
  'purple',
  'violet',
  'pink',
  'orange',
  'amber',
  'red',
  'teal',
];

export function readAppearanceSettings(): AppearanceSettings {
  try {
    const raw = localStorage.getItem(LOCAL_THEME_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    
    // Normalization
    let theme: ThemeMode = parsed.theme;
    if (theme === ('amoled' as any)) theme = 'oled';
    if (theme === ('emerald' as any)) theme = 'forest';
    if (!VALID_THEMES.includes(theme)) {
      theme = 'dark';
    }

    let accent: AccentColor = parsed.accent;
    if (accent === ('emerald' as any)) accent = 'teal';
    if (!VALID_ACCENTS.includes(accent)) {
      accent = 'lime';
    }

    return { ...DEFAULT_SETTINGS, ...parsed, theme, accent };
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

  // Resolve active theme configuration
  let resolvedMode: Exclude<ThemeMode, 'system'> = 'dark';
  if (settings.theme === 'system') {
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    resolvedMode = isDark ? 'dark' : 'light';
  } else {
    resolvedMode = settings.theme;
  }

  const tokens = THEME_CONFIGS[resolvedMode] || THEME_CONFIGS.dark;
  const accentInfo = ACCENT_COLOR_MAP[settings.accent] || ACCENT_COLOR_MAP.lime;

  // Set data attributes on html root
  root.setAttribute('data-theme', settings.theme);
  root.setAttribute('data-resolved-theme', resolvedMode);
  root.setAttribute('data-accent', settings.accent);

  root.classList.remove('light-mode', 'dark-mode', 'glass-mode', 'theme-glass');
  if (tokens.isLight) {
    root.classList.add('light-mode');
  } else if (resolvedMode === 'glass') {
    root.classList.add('glass-mode', 'theme-glass', 'dark-mode');
  } else {
    root.classList.add('dark-mode');
  }

  // Set CSS Semantic Tokens
  root.style.setProperty('--background', tokens.bg);
  root.style.setProperty('--app-bg', tokens.bg);
  root.style.setProperty('--surface', tokens.surface);
  root.style.setProperty('--app-card-bg', tokens.surface);
  root.style.setProperty('--surface-elevated', tokens.surfaceElevated);
  root.style.setProperty('--app-surface-secondary', tokens.surfaceElevated);
  root.style.setProperty('--surface-glass', tokens.surfaceGlass);
  root.style.setProperty('--surface-glass-subtle', tokens.surfaceGlassSubtle || 'rgba(255, 255, 255, 0.04)');
  root.style.setProperty('--surface-glass-elevated', tokens.surfaceGlassElevated || tokens.surfaceElevated);
  root.style.setProperty('--surface-glass-border', tokens.surfaceGlassBorder || tokens.border);
  root.style.setProperty('--border', tokens.border);
  root.style.setProperty('--surface-border', tokens.border);
  root.style.setProperty('--app-surface-border', tokens.border);
  root.style.setProperty('--text-primary', tokens.textPrimary);
  root.style.setProperty('--app-text-primary', tokens.textPrimary);
  root.style.setProperty('--text-secondary', tokens.textSecondary);
  root.style.setProperty('--app-text-secondary', tokens.textSecondary);
  root.style.setProperty('--text-muted', tokens.textMuted);
  root.style.setProperty('--app-text-muted', tokens.textMuted);
  root.style.setProperty('--shadow', tokens.shadow);
  root.style.setProperty('--overlay', tokens.overlay);

  // Set Accent Colors
  root.style.setProperty('--accent', accentInfo.hex);
  root.style.setProperty('--app-accent', accentInfo.hex);
  root.style.setProperty('--accent-contrast', accentInfo.contrast);

  // Global body background
  document.body.style.backgroundColor = tokens.bg;
  document.body.style.color = tokens.textPrimary;
}

if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemChange = () => {
    const settings = readAppearanceSettings();
    if (settings.theme === 'system') {
      applyAppearanceSettings(settings);
    }
  };
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleSystemChange);
  } else {
    mediaQuery.addListener(handleSystemChange);
  }
}
