/**
 * Centralized XP and Level Engine for STREAKLOOP
 *
 * CRITICAL ARCHITECTURAL PRINCIPLE:
 * XP and STREAK are COMPLETELY SEPARATE metrics.
 * - STREAK measures CONSISTENCY across scheduled activity.
 * - XP measures PRODUCTIVE ACTIVITY / PROGRESSION.
 * - XP is NEVER derived directly from streak.
 * - XP does NOT reset when a streak breaks.
 * - Stored as lifetime XP with idempotent event tracking to prevent XP farming.
 */

import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { isCloudSyncableUser } from './authUtils';
import { getTodayDateKey } from './dateUtils';

export type XPSourceType =
  | 'habit'
  | 'task'
  | 'focus'
  | 'goal'
  | 'workout'
  | 'journal'
  | 'achievement'
  | 'challenge';

export interface XPEvent {
  id: string; // Unique deterministic event ID (prevents duplicate awards)
  userId: string;
  sourceType: XPSourceType;
  sourceId: string;
  date: string; // YYYY-MM-DD
  baseXP: number;
  multiplier: number;
  finalXP: number;
  description: string;
  createdAt: string;
}

export interface LevelInfo {
  level: number;
  totalLifetimeXP: number;
  currentLevelMinXP: number;
  nextLevelXP: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  progressPercent: number;
  title: string;
}

const LOCAL_XP_KEY = 'streak_lifetime_xp_v1';
const LOCAL_XP_EVENTS_KEY = 'streak_xp_events_v1';

// Base XP Rules (Part 4)
export const XP_CONFIG = {
  HABIT_COMPLETION: 10,
  TASK_LOW: 10,
  TASK_MEDIUM: 15,
  TASK_HIGH: 25,
  FOCUS_BLOCK_25MIN: 5,
  FOCUS_DAILY_CAP: 50, // Max 50 XP from focus per day
  GOAL_STEP: 25,
  GOAL_COMPLETION: 100,
  WORKOUT_SESSION: 20, // 10-40 based on duration
  JOURNAL_ENTRY: 5,
  JOURNAL_DAILY_CAP: 5, // Max 5 XP from journal per day
  ACHIEVEMENT_BONUS: 50,
  CHALLENGE_COMPLETION: 100,
};

/**
 * Level Progression Curve:
 * Level 1 = 0 XP
 * XP_required(n) = floor(100 * n^1.5)
 * Level 1: 0 - 282 XP
 * Level 2: 283 - 519 XP
 * Level 3: 520 - 799 XP
 * Level 4: 800 - 1117 XP
 * Level 5: 1118 - 1469 XP
 * etc.
 */
export function getXPRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(level, 1.5));
}

const LEVEL_TITLES: { [level: number]: string } = {
  1: 'Novice Striver',
  2: 'Habit Apprentice',
  3: 'Focused Builder',
  4: 'Consistency Seeker',
  5: 'Momentum Maker',
  6: 'Routine Craftsman',
  7: 'Disciplined Master',
  8: 'Atomic Champion',
  9: 'Unstoppable Force',
  10: 'Habit Legend',
};

export function calculateLevel(lifetimeXP: number): LevelInfo {
  const safeXP = Math.max(0, Math.floor(lifetimeXP || 0));

  let level = 1;
  while (getXPRequiredForLevel(level + 1) <= safeXP) {
    level++;
    if (level >= 100) break; // Reasonable cap
  }

  const currentLevelMinXP = getXPRequiredForLevel(level);
  const nextLevelXP = getXPRequiredForLevel(level + 1);
  const span = Math.max(1, nextLevelXP - currentLevelMinXP);
  const xpInCurrentLevel = safeXP - currentLevelMinXP;
  const xpNeededForNextLevel = Math.max(0, nextLevelXP - safeXP);
  const progressPercent = Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / span) * 100)));

  const title = LEVEL_TITLES[level] || `Level ${level} Master`;

  return {
    level,
    totalLifetimeXP: safeXP,
    currentLevelMinXP,
    nextLevelXP,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    progressPercent,
    title,
  };
}

// Local Storage helpers
export function getStoredLifetimeXP(): number {
  try {
    const raw = localStorage.getItem(LOCAL_XP_KEY);
    if (raw) return parseInt(raw, 10) || 0;
  } catch {}
  return 0;
}

export function saveStoredLifetimeXP(xp: number): void {
  try {
    localStorage.setItem(LOCAL_XP_KEY, Math.max(0, xp).toString());
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('streak_xp_updated', { detail: { lifetimeXP: xp } }));
    }
  } catch {}
}

export function getStoredXPEvents(): XPEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_XP_EVENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveStoredXPEvents(events: XPEvent[]): void {
  try {
    // Retain recent 500 events locally for auditability
    const trimmed = events.slice(0, 500);
    localStorage.setItem(LOCAL_XP_EVENTS_KEY, JSON.stringify(trimmed));
  } catch {}
}

/**
 * Deterministic Event ID builder for anti-gaming & duplicate prevention
 */
export function buildXPEventId(sourceType: XPSourceType, sourceId: string, dateStr: string): string {
  return `xp_${sourceType}_${sourceId}_${dateStr}`;
}

export interface AwardXPParams {
  userId: string;
  sourceType: XPSourceType;
  sourceId: string;
  dateStr?: string;
  baseXP: number;
  difficultyMultiplier?: number;
  qualityMultiplier?: number;
  description: string;
}

export interface AwardXPResult {
  awarded: boolean;
  xpAwarded: number;
  newLifetimeXP: number;
  levelInfo: LevelInfo;
  reason?: 'duplicate' | 'daily_cap_exceeded' | 'invalid';
  event?: XPEvent;
}

/**
 * Centralized XP award function:
 * - Checks idempotency (no double-awarding for same habit/task completion)
 * - Checks daily caps (journal, focus)
 * - Persists XP event & updates lifetime XP atomically
 */
export async function awardXP(params: AwardXPParams): Promise<AwardXPResult> {
  const dateStr = params.dateStr || getTodayDateKey();
  const eventId = buildXPEventId(params.sourceType, params.sourceId, dateStr);
  const localEvents = getStoredXPEvents();

  // 1. Idempotency Check: Prevent duplicate completion awards
  const existingEvent = localEvents.find((e) => e.id === eventId);
  const currentLifetimeXP = getStoredLifetimeXP();

  if (existingEvent) {
    return {
      awarded: false,
      xpAwarded: 0,
      newLifetimeXP: currentLifetimeXP,
      levelInfo: calculateLevel(currentLifetimeXP),
      reason: 'duplicate',
      event: existingEvent,
    };
  }

  // 2. Daily Caps Check
  if (params.sourceType === 'journal') {
    const todayJournalXP = localEvents
      .filter((e) => e.sourceType === 'journal' && e.date === dateStr)
      .reduce((sum, e) => sum + e.finalXP, 0);

    if (todayJournalXP >= XP_CONFIG.JOURNAL_DAILY_CAP) {
      return {
        awarded: false,
        xpAwarded: 0,
        newLifetimeXP: currentLifetimeXP,
        levelInfo: calculateLevel(currentLifetimeXP),
        reason: 'daily_cap_exceeded',
      };
    }
  }

  if (params.sourceType === 'focus') {
    const todayFocusXP = localEvents
      .filter((e) => e.sourceType === 'focus' && e.date === dateStr)
      .reduce((sum, e) => sum + e.finalXP, 0);

    if (todayFocusXP >= XP_CONFIG.FOCUS_DAILY_CAP) {
      return {
        awarded: false,
        xpAwarded: 0,
        newLifetimeXP: currentLifetimeXP,
        levelInfo: calculateLevel(currentLifetimeXP),
        reason: 'daily_cap_exceeded',
      };
    }
  }

  // 3. Calculate final XP
  const diffMult = params.difficultyMultiplier || 1.0;
  const qualMult = params.qualityMultiplier || 1.0;
  const finalXP = Math.max(1, Math.round(params.baseXP * diffMult * qualMult));

  const newEvent: XPEvent = {
    id: eventId,
    userId: params.userId || 'local',
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    date: dateStr,
    baseXP: params.baseXP,
    multiplier: diffMult * qualMult,
    finalXP,
    description: params.description,
    createdAt: new Date().toISOString(),
  };

  // 4. Update local state
  localEvents.unshift(newEvent);
  saveStoredXPEvents(localEvents);

  const newLifetimeXP = currentLifetimeXP + finalXP;
  saveStoredLifetimeXP(newLifetimeXP);

  // 5. Cloud Sync if authenticated
  if (isCloudSyncableUser(params.userId)) {
    try {
      // Save event
      const eventRef = doc(db, 'xp_events', eventId);
      await setDoc(eventRef, {
        ...newEvent,
        createdAt: serverTimestamp(),
      });

      // Update user lifetime XP
      const userRef = doc(db, 'users', params.userId);
      await setDoc(
        userRef,
        {
          lifetimeXP: newLifetimeXP,
          level: calculateLevel(newLifetimeXP).level,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Could not sync XP to Firestore:', err);
    }
  }

  return {
    awarded: true,
    xpAwarded: finalXP,
    newLifetimeXP,
    levelInfo: calculateLevel(newLifetimeXP),
    event: newEvent,
  };
}

/**
 * Sync lifetime XP from Firestore on initial login
 */
export async function syncUserXPFromCloud(userId: string): Promise<number> {
  if (!isCloudSyncableUser(userId)) {
    return getStoredLifetimeXP();
  }

  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      const cloudXP = typeof data.lifetimeXP === 'number' ? data.lifetimeXP : 0;
      const localXP = getStoredLifetimeXP();
      // Use highest to prevent regression
      const resolvedXP = Math.max(cloudXP, localXP);
      saveStoredLifetimeXP(resolvedXP);
      return resolvedXP;
    }
  } catch (err) {
    console.warn('Failed to sync XP from cloud:', err);
  }
  return getStoredLifetimeXP();
}
