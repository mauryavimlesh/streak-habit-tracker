import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Sparkles, Users, ArrowRight, Flame, Shield, CheckCircle2 } from 'lucide-react';
import { resolveInviteCode } from '../lib/inviteService';
import { triggerHaptic } from '../lib/haptics';

export default function InviteLanding() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const [inviterName, setInviterName] = useState<string>('A STREAKLOOP member');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (code) {
      localStorage.setItem('streak_pending_invite_code', code.toUpperCase());
      resolveInviteCode(code).then((info) => {
        if (info.inviterUsername) {
          setInviterName(info.inviterDisplayName || info.inviterUsername);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [code]);

  const handleJoin = () => {
    triggerHaptic('success');
    navigate('/login?tab=signup');
  };

  const handleGuest = () => {
    triggerHaptic('tap');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-white flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Ambient Gradient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-accent-primary/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm rounded-[32px] bg-[#121622] border border-[#232a3d] p-7 shadow-2xl relative text-center z-10 space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center text-accent-primary font-black text-sm">
            S
          </div>
          <span className="text-sm font-black tracking-widest text-white">STREAKLOOP</span>
        </div>

        {/* Hero badge */}
        <div className="w-16 h-16 rounded-2xl bg-accent-primary/10 border border-accent-primary/25 flex items-center justify-center mx-auto text-accent-primary">
          <Users className="w-8 h-8" />
        </div>

        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-[10px] font-bold text-accent-primary uppercase tracking-wider mb-3">
            INVITATION CODE: {code?.toUpperCase()}
          </span>

          <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">
            Build your streak together.
          </h1>

          <p className="text-xs text-[#8c94a8] leading-relaxed mt-2">
            <strong className="text-white">@{inviterName}</strong> invited you to join STREAKLOOP for mutual accountability, daily momentum, and habits that compound.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-2 text-left text-xs text-[#a6adc2]">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Real momentum scores & streak protection</span>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
            <Users className="w-4 h-4 text-accent-primary shrink-0" />
            <span>Compare mutually shared habits privately</span>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
            <Shield className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Lifetime XP and rank progression</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button
            onClick={handleJoin}
            className="w-full py-3.5 px-4 rounded-xl bg-accent-primary hover:opacity-90 text-black font-bold text-xs tracking-tight transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2"
          >
            <span>Accept Invite & Create Account</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleGuest}
            className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs tracking-tight transition-all active:scale-[0.98] cursor-pointer border border-white/10"
          >
            Explore as Guest first
          </button>
        </div>
      </div>
    </div>
  );
}
