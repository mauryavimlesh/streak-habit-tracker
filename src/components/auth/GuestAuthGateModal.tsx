import React from 'react';
import { useNavigate } from 'react-router';
import { Shield, Sparkles, Users, Trophy, Cloud, X } from 'lucide-react';
import { triggerHaptic } from '../../lib/haptics';

interface GuestAuthGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export default function GuestAuthGateModal({
  isOpen,
  onClose,
  featureName = 'Social & Community',
}: GuestAuthGateModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSignIn = () => {
    triggerHaptic('tap');
    onClose();
    navigate('/login');
  };

  const handleSignUp = () => {
    triggerHaptic('tap');
    onClose();
    navigate('/login?tab=signup');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-[28px] bg-[#121620] border border-[#232a3b] p-6 shadow-2xl relative text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-accent-primary/10 border border-accent-primary/25 flex items-center justify-center mx-auto mb-4 text-accent-primary">
          <Sparkles className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-bold text-white tracking-tight mb-1.5">
          Create your STREAKLOOP identity
        </h3>

        <p className="text-xs text-[#8c94a8] leading-relaxed mb-5">
          Sign in to unlock {featureName}, connect with accountability friends, join challenges, and sync your streaks across all devices.
        </p>

        {/* Value Props */}
        <div className="space-y-2 mb-6 text-left">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
            <Users className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-[11px] text-white/90">Unique username & friends comparison</span>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px] text-white/90">Community sprints & habit challenges</span>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
            <Cloud className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px] text-white/90">Permanent cloud backup & sync</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleSignUp}
            className="w-full py-3 px-4 rounded-xl bg-accent-primary hover:opacity-90 text-black font-semibold text-xs tracking-tight transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-accent-primary/20"
          >
            Create Account
          </button>

          <button
            onClick={handleSignIn}
            className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs tracking-tight transition-all active:scale-[0.98] cursor-pointer border border-white/10"
          >
            Log In
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-[11px] text-[#7d8495] hover:text-white transition-colors cursor-pointer"
          >
            Continue exploring as Guest
          </button>
        </div>
      </div>
    </div>
  );
}
