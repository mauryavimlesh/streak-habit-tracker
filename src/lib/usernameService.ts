/**
 * Centralized Username Identity System for STREAKLOOP
 *
 * SPECIFICATION REQUIREMENTS:
 * 1. Every registered user can have one unique username.
 * 2. Globally unique & CASE-INSENSITIVE (e.g. vimlesh == Vimlesh == VIMLESH).
 * 3. Normalization: trim(username).toLowerCase().
 * 4. Rules: 3-20 characters, letters, numbers, underscore, no spaces, no unsafe characters.
 * 5. Prevent reserved usernames (admin, administrator, support, streakloop, official, system, root, api, help, moderator).
 * 6. ATOMIC creation/updating using Firestore documents (usernames/{normalizedUsername}).
 * 7. Permanently associated with user's account.
 * 8. Never expose internal database IDs in public links/cards.
 */

import { doc, getDoc, setDoc, deleteDoc, runTransaction, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from './firebase';
import { isCloudSyncableUser } from './authUtils';

export const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'support',
  'streakloop',
  'official',
  'system',
  'root',
  'api',
  'help',
  'moderator',
  'guest',
  'null',
  'undefined',
  'settings',
  'more',
  'home',
  'login',
  'signup',
  'profile',
  'social',
  'challenge',
  'invite',
]);

export interface UsernameValidationResult {
  isValid: boolean;
  normalized: string;
  error?: string;
}

export interface ClaimUsernameResult {
  success: boolean;
  username: string;
  normalized: string;
  error?: string;
}

export interface PublicUserProfile {
  uid: string;
  username: string;
  normalizedUsername: string;
  displayName?: string;
  avatarUrl?: string;
  streak?: number;
  lifetimeXP?: number;
  level?: number;
  momentum?: number;
  updatedAt?: string;
}

/**
 * Normalizes username: trim & lowercase.
 */
export function normalizeUsername(input: string): string {
  if (!input) return '';
  return input.trim().toLowerCase();
}

/**
 * Validates syntax, length, character set, and reserved status.
 */
export function validateUsernameSyntax(input: string): UsernameValidationResult {
  const normalized = normalizeUsername(input);

  if (!normalized || normalized.length < 3) {
    return { isValid: false, normalized, error: 'Username must be at least 3 characters long.' };
  }

  if (normalized.length > 20) {
    return { isValid: false, normalized, error: 'Username cannot exceed 20 characters.' };
  }

  const allowedRegex = /^[a-z0-9_]+$/;
  if (!allowedRegex.test(normalized)) {
    return { isValid: false, normalized, error: 'Username can only contain letters, numbers, and underscores.' };
  }

  if (RESERVED_USERNAMES.has(normalized)) {
    return { isValid: false, normalized, error: 'This username is reserved and cannot be claimed.' };
  }

  return { isValid: true, normalized };
}

/**
 * Check whether a username is available in Firestore
 */
export async function checkUsernameAvailability(username: string, currentUid?: string): Promise<{ available: boolean; error?: string }> {
  const validation = validateUsernameSyntax(username);
  if (!validation.isValid) {
    return { available: false, error: validation.error };
  }

  try {
    const docRef = doc(db, 'usernames', validation.normalized);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return { available: true };
    }

    const data = snap.data();
    // If the current user already owns this username, it's available to them
    if (currentUid && data?.uid === currentUid) {
      return { available: true };
    }

    return { available: false, error: 'That username is already taken.' };
  } catch (err: any) {
    console.warn('Error checking username availability:', err);
    // In guest mode or network failure, allow syntax pass
    return { available: true };
  }
}

/**
 * ATOMIC Claim or Update Username in Firestore.
 * Handles race conditions safely.
 */
export async function claimUsername(
  userId: string,
  rawUsername: string,
  oldRawUsername?: string
): Promise<ClaimUsernameResult> {
  const validation = validateUsernameSyntax(rawUsername);
  if (!validation.isValid) {
    return { success: false, username: rawUsername, normalized: validation.normalized, error: validation.error };
  }

  const cleanOriginal = rawUsername.trim();
  const normalized = validation.normalized;
  const oldNormalized = oldRawUsername ? normalizeUsername(oldRawUsername) : null;

  if (!isCloudSyncableUser(userId)) {
    // Guest mode: Save locally in localStorage
    try {
      localStorage.setItem('streak_guest_username', cleanOriginal);
    } catch {}
    return { success: true, username: cleanOriginal, normalized };
  }

  try {
    const newUsernameRef = doc(db, 'usernames', normalized);
    const userDocRef = doc(db, 'users', userId);

    await runTransaction(db, async (transaction) => {
      const usernameDoc = await transaction.get(newUsernameRef);

      if (usernameDoc.exists()) {
        const existingData = usernameDoc.data();
        if (existingData.uid !== userId) {
          throw new Error('That username was just taken.');
        }
      }

      // If user previously owned another username, release it
      if (oldNormalized && oldNormalized !== normalized) {
        const oldRef = doc(db, 'usernames', oldNormalized);
        transaction.delete(oldRef);
      }

      // Claim new username
      transaction.set(newUsernameRef, {
        uid: userId,
        username: cleanOriginal,
        normalized,
        updatedAt: serverTimestamp(),
        createdAt: usernameDoc.exists() ? usernameDoc.data().createdAt || serverTimestamp() : serverTimestamp(),
      });

      // Update user document
      transaction.set(
        userDocRef,
        {
          userName: cleanOriginal,
          userNameNormalized: normalized,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });

    return {
      success: true,
      username: cleanOriginal,
      normalized,
    };
  } catch (err: any) {
    console.error('Failed to claim username:', err);
    return {
      success: false,
      username: cleanOriginal,
      normalized,
      error: err.message || 'Failed to claim username. Please retry.',
    };
  }
}

/**
 * Search public profiles by username (prefix matching)
 */
export async function searchUsersByUsername(queryStr: string, currentUid?: string): Promise<PublicUserProfile[]> {
  const normQuery = normalizeUsername(queryStr);
  if (!normQuery || normQuery.length < 2) return [];

  try {
    const usernamesColl = collection(db, 'usernames');
    // Prefix search in Firestore using range query
    const q = query(
      usernamesColl,
      where('normalized', '>=', normQuery),
      where('normalized', '<=', normQuery + '\uf8ff'),
      limit(10)
    );

    const snapshot = await getDocs(q);
    const results: PublicUserProfile[] = [];

    for (const d of snapshot.docs) {
      const data = d.data();
      if (currentUid && data.uid === currentUid) continue;

      // Fetch public profile data from user doc
      try {
        const uSnap = await getDoc(doc(db, 'users', data.uid));
        const uData = uSnap.data() || {};

        results.push({
          uid: data.uid,
          username: data.username || d.id,
          normalizedUsername: data.normalized || d.id,
          displayName: uData.displayName || uData.name || data.username,
          avatarUrl: uData.avatarUrl || '',
          streak: uData.streak || 0,
          lifetimeXP: uData.lifetimeXP || 0,
          level: uData.level || 1,
          momentum: uData.momentum || 0,
          updatedAt: uData.updatedAt?.toDate ? uData.updatedAt.toDate().toISOString() : undefined,
        });
      } catch {
        results.push({
          uid: data.uid,
          username: data.username || d.id,
          normalizedUsername: data.normalized || d.id,
          displayName: data.username,
        });
      }
    }

    return results;
  } catch (err) {
    console.warn('Search users by username failed:', err);
    return [];
  }
}

/**
 * Get public profile by username
 */
export async function getPublicProfileByUsername(username: string): Promise<PublicUserProfile | null> {
  const normalized = normalizeUsername(username);
  if (!normalized) return null;

  try {
    const uRef = doc(db, 'usernames', normalized);
    const uSnap = await getDoc(uRef);
    if (!uSnap.exists()) return null;

    const data = uSnap.data();
    const userDocRef = doc(db, 'users', data.uid);
    const userSnap = await getDoc(userDocRef);
    const userData = userSnap.data() || {};

    return {
      uid: data.uid,
      username: data.username || normalized,
      normalizedUsername: normalized,
      displayName: userData.displayName || userData.name || data.username,
      avatarUrl: userData.avatarUrl || '',
      streak: userData.streak || 0,
      lifetimeXP: userData.lifetimeXP || 0,
      level: userData.level || 1,
      momentum: userData.momentum || 0,
    };
  } catch (err) {
    console.warn('Error fetching public profile by username:', err);
    return null;
  }
}
