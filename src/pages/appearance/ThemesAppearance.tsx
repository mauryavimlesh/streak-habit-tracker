import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  Paintbrush,
  Sparkles,
  Check,
  Eye,
  Sliders,
  SunMoon,
} from 'lucide-react';
import {
  AppearanceSettings,
  ThemeMode,
  AccentColor,
  readAppearanceSettings,
  saveAppearanceSettings,
  THEME_MODE_MAP,
  ACCENT_COLOR_MAP,
} from '../../lib/themeService';
import { cn } from '../../lib/utils';

export default function ThemesAppearance() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppearanceSettings>(readAppearanceSettings());

  useEffect(() => {
    setSettings(readAppearanceSettings());
  }, []);

  const handleUpdate = (updates: Partial<AppearanceSettings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    saveAppearanceSettings(updated);
    if (navigator.vibrate) navigator.vibrate(8);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0d0e12] text-white pb-24 select-none">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#0d0e12]/90 backdrop-blur-xl border-b border-white/10 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/more')}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Themes & Appearance</h1>
            <p className="text-xs text-[#7d8495]">Tailor your visual ambiance</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto w-full px-5 pt-4 space-y-5">
        {/* Live Canvas Preview Card */}
        <div className="p-4 rounded-3xl bg-[#13151b] border border-white/10 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#7d8495] uppercase tracking-wider">
              Live Preview
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#8cee28]/15 text-[#8cee28] border border-[#8cee28]/30">
              {THEME_MODE_MAP[settings.theme].name}
            </span>
          </div>

          <div
            className="p-3.5 rounded-2xl border border-white/10 flex items-center justify-between"
            style={{ backgroundColor: THEME_MODE_MAP[settings.theme].bg }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-black font-bold"
                style={{ backgroundColor: ACCENT_COLOR_MAP[settings.accent].hex }}
              >
                <Check className="w-5 h-5 stroke-[3]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Morning Routine</h4>
                <p className="text-[10px] text-[#7d8495]">Streak: 12 days active</p>
              </div>
            </div>
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: ACCENT_COLOR_MAP[settings.accent].hex }}
            />
          </div>
        </div>

        {/* Theme Modes */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#7d8495] uppercase tracking-wider block">
            Theme Mode
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {(Object.keys(THEME_MODE_MAP) as ThemeMode[]).map((mode) => {
              const info = THEME_MODE_MAP[mode];
              const isSelected = settings.theme === mode;

              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleUpdate({ theme: mode })}
                  className={cn(
                    'p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative',
                    isSelected
                      ? 'bg-white/10 border-white/30 shadow-lg'
                      : 'bg-[#13151b] border-white/5 hover:border-white/15'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-5 h-5 rounded-full border border-white/20"
                      style={{ backgroundColor: info.bg }}
                    />
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-[#8cee28] text-black flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white">{info.name}</h4>
                  <p className="text-[10px] text-[#7d8495] mt-0.5 line-clamp-1">{info.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent Colors */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#7d8495] uppercase tracking-wider block">
            Accent Color
          </label>
          <div className="grid grid-cols-5 gap-2">
            {(Object.keys(ACCENT_COLOR_MAP) as AccentColor[]).map((acc) => {
              const info = ACCENT_COLOR_MAP[acc];
              const isSelected = settings.accent === acc;

              return (
                <button
                  key={acc}
                  type="button"
                  onClick={() => handleUpdate({ accent: acc })}
                  className={cn(
                    'p-3 rounded-2xl bg-[#13151b] border flex flex-col items-center gap-1.5 transition-all cursor-pointer',
                    isSelected
                      ? 'border-white/40 bg-white/10 scale-105 shadow-md'
                      : 'border-white/5 hover:border-white/15'
                  )}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-black"
                    style={{ backgroundColor: info.hex }}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="text-[10px] text-white/80 font-medium truncate w-full text-center">
                    {info.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Visual Experience Toggles */}
        <div className="space-y-2 pt-1">
          <label className="text-xs font-semibold text-[#7d8495] uppercase tracking-wider block">
            Visual Experience
          </label>
          <div className="p-4 rounded-3xl bg-[#13151b] border border-white/5 space-y-4">
            {/* Glassmorphism Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">Glassmorphism Blur</h4>
                <p className="text-[10px] text-[#7d8495]">Frosted glass overlays & bottom sheets</p>
              </div>
              <button
                type="button"
                onClick={() => handleUpdate({ glassEffect: !settings.glassEffect })}
                className={cn(
                  'w-11 h-6 rounded-full transition-colors relative cursor-pointer',
                  settings.glassEffect ? 'bg-[#8cee28]' : 'bg-white/10'
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded-full top-1 absolute shadow transition-transform',
                    settings.glassEffect ? 'translate-x-6 bg-black' : 'translate-x-1 bg-white/60'
                  )}
                />
              </button>
            </div>

            {/* Ambient Background Glow Toggle */}
            <div className="flex items-center justify-between border-t border-white/5 pt-3">
              <div>
                <h4 className="text-xs font-bold text-white">Ambient Glow</h4>
                <p className="text-[10px] text-[#7d8495]">Soft atmospheric light pulses behind cards</p>
              </div>
              <button
                type="button"
                onClick={() => handleUpdate({ ambientGlow: !settings.ambientGlow })}
                className={cn(
                  'w-11 h-6 rounded-full transition-colors relative cursor-pointer',
                  settings.ambientGlow ? 'bg-[#8cee28]' : 'bg-white/10'
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded-full top-1 absolute shadow transition-transform',
                    settings.ambientGlow ? 'translate-x-6 bg-black' : 'translate-x-1 bg-white/60'
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
