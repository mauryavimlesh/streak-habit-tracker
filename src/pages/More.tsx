import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router';
import {
  Bell,
  Settings as SettingsIcon,
  ChevronRight,
  Target,
  BarChart2,
  Sparkles,
  Book,
  Clock,
  Palette,
  Cloud,
  Settings,
  HelpCircle,
  Play,
  Moon,
  Calendar,
  Users,
  CheckCircle2,
  Flame,
  Zap,
  Shield,
  Layers,
} from 'lucide-react';
import UserAvatar from '../components/profile/UserAvatar';
import EditProfileModal from '../components/profile/EditProfileModal';
import DeveloperFooter from '../components/layout/DeveloperFooter';
import GuestAuthGateModal from '../components/auth/GuestAuthGateModal';
import { triggerHaptic } from '../lib/haptics';
import { getLocalFriends } from '../lib/socialService';
import { getStoredLifetimeXP, calculateLevel } from '../lib/xpService';
import { readLocalHabits, readLocalLogs } from '../lib/habitService';
import { calculateGlobalHabitStreak } from '../lib/habitEngine';

export default function More() {
  const { user, profile, logout, isGuest } = useAuth();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAuthGateOpen, setIsAuthGateOpen] = useState(false);
  const [authGateFeature, setAuthGateFeature] = useState('Friends & Accountability');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Identity: Display Name vs unique @username
  const displayName = profile?.displayName || profile?.name || 'Vimlesh';
  const username = (profile?.userName || profile?.name || 'vimlesh').replace(/\s+/g, '_').toLowerCase();

  // Social counts
  const [friendsCount, setFriendsCount] = useState(0);
  const [sharedHabitsCount, setSharedHabitsCount] = useState(0);
  const [lifetimeXP, setLifetimeXP] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    const f = getLocalFriends();
    const habits = readLocalHabits();
    const logs = readLocalLogs();
    const shared = habits.filter((h) => h.isShared || h.visibility === 'shared');
    const xp = getStoredLifetimeXP();
    const streak = calculateGlobalHabitStreak(habits, logs).currentStreak;

    setFriendsCount(f.length);
    setSharedHabitsCount(shared.length);
    setLifetimeXP(xp);
    setCurrentStreak(streak);
  }, [isEditModalOpen]);

  const levelInfo = calculateLevel(lifetimeXP);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenSocial = () => {
    triggerHaptic('tap');
    if (isGuest) {
      setAuthGateFeature('Friends & Community');
      setIsAuthGateOpen(true);
      return;
    }
    navigate('/social');
  };

  // Compact rows under PERSONAL
  const personalItems = [
    { id: 'goals', label: 'Goals', sub: 'Long-term milestones', icon: Target, color: 'text-pink-400', bg: 'bg-pink-400/15', path: '/goals' },
    { id: 'journal', label: 'Journal', sub: 'Daily reflections & wins', icon: Book, color: 'text-fuchsia-400', bg: 'bg-fuchsia-400/15', path: '/journal' },
    { id: 'analytics', label: 'Analytics', sub: 'Consistency trends', icon: BarChart2, color: 'text-yellow-400', bg: 'bg-yellow-400/15', path: '/analytics' },
    { id: 'activity', label: 'Workout & Focus Timer', sub: 'Deep work tracker', icon: Play, color: 'text-emerald-400', bg: 'bg-emerald-400/15', path: '/activity/history' },
    { id: 'ai', label: 'AI Coach', sub: 'Habit guidance & chat', icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-400/15', path: '/ai-coach' },
    { id: 'reminders', label: 'Reminders & Alarms', sub: 'Smart habit nudges', icon: Clock, color: 'text-orange-400', bg: 'bg-orange-400/15', path: '/reminders' },
  ];

  // Compact rows under APP
  const appItems = [
    { id: 'themes', label: 'Themes & Appearance', icon: Palette, color: 'text-cyan-400', bg: 'bg-cyan-400/15', path: '/themes' },
    { id: 'sync', label: 'Backup & Cloud Sync', icon: Cloud, color: 'text-blue-500', bg: 'bg-blue-500/15', path: '/sync' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'text-indigo-400', bg: 'bg-indigo-400/15', path: '/settings' },
    { id: 'help', label: 'Help & Support', icon: HelpCircle, color: 'text-blue-300', bg: 'bg-blue-300/15', path: '/support' },
  ];

  return (
    <div className="p-4 pb-28 space-y-5 max-w-md mx-auto relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#1e2330] border border-accent-primary/40 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-accent-primary" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between pt-1 mb-1">
        <h1 className="text-xl font-bold text-white tracking-tight">More</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              triggerHaptic('tap');
              navigate('/reminders');
            }}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              triggerHaptic('tap');
              navigate('/settings');
            }}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors cursor-pointer"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 1. COMPACT PROFILE HEADER */}
      <div
        onClick={() => {
          triggerHaptic('tap');
          setIsEditModalOpen(true);
        }}
        className="p-4 rounded-[24px] bg-surface-card border border-[#1f232c] hover:border-accent-primary/40 cursor-pointer transition-all shadow-sm group active:scale-[0.99] space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <UserAvatar
                avatarUrl={profile?.avatarUrl}
                name={displayName}
                size="md"
                showBadge
                onBadgeClick={() => {
                  triggerHaptic('tap');
                  setIsEditModalOpen(true);
                }}
              />
              <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-[#141822] border border-accent-primary/40 text-[9px] font-bold text-accent-primary leading-none shadow">
                Lv.{levelInfo.level}
              </div>
            </div>

            <div>
              <h2 className="font-bold text-white tracking-tight text-[15px] group-hover:text-accent-primary transition-colors flex items-center gap-2">
                <span>{displayName}</span>
              </h2>
              {isGuest ? (
                <p className="text-xs text-accent-primary font-medium mt-0.5 flex items-center gap-1.5">
                  <span>Guest Account</span>
                  <span className="text-[10px] text-[#8c94a8]">· Sign up to claim handle</span>
                </p>
              ) : (
                <p className="text-xs font-mono text-cyan-400 font-semibold mt-0.5">
                  @{username}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 text-[#7d8495] group-hover:text-white transition-colors">
            <span className="text-[11px] font-semibold text-accent-primary/80 group-hover:text-accent-primary">
              Edit Profile
            </span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Level, XP, Streak Badges */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
              <Flame className="w-3 h-3 fill-amber-400 text-amber-400" />
              {currentStreak}d Streak
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/20">
              <Zap className="w-3 h-3 text-cyan-400" />
              {lifetimeXP.toLocaleString()} XP
            </span>
          </div>

          <span className="text-[10px] text-[#7d8495]">
            {user && !user.isAnonymous ? 'Personal Plan · In Sync' : 'Guest Mode'}
          </span>
        </div>
      </div>

      {/* 2. CONNECT: ONE PRIMARY SOCIAL ENTRY */}
      <section className="space-y-1.5">
        <h3 className="text-[11px] font-bold text-[#8c94a8] uppercase tracking-wider px-2">
          Connect
        </h3>

        <div
          onClick={handleOpenSocial}
          className="p-4 rounded-[24px] bg-gradient-to-r from-accent-primary/[0.08] via-surface-card to-surface-card border border-accent-primary/30 hover:border-accent-primary/60 transition-all cursor-pointer group active:scale-[0.99] shadow-sm flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center text-accent-primary shadow-sm group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-[15px] font-bold text-white group-hover:text-accent-primary transition-colors">
                  Friends
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-primary/15 text-accent-primary border border-accent-primary/25">
                  {friendsCount > 0
                    ? `${friendsCount} friend${friendsCount === 1 ? '' : 's'}${sharedHabitsCount > 0 ? ` · ${sharedHabitsCount} shared` : ''}`
                    : 'Build your circle'}
                </span>
              </div>
              <p className="text-xs text-[#8c94a8] mt-0.5">
                Connect, invite & stay accountable
              </p>
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-accent-primary/70 group-hover:text-accent-primary group-hover:translate-x-0.5 transition-all" />
        </div>
      </section>

      {/* 3. PERSONAL (Compact Rows) */}
      <section className="space-y-1.5">
        <h3 className="text-[11px] font-bold text-[#8c94a8] uppercase tracking-wider px-2">
          Personal
        </h3>
        <div className="bg-surface-card border border-[#1f232c] rounded-[22px] p-1.5 divide-y divide-[#1e222c] shadow-sm">
          {personalItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                triggerHaptic('tap');
                navigate(item.path);
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#181c26] transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-[13px] font-medium text-white/90 group-hover:text-white transition-colors">
                    {item.label}
                  </span>
                  {item.sub && <span className="text-[10px] text-[#7d8495]">{item.sub}</span>}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#7d8495] group-hover:text-white transition-colors" />
            </button>
          ))}
        </div>
      </section>

      {/* 4. APP (Compact Rows) */}
      <section className="space-y-1.5">
        <h3 className="text-[11px] font-bold text-[#8c94a8] uppercase tracking-wider px-2">
          App
        </h3>
        <div className="bg-surface-card border border-[#1f232c] rounded-[22px] p-1.5 divide-y divide-[#1e222c] shadow-sm">
          {appItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                triggerHaptic('tap');
                navigate(item.path);
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#181c26] transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="text-[13px] font-medium text-white/90 group-hover:text-white transition-colors">
                  {item.label}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#7d8495] group-hover:text-white transition-colors" />
            </button>
          ))}
        </div>
      </section>

      {/* Sign Out / Sign In Button */}
      {user && !user.isAnonymous ? (
        <div className="pt-1">
          <button
            onClick={async () => {
              triggerHaptic('tap');
              await logout();
              navigate('/login');
            }}
            className="w-full py-3 rounded-[16px] bg-red-500/10 text-red-400 font-medium text-xs hover:bg-red-500/20 transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div className="pt-1">
          <button
            onClick={() => {
              triggerHaptic('tap');
              navigate('/login');
            }}
            className="w-full py-3 rounded-[16px] bg-accent-primary/10 text-accent-primary font-medium text-xs hover:bg-accent-primary/20 transition-colors cursor-pointer"
          >
            Sign In / Create Account
          </button>
        </div>
      )}

      {/* Developer Footer */}
      <DeveloperFooter />

      {/* Edit Profile Modal (Profile & Achievements) */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccessToast={showToast}
      />

      {/* Guest Authentication Gate Modal */}
      <GuestAuthGateModal
        isOpen={isAuthGateOpen}
        onClose={() => setIsAuthGateOpen(false)}
        featureName={authGateFeature}
      />
    </div>
  );
}
