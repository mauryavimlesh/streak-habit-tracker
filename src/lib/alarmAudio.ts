// STREAK Alarm Audio & Vibration Engine
// Provides synthesized zero-latency built-in alarm tones using Web Audio API,
// as well as playback for custom device audio blobs with volume & vibration support.

export interface AlarmToneOption {
  id: string;
  name: string;
  description: string;
  category: 'built-in' | 'custom';
}

export const BUILT_IN_TONES: AlarmToneOption[] = [
  {
    id: 'streak-pulse',
    name: 'STREAK Pulse',
    description: 'Crisp, resonant 3-tone harmonic chime',
    category: 'built-in',
  },
  {
    id: 'atomic-focus',
    name: 'Atomic Focus',
    description: 'Ascending crystal bell progression',
    category: 'built-in',
  },
  {
    id: 'zen-bell',
    name: 'Zen Bell',
    description: 'Deep warm singing bowl gong',
    category: 'built-in',
  },
  {
    id: 'gentle-sunrise',
    name: 'Gentle Sunrise',
    description: 'Warm acoustic morning arpeggio',
    category: 'built-in',
  },
  {
    id: 'digital-beep',
    name: 'Digital Beep',
    description: 'Classic electronic alarm clock pulse',
    category: 'built-in',
  },
  {
    id: 'vibrant-marimba',
    name: 'Vibrant Marimba',
    description: 'Uplifting percussive wooden melody',
    category: 'built-in',
  },
];

export type VibrationPatternType = 'default' | 'double-pulse' | 'long-persistent' | 'off';

export interface VibrationPatternConfig {
  id: VibrationPatternType;
  name: string;
  description: string;
  pattern: number[];
  loopIntervalMs: number;
}

export const VIBRATION_PATTERNS: Record<VibrationPatternType, VibrationPatternConfig> = {
  'default': {
    id: 'default',
    name: 'Default',
    description: 'Balanced rhythmic pulses',
    pattern: [500, 200, 500, 200, 800],
    loopIntervalMs: 2500,
  },
  'double-pulse': {
    id: 'double-pulse',
    name: 'Double Pulse',
    description: 'Quick crisp double beats',
    pattern: [150, 100, 150, 600],
    loopIntervalMs: 1400,
  },
  'long-persistent': {
    id: 'long-persistent',
    name: 'Long Persistent',
    description: 'Continuous deep alert buzzes',
    pattern: [1000, 250, 1000, 250],
    loopIntervalMs: 2800,
  },
  'off': {
    id: 'off',
    name: 'Off',
    description: 'No vibration',
    pattern: [],
    loopIntervalMs: 0,
  },
};

export const VIBRATION_PATTERN_OPTIONS: VibrationPatternConfig[] = [
  VIBRATION_PATTERNS['default'],
  VIBRATION_PATTERNS['double-pulse'],
  VIBRATION_PATTERNS['long-persistent'],
  VIBRATION_PATTERNS['off'],
];

/**
 * Previews a single cycle of a vibration pattern.
 */
export function previewVibrationPattern(patternType: VibrationPatternType): boolean {
  if (patternType === 'off') {
    stopAlarmVibration();
    return true;
  }
  const config = VIBRATION_PATTERNS[patternType] || VIBRATION_PATTERNS['default'];
  if (config.pattern.length > 0) {
    return triggerAlarmVibration(config.pattern);
  }
  return false;
}

let globalAudioCtx: AudioContext | null = null;
let previewAudioElement: HTMLAudioElement | null = null;
let alarmAudioElement: HTMLAudioElement | null = null;
let alarmLoopInterval: any = null;
let vibrationInterval: any = null;
let isPreviewing = false;
let isAlarmRinging = false;
let currentActiveToneName = 'STREAK Pulse';

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
    globalAudioCtx = new AudioContextClass();
  }
  if (globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume().catch(() => {});
  }
  return globalAudioCtx;
}

/**
 * Synthesizes a bell/chime note with harmonic richness and exponential decay.
 */
function playSynthNote(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  gainLevel: number = 0.25,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(gainLevel, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * Plays one iteration of a built-in alarm tone using Web Audio API.
 */
function playToneSequence(ctx: AudioContext, toneId: string, volume: number = 0.85): number {
  const now = ctx.currentTime;
  const masterGain = Math.max(0.05, Math.min(1.0, volume));

  switch (toneId) {
    case 'streak-pulse': {
      // Modern 3-note harmonic chord: F#5 (739.99), A#5 (932.33), C#6 (1108.73)
      playSynthNote(ctx, 739.99, now + 0.0, 1.2, 0.35 * masterGain, 'sine');
      playSynthNote(ctx, 932.33, now + 0.18, 1.2, 0.35 * masterGain, 'sine');
      playSynthNote(ctx, 1108.73, now + 0.36, 1.8, 0.45 * masterGain, 'triangle');
      return 2.2;
    }

    case 'atomic-focus': {
      // Fast bright 5-note chime: C5 (523), E5 (659), G5 (784), B5 (987), C6 (1046)
      const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
      notes.forEach((freq, idx) => {
        playSynthNote(ctx, freq, now + idx * 0.12, 1.0, 0.3 * masterGain, 'triangle');
      });
      return 1.8;
    }

    case 'zen-bell': {
      // Deep meditation bowl: fundamental 216Hz + overtones 432Hz and 648Hz
      playSynthNote(ctx, 216, now, 3.2, 0.5 * masterGain, 'sine');
      playSynthNote(ctx, 432, now + 0.05, 2.8, 0.25 * masterGain, 'sine');
      playSynthNote(ctx, 648, now + 0.1, 2.0, 0.15 * masterGain, 'sine');
      return 3.5;
    }

    case 'gentle-sunrise': {
      // Warm acoustic morning arpeggio
      const notes = [329.63, 415.3, 493.88, 659.25, 830.61]; // E4, G#4, B4, E5, G#5
      notes.forEach((freq, idx) => {
        playSynthNote(ctx, freq, now + idx * 0.22, 1.4, 0.28 * masterGain, 'sine');
      });
      return 2.4;
    }

    case 'digital-beep': {
      // Crisp retro 880Hz double pulse
      playSynthNote(ctx, 880, now + 0.0, 0.12, 0.4 * masterGain, 'square');
      playSynthNote(ctx, 880, now + 0.2, 0.12, 0.4 * masterGain, 'square');
      playSynthNote(ctx, 880, now + 0.6, 0.12, 0.4 * masterGain, 'square');
      playSynthNote(ctx, 880, now + 0.8, 0.12, 0.4 * masterGain, 'square');
      return 1.4;
    }

    case 'vibrant-marimba': {
      // Percussive woody marimba: G4, C5, D5, G5
      const freqs = [392.0, 523.25, 587.33, 783.99, 1046.5];
      freqs.forEach((freq, idx) => {
        const t = now + idx * 0.14;
        playSynthNote(ctx, freq, t, 0.4, 0.45 * masterGain, 'triangle');
        playSynthNote(ctx, freq * 2, t, 0.15, 0.15 * masterGain, 'sine');
      });
      return 1.6;
    }

    default:
      playSynthNote(ctx, 739.99, now, 1.0, 0.3 * masterGain, 'sine');
      return 1.2;
  }
}

/**
 * Triggers hardware vibration if supported by device/browser.
 */
export function triggerAlarmVibration(pattern: number[] = [400, 200, 400, 200, 600]): boolean {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Stops any ongoing hardware vibration.
 */
export function stopAlarmVibration() {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch {
      // Ignore
    }
  }
  if (vibrationInterval) {
    clearInterval(vibrationInterval);
    vibrationInterval = null;
  }
}

/**
 * Previews a tone once (or stops preview if currently playing).
 */
export async function previewAlarmTone(
  toneId: string,
  customAudioBlob?: Blob | null,
  volume: number = 0.85
): Promise<void> {
  stopPreviewTone();
  stopAlarmSound();

  isPreviewing = true;

  if (toneId === 'custom' && customAudioBlob) {
    try {
      const url = URL.createObjectURL(customAudioBlob);
      previewAudioElement = new Audio(url);
      previewAudioElement.volume = Math.max(0, Math.min(1, volume));
      previewAudioElement.onended = () => {
        stopPreviewTone();
      };
      previewAudioElement.onerror = () => {
        stopPreviewTone();
      };
      await previewAudioElement.play();
    } catch (err) {
      console.warn('Failed to preview custom audio:', err);
      stopPreviewTone();
    }
    return;
  }

  // Synthesized built-in tone
  const ctx = getAudioContext();
  if (!ctx) return;

  const durationSec = playToneSequence(ctx, toneId, volume);
  setTimeout(() => {
    if (isPreviewing) {
      isPreviewing = false;
    }
  }, durationSec * 1000);
}

/**
 * Stops any tone preview.
 */
export function stopPreviewTone(): void {
  isPreviewing = false;
  if (previewAudioElement) {
    previewAudioElement.pause();
    previewAudioElement.currentTime = 0;
    previewAudioElement = null;
  }
}

/**
 * Starts continuous alarm ringing (loops until stopped or snoozed).
 */
export async function startAlarmSound(
  toneId: string = 'streak-pulse',
  customAudioBlob?: Blob | null,
  volume: number = 0.85,
  vibrate: boolean = true,
  vibrationPattern: VibrationPatternType = 'default'
): Promise<void> {
  stopAlarmSound();
  stopPreviewTone();

  isAlarmRinging = true;
  const toneObj = BUILT_IN_TONES.find((t) => t.id === toneId);
  currentActiveToneName = toneId === 'custom' ? 'Custom Device Tone' : toneObj?.name || 'STREAK Pulse';

  // Hardware vibration loop based on selected pattern
  if (vibrate && vibrationPattern !== 'off') {
    const config = VIBRATION_PATTERNS[vibrationPattern] || VIBRATION_PATTERNS['default'];
    if (config.pattern.length > 0) {
      triggerAlarmVibration(config.pattern);
      const intervalMs = config.loopIntervalMs || 2500;
      vibrationInterval = setInterval(() => {
        if (!isAlarmRinging) {
          stopAlarmVibration();
          return;
        }
        triggerAlarmVibration(config.pattern);
      }, intervalMs);
    }
  }

  // If custom audio blob is present
  if (toneId === 'custom' && customAudioBlob) {
    try {
      const url = URL.createObjectURL(customAudioBlob);
      alarmAudioElement = new Audio(url);
      alarmAudioElement.loop = true;
      alarmAudioElement.volume = Math.max(0, Math.min(1, volume));
      await alarmAudioElement.play();
      return;
    } catch (err) {
      console.warn('Custom audio play failed, falling back to STREAK pulse:', err);
      // Fallback to built-in tone
    }
  }

  // Synthesized tone loop
  const ctx = getAudioContext();
  if (!ctx) return;

  const singleDuration = playToneSequence(ctx, toneId, volume);
  const loopIntervalMs = Math.max(1600, singleDuration * 1000 + 350);

  alarmLoopInterval = setInterval(() => {
    if (!isAlarmRinging) {
      clearInterval(alarmLoopInterval);
      alarmLoopInterval = null;
      return;
    }
    const activeCtx = getAudioContext();
    if (activeCtx) {
      playToneSequence(activeCtx, toneId, volume);
    }
  }, loopIntervalMs);
}

/**
 * Stops continuous alarm ringing and vibration.
 */
export function stopAlarmSound(): void {
  isAlarmRinging = false;
  if (alarmLoopInterval) {
    clearInterval(alarmLoopInterval);
    alarmLoopInterval = null;
  }
  if (alarmAudioElement) {
    alarmAudioElement.pause();
    alarmAudioElement.currentTime = 0;
    alarmAudioElement = null;
  }
  stopAlarmVibration();
}

export function getIsAlarmRinging(): boolean {
  return isAlarmRinging;
}

export function getCurrentToneName(): string {
  return currentActiveToneName;
}
