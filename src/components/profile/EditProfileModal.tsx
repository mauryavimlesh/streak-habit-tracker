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
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../lib/AuthContext';
import { readFileAsDataUrl } from '../../lib/imageUtils';
import { triggerHaptic } from '../../lib/haptics';
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
  const { user, profile, updateProfile, removeProfilePhoto } = useAuth();
  const navigate = useNavigate();

  // Profile fields state
  const initialName = profile?.userName || profile?.name || profile?.displayName || 'Vimlesh';
  const [name, setName] = useState(initialName);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatarUrl || null);
  
  // UI states
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showAuthGateModal, setShowAuthGateModal] = useState(false);
  const [cropperRawImage, setCropperRawImage] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Hidden file inputs
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(profile?.userName || profile?.name || profile?.displayName || 'Vimlesh');
      setAvatarPreview(profile?.avatarUrl || null);
      setShowPhotoOptions(false);
      setShowRemoveConfirm(false);
      setShowAuthGateModal(false);
      setStatusMessage(null);
    }
  }, [isOpen, profile]);

  // Handle Photo selection from File Input
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // If user is guest, check auth requirement
      if (!user) {
        setShowAuthGateModal(true);
        e.target.value = '';
        return;
      }

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

  // Save all profile changes (name + photo)
  const handleSaveAll = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setStatusMessage({ type: 'error', text: 'Name cannot be empty' });
      triggerHaptic('warning');
      return;
    }

    if (!user) {
      // Show auth requirement prompt
      setShowAuthGateModal(true);
      return;
    }

    setIsSaving(true);
    triggerHaptic('completion');
    try {
      await updateProfile({
        name: trimmed,
        userName: trimmed,
        displayName: trimmed,
        avatarUrl: avatarPreview || '',
      });
      const msg = 'Profile updated successfully!';
      if (onSuccessToast) onSuccessToast(msg);
      onClose();
    } catch (err) {
      console.error('Failed saving profile:', err);
      setStatusMessage({ type: 'error', text: 'Failed to save changes.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md">
          {/* Modal / Bottom Sheet */}
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
                <h2 className="text-lg font-bold text-white tracking-tight">Edit Profile</h2>
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

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6">
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

              {/* Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#7d8495] uppercase tracking-wider flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-accent-primary" />
                  <span>Your Name / Username</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={40}
                    placeholder="e.g. Vimlesh"
                    className="w-full px-4 py-3 bg-background border border-[#232834] focus:border-accent-primary rounded-2xl text-white text-sm focus:outline-none transition-colors"
                  />
                  <span className="absolute right-3.5 top-3.5 text-[11px] text-[#7d8495]">
                    {name.length}/40
                  </span>
                </div>
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
                      {user?.email || 'No cloud account connected'}
                    </p>
                    <p className="text-xs text-[#7d8495]">
                      {user
                        ? 'Profile photos & streaks sync securely with Firebase'
                        : 'Connect an account to preserve your profile permanently'}
                    </p>
                  </div>
                  {!user && (
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
            </div>

            {/* Footer Actions */}
            <div className="p-5 border-t border-white/5 bg-[#101217] flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-sm font-medium text-[#7d8495] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={isSaving}
                className="flex-1 py-3 px-4 rounded-2xl bg-accent-primary hover:bg-[#9eff38] active:scale-95 text-black font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(140,238,40,0.25)]"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
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

      {/* Auth Gate Modal for Guest users */}
      <AnimatePresence>
        {showAuthGateModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="w-full max-w-sm bg-[#181b23] border border-[#2e3547] rounded-3xl p-6 text-center space-y-4 shadow-2xl"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent-primary/15 border border-accent-primary/30 text-accent-primary mx-auto flex items-center justify-center">
                <LogIn className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Log in or Create an Account
                </h3>
                <p className="text-xs text-[#7d8495] mt-2 leading-relaxed">
                  Log in or Create an Account to save your profile photo and sync your consistency streak across all devices.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAuthGateModal(false);
                    onClose();
                    navigate('/login');
                  }}
                  className="w-full py-3 rounded-2xl bg-accent-primary hover:bg-[#9eff38] text-black font-semibold text-sm transition-all cursor-pointer shadow-[0_0_20px_rgba(140,238,40,0.3)] flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Log in / Sign Up</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    // Allow local preview for guest
                    setShowAuthGateModal(false);
                    galleryInputRef.current?.click();
                  }}
                  className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-medium text-white/80 hover:text-white transition-colors cursor-pointer"
                >
                  Continue with Local Photo (Guest Mode)
                </button>

                <button
                  type="button"
                  onClick={() => setShowAuthGateModal(false)}
                  className="w-full py-2 text-xs text-[#7d8495] hover:text-white cursor-pointer"
                >
                  Cancel
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
