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

import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { isCloudSyncableUser } from './authUtils';

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
export async function recordReferralSignup(inviteCode: string, newUserId: string): Promise<boolean> {
  const cleanCode = (inviteCode || '').trim().toLowerCase();
  if (!cleanCode || !newUserId) return false;

  try {
    const inviteInfo = await resolveInviteCode(cleanCode);
    if (!inviteInfo.valid || !inviteInfo.inviterUid) return false;

    // Prevent self-referral
    if (inviteInfo.inviterUid === newUserId) return false;

    const referralDocId = `ref_${inviteInfo.inviterUid}_${newUserId}`;
    const referralRef = doc(db, 'referrals', referralDocId);
    const existingRef = await getDoc(referralRef);

    // Prevent duplicate referral rewards
    if (existingRef.exists()) {
      return false;
    }

    // Record referral in database
    await setDoc(referralRef, {
      id: referralDocId,
      inviterUid: inviteInfo.inviterUid,
      inviterUsername: inviteInfo.inviterUsername,
      newUserId,
      createdAt: serverTimestamp(),
      rewardClaimed: true,
    });

    // Record attribution on user doc
    const userRef = doc(db, 'users', newUserId);
    await setDoc(
      userRef,
      {
        referredByInviteCode: cleanCode,
        referredByUsername: inviteInfo.inviterUsername,
        referredAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Award inviter +50 XP
    const { awardXP } = await import('./xpService');
    await awardXP({
      userId: inviteInfo.inviterUid,
      sourceType: 'achievement',
      sourceId: `ref_inviter_${newUserId}`,
      baseXP: 50,
      description: `Friend joined via your invite link (@${inviteInfo.inviterUsername})`,
    });

    // Award new user +25 XP
    await awardXP({
      userId: newUserId,
      sourceType: 'achievement',
      sourceId: `ref_welcome_${newUserId}`,
      baseXP: 25,
      description: `Welcome bonus for joining via invite`,
    });

    // Automatically connect friendship
    try {
      const { sendFriendRequest, acceptFriendRequest } = await import('./socialService');
      const reqRes = await sendFriendRequest(
        inviteInfo.inviterUid,
        inviteInfo.inviterUsername || 'friend',
        newUserId
      );
      if (reqRes.request?.id) {
        await acceptFriendRequest(reqRes.request.id, newUserId, 'new_user');
      }
    } catch {}

    return true;
  } catch (err) {
    console.error('Failed recording referral signup:', err);
    return false;
  }
}
