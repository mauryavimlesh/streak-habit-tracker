/**
 * Invite and Referral Attribution System for STREAKLOOP
 *
 * SPECIFICATION REQUIREMENTS:
 * 1. Every registered user gets a permanent invite URL: streakloop.vercel.app/invite/{USERNAME}
 * 2. The invite must identify the inviter without exposing sensitive internal IDs.
 * 3. Opens the signup/login flow, preserving referral attribution.
 * 4. Connects the new user automatically upon successful signup.
 * 5. Prevents duplicate referral rewards, self-referrals, and referral abuse.
 * 6. Rewards: Inviter +50 XP, New user +25 XP (once per unique signup).
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { isCloudSyncableUser } from './authUtils';
import { logFirestoreRead, logFirestoreWrite } from './firestoreLogger';

export interface UserInvite {
  code: string;
  inviterUid: string;
  inviterUsername: string;
  inviterDisplayName?: string;
  url: string;
  totalReferrals: number;
  acceptedUsers: string[];
  createdAt: string;
}

const LOCAL_INVITE_KEY = 'streak_user_invite_v1';

export function getLocalUserInvite(): UserInvite | null {
  try {
    const raw = localStorage.getItem(LOCAL_INVITE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveLocalUserInvite(invite: UserInvite): void {
  try {
    localStorage.setItem(LOCAL_INVITE_KEY, JSON.stringify(invite));
  } catch {}
}

/**
 * Get or initialize the user's permanent invite URL
 */
export async function getOrInitUserInvite(
  userId: string,
  username: string,
  displayName?: string
): Promise<UserInvite> {
  const cleanUsername = (username || 'user').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const existing = getLocalUserInvite();
  if (existing && existing.inviterUsername.toLowerCase() === cleanUsername) {
    return existing;
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://streakloop.vercel.app';
  const url = `${baseUrl}/invite/${cleanUsername}`;

  const newInvite: UserInvite = {
    code: cleanUsername,
    inviterUid: userId,
    inviterUsername: cleanUsername,
    inviterDisplayName: displayName || cleanUsername,
    url,
    totalReferrals: existing?.totalReferrals || 0,
    acceptedUsers: existing?.acceptedUsers || [],
    createdAt: new Date().toISOString(),
  };

  saveLocalUserInvite(newInvite);

  // Sync to Firestore if authenticated
  if (isCloudSyncableUser(userId)) {
    try {
      const inviteDocRef = doc(db, 'invites', cleanUsername);
      logFirestoreWrite('inviteService:getOrInitUserInvite', `invites/${cleanUsername}`, 'set');
      await setDoc(
        inviteDocRef,
        {
          code: cleanUsername,
          inviterUid: userId,
          inviterUsername: cleanUsername,
          inviterDisplayName: displayName || cleanUsername,
          createdAt: serverTimestamp(),
          status: 'created',
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Could not sync invite to Firestore:', err);
    }
  }

  return newInvite;
}

/**
 * Resolve public invite information by username/code (does not require login)
 */
export async function resolveInviteCode(code: string): Promise<{
  valid: boolean;
  inviterUsername?: string;
  inviterDisplayName?: string;
  inviterUid?: string;
  code: string;
}> {
  const cleanCode = (code || '').trim().toLowerCase();
  if (!cleanCode) {
    return { valid: false, code: cleanCode };
  }

  try {
    // 1. Check invites collection
    const inviteRef = doc(db, 'invites', cleanCode);
    logFirestoreRead('inviteService:resolveInviteCode:invites', `invites/${cleanCode}`);
    const snap = await getDoc(inviteRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        valid: true,
        inviterUsername: data.inviterUsername || cleanCode,
        inviterDisplayName: data.inviterDisplayName || data.inviterUsername || cleanCode,
        inviterUid: data.inviterUid,
        code: cleanCode,
      };
    }

    // 2. Check usernames collection as fallback
    const userRef = doc(db, 'usernames', cleanCode);
    logFirestoreRead('inviteService:resolveInviteCode:usernames', `usernames/${cleanCode}`);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const udata = userSnap.data();
      return {
        valid: true,
        inviterUsername: udata.username || cleanCode,
        inviterDisplayName: udata.displayName || udata.username || cleanCode,
        inviterUid: udata.uid,
        code: cleanCode,
      };
    }
  } catch (err) {
    console.warn('Failed resolving invite code:', err);
  }

  return {
    valid: true,
    inviterUsername: cleanCode,
    inviterDisplayName: cleanCode,
    code: cleanCode,
  };
}

/**
 * Claim referral when a new user signs up via invite link.
 * Prevents self-referral, prevents duplicate referral rewards, and awards XP.
 */
/**
 * Claim referral when a new user signs up via invite link.
 * Prevents self-referral, prevents duplicate referral rewards, and awards XP.
 */
export async function recordReferralSignup(inviteCode: string, newUserId: string): Promise<boolean> {
  const cleanCode = (inviteCode || '').trim().toLowerCase();
  if (!cleanCode || !newUserId) return false;

  try {
    const response = await fetch('/api/referral/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inviteCode: cleanCode,
        newUserId,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      console.warn('Backend referral claim rejected:', errData.error || response.statusText);
      return false;
    }

    const resData = await response.json();
    return Boolean(resData.success);
  } catch (err) {
    console.error('Failed to securely process referral claim via server:', err);
    return false;
  }
}

/**
 * Triggers the activation reward for first habit completion.
 * Checks if the user was referred, and if they haven't activated yet.
 * If eligible, awards the remaining +25 XP to the inviter and updates the referral status.
 */
export async function checkAndRewardFirstHabitActivation(userId: string): Promise<boolean> {
  if (!isCloudSyncableUser(userId)) return false;

  try {
    // 1. Look up any referral record where this user is the invitee (newUserId == userId)
    const referralsColl = collection(db, 'referrals');
    const q = query(referralsColl, where('newUserId', '==', userId));
    logFirestoreRead('inviteService:checkAndRewardFirstHabitActivation', `referrals (newUserId == ${userId})`);
    const snap = await getDocs(q);

    if (snap.empty) {
      return false; // Not referred
    }

    const referralDoc = snap.docs[0];
    const referralData = referralDoc.data();

    // 2. Check if reward for first habit is already granted
    if (referralData.rewardFirstHabitGranted === true) {
      return false; // Already granted
    }

    // 3. Grant the remaining +25 XP to the inviter
    const inviterUid = referralData.inviterUid;
    const inviterUsername = referralData.inviterUsername;

    const { awardXP } = await import('./xpService');
    await awardXP({
      userId: inviterUid,
      sourceType: 'achievement',
      sourceId: `ref_activation_${userId}`,
      baseXP: 25,
      description: `Referral activation: Your referred friend completed their first habit!`,
    });

    // 4. Update the referral status in Firestore to fully activated
    const referralRef = doc(db, 'referrals', referralDoc.id);
    logFirestoreWrite('inviteService:checkAndRewardFirstHabitActivation:update', `referrals/${referralDoc.id}`, 'update');
    await updateDoc(referralRef, {
      rewardFirstHabitGranted: true,
      status: 'activated',
      activatedAt: serverTimestamp(),
    });

    return true;
  } catch (err) {
    console.error('Failed checking first habit activation reward:', err);
    return false;
  }
}
