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
import { logFirestoreRead, logFirestoreWrite } from './firestoreLogger';

// In-memory cache for availability checks to prevent duplicate reads while typing
const availabilityCache = new Map<string, { available: boolean; error?: string; timestamp: number }>();
const AVAILABILITY_TTL = 45 * 1000; // 45 seconds

// In-memory cache for public profiles
const publicProfileCache = new Map<string, { profile: PublicUserProfile; timestamp: number }>();
const PUBLIC_PROFILE_TTL = 3 * 60 * 1000; // 3 minutes

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
 * Check whether a username is available in Firestore (with in-memory TTL caching)
 */
export async function checkUsernameAvailability(username: string, currentUid?: string): Promise<{ available: boolean; error?: string }> {
  const validation = validateUsernameSyntax(username);
  if (!validation.isValid) {
    return { available: false, error: validation.error };
  }

  // Check in-memory cache first
  const cacheKey = `${validation.normalized}_${currentUid || 'anon'}`;
  const cached = availabilityCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < AVAILABILITY_TTL) {
    return { available: cached.available, error: cached.error };
  }

  try {
    const docRef = doc(db, 'usernames', validation.normalized);
    logFirestoreRead('usernameService:checkAvailability', `usernames/${validation.normalized}`);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      availabilityCache.set(cacheKey, { available: true, timestamp: Date.now() });
      return { available: true };
    }

    const data = snap.data();
    // If the current user already owns this username, it's available to them
    if (currentUid && data?.uid === currentUid) {
      availabilityCache.set(cacheKey, { available: true, timestamp: Date.now() });
      return { available: true };
    }

    const res = { available: false, error: 'That username is already taken.' };
    availabilityCache.set(cacheKey, { ...res, timestamp: Date.now() });
    return res;
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

    logFirestoreWrite('usernameService:claimUsername', `usernames/${normalized}`, 'set');
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

    // Invalidate local availability cache
    availabilityCache.clear();

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
      limit(6)
    );

    logFirestoreRead('usernameService:searchUsers', `usernames (prefix: ${normQuery})`);
    const snapshot = await getDocs(q);
    const results: PublicUserProfile[] = [];

    for (const d of snapshot.docs) {
      const data = d.data();
      if (currentUid && data.uid === currentUid) continue;

      // Check public profile cache first
      const cached = publicProfileCache.get(data.uid);
      if (cached && Date.now() - cached.timestamp < PUBLIC_PROFILE_TTL) {
        results.push(cached.profile);
        continue;
      }

      // Fetch public profile data from user doc
      try {
        logFirestoreRead('usernameService:searchUserProfile', `users/${data.uid}`);
        const uSnap = await getDoc(doc(db, 'users', data.uid));
        const uData = uSnap.data() || {};

        const pub: PublicUserProfile = {
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
        };
        publicProfileCache.set(data.uid, { profile: pub, timestamp: Date.now() });
        results.push(pub);
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

  // Check cache
  const cached = publicProfileCache.get(normalized);
  if (cached && Date.now() - cached.timestamp < PUBLIC_PROFILE_TTL) {
    return cached.profile;
  }

  try {
    const uRef = doc(db, 'usernames', normalized);
    logFirestoreRead('usernameService:getPublicProfile', `usernames/${normalized}`);
    const uSnap = await getDoc(uRef);
    if (!uSnap.exists()) return null;

    const data = uSnap.data();
    const userDocRef = doc(db, 'users', data.uid);
    logFirestoreRead('usernameService:getPublicProfileUser', `users/${data.uid}`);
    const userSnap = await getDoc(userDocRef);
    const userData = userSnap.data() || {};

    const pubProfile: PublicUserProfile = {
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

    publicProfileCache.set(normalized, { profile: pubProfile, timestamp: Date.now() });
    publicProfileCache.set(data.uid, { profile: pubProfile, timestamp: Date.now() });
    return pubProfile;
  } catch (err) {
    console.warn('Error fetching public profile by username:', err);
    return null;
  }
}

/**
 * Search users by display name (case-insensitive prefix search)
 */
export async function searchUsersByName(queryStr: string): Promise<PublicUserProfile[]> {
  const trimmed = queryStr.trim();
  if (!trimmed || trimmed.length < 2) return [];

  try {
    const usersColl = collection(db, 'users');
    const resultsMap = new Map<string, PublicUserProfile>();

    // Capitalize first letter of each word to match common display names
    const termCapitalized = trimmed.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    
    const queries = [
      query(
        usersColl,
        where('displayName', '>=', termCapitalized),
        where('displayName', '<=', termCapitalized + '\uf8ff'),
        limit(10)
      )
    ];

    if (termCapitalized !== trimmed) {
      queries.push(
        query(
          usersColl,
          where('displayName', '>=', trimmed),
          where('displayName', '<=', trimmed + '\uf8ff'),
          limit(10)
        )
      );
    }

    logFirestoreRead('usernameService:searchUsersByName', `users (prefix searches)`);
    for (const q of queries) {
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        const uData = d.data();
        if (!uData.userName) continue; // must have a username

        const pub: PublicUserProfile = {
          uid: d.id,
          username: uData.userName,
          normalizedUsername: (uData.userName || '').toLowerCase(),
          displayName: uData.displayName || uData.name || uData.userName,
          avatarUrl: uData.avatarUrl || '',
          streak: uData.streak || 0,
          lifetimeXP: uData.lifetimeXP || 0,
          level: uData.level || 1,
          momentum: uData.momentum || 0,
        };
        resultsMap.set(d.id, pub);
      }
    }

    return Array.from(resultsMap.values());
  } catch (err) {
    console.warn('Search users by name failed:', err);
    return [];
  }
}

/**
 * Unified search helper that queries by username and display name with deduplication
 */
export async function searchPeople(queryStr: string, currentUid?: string): Promise<PublicUserProfile[]> {
  const trimmed = queryStr.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const resultsMap = new Map<string, PublicUserProfile>();
  const isUsernameQuery = trimmed.startsWith('@') || !trimmed.includes(' ');
  const cleanUsernameQuery = trimmed.replace(/^@/, '').trim();

  // 1. If it looks like a username, do an exact lookup first (highly efficient O(1))
  if (isUsernameQuery && cleanUsernameQuery.length >= 3) {
    const exactProfile = await getPublicProfileByUsername(cleanUsernameQuery);
    if (exactProfile) {
      if (!currentUid || exactProfile.uid !== currentUid) {
        resultsMap.set(exactProfile.uid, exactProfile);
      }
    }
  }

  // 2. Also search by username prefix
  if (isUsernameQuery) {
    const prefixResults = await searchUsersByUsername(cleanUsernameQuery, currentUid);
    for (const p of prefixResults) {
      if (!currentUid || p.uid !== currentUid) {
        resultsMap.set(p.uid, p);
      }
    }
  }

  // 3. Search by name prefix
  const nameResults = await searchUsersByName(trimmed);
  for (const n of nameResults) {
    if (!currentUid || n.uid !== currentUid) {
      resultsMap.set(n.uid, n);
    }
  }

  return Array.from(resultsMap.values());
}
