import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  User,
  Clock,
  Calendar,
  Volume2,
  Sparkles,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Info,
  Check,
  X,
  LogOut,
  LogIn,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { hasGuestDataToMigrate } from '../../lib/guestMigrationService';
import {
  AppSettings,
  readAppSettings,
  saveAppSettings,
  clearAllLocalData,
} from '../../lib/settingsService';
import { cn } from '../../lib/utils';
import UserAvatar from '../../components/profile/UserAvatar';
import EditProfileModal from '../../components/profile/EditProfileModal';
import DeveloperFooter from '../../components/layout/DeveloperFooter';

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile, updateProfile, signOut, isGuest, resetGuestSession, migrateGuestData } = useAuth();

  const [settings, setSettings] = useState<AppSettings>(readAppSettings());
  const [displayName, setDisplayName] = useState(profile?.displayName || profile?.name || 'Guest Explorer');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(() => {
    return sessionStorage.getItem('streak_guest_migrated') === 'true'
      ? 'Guest data migrated to Firestore'
      : null;
  });
  const [hasPendingGuestData, setHasPendingGuestData] = useState(() => hasGuestDataToMigrate());

  useEffect(() => {
    if (profile?.displayName || profile?.name) {
      setDisplayName(profile.displayName || profile.name);
    }
  }, [profile]);

  const handleUpdateSetting = (updates: Partial<AppSettings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    saveAppSettings(updated);
  };

  const handleSaveName = async () => {
    if (displayName.trim()) {
      await updateProfile({ displayName: displayName.trim() });
      setIsEditingName(false);
    }
  };

  const handleResetOnboarding = async () => {
    await updateProfile({ hasCompletedOnboarding: false });
    navigate('/onboarding');
  };

  const handleConfirmClearData = () => {
    clearAllLocalData();
    setShowClearConfirm(false);
    navigate('/onboarding');
    window.location.reload();
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-white pb-24 select-none">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-white/10 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/more')}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Settings</h1>
            <p className="text-xs text-[#7d8495]">App preferences & account</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto w-full px-5 pt-4 space-y-4">
        {/* Profile Card */}
        <div className="p-5 rounded-3xl bg-surface-card border border-white/5 space-y-3">
          <span className="text-[11px] font-semibold text-[#7d8495] uppercase tracking-wider block">
            Profile & Account
          </span>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserAvatar
                avatarUrl={profile?.avatarUrl}
                name={displayName}
                size="md"
                showBadge
                onBadgeClick={() => setIsEditProfileOpen(true)}
                onClick={() => setIsEditProfileOpen(true)}
                className="cursor-pointer"
              />
              <div>
                {isEditingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="px-2 py-1 bg-black/40 border border-white/20 rounded-lg text-sm text-white focus:outline-none focus:border-accent-primary"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      className="p-1 text-accent-primary hover:text-white"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{profile?.displayName || profile?.name || 'Guest Explorer'}</h3>
                    {isGuest && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent-primary/15 text-accent-primary border border-accent-primary/30">
                        Guest
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsEditProfileOpen(true)}
                      className="text-[10px] text-accent-primary hover:underline cursor-pointer ml-1"
                    >
                      Edit
                    </button>
                  </div>
                )}
                <p className="text-xs text-[#7d8495] flex items-center gap-1.5 mt-0.5">
                  {isGuest ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
                      <span>Guest mode (saved in streak_guest_data)</span>
                    </>
                  ) : (
                    user?.email || 'Logged in'
                  )}
                </p>
              </div>
            </div>

            {user && !user.isAnonymous ? (
              <button
                type="button"
                onClick={signOut}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-[#7d8495] hover:text-white border border-white/10 transition-colors cursor-pointer flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="px-3 py-1.5 rounded-xl bg-accent-primary hover:bg-[#9eff38] text-xs font-semibold text-black transition-colors cursor-pointer flex items-center gap-1 shadow-[0_0_15px_rgba(140,238,40,0.25)]"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>

          {isGuest && (
            <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
              <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-accent-primary/5 border border-accent-primary/15 text-[11px] text-[#a3b1cc]">
                <ShieldCheck className="w-4 h-4 text-accent-primary shrink-0 mt-0.5" />
                <span>
                  Your guest streaks, habits, and tasks are safely stored locally in <code className="text-white font-mono text-[10px]">streak_guest_data</code>. When you sign in, everything will be migrated to Firestore and cleared locally only after confirmed database write.
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[#7d8495]">Want a fresh guest profile?</span>
                <button
                  type="button"
                  onClick={() => {
                    const newGuest = resetGuestSession();
                    setDisplayName(newGuest.displayName);
                  }}
                  className="text-white/70 hover:text-white underline text-[11px] cursor-pointer"
                >
                  Reset Guest Session
                </button>
              </div>
            </div>
          )}

          {!isGuest && hasPendingGuestData && (
            <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-amber-200 text-[11px]">Unmigrated guest data found in browser</span>
                </div>
                <button
                  type="button"
                  disabled={isMigrating}
                  onClick={async () => {
                    setIsMigrating(true);
                    try {
                      const res = await migrateGuestData();
                      if (res?.success) {
                        setMigrationStatus('Successfully migrated guest data to Firestore');
                        setHasPendingGuestData(false);
                      } else {
                        setMigrationStatus(res?.error || 'Migration failed');
                      }
                    } catch (e: any) {
                      setMigrationStatus(e?.message || 'Error migrating data');
                    } finally {
                      setIsMigrating(false);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-semibold text-[10px] flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-3 h-3", isMigrating && "animate-spin")} />
                  <span>{isMigrating ? 'Migrating...' : 'Migrate Now'}</span>
                </button>
              </div>
            </div>
          )}

          {!isGuest && migrationStatus && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-accent-primary bg-accent-primary/10 border border-accent-primary/20 px-3 py-1.5 rounded-xl">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{migrationStatus}</span>
            </div>
          )}
        </div>

        {/* General Preferences */}
        <div className="p-5 rounded-3xl bg-surface-card border border-white/5 space-y-4">
          <span className="text-[11px] font-semibold text-[#7d8495] uppercase tracking-wider block">
            General Preferences
          </span>

          {/* Week Start */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-accent-primary" />
              <div>
                <h4 className="text-xs font-bold text-white">First Day of Week</h4>
                <p className="text-[10px] text-[#7d8495]">Calendar & streak alignment</p>
              </div>
            </div>
            <div className="grid grid-cols-2 p-0.5 rounded-xl bg-black/40 border border-white/5 text-xs">
              <button
                type="button"
                onClick={() => handleUpdateSetting({ weekStart: 'monday' })}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                  settings.weekStart === 'monday' ? 'bg-white/15 text-white' : 'text-[#7d8495]'
                )}
              >
                Mon
              </button>
              <button
                type="button"
                onClick={() => handleUpdateSetting({ weekStart: 'sunday' })}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                  settings.weekStart === 'sunday' ? 'bg-white/15 text-white' : 'text-[#7d8495]'
                )}
              >
                Sun
              </button>
            </div>
          </div>

          {/* Time Format */}
          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-accent-primary" />
              <div>
                <h4 className="text-xs font-bold text-white">Clock Format</h4>
                <p className="text-[10px] text-[#7d8495]">12-hour or 24-hour display</p>
              </div>
            </div>
            <div className="grid grid-cols-2 p-0.5 rounded-xl bg-black/40 border border-white/5 text-xs">
              <button
                type="button"
                onClick={() => handleUpdateSetting({ timeFormat: '12h' })}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                  settings.timeFormat === '12h' ? 'bg-white/15 text-white' : 'text-[#7d8495]'
                )}
              >
                12h
              </button>
              <button
                type="button"
                onClick={() => handleUpdateSetting({ timeFormat: '24h' })}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer',
                  settings.timeFormat === '24h' ? 'bg-white/15 text-white' : 'text-[#7d8495]'
                )}
              >
                24h
              </button>
            </div>
          </div>

          {/* AI Coach Context Sharing */}
          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-accent-primary" />
              <div>
                <h4 className="text-xs font-bold text-white">AI Coach Context</h4>
                <p className="text-[10px] text-[#7d8495]">Allow coach to read recent streaks</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleUpdateSetting({ aiContextSharing: !settings.aiContextSharing })}
              className={cn(
                'w-11 h-6 rounded-full transition-colors relative cursor-pointer',
                settings.aiContextSharing ? 'bg-accent-primary' : 'bg-white/10'
              )}
            >
              <div
                className={cn(
                  'w-4 h-4 rounded-full top-1 absolute shadow transition-transform',
                  settings.aiContextSharing ? 'translate-x-6 bg-black' : 'translate-x-1 bg-white/60'
                )}
              />
            </button>
          </div>
        </div>

        {/* Maintenance & Reset */}
        <div className="p-5 rounded-3xl bg-surface-card border border-white/5 space-y-3">
          <span className="text-[11px] font-semibold text-[#7d8495] uppercase tracking-wider block">
            System & Data Reset
          </span>

          <button
            type="button"
            onClick={handleResetOnboarding}
            className="w-full py-2.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-between text-xs font-semibold text-white transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-[#7d8495]" />
              <span>Replay Onboarding Guide</span>
            </div>
            <span className="text-[10px] text-[#7d8495]">Reset intro</span>
          </button>

          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="w-full py-2.5 px-3 rounded-2xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 flex items-center justify-between text-xs font-semibold text-red-400 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>Clear All Local Data</span>
            </div>
            <span className="text-[10px] text-red-400/80">Erase device cache</span>
          </button>
        </div>

        {/* App Version Info */}
        <div className="text-center py-4 space-y-1">
          <p className="text-xs font-semibold text-white/80">STREAK • Version {settings.appVersion}</p>
          <p className="text-[11px] text-[#7d8495]">Designed for discipline, clarity & execution</p>
        </div>

        {/* Developer Footer */}
        <DeveloperFooter />
      </main>

      {/* Clear Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-surface-card border border-red-500/30 rounded-3xl p-5 z-10 space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Erase All Data?</h3>
                <p className="text-xs text-[#7d8495] mt-1 leading-relaxed">
                  This action will permanently delete your habits, logs, calendar tasks, goals, and journal entries from this browser.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearData}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-xs font-bold text-white cursor-pointer"
                >
                  Confirm Erase
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />
    </div>
  );
}
