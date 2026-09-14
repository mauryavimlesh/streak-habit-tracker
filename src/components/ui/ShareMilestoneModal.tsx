import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share, Download, Flame, CheckCircle2, Award } from 'lucide-react';
import html2canvas from 'html2canvas';
import { cn } from '../../lib/utils';

interface ShareMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  streak: number;
  userName: string;
  totalHabits: number;
  completedHabits: number;
  goalTitle?: string;
}

export function ShareMilestoneModal({
  isOpen,
  onClose,
  streak,
  userName,
  totalHabits,
  completedHabits,
  goalTitle
}: ShareMilestoneModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, // High resolution
        backgroundColor: '#0a0c10', // Match background
        useCORS: true,
      });
      
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = goalTitle ? `goal-${goalTitle.replace(/\s+/g, '-').toLowerCase()}.png` : `streak-${streak}-days.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to generate image', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const completionRate = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          className="relative w-full max-w-sm bg-[#14161e] border border-[#232938] rounded-[32px] p-4 shadow-2xl z-10 flex flex-col items-center"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors z-20"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          
          <h2 className="text-lg font-bold text-white mb-4 mt-2">Share Milestone</h2>
          
          {/* 9:16 Card Container */}
          <div className="w-full flex justify-center mb-6">
            {/* 9:16 Aspect Ratio is roughly 9/16 = 0.5625. If width is 240px, height is 426px. */}
            <div 
              ref={cardRef}
              className="w-[260px] h-[462px] relative rounded-3xl overflow-hidden shadow-2xl flex flex-col bg-gradient-to-br from-[#121820] to-[#0a0c10] border border-[#2a303c]"
              style={{ padding: '24px' }}
            >
              {/* Background Glows */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent-primary/20 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/10 blur-[60px] rounded-full translate-y-1/2 -translate-x-1/2"></div>
              
              <div className="flex-1 flex flex-col z-10">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                  <span className="font-bold tracking-tight text-white flex items-center gap-1.5 text-sm">
                    <span className="w-2 h-2 rounded-full bg-accent-primary"></span>
                    STREAK
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7d8495]">{today}</span>
                </div>
                
                {/* Main Content */}
                <div className="flex-1 flex flex-col items-center justify-center text-center -mt-4">
                  <div className="w-20 h-20 rounded-full bg-[#1e3419] border border-[#2d5025] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(165,255,54,0.15)] relative">
                    <div className="absolute inset-0 rounded-full border border-accent-primary/50 animate-ping opacity-20"></div>
                    {goalTitle ? (
                      <Award className="w-10 h-10 text-accent-primary" />
                    ) : (
                      <Flame className="w-10 h-10 fill-accent-primary stroke-accent-primary" />
                    )}
                  </div>
                  
                  <h3 className={cn("leading-none font-bold text-white mb-2 tracking-tighter", goalTitle ? "text-[28px]" : "text-[54px]")}>
                    {goalTitle || streak}
                  </h3>
                  <p className="text-sm font-semibold text-accent-primary uppercase tracking-widest mb-6">
                    {goalTitle ? 'Goal Target' : 'Day Streak'}
                  </p>
                  
                  <p className="text-[#a1a8b9] text-xs leading-relaxed max-w-[200px]">
                    <span className="font-semibold text-white">{userName || 'I'}</span> is {goalTitle ? 'making solid progress on their goals.' : 'building momentum and crushing daily habits.'}
                  </p>
                </div>
                
                {/* Bottom Stats */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex justify-around mt-auto backdrop-blur-md">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-[#7d8495] uppercase font-bold tracking-wider mb-1">Completed</span>
                    <span className="text-white font-bold text-sm flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      {completedHabits}/{totalHabits}
                    </span>
                  </div>
                  <div className="w-[1px] bg-white/10"></div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-[#7d8495] uppercase font-bold tracking-wider mb-1">Score</span>
                    <span className="text-white font-bold text-sm flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      {streak * 10}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="w-full py-4 rounded-2xl bg-accent-primary text-black font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {isExporting ? (
              'Exporting...'
            ) : (
              <>
                <Download className="w-4 h-4" /> Save to Photos
              </>
            )}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
