import React, { useState } from 'react';
import { X, Share2, Copy, Check, Send, Download, Sparkles, Flame, Zap, Award, Trophy } from 'lucide-react';
import { triggerHaptic } from '../../lib/haptics';

export type ShareCardType = 'streak' | 'xp' | 'momentum' | 'achievement' | 'challenge';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  cardType?: ShareCardType;
  metricValue?: string | number;
  metricLabel?: string;
  achievementTitle?: string;
  challengeTitle?: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  username,
  cardType = 'streak',
  metricValue = '21',
  metricLabel = 'Day Consistency Streak',
  achievementTitle,
  challengeTitle,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeType, setActiveType] = useState<ShareCardType>(cardType);

  if (!isOpen) return null;

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const getCardDetails = () => {
    switch (activeType) {
      case 'streak':
        return {
          badge: 'CONSISTENCY STREAK',
          icon: <Flame className="w-5 h-5 text-amber-400" />,
          value: metricValue,
          label: 'Days Unbroken',
          quote: 'Small actions. Every day. Discipline compound interest in action.',
          color: 'from-amber-500/20 via-[#181d2a] to-[#121622]',
          borderColor: 'border-amber-500/30',
          accentColor: 'text-amber-400',
        };
      case 'xp':
        return {
          badge: 'LIFETIME PROGRESSION',
          icon: <Zap className="w-5 h-5 text-cyan-400" />,
          value: metricValue,
          label: 'Productive XP Earned',
          quote: 'Turning daily focus sessions into lasting behavioral momentum.',
          color: 'from-cyan-500/20 via-[#181d2a] to-[#121622]',
          borderColor: 'border-cyan-500/30',
          accentColor: 'text-cyan-400',
        };
      case 'momentum':
        return {
          badge: "TODAY'S MOMENTUM",
          icon: <Sparkles className="w-5 h-5 text-accent-primary" />,
          value: `${metricValue}%`,
          label: 'Daily Execution Score',
          quote: 'Real progress against today’s scheduled habits, tasks, and goals.',
          color: 'from-accent-primary/20 via-[#181d2a] to-[#121622]',
          borderColor: 'border-accent-primary/30',
          accentColor: 'text-accent-primary',
        };
      case 'achievement':
        return {
          badge: 'ACHIEVEMENT UNLOCKED',
          icon: <Award className="w-5 h-5 text-purple-400" />,
          value: achievementTitle || 'Century of Actions',
          label: 'Mastery Milestone',
          quote: 'A milestone achieved through steady, relentless consistency.',
          color: 'from-purple-500/20 via-[#181d2a] to-[#121622]',
          borderColor: 'border-purple-500/30',
          accentColor: 'text-purple-400',
        };
      case 'challenge':
        return {
          badge: 'COMMUNITY CHALLENGE',
          icon: <Trophy className="w-5 h-5 text-yellow-400" />,
          value: challengeTitle || '7-Day Workout Sprint',
          label: 'Challenge Progress',
          quote: 'Pushing boundaries together with the STREAKLOOP collective.',
          color: 'from-yellow-500/20 via-[#181d2a] to-[#121622]',
          borderColor: 'border-yellow-500/30',
          accentColor: 'text-yellow-400',
        };
    }
  };

  const details = getCardDetails();
  const shareUrl = 'https://streakloop.vercel.app';
  const shareText = `🔥 @${username} on STREAKLOOP: ${details.value} (${details.label})! Build your streak together: ${shareUrl}`;

  const handleNativeShare = async () => {
    triggerHaptic('tap');
    if (navigator.share) {
      try {
        await navigator.share({
          title: `STREAKLOOP Progress — @${username}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {}
    }
    handleCopyLink();
  };

  const handleCopyLink = () => {
    triggerHaptic('tap');
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    triggerHaptic('tap');
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleTelegram = () => {
    triggerHaptic('tap');
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-[32px] bg-[#0e121a] border border-[#212738] p-5 shadow-2xl relative text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-base font-semibold text-white tracking-tight mb-3">
          Share Your Progress
        </h3>

        {/* Type selector tabs */}
        <div className="flex items-center justify-center gap-1.5 p-1 bg-white/[0.04] border border-white/5 rounded-2xl mb-4 overflow-x-auto">
          {(['streak', 'xp', 'momentum'] as ShareCardType[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                triggerHaptic('tap');
                setActiveType(t);
              }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all capitalize cursor-pointer ${
                activeType === t
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Premium Visual Share Card */}
        <div
          id="streakloop-share-card"
          className={`p-6 rounded-[28px] bg-gradient-to-b ${details.color} border ${details.borderColor} shadow-xl relative text-left overflow-hidden mb-5`}
        >
          {/* Subtle Grid Ambient Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:12px_12px] opacity-60 pointer-events-none" />

          {/* Card Header */}
          <div className="flex items-center justify-between relative z-10 mb-5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-[10px]">
                S
              </div>
              <span className="text-[12px] font-bold text-white tracking-wider">
                STREAKLOOP
              </span>
            </div>
            <span className="text-[10px] font-medium text-white/50 tracking-tight">
              {todayFormatted}
            </span>
          </div>

          {/* User Badge */}
          <div className="relative z-10 mb-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-medium text-white/90">
            {details.icon}
            <span>@{username}</span>
          </div>

          {/* Primary Metric */}
          <div className="relative z-10 my-2">
            <div className="text-[40px] font-black text-white leading-none tracking-tight">
              {details.value}
            </div>
            <p className={`text-xs font-semibold tracking-wide uppercase mt-1 ${details.accentColor}`}>
              {details.label}
            </p>
          </div>

          {/* Quote & Footer */}
          <p className="relative z-10 text-[11px] text-white/60 leading-relaxed mt-4 pt-3 border-t border-white/10 italic">
            "{details.quote}"
          </p>

          <div className="relative z-10 mt-3 flex items-center justify-between text-[9px] text-white/40">
            <span>Small actions. Every day.</span>
            <span className="font-mono">streakloop.vercel.app</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <button
            onClick={handleNativeShare}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-2xl bg-accent-primary/10 border border-accent-primary/25 text-accent-primary hover:bg-accent-primary/20 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-[10px] font-semibold">Share</span>
          </button>

          <button
            onClick={handleWhatsApp}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/25 text-[#25D366] hover:bg-[#25D366]/20 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="text-[10px] font-semibold">WhatsApp</span>
          </button>

          <button
            onClick={handleTelegram}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-2xl bg-[#0088cc]/10 border border-[#0088cc]/25 text-[#0088cc] hover:bg-[#0088cc]/20 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4 -rotate-45" />
            <span className="text-[10px] font-semibold">Telegram</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-2xl bg-white/5 border border-white/10 text-white/90 hover:bg-white/10 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-accent-primary" /> : <Copy className="w-4 h-4" />}
            <span className="text-[10px] font-semibold">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 text-[11px] text-[#7d8495] hover:text-white transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
}
