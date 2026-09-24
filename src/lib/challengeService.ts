/**
 * Social Challenges Engine for STREAKLOOP
 *
 * CRITICAL ARCHITECTURAL PRINCIPLE (Part 13):
 * 1. Social challenges contain title, description, start date, end date, target, participants.
 * 2. Progress is CALCULATED FROM ACTUAL UNDERLYING HABIT DATA.
 * 3. NO fake counters or demo stats.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { isCloudSyncableUser } from './authUtils';
import { Habit } from './habitService';
import { getTodayDateKey, parseDateKey } from './dateUtils';

export interface ChallengeParticipant {
  uid: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  joinedAt: string;
  progressCount: number; // Real completed days during challenge window
  targetCount: number;
  completed: boolean;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  targetHabitKeyword: string; // e.g. "workout", "water", "study", "read"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  durationDays: number;
  targetCompletions: number; // e.g. 7 days
  creatorUid: string;
  creatorUsername: string;
  participants: { [uid: string]: ChallengeParticipant };
  createdAt: string;
}

const LOCAL_CHALLENGES_KEY = 'streak_challenges_v1';

// Seed community challenges if empty
export const DEFAULT_COMMUNITY_CHALLENGES: Challenge[] = [
  {
    id: 'chall_7day_workout',
    title: '7-Day Workout Sprint',
    description: 'Complete 30 minutes of physical exercise or workout every day for 7 consecutive days.',
    category: 'Fitness',
    targetHabitKeyword: 'workout',
    startDate: getTodayDateKey(),
    endDate: getTodayDateKey(), // Updated dynamically
    durationDays: 7,
    targetCompletions: 7,
    creatorUid: 'system',
    creatorUsername: 'streakloop',
    participants: {},
    createdAt: new Date().toISOString(),
  },
  {
    id: 'chall_mindful_hydration',
    title: 'Mindful Hydration Week',
    description: 'Hit your daily water goal every day to flush toxins and optimize mental alertness.',
    category: 'Health',
    targetHabitKeyword: 'water',
    startDate: getTodayDateKey(),
    endDate: getTodayDateKey(),
    durationDays: 7,
    targetCompletions: 7,
    creatorUid: 'system',
    creatorUsername: 'streakloop',
    participants: {},
    createdAt: new Date().toISOString(),
  },
  {
    id: 'chall_deep_work_focus',
    title: 'Deep Work Sprint',
    description: 'Lock in at least 45 minutes of distraction-free study or deep work daily.',
    category: 'Productivity',
    targetHabitKeyword: 'study',
    startDate: getTodayDateKey(),
    endDate: getTodayDateKey(),
    durationDays: 14,
    targetCompletions: 12,
    creatorUid: 'system',
    creatorUsername: 'streakloop',
    participants: {},
    createdAt: new Date().toISOString(),
  },
];

export function getLocalChallenges(): Challenge[] {
  try {
    const raw = localStorage.getItem(LOCAL_CHALLENGES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_COMMUNITY_CHALLENGES;
}

export function saveLocalChallenges(challenges: Challenge[]): void {
  try {
    localStorage.setItem(LOCAL_CHALLENGES_KEY, JSON.stringify(challenges));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('streak_challenges_updated', { detail: challenges }));
    }
  } catch {}
}

/**
 * Calculates a participant's real progress in a challenge using their actual habit logs
 */
export function calculateChallengeProgressFromHabits(
  challenge: Challenge,
  habits: Habit[],
  logs: any[]
): { progressCount: number; targetCount: number; percent: number; isCompleted: boolean } {
  const keyword = challenge.targetHabitKeyword.toLowerCase();
  // Find matching habit
  const matchingHabit = habits.find(
    (h) => h.name.toLowerCase().includes(keyword) || (h.category || '').toLowerCase().includes(keyword)
  );

  const targetCount = challenge.targetCompletions || challenge.durationDays || 7;

  if (!matchingHabit) {
    return { progressCount: 0, targetCount, percent: 0, isCompleted: false };
  }

  // Count days completed between start and end date
  const habitId = matchingHabit.id!;
  const targetVal = matchingHabit.targetValue || 1;

  let completedDays = 0;
  const start = parseDateKey(challenge.startDate).getTime();
  const end = parseDateKey(challenge.endDate).getTime();

  for (const log of logs) {
    if (log.habitId !== habitId) continue;
    const logDate = parseDateKey(log.date).getTime();
    if (logDate >= start && logDate <= end) {
      if (log.status === 'completed' || (log.progressValue || 0) >= targetVal) {
        completedDays++;
      }
    }
  }

  const percent = Math.min(100, Math.round((completedDays / targetCount) * 100));
  const isCompleted = completedDays >= targetCount;

  return {
    progressCount: completedDays,
    targetCount,
    percent,
    isCompleted,
  };
}

/**
 * Join Challenge
 */
export async function joinChallenge(
  challengeId: string,
  userId: string,
  username: string,
  displayName?: string
): Promise<{ success: boolean; challenge?: Challenge }> {
  const list = getLocalChallenges();
  const challenge = list.find((c) => c.id === challengeId);
  if (!challenge) return { success: false };

  if (!challenge.participants) challenge.participants = {};

  challenge.participants[userId] = {
    uid: userId,
    username,
    displayName: displayName || username,
    joinedAt: new Date().toISOString(),
    progressCount: 0,
    targetCount: challenge.targetCompletions,
    completed: false,
  };

  saveLocalChallenges(list);

  if (isCloudSyncableUser(userId)) {
    try {
      const cRef = doc(db, 'challenges', challengeId);
      await updateDoc(cRef, {
        [`participants.${userId}`]: challenge.participants[userId],
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Could not sync challenge join to Firestore:', err);
    }
  }

  return { success: true, challenge };
}

/**
 * Create a new custom challenge
 */
export async function createChallenge(
  payload: Omit<Challenge, 'id' | 'participants' | 'createdAt'>,
  userId: string,
  username: string
): Promise<Challenge> {
  const challengeId = `chall_${Date.now()}`;
  const newChallenge: Challenge = {
    ...payload,
    id: challengeId,
    creatorUid: userId,
    creatorUsername: username,
    participants: {
      [userId]: {
        uid: userId,
        username,
        joinedAt: new Date().toISOString(),
        progressCount: 0,
        targetCount: payload.targetCompletions,
        completed: false,
      },
    },
    createdAt: new Date().toISOString(),
  };

  const list = getLocalChallenges();
  list.unshift(newChallenge);
  saveLocalChallenges(list);

  if (isCloudSyncableUser(userId)) {
    try {
      await setDoc(doc(db, 'challenges', challengeId), {
        ...newChallenge,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Could not create challenge in Firestore:', err);
    }
  }

  return newChallenge;
}
