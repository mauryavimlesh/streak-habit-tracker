import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Award,
  Flame,
  CheckCircle2,
  Share2,
  Download,
  BookOpen,
  Clock,
  Sparkles,
} from 'lucide-react';
import { MilestoneItem } from '../../lib/milestoneService';
import { ShareModal } from './ShareModal';
import { StreakShareCard } from './StreakShareCard';
import confetti from 'canvas-confetti';

interface MilestoneCelebrationModalProps {
  milestone: MilestoneItem | null;
  onClose: () => void;
  userName?: string;
}

export function MilestoneCelebrationModal({
  milestone,
  onClose,
  userName = 'Student',
}: MilestoneCelebrationModalProps) {
  const [isShareOpen, setIsShareOpen] = useState(false);

  if (!milestone) return null;

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.5 },
    });
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-10 h-10 text-accent-primary fill-accent-primary" />;
      case 'Award':
        return <Award className="w-10 h-10 text-amber-400" />;
      case 'BookOpen':
        return <BookOpen className="w-10 h-10 text-blue-400" />;
      case 'Clock':
        return <Clock className="w-10 h-10 text-purple-400" />;
      case 'CheckCircle2':
        return <CheckCircle2 className="w-10 h-10 text-emerald-400" />;
      default:
        return <Sparkles className="w-10 h-10 text-accent-primary" />;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-sm bg-[#12151d] border border-accent-primary/30 rounded-3xl overflow-hidden shadow-2xl relative text-center p-6"
        >
          {/* Background Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-accent-primary/15 blur-[60px] rounded-full pointer-events-none"></div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#7d8495] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Badge Icon */}
          <div className="mx-auto w-20 h-20 rounded-3xl bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center mb-4 mt-2 shadow-[0_0_30px_rgba(165,255,54,0.15)] relative">
            <div className="absolute inset-0 rounded-3xl border border-accent-primary/40 animate-ping opacity-20"></div>
            {getIconComponent(milestone.icon)}
          </div>

          <span className="text-[11px] font-bold uppercase tracking-widest text-accent-primary block mb-1">
            Milestone Unlocked!
          </span>
          <h3 className="text-xl font-black text-white tracking-tight mb-2">
            {milestone.title}
          </h3>
          <p className="text-xs text-[#a1a8b9] leading-relaxed mb-6 max-w-xs mx-auto">
            {milestone.description}
          </p>

          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-around mb-6">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-[#7d8495] uppercase font-bold tracking-wider">Achieved</span>
              <span className="text-white font-black text-base">{milestone.currentValue} {milestone.unit}</span>
            </div>
            <div className="w-[1px] h-6 bg-white/10"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-[#7d8495] uppercase font-bold tracking-wider">Status</span>
              <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Verified
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsShareOpen(true)}
              className="flex-1 py-3 rounded-2xl bg-accent-primary text-black font-bold text-xs hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-accent-primary/20"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Card</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>

      {/* Share Modal Integration */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        fileName={`milestone-${milestone.id}`}
      >
        {(format) => (
          <StreakShareCard
            userName={userName}
            streak={milestone.threshold}
            goalTitle={milestone.title}
            totalHabits={milestone.currentValue}
            completedHabits={milestone.threshold}
            format={format}
          />
        )}
      </ShareModal>
    </>
  );
}
