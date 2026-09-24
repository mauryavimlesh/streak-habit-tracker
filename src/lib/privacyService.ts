/**
 * Privacy & Sharing Settings System for STREAKLOOP
 *
 * SPECIFICATION RULES:
 * 1. Default habit visibility is strictly PRIVATE.
 * 2. Habits are only visible to accountability partners if explicitly marked Shared.
 * 3. Granular privacy controls for profile visibility, activity feed, and public stats.
 */

export interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  defaultHabitPrivacy: 'private' | 'shared';
  shareCompletionsToFeed: boolean;
  showStreakOnProfile: boolean;
  showXPOnProfile: boolean;
  allowFriendRequests: boolean;
}

const LOCAL_PRIVACY_KEY = 'streak_privacy_settings_v1';

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  profileVisibility: 'friends',
  defaultHabitPrivacy: 'private', // Strictly private by default
  shareCompletionsToFeed: true,
  showStreakOnProfile: true,
  showXPOnProfile: true,
  allowFriendRequests: true,
};

export function getLocalPrivacySettings(): PrivacySettings {
  try {
    const raw = localStorage.getItem(LOCAL_PRIVACY_KEY);
    if (raw) {
      return { ...DEFAULT_PRIVACY_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_PRIVACY_SETTINGS;
}

export function saveLocalPrivacySettings(settings: PrivacySettings): void {
  try {
    localStorage.setItem(LOCAL_PRIVACY_KEY, JSON.stringify(settings));
  } catch {}
}
