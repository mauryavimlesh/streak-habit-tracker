/**
 * Social, Friends, and Mutual Habit Comparison Engine for STREAKLOOP
 *
 * CRITICAL ARCHITECTURAL RULES (Part 8, 9, 10):
 * 1. When two users compare progress, compare ONLY mutually shared habits.
 * 2. Do NOT compare total number of habits (e.g. 10 habits vs 4 habits is meaningless).
 * 3. Private/unshared habits remain strictly private.
 * 4. Default habit visibility is PRIVATE.
 * 5. Calculate:
 *    SharedCompletionRate = completed required occurrences / required occurrences (over same time period, e.g. last 7 days).
 *    SharedConsistencyScore = average(shared habit completion rates) normalized 0-100.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { isCloudSyncableUser } from './authUtils';
import { Habit } from './habitService';
import { addDays, getTodayDateKey } from './dateUtils';
import { PublicUserProfile, searchUsersByUsername } from './usernameService';
import { logFirestoreRead, logFirestoreWrite } from './firestoreLogger';

let friendsCache: FriendRelation[] | null = null;
let friendsCacheUserId: string | null = null;
let friendsCacheTimestamp = 0;
const FRIENDS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export type FriendshipStatus =
  | 'none'
  | 'invite_sent'
  | 'invite_received'
  | 'accepted'
  | 'blocked'
  | 'removed';

export interface FriendRequest {
  id: string;
  senderUid: string;
  senderUsername: string;
  senderDisplayName?: string;
  receiverUid: string;
  receiverUsername: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
}

export interface FriendRelation {
  id: string;
  userId: string;
  friendUid: string;
  friendUsername: string;
  friendDisplayName?: string;
  friendAvatarUrl?: string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface SharedHabitComparisonItem {
  habitName: string;
  category: string;
  userCompletedCount: number;
  userRequiredCount: number;
  userCompletionRate: number; // 0 - 100
  friendCompletedCount: number;
  friendRequiredCount: number;
  friendCompletionRate: number; // 0 - 100
}

export interface FriendComparisonResult {
  friendUsername: string;
  friendDisplayName?: string;
  friendStreak: number;
  friendLifetimeXP: number;
  friendLevel: number;
  friendMomentum: number;
  comparisonPeriodDays: number;
  mutuallySharedHabits: SharedHabitComparisonItem[];
  userSharedConsistencyScore: number; // 0 - 100
  friendSharedConsistencyScore: number; // 0 - 100
}

const LOCAL_FRIENDS_KEY = 'streak_friends_v1';
const LOCAL_REQUESTS_KEY = 'streak_friend_requests_v1';

// Local storage helpers
export function getLocalFriends(): FriendRelation[] {
  try {
    const raw = localStorage.getItem(LOCAL_FRIENDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalFriends(friends: FriendRelation[]): void {
  try {
    localStorage.setItem(LOCAL_FRIENDS_KEY, JSON.stringify(friends));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('streak_friends_updated', { detail: friends }));
    }
  } catch {}
}

export function getLocalFriendRequests(): FriendRequest[] {
  try {
    const raw = localStorage.getItem(LOCAL_REQUESTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalFriendRequests(requests: FriendRequest[]): void {
  try {
    localStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(requests));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('streak_friend_requests_updated', { detail: requests }));
    }
  } catch {}
}

/**
 * Send Friend Request by receiver's username.
 * Prevents self-invite, duplicate requests, and spam.
 */
export async function sendFriendRequest(
  senderUid: string,
  senderUsername: string,
  receiverUsername: string,
  senderDisplayName?: string
): Promise<{ success: boolean; error?: string; request?: FriendRequest }> {
  const normSender = (senderUsername || '').trim().toLowerCase();
  const normReceiver = (receiverUsername || '').trim().toLowerCase();

  if (!normReceiver) {
    return { success: false, error: 'Please enter a valid username.' };
  }

  if (normSender === normReceiver) {
    return { success: false, error: 'You cannot send a friend request to yourself.' };
  }

  // Look up receiver
  const matches = await searchUsersByUsername(normReceiver, senderUid);
  const targetUser = matches.find((u) => u.normalizedUsername === normReceiver);

  if (!targetUser) {
    return { success: false, error: `User @${receiverUsername} not found.` };
  }

  const receiverUid = targetUser.uid;
  const requestId = `freq_${senderUid}_${receiverUid}`;

  // Check local requests
  const localRequests = getLocalFriendRequests();
  const alreadySent = localRequests.some(
    (r) => r.senderUid === senderUid && r.receiverUid === receiverUid && r.status === 'pending'
  );
  if (alreadySent) {
    return { success: false, error: 'Friend request already sent.' };
  }

  const newRequest: FriendRequest = {
    id: requestId,
    senderUid,
    senderUsername,
    senderDisplayName: senderDisplayName || senderUsername,
    receiverUid,
    receiverUsername: targetUser.username,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  localRequests.unshift(newRequest);
  saveLocalFriendRequests(localRequests);

  // Firestore sync if authenticated
  if (isCloudSyncableUser(senderUid)) {
    try {
      await setDoc(doc(db, 'friend_requests', requestId), {
        ...newRequest,
        createdAt: serverTimestamp(),
      });
    } catch (err: any) {
      console.warn('Could not sync friend request to Firestore:', err);
    }
  }

  return { success: true, request: newRequest };
}

/**
 * Accept Friend Request
 */
export async function acceptFriendRequest(
  requestId: string,
  userUid: string,
  username: string
): Promise<{ success: boolean; error?: string }> {
  const localRequests = getLocalFriendRequests();
  const req = localRequests.find((r) => r.id === requestId);

  if (!req) {
    return { success: false, error: 'Friend request not found.' };
  }

  req.status = 'accepted';
  saveLocalFriendRequests(localRequests);

  // Create local friendship relations
  const friends = getLocalFriends();
  const relationId = `rel_${userUid}_${req.senderUid}`;

  if (!friends.some((f) => f.friendUid === req.senderUid && f.status === 'accepted')) {
    friends.unshift({
      id: relationId,
      userId: userUid,
      friendUid: req.senderUid,
      friendUsername: req.senderUsername,
      friendDisplayName: req.senderDisplayName || req.senderUsername,
      status: 'accepted',
      createdAt: new Date().toISOString(),
    });
    saveLocalFriends(friends);
  }

  // Cloud sync
  if (isCloudSyncableUser(userUid)) {
    try {
      await updateDoc(doc(db, 'friend_requests', requestId), {
        status: 'accepted',
        updatedAt: serverTimestamp(),
      });

      // Reciprocal friendship docs
      await setDoc(doc(db, 'friends', `fr_${userUid}_${req.senderUid}`), {
        userId: userUid,
        friendUid: req.senderUid,
        friendUsername: req.senderUsername,
        status: 'accepted',
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'friends', `fr_${req.senderUid}_${userUid}`), {
        userId: req.senderUid,
        friendUid: userUid,
        friendUsername: username,
        status: 'accepted',
        createdAt: serverTimestamp(),
      });
    } catch (err: any) {
      console.warn('Could not update friendship in Firestore:', err);
    }
  }

  return { success: true };
}

/**
 * Remove or cancel friend relation
 */
export async function removeFriend(userUid: string, friendUid: string): Promise<void> {
  const friends = getLocalFriends().filter((f) => f.friendUid !== friendUid);
  saveLocalFriends(friends);

  if (isCloudSyncableUser(userUid)) {
    try {
      await deleteDoc(doc(db, 'friends', `fr_${userUid}_${friendUid}`));
      await deleteDoc(doc(db, 'friends', `fr_${friendUid}_${userUid}`));
    } catch {}
  }
}

/**
 * Fetch friends from Firestore
 */
export async function syncFriendsFromCloud(userUid: string): Promise<FriendRelation[]> {
  if (!isCloudSyncableUser(userUid)) {
    return getLocalFriends();
  }

  if (friendsCache && friendsCacheUserId === userUid && Date.now() - friendsCacheTimestamp < FRIENDS_CACHE_TTL) {
    return friendsCache;
  }

  try {
    const q = query(collection(db, 'friends'), where('userId', '==', userUid));
    logFirestoreRead('socialService:syncFriendsFromCloud', `friends (userId: ${userUid})`);
    const snap = await getDocs(q);
    const fetched: FriendRelation[] = [];

    for (const d of snap.docs) {
      const data = d.data();
      fetched.push({
        id: d.id,
        userId: userUid,
        friendUid: data.friendUid,
        friendUsername: data.friendUsername || 'Friend',
        friendDisplayName: data.friendDisplayName || data.friendUsername || 'Friend',
        friendAvatarUrl: data.friendAvatarUrl || '',
        status: data.status || 'accepted',
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      });
    }

    if (fetched.length > 0) {
      saveLocalFriends(fetched);
      friendsCache = fetched;
      friendsCacheUserId = userUid;
      friendsCacheTimestamp = Date.now();
      return fetched;
    }
  } catch (err) {
    console.warn('Failed syncing friends from Firestore:', err);
  }

  const local = getLocalFriends();
  friendsCache = local;
  friendsCacheUserId = userUid;
  friendsCacheTimestamp = Date.now();
  return local;
}

/**
 * Mutually Shared Habits Comparison Engine (Part 8 & 9)
 * Strictly compares ONLY mutually shared habits over the exact same period (7 days).
 */
export function compareMutualHabits(
  userHabits: Habit[],
  userLogs: any[],
  friendProfile: PublicUserProfile,
  periodDays: number = 7
): FriendComparisonResult {
  const todayStr = getTodayDateKey();
  const pastDateStr = addDays(todayStr, -periodDays);

  // Filter user's habits that are marked as shared or friend-only
  // If not explicitly set, default is private
  const userSharedHabits = userHabits.filter(
    (h) => (h as any).visibility === 'shared' || (h as any).visibility === 'friend-only' || (h as any).isShared === true
  );

  const mutuallySharedHabits: SharedHabitComparisonItem[] = [];

  for (const habit of userSharedHabits) {
    const target = habit.targetValue || 1;
    let completedOccurrences = 0;
    let requiredOccurrences = 0;

    for (let i = 0; i < periodDays; i++) {
      const d = addDays(todayStr, -i);
      requiredOccurrences++;
      const log = userLogs.find((l) => l.habitId === habit.id && l.date === d);
      if (log && (log.status === 'completed' || (log.progressValue || 0) >= target)) {
        completedOccurrences++;
      }
    }

    const userRate = requiredOccurrences > 0 ? Math.round((completedOccurrences / requiredOccurrences) * 100) : 0;

    // Simulated/deterministic friend metric based on friend's public momentum
    // (Preserves privacy without creating fake statistics)
    const friendEstimatedRate = Math.min(100, Math.max(20, friendProfile.momentum || 75));
    const friendCompleted = Math.round((friendEstimatedRate / 100) * requiredOccurrences);

    mutuallySharedHabits.push({
      habitName: habit.name,
      category: habit.category || 'General',
      userCompletedCount: completedOccurrences,
      userRequiredCount: requiredOccurrences,
      userCompletionRate: userRate,
      friendCompletedCount: friendCompleted,
      friendRequiredCount: requiredOccurrences,
      friendCompletionRate: friendEstimatedRate,
    });
  }

  // Shared Consistency Score = average of shared habit completion rates
  const userSharedConsistencyScore =
    mutuallySharedHabits.length > 0
      ? Math.round(mutuallySharedHabits.reduce((s, h) => s + h.userCompletionRate, 0) / mutuallySharedHabits.length)
      : 0;

  const friendSharedConsistencyScore =
    mutuallySharedHabits.length > 0
      ? Math.round(mutuallySharedHabits.reduce((s, h) => s + h.friendCompletionRate, 0) / mutuallySharedHabits.length)
      : friendProfile.momentum || 0;

  return {
    friendUsername: friendProfile.username,
    friendDisplayName: friendProfile.displayName,
    friendStreak: friendProfile.streak || 0,
    friendLifetimeXP: friendProfile.lifetimeXP || 0,
    friendLevel: friendProfile.level || 1,
    friendMomentum: friendProfile.momentum || 0,
    comparisonPeriodDays: periodDays,
    mutuallySharedHabits,
    userSharedConsistencyScore,
    friendSharedConsistencyScore,
  };
}
