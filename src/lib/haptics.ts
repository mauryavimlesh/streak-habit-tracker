/**
 * Tactile 'Premium OS' Haptics Service
 * Provides Apple-inspired subtle vibration feedback patterns via navigator.vibrate()
 */

export type HapticPreset = 'tap' | 'step' | 'selection' | 'completion' | 'warning' | 'error' | 'light';

export function triggerHaptic(pattern: number | number[] | HapticPreset = 25): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  if (!('vibrate' in navigator) || typeof navigator.vibrate !== 'function') {
    return false;
  }

  try {
    if (typeof pattern === 'string') {
      switch (pattern) {
        case 'tap':
        case 'step':
        case 'light':
          return navigator.vibrate(18);
        case 'selection':
          return navigator.vibrate(25);
        case 'completion':
          return navigator.vibrate([40, 60, 40]);
        case 'warning':
          return navigator.vibrate([30, 50, 30]);
        case 'error':
          return navigator.vibrate([50, 70, 50, 70, 50]);
        default:
          return navigator.vibrate(20);
      }
    }
    return navigator.vibrate(pattern);
  } catch {
    // Graceful fallback on restricted or unsupported environments
    return false;
  }
}

/**
 * Double-pulse confirmation vibration when completing a habit or task (Apple OS feel)
 */
export function hapticTaskDone(): boolean {
  return triggerHaptic([40, 60, 40]);
}

/**
 * Alias for habit completion feedback
 */
export function hapticHabitDone(): boolean {
  return triggerHaptic([40, 60, 40]);
}

/**
 * Crisp micro-tap when incrementing a counter or taking a step
 */
export function hapticStep(): boolean {
  return triggerHaptic(20);
}

/**
 * Light subtle pulse for undo or reset
 */
export function hapticLight(): boolean {
  return triggerHaptic(15);
}

/**
 * Medium pulse for toggling switches or selections
 */
export function hapticSelection(): boolean {
  return triggerHaptic(25);
}
