import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Check } from 'lucide-react';
import {
  AppearanceSettings,
  ThemeMode,
  AccentColor,
  readAppearanceSettings,
  saveAppearanceSettings,
  THEME_MODE_MAP,
  ACCENT_COLOR_MAP,
  THEME_CONFIGS,
} from '../../lib/themeService';
import { cn } from '../../lib/utils';
import { useAuth } from '../../lib/AuthContext';

interface ThemeItem {
  id: ThemeMode;
  name: string;
  desc: string;
  bgPreview: string;
  surfacePreview: string;
}

const ALL_THEME_ITEMS: ThemeItem[] = [
  {
    id: 'system',
    name: 'System',
    desc: 'Follows your device settings',
    bgPreview: '#0d0e12',
    surfacePreview: '#13151b',
  },
  {
    id: 'light',
    name: 'Clean Light',
    desc: 'High contrast light mode',
    bgPreview: '#f5f5f7',
    surfacePreview: '#ffffff',
  },
  {
    id: 'dark',
    name: 'Obsidian Dark',
    desc: 'Default calm & high-contrast dark',
    bgPreview: '#0d0e12',
    surfacePreview: '#13151b',
  },
  {
    id: 'oled',
    name: 'OLED Black',
    desc: 'Pure pitch black for OLED battery saving',
    bgPreview: '#000000',
    surfacePreview: '#090a0d',
  },
  {
    id: 'forest',
    name: 'Forest Night',
    desc: 'Deep organic forest night',
    bgPreview: '#07120a',
    surfacePreview: '#0d1e13',
  },
  {
    id: 'cosmic',
    name: 'Cosmic Slate',
    desc: 'Deep cosmic indigo slate',
    bgPreview: '#0c0716',
    surfacePreview: '#170e28',
  },
  {
    id: 'aurora',
    name: 'Aurora Arctic',
    desc: 'Atmospheric northern glow',
    bgPreview: '#061016',
    surfacePreview: '#0b1c24',
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    desc: 'Calm deep indigo navy',
    bgPreview: '#080c18',
    surfacePreview: '#0f152b',
  },
  {
    id: 'glass',
    name: 'Frosted Glass',
    desc: 'Translucent layered depth',
    bgPreview: '#07090e',
    surfacePreview: 'rgba(20, 24, 33, 0.72)',
  },
  {
    id: 'soft-light',
    name: 'Soft Parchment',
    desc: 'Warm paper eye-comfort',
    bgPreview: '#f9f8f6',
    surfacePreview: '#ffffff',
  },
];

const ACCENT_LIST: { id: AccentColor; label: string; hex: string }[] = [
  { id: 'lime', label: 'Signature', hex: '#8cee28' },
  { id: 'cyan', label: 'Cyan', hex: '#22d3ee' },
  { id: 'teal', label: 'Teal', hex: '#10b981' },
  { id: 'blue', label: 'Ocean', hex: '#3b82f6' },
  { id: 'indigo', label: 'Indigo', hex: '#6366f1' },
  { id: 'violet', label: 'Violet', hex: '#c084fc' },
  { id: 'purple', label: 'Purple', hex: '#a855f7' },
  { id: 'pink', label: 'Neon', hex: '#ec4899' },
  { id: 'amber', label: 'Golden', hex: '#f59e0b' },
  { id: 'orange', label: 'Amber', hex: '#f97316' },
  { id: 'red', label: 'Crimson', hex: '#ef4444' },
];

export default function ThemesAppearance() {
  const navigate = useNavigate();
  const { updateProfile } = useAuth();
  const [settings, setSettings] = useState<AppearanceSettings>(readAppearanceSettings());

  useEffect(() => {
    setSettings(readAppearanceSettings());
  }, []);

  const handleUpdate = (updates: Partial<AppearanceSettings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    saveAppearanceSettings(updated);
    if (updateProfile) {
      updateProfile({ appearancePreference: updated.theme }).catch(() => {});
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        // Ignore
      }
    }
  };

  const activeAccent = ACCENT_COLOR_MAP[settings.accent] || ACCENT_COLOR_MAP.lime;
  const currentThemeInfo = THEME_MODE_MAP[settings.theme] || { name: 'Clean Light' };

  return (
    <div className="flex flex-col min-h-screen bg-background text-text-primary pb-32">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={() => navigate('/more')}
            aria-label="Go Back"
            className="w-9 h-9 rounded-full bg-surface-secondary border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0 active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center pr-9">
            <h1 className="text-[17px] font-bold text-text-primary tracking-tight">
              Themes & Appearance
            </h1>
            <p className="text-[11px] text-text-muted">
              Tailor your visual ambiance
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-4 space-y-6">
        {/* 1. LIVE PREVIEW */}
        <section className="space-y-2">
          <div className="p-4 rounded-3xl bg-surface border border-border shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-text-muted uppercase">
                LIVE PREVIEW
              </span>
              <span className="px-3 py-0.5 rounded-full border border-accent-primary/40 bg-accent-primary/10 text-[11px] font-semibold text-accent-primary">
                {currentThemeInfo.name}
              </span>
            </div>

            {/* Inner Interactive Card */}
            <div className="p-3.5 rounded-2xl bg-surface-secondary/80 border border-border flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold shadow-xs shrink-0 transition-transform active:scale-95 cursor-pointer"
                  style={{ backgroundColor: activeAccent.hex, color: activeAccent.contrast }}
                >
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-primary">Morning Routine</h4>
                  <p className="text-xs text-text-muted mt-0.5">Streak: 12 days active</p>
                </div>
              </div>
              <div
                className="w-3.5 h-3.5 rounded-full shadow-xs shrink-0"
                style={{ backgroundColor: activeAccent.hex }}
              />
            </div>
          </div>
        </section>

        {/* 2. THEME MODE (Unified 2-Column Grid matching Screenshot) */}
        <section className="space-y-2.5">
          <label className="text-[12px] font-bold tracking-wider text-text-muted uppercase block">
            THEME MODE
          </label>

          <div className="grid grid-cols-2 gap-2.5">
            {ALL_THEME_ITEMS.map((item) => {
              const isSelected = settings.theme === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleUpdate({ theme: item.id })}
                  className={cn(
                    'p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[92px]',
                    isSelected
                      ? 'border-accent-primary bg-surface shadow-md ring-1 ring-accent-primary/40'
                      : 'border-border bg-surface hover:border-border/80'
                  )}
                >
                  {/* Top row: Preview Swatch + Checkmark if selected */}
                  <div className="flex items-center justify-between w-full">
                    <div
                      className="w-6 h-6 rounded-full border border-white/10 shrink-0 shadow-inner"
                      style={{ backgroundColor: item.bgPreview }}
                    />
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-accent-primary text-accent-contrast flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Bottom info */}
                  <div className="mt-3">
                    <span className="text-[13px] font-bold text-text-primary block leading-tight">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-text-muted line-clamp-1 mt-0.5">
                      {item.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. ACCENT COLOR */}
        <section className="space-y-2.5">
          <label className="text-[12px] font-bold tracking-wider text-text-muted uppercase block">
            ACCENT COLOR
          </label>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
            {ACCENT_LIST.map((acc) => {
              const isSelected = settings.accent === acc.id;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleUpdate({ accent: acc.id })}
                  className={cn(
                    'p-3 rounded-2xl border flex flex-col items-center justify-center min-w-[76px] transition-all cursor-pointer shrink-0',
                    isSelected
                      ? 'border-accent-primary bg-surface shadow-sm ring-1 ring-accent-primary/40'
                      : 'border-border bg-surface hover:border-border/80'
                  )}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shadow-xs text-white"
                    style={{ backgroundColor: acc.hex }}
                  >
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 stroke-[3] text-black" />
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-text-muted mt-1.5 text-center truncate max-w-[68px]">
                    {acc.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. VISUAL EXPERIENCE */}
        <section className="space-y-2.5">
          <label className="text-[12px] font-bold tracking-wider text-text-muted uppercase block">
            VISUAL EXPERIENCE
          </label>

          <div className="rounded-2xl bg-surface border border-border divide-y divide-border/60 overflow-hidden shadow-xs">
            {/* Toggle: Ambient Glow */}
            <div className="p-3.5 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-text-primary">
                  Ambient luminous glow
                </h4>
                <p className="text-xs text-text-muted mt-0.5">
                  Subtle background depth and aura highlights
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.ambientGlow ?? true}
                onClick={() => handleUpdate({ ambientGlow: !(settings.ambientGlow ?? true) })}
                className={cn(
                  'w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer relative shrink-0',
                  (settings.ambientGlow ?? true)
                    ? 'bg-accent-primary'
                    : 'bg-zinc-700/60'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                    (settings.ambientGlow ?? true) ? 'translate-x-6' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            {/* Toggle: Glassmorphism */}
            <div className="p-3.5 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-text-primary">
                  Glassmorphic blur & depth
                </h4>
                <p className="text-xs text-text-muted mt-0.5">
                  Translucent glass materials and backdrop filters
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.glassEffect ?? true}
                onClick={() => handleUpdate({ glassEffect: !(settings.glassEffect ?? true) })}
                className={cn(
                  'w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer relative shrink-0',
                  (settings.glassEffect ?? true)
                    ? 'bg-accent-primary'
                    : 'bg-zinc-700/60'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                    (settings.glassEffect ?? true) ? 'translate-x-6' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            {/* Toggle: Compact Mode */}
            <div className="p-3.5 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-text-primary">
                  Fast animations & tactile haptics
                </h4>
                <p className="text-xs text-text-muted mt-0.5">
                  Snappy transitions and responsive touch feedback
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!(settings.compactMode ?? false)}
                onClick={() => handleUpdate({ compactMode: !settings.compactMode })}
                className={cn(
                  'w-12 h-6 rounded-full transition-colors p-0.5 cursor-pointer relative shrink-0',
                  !(settings.compactMode ?? false)
                    ? 'bg-accent-primary'
                    : 'bg-zinc-700/60'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                    !(settings.compactMode ?? false) ? 'translate-x-6' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
