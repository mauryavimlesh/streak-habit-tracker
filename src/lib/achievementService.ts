/**
 * Event-Driven Achievements System for STREAKLOOP
 *
 * REQUIREMENTS (Part 17):
 * 1. Achievements are based on actual events (never awarded repeatedly).
 * 2. Stored with uniqueness enforcement: achievementId, userId, unlockedAt.
 * 3. Never removed if streak breaks later.
 * 4. Awards bonus XP upon unlock.
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { isCloudSyncableUser } from './authUtils';
import { awardXP } from './xpService';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'streak' | 'habits' | 'social' | 'mastery';
  xpReward: number;
}

export interface UserAchievement {
  achievementId: string;
  userId: string;
  unlockedAt: string;
  title: string;
  xpReward: number;
}

export const ACHIEVEMENTS_REGISTRY: AchievementDefinition[] = [
  {
    id: 'first_habit',
    title: 'First Action',
    description: 'Completed your first scheduled habit.',
    icon: 'Sparkles',
    category: 'habits',
    xpReward: 25,
  },
  {
    id: 'streak_3',
    title: '3-Day Momentum',
    description: 'Maintained a 3-day active consistency streak.',
    icon: 'Flame',
    category: 'streak',
    xpReward: 50,
  },
  {
    id: 'streak_7',
    title: 'One Week Unbroken',
    description: 'Reached a 7-day consistency streak.',
    icon: 'Flame',
    category: 'streak',
    xpReward: 75,
  },
  {
    id: 'streak_21',
    title: 'Habit Formation',
    description: 'Hit 21 consecutive days of discipline.',
    icon: 'Zap',
    category: 'streak',
    xpReward: 150,
  },
  {
    id: 'streak_50',
    title: 'Half Century',
    description: '50-day consistency streak locked in.',
    icon: 'Shield',
    category: 'streak',
    xpReward: 250,
  },
  {
    id: 'streak_100',
    title: 'Centurion',
    description: '100 days of relentless execution.',
    icon: 'Crown',
    category: 'streak',
    xpReward: 500,
  },
  {
    id: 'completions_100',
    title: 'Century of Actions',
    description: 'Logged 100 total habit completions.',
    icon: 'CheckCheck',
    category: 'habits',
    xpReward: 150,
  },
  {
    id: 'first_goal',
    title: 'Goal Achiever',
    description: 'Completed your first primary goal.',
    icon: 'Target',
    category: 'mastery',
    xpReward: 100,
  },
  {
    id: 'first_friend',
    title: 'Allied Discipline',
    description: 'Connected with your first accountability friend.',
    icon: 'Users',
    category: 'social',
    xpReward: 50,
  },
  {
    id: 'first_shared_habit',
    title: 'Shared Accountability',
    description: 'Shared a habit for mutual accountability.',
    icon: 'Share2',
    category: 'social',
    xpReward: 50,
  },
  {
    id: 'first_challenge',
    title: 'Challenger',
    description: 'Joined or completed a community habit challenge.',
    icon: 'Trophy',
    category: 'social',
    xpReward: 75,
  },
  {
    id: 'xp_1000',
    title: 'Kilo-XP',
    description: 'Reached 1,000 lifetime productive XP.',
    icon: 'Award',
    category: 'mastery',
    xpReward: 100,
  },
  {
    id: 'perfect_week',
    title: 'Perfect 7-Day Cycle',
    description: 'Completed 100% of all scheduled habits for an entire week.',
    icon: 'Star',
    category: 'streak',
    xpReward: 150,
  },
];

const LOCAL_ACHIEVEMENTS_KEY = 'streak_unlocked_achievements_v1';

export function getLocalUnlockedAchievements(): UserAchievement[] {
  try {
    const raw = localStorage.getItem(LOCAL_ACHIEVEMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalUnlockedAchievements(achievements: UserAchievement[]): void {
  try {
    localStorage.setItem(LOCAL_ACHIEVEMENTS_KEY, JSON.stringify(achievements));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('streak_achievements_updated', { detail: achievements })
      );
    }
  } catch {}
}

/**
 * Check and unlock an achievement idempotently.
 * Returns true if newly unlocked.
 */
export async function checkAndUnlockAchievement(
  achievementId: string,
  userId: string = 'local'
): Promise<boolean> {
  const def = ACHIEVEMENTS_REGISTRY.find((a) => a.id === achievementId);
  if (!def) return false;

  const unlocked = getLocalUnlockedAchievements();
  if (unlocked.some((a) => a.achievementId === achievementId)) {
    return false; // Already unlocked
  }

  const newAchievement: UserAchievement = {
    achievementId,
    userId,
    unlockedAt: new Date().toISOString(),
    title: def.title,
    xpReward: def.xpReward,
  };

  unlocked.push(newAchievement);
  saveLocalUnlockedAchievements(unlocked);

  // Award bonus XP
  await awardXP({
    userId,
    sourceType: 'achievement',
    sourceId: achievementId,
    baseXP: def.xpReward,
    description: `Unlocked Achievement: ${def.title}`,
  });

  // Cloud sync
  if (isCloudSyncableUser(userId)) {
    try {
      const docRef = doc(db, 'user_achievements', `${userId}_${achievementId}`);
      await setDoc(
        docRef,
        {
          ...newAchievement,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Could not sync achievement to Firestore:', err);
    }
  }

  // Dispatch toast event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('streak_achievement_unlocked_banner', {
        detail: { achievement: def },
      })
    );
  }

  return true;
}
