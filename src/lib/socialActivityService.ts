/**
 * Social Activity Feed and Kudos Service for STREAKLOOP
 *
 * Provides real-time activity stream of accountability actions:
 * - Shared habit completions
 * - Streak milestones (7, 14, 21, 30+ days)
 * - Challenge registrations & completions
 * - Badge unlocks
 * - Peer Kudos / High-Five reactions
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { isCloudSyncableUser } from './authUtils';

export interface SocialActivityItem {
  id: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  type: 'habit_completed' | 'streak_milestone' | 'challenge_joined' | 'achievement_unlocked';
  title: string;
  description: string;
  category?: string;
  metricValue?: number;
  kudosCount: number;
  kudosGivenBy: string[]; // List of user IDs or usernames who gave kudos
  createdAt: string;
}

const LOCAL_ACTIVITY_KEY = 'streak_social_activity_v1';

// Seed initial realistic social accountability items if empty
const DEFAULT_SOCIAL_ACTIVITIES: SocialActivityItem[] = [
  {
    id: 'soc_act_1',
    userId: 'user_sarah',
    username: 'sarah_m',
    displayName: 'Sarah Miller',
    type: 'streak_milestone',
    title: 'Hit 14-Day Streak! 🔥',
    description: 'Crushed the Morning Workout habit for 14 consecutive days unbroken.',
    category: 'Fitness',
    metricValue: 14,
    kudosCount: 5,
    kudosGivenBy: ['alex_r', 'david_k'],
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'soc_act_2',
    userId: 'user_alex',
    username: 'alex_r',
    displayName: 'Alex Rivera',
    type: 'challenge_joined',
    title: 'Enrolled in 7-Day Hydration Hero',
    description: 'Commited to drinking at least 2,500ml water daily this week.',
    category: 'Health',
    kudosCount: 3,
    kudosGivenBy: ['sarah_m'],
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'soc_act_3',
    userId: 'user_david',
    username: 'david_k',
    displayName: 'David Kim',
    type: 'achievement_unlocked',
    title: 'Unlocked "Century Club" 🏅',
    description: 'Recorded 100 lifetime productive habit completions!',
    category: 'Milestone',
    kudosCount: 8,
    kudosGivenBy: ['sarah_m', 'alex_r', 'marcus_v'],
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

export function getLocalSocialActivities(): SocialActivityItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_ACTIVITY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  // Default seed
  saveLocalSocialActivities(DEFAULT_SOCIAL_ACTIVITIES);
  return DEFAULT_SOCIAL_ACTIVITIES;
}

export function saveLocalSocialActivities(items: SocialActivityItem[]): void {
  try {
    localStorage.setItem(LOCAL_ACTIVITY_KEY, JSON.stringify(items));
  } catch {}
}

export async function logSocialActivity(
  userId: string,
  username: string,
  type: SocialActivityItem['type'],
  title: string,
  description: string,
  extra?: {
    displayName?: string;
    avatarUrl?: string;
    category?: string;
    metricValue?: number;
  }
): Promise<SocialActivityItem> {
  const newItem: SocialActivityItem = {
    id: `soc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId,
    username,
    displayName: extra?.displayName,
    avatarUrl: extra?.avatarUrl,
    type,
    title,
    description,
    category: extra?.category,
    metricValue: extra?.metricValue,
    kudosCount: 0,
    kudosGivenBy: [],
    createdAt: new Date().toISOString(),
  };

  const list = getLocalSocialActivities();
  list.unshift(newItem);
  saveLocalSocialActivities(list.slice(0, 50)); // keep last 50

  if (isCloudSyncableUser(userId)) {
    try {
      await addDoc(collection(db, 'social_activities'), {
        ...newItem,
        cloudCreatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Failed cloud sync social activity:', e);
    }
  }

  return newItem;
}

export async function toggleKudos(activityId: string, currentUserId: string): Promise<{ kudosCount: number; hasGiven: boolean }> {
  const list = getLocalSocialActivities();
  const target = list.find((a) => a.id === activityId);
  if (!target) return { kudosCount: 0, hasGiven: false };

  const hasGiven = target.kudosGivenBy.includes(currentUserId);
  if (hasGiven) {
    target.kudosGivenBy = target.kudosGivenBy.filter((u) => u !== currentUserId);
    target.kudosCount = Math.max(0, target.kudosCount - 1);
  } else {
    target.kudosGivenBy.push(currentUserId);
    target.kudosCount += 1;
  }

  saveLocalSocialActivities(list);

  if (isCloudSyncableUser(currentUserId)) {
    try {
      const docRef = doc(db, 'social_activities', activityId);
      await updateDoc(docRef, {
        kudosCount: target.kudosCount,
        kudosGivenBy: target.kudosGivenBy,
      });
    } catch {}
  }

  return { kudosCount: target.kudosCount, hasGiven: !hasGiven };
}

export async function sendKudosToFriend(
  fromUsername: string,
  toUsername: string,
  kudosText: string,
  fromDisplayName?: string
): Promise<SocialActivityItem> {
  const newItem: SocialActivityItem = {
    id: `kudos_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: fromUsername,
    username: fromUsername,
    displayName: fromDisplayName || fromUsername,
    type: 'habit_completed',
    title: `Sent kudos to @${toUsername}`,
    description: `"${kudosText}"`,
    category: 'Encouragement',
    kudosCount: 1,
    kudosGivenBy: [fromUsername],
    createdAt: new Date().toISOString(),
  };

  const list = getLocalSocialActivities();
  list.unshift(newItem);
  saveLocalSocialActivities(list.slice(0, 50));

  return newItem;
}
