import { auth } from './firebase';

/**
 * Validates whether the given userId belongs to an actively authenticated Firebase user.
 * Prevents unauthorized Firestore writes/reads for guest, local, default, or unauthenticated states.
 */
export function isCloudSyncableUser(userId?: string | null): boolean {
  if (!userId) return false;
  if (
    userId === 'local' ||
    userId === 'default' ||
    userId === 'guest' ||
    userId.startsWith('guest_')
  ) {
    return false;
  }
  // Check that Firebase auth has an active authenticated user matching this userId
  if (!auth?.currentUser || auth.currentUser.uid !== userId) {
    return false;
  }
  return true;
}
