import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Camera,
  Image as ImageIcon,
  Trash2,
  Check,
  AlertTriangle,
  LogIn,
  Mail,
  User as UserIcon,
  ShieldCheck,
  Sparkles,
  Award,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../lib/AuthContext';
import { readFileAsDataUrl } from '../../lib/imageUtils';
import { triggerHaptic } from '../../lib/haptics';
import { checkUsernameAvailability, claimUsername, validateUsernameSyntax } from '../../lib/usernameService';
import { ACHIEVEMENTS_REGISTRY, getLocalUnlockedAchievements, UserAchievement } from '../../lib/achievementService';
import UserAvatar from './UserAvatar';
import ImageCropperModal from './ImageCropperModal';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
}) => {
  const { user, profile, updateProfile, removeProfilePhoto, isGuest } = useAuth();
  const navigate = useNavigate();

  const [modalTab, setModalTab] = useState<'profile' | 'achievements'>('profile');
  const [unlockedAchievements, setUnlockedAchievements] = useState<UserAchievement[]>(() =>
    getLocalUnlockedAchievements()
  );

  // Profile fields state
  const initialDisplayName = profile?.displayName || profile?.name || 'Vimlesh';
  const initialUsername = (profile?.userName || profile?.name || 'vimlesh').replace(/\s+/g, '_').toLowerCase();

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  const [usernameCheck, setUsernameCheck] = useState<{
    checking: boolean;
    available: boolean | null;
    error?: string;
  }>({ checking: false, available: true });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatarUrl || null);
  
  // UI states
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [cropperRawImage, setCropperRawImage] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Hidden file inputs
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const dName = profile?.displayName || profile?.name || 'Vimlesh';
      const uName = (profile?.userName || profile?.name || 'vimlesh').replace(/\s+/g, '_').toLowerCase();
      setDisplayName(dName);
      setUsername(uName);
      setUsernameCheck({ checking: false, available: true });
      setAvatarPreview(profile?.avatarUrl || null);
      setShowPhotoOptions(false);
      setShowRemoveConfirm(false);
      setStatusMessage(null);
    }
  }, [isOpen, profile]);

  // Debounced username availability validation
  useEffect(() => {
    if (!isOpen) return;
    const clean = username.trim().toLowerCase();
    if (!clean) {
      setUsernameCheck({ checking: false, available: false, error: 'Username cannot be empty.' });
      return;
    }

    const syntax = validateUsernameSyntax(clean);
    if (!syntax.isValid) {
      setUsernameCheck({ checking: false, available: false, error: syntax.error });
      return;
    }

    // If unchanged from current, treat as available
    const currentOwned = (profile?.userName || '').trim().toLowerCase();
    if (clean === currentOwned) {
      setUsernameCheck({ checking: false, available: true });
      return;
    }

    setUsernameCheck({ checking: true, available: null });
    const timer = setTimeout(async () => {
      const result = await checkUsernameAvailability(clean, user?.uid);
      setUsernameCheck({
        checking: false,
        available: result.available,
        error: result.error,
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [username, isOpen, profile, user]);

  // Handle Photo selection from File Input
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setCropperRawImage(dataUrl);
      setIsCropperOpen(true);
      setShowPhotoOptions(false);
      triggerHaptic('selection');
    } catch (err) {
      console.error('Failed reading selected image:', err);
      setStatusMessage({ type: 'error', text: 'Unable to load that image. Please try another.' });
    } finally {
      // Reset input so re-selecting same file triggers change
      e.target.value = '';
    }
  };

  // Called when image cropper finishes
  const handleCropComplete = async (croppedDataUrl: string) => {
    setAvatarPreview(croppedDataUrl);
    setIsSaving(true);
    try {
      await updateProfile({ avatarUrl: croppedDataUrl });
      triggerHaptic('completion');
      const msg = 'Profile photo updated!';
      setStatusMessage({ type: 'success', text: msg });
      if (onSuccessToast) onSuccessToast(msg);
    } catch (err) {
      console.error('Failed saving profile photo:', err);
      setStatusMessage({ type: 'error', text: 'Failed to save photo.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Photo Removal Confirmation
  const handleConfirmRemovePhoto = async () => {
    setIsSaving(true);
    triggerHaptic('completion');
    try {
      await removeProfilePhoto();
      setAvatarPreview(null);
      setShowRemoveConfirm(false);
      setShowPhotoOptions(false);
      const msg = 'Profile picture removed';
      setStatusMessage({ type: 'success', text: msg });
      if (onSuccessToast) onSuccessToast(msg);
    } catch (err) {
      console.error('Failed removing photo:', err);
      setStatusMessage({ type: 'error', text: 'Failed to remove photo.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Save all profile changes (display name + username + photo)
  const handleSaveAll = async () => {
    const trimmedDisplay = displayName.trim();
    if (!trimmedDisplay) {
      setStatusMessage({ type: 'error', text: 'Display name cannot be empty.' });
      triggerHaptic('warning');
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const syntax = validateUsernameSyntax(cleanUsername);
    if (!syntax.isValid) {
      setStatusMessage({ type: 'error', text: syntax.error || 'Invalid username.' });
      triggerHaptic('warning');
      return;
    }

    if (usernameCheck.available === false) {
      setStatusMessage({ type: 'error', text: usernameCheck.error || 'Username is not available.' });
      triggerHaptic('warning');
      return;
    }

    setIsSaving(true);
    triggerHaptic('completion');
    try {
      // 1. Claim username if changed
      const currentUsername = (profile?.userName || '').trim().toLowerCase();
      if (cleanUsername !== currentUsername) {
        const claimResult = await claimUsername(user?.uid || 'local', cleanUsername, currentUsername);
        if (!claimResult.success) {
          setStatusMessage({ type: 'error', text: claimResult.error || 'Failed to claim username.' });
          setIsSaving(false);
          return;
        }
      }

      // 2. Update user profile
      await updateProfile({
        name: trimmedDisplay,
        displayName: trimmedDisplay,
        userName: cleanUsername,
        avatarUrl: avatarPreview || '',
      });

      const msg = 'Profile & username updated successfully!';
      if (onSuccessToast) onSuccessToast(msg);
      onClose();
    } catch (err) {
      console.error('Failed saving profile:', err);
      setStatusMessage({ type: 'error', text: 'Failed to save profile changes.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  if (isGuest) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="w-full max-w-sm bg-[#131622] border border-[#232a3d] rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl relative text-center space-y-4"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#7d8495] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-accent-primary/15 border border-accent-primary/30 flex items-center justify-center mx-auto text-accent-primary">
              <Sparkles className="w-7 h-7" />
            </div>

            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-[10px] font-bold text-accent-primary uppercase tracking-wider mb-2">
                Guest Session
              </span>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Create your STREAKLOOP profile
              </h3>
              <p className="text-xs text-[#8c94a8] leading-relaxed mt-1.5">
                Your profile is currently a Guest Session. Create an account to save your name, username, photo and progress permanently.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  onClose();
                  navigate('/login?tab=signup');
                }}
                className="w-full py-3 px-4 rounded-xl bg-accent-primary hover:bg-[#9eff38] active:scale-95 text-black font-bold text-xs tracking-tight transition-all cursor-pointer shadow-lg shadow-accent-primary/20"
              >
                Sign Up / Create Account
              </button>
              <button
                onClick={() => {
                  onClose();
                  navigate('/login');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs tracking-tight transition-all cursor-pointer border border-white/10"
              >
                Log In
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="w-full max-w-md bg-surface-card border border-[#212633] rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
          >
            {/* Sheet Drag Handle for mobile */}
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-white/5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white tracking-tight">Edit Profile</h2>
                  {isGuest && (
                    <span className="px-2 py-0.5 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-[10px] font-semibold text-accent-primary">
                      Guest
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#7d8495]">Manage your personal identity & photo</p>
              </div>
              <button
                onClick={onClose}
                disabled={isSaving}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Guest session banner */}
            {isGuest && (
              <div className="mx-6 mt-4 p-3 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-white">
                  <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
                  <span className="font-semibold text-accent-primary">Guest Session</span>
                  <span className="text-[#7d8495] hidden xs:inline">· Saved locally</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/login');
                  }}
                  className="text-accent-primary hover:underline font-semibold text-[11px] flex items-center gap-1"
                >
                  <LogIn className="w-3 h-3" />
                  <span>Sign In / Sync</span>
                </button>
              </div>
            )}

            {/* Segmented Tab: Profile Identity vs Achievements */}
            <div className="mx-6 mt-3 grid grid-cols-2 gap-1 p-1 bg-white/[0.04] border border-white/5 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  setModalTab('profile');
                }}
                className={`py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  modalTab === 'profile'
                    ? 'bg-accent-primary text-black font-bold shadow'
                    : 'text-[#8c94a8] hover:text-white'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Identity & Handle</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  setModalTab('achievements');
                }}
                className={`py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  modalTab === 'achievements'
                    ? 'bg-accent-primary text-black font-bold shadow'
                    : 'text-[#8c94a8] hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Achievements ({unlockedAchievements.length})</span>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {modalTab === 'achievements' ? (
                /* ACHIEVEMENTS TAB VIEW (Moved from Social to Profile) */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">Your Milestone Badges</h4>
                      <p className="text-xs text-[#8c94a8]">Permanent proof of consistency</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      +{unlockedAchievements.reduce((sum, a) => sum + (a.xpReward || 0), 0)} XP Earned
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {ACHIEVEMENTS_REGISTRY.map((def) => {
                      const isUnlocked = unlockedAchievements.some((a) => a.achievementId === def.id);
                      return (
                        <div
                          key={def.id}
                          className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                            isUnlocked
                              ? 'bg-white/[0.04] border-purple-500/30 shadow-sm'
                              : 'bg-white/[0.01] border-white/5 opacity-50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                                isUnlocked
                                  ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
                                  : 'bg-white/5 text-white/40'
                              }`}
                            >
                              <Award className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-bold text-cyan-400">+{def.xpReward} XP</span>
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-white truncate">{def.title}</h5>
                            <p className="text-[10px] text-[#8c94a8] leading-tight line-clamp-2 mt-0.5">
                              {def.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* PROFILE IDENTITY TAB VIEW */
                <>
              {/* Status Banner */}
              {statusMessage && (
                <div
                  className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-medium ${
                    statusMessage.type === 'success'
                      ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}
                >
                  {statusMessage.type === 'success' ? (
                    <Check className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              {/* Avatar Section */}
              <div className="flex flex-col items-center justify-center pt-2">
                <div className="relative">
                  <UserAvatar
                    avatarUrl={avatarPreview}
                    name={name}
                    size="2xl"
                    showBadge
                    onBadgeClick={() => {
                      triggerHaptic('tap');
                      setShowPhotoOptions(true);
                    }}
                    onClick={() => {
                      triggerHaptic('tap');
                      setShowPhotoOptions(true);
                    }}
                    className="cursor-pointer"
                  />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setShowPhotoOptions(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-accent-primary hover:text-[#9eff38] border border-white/10 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Change Profile Photo</span>
                  </button>

                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={() => setShowRemoveConfirm(true)}
                      className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-medium text-red-400 border border-red-500/20 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-[#7d8495] mt-1.5">
                  Square or circular photo. Crisp & optimized for consistency.
                </p>
              </div>

              {/* 1. Display Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#7d8495] uppercase tracking-wider flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-accent-primary" />
                  <span>Display Name</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={40}
                    placeholder="e.g. Vimlesh Patel"
                    className="w-full px-4 py-3 bg-background border border-[#232834] focus:border-accent-primary rounded-2xl text-white text-sm focus:outline-none transition-colors"
                  />
                  <span className="absolute right-3.5 top-3.5 text-[11px] text-[#7d8495]">
                    {displayName.length}/40
                  </span>
                </div>
                <p className="text-[10px] text-[#7d8495]">
                  Friendly name shown on your dashboard and greetings.
                </p>
              </div>

              {/* 2. Unique Username Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#7d8495] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Unique Username (@handle)</span>
                  </label>
                  {usernameCheck.checking ? (
                    <span className="text-[10px] text-[#8c94a8] flex items-center gap-1">
                      <div className="w-2.5 h-2.5 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      Checking...
                    </span>
                  ) : usernameCheck.available === true ? (
                    <span className="text-[10px] text-accent-primary font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Available
                    </span>
                  ) : usernameCheck.error ? (
                    <span className="text-[10px] text-rose-400 font-semibold truncate max-w-[170px]">
                      {usernameCheck.error}
                    </span>
                  ) : null}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-sm font-bold text-[#8c94a8]">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      // Normalize input: remove spaces, lowercase, alphanumeric and underscores only
                      const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                      setUsername(val);
                    }}
                    maxLength={20}
                    placeholder="username"
                    className={`w-full pl-8 pr-12 py-3 bg-background border rounded-2xl text-white text-sm focus:outline-none transition-colors font-mono ${
                      usernameCheck.available === true
                        ? 'border-accent-primary/50 focus:border-accent-primary'
                        : usernameCheck.error
                        ? 'border-rose-500/50 focus:border-rose-500'
                        : 'border-[#232834] focus:border-accent-primary'
                    }`}
                  />
                  <span className="absolute right-3.5 top-3.5 text-[11px] text-[#7d8495]">
                    {username.length}/20
                  </span>
                </div>
                <p className="text-[10px] text-[#7d8495]">
                  Globally unique handle for friend invites and progress comparisons.
                </p>
              </div>

              {/* Account / Sync Status Card */}
              <div className="p-4 rounded-2xl bg-background border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#7d8495] uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    <span>Account Status</span>
                  </span>
                  {user ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded-md border border-accent-primary/20">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Synced</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-md border border-yellow-400/20">
                      <span>Guest (Local)</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {user && !user.isAnonymous ? user.email : 'Guest Session'}
                    </p>
                    <p className="text-xs text-[#7d8495]">
                      {user && !user.isAnonymous
                        ? 'Profile photos & streaks sync securely with Firebase'
                        : 'Saved locally in streak_guest_data · Connect account anytime'}
                    </p>
                  </div>
                  {(!user || user.isAnonymous) && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate('/login');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-accent-primary/15 hover:bg-accent-primary/25 text-xs font-semibold text-accent-primary border border-accent-primary/30 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

      {/* Footer Actions */}
      {modalTab === 'profile' ? (
        <div className="p-4 border-t border-white/5 bg-[#101217] flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#7d8495] hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex-1 py-3 px-4 rounded-2xl bg-accent-primary hover:bg-[#9eff38] active:scale-95 text-black font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(140,238,40,0.25)]"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="p-4 border-t border-white/5 bg-[#101217]">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      )}
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Hidden File Inputs */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileSelected}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Photo Options Action Sheet */}
      <AnimatePresence>
        {showPhotoOptions && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="w-full max-w-sm bg-[#181b23] border border-[#2a3040] rounded-t-3xl sm:rounded-3xl p-5 space-y-3 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <h3 className="text-sm font-semibold text-white">Change Profile Photo</h3>
                <button
                  onClick={() => setShowPhotoOptions(false)}
                  className="p-1 rounded-full text-[#7d8495] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    galleryInputRef.current?.click();
                  }}
                  className="w-full p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">Choose from Gallery / Files</p>
                    <p className="text-[11px] text-[#7d8495]">Upload from device storage</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    cameraInputRef.current?.click();
                  }}
                  className="w-full p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-accent-primary/20 text-accent-primary flex items-center justify-center">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">Take Photo</p>
                    <p className="text-[11px] text-[#7d8495]">Use device camera</p>
                  </div>
                </button>

                {avatarPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowPhotoOptions(false);
                      setShowRemoveConfirm(true);
                    }}
                    className="w-full p-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium flex items-center gap-3 transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm">Remove Photo</p>
                      <p className="text-[11px] text-red-400/80">Revert to first-letter avatar</p>
                    </div>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Remove Confirmation Dialog */}
      <AnimatePresence>
        {showRemoveConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="w-full max-w-xs bg-[#181b23] border border-red-500/20 rounded-3xl p-5 text-center space-y-4 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-400 mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Remove Profile Picture?</h3>
                <p className="text-xs text-[#7d8495] mt-1.5">
                  Are you sure you want to remove your profile picture? It will reset back to your default initial avatar.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRemoveConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-[#7d8495] hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemovePhoto}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors cursor-pointer shadow-md"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={isCropperOpen}
        imageSrc={cropperRawImage}
        onClose={() => {
          setIsCropperOpen(false);
          setCropperRawImage(null);
        }}
        onCropComplete={handleCropComplete}
      />
    </>
  );
};
export default EditProfileModal;
