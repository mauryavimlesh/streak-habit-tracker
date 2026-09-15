import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share2, Smartphone, Square } from 'lucide-react';
import html2canvas from 'html2canvas';
import { cn } from '../../lib/utils';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode | ((format: 'story' | 'square') => React.ReactNode);
  fileName?: string;
}

export function ShareModal({ isOpen, onClose, children, fileName = 'streak-share' }: ShareModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState<'story' | 'square'>('story');

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // High resolution for better sharing
        backgroundColor: '#0a0c10',
        useCORS: true,
      });
      
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `${fileName}-${format}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to generate image', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleNativeShare = async () => {
    if (!cardRef.current) return;
    
    // Fallback to download if native share is not supported
    if (!navigator.share || !navigator.canShare) {
      handleDownload();
      return;
    }

    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: '#0a0c10',
        useCORS: true,
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `${fileName}-${format}.png`, { type: 'image/png' });
        
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'STREAK',
              text: 'Check out my progress on STREAK! 🔥',
            });
          } catch (e) {
            // User likely cancelled
            console.log('Share failed or cancelled', e);
          }
        } else {
          handleDownload();
        }
        setIsExporting(false);
      }, 'image/png');
    } catch (error) {
      console.error('Failed to generate image', error);
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          className="relative w-full max-w-[360px] bg-[#14161e] border border-[#232938] rounded-[32px] p-5 shadow-2xl z-10 flex flex-col items-center"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors z-20"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          
          <h2 className="text-lg font-bold text-white mb-4 mt-1 tracking-tight">Share Milestone</h2>
          
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 mb-6">
            <button
              onClick={() => setFormat('story')}
              className={cn(
                "flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                format === 'story' ? "bg-[#2a303c] text-white shadow" : "text-[#7d8495] hover:text-white"
              )}
            >
              <Smartphone className="w-3.5 h-3.5" /> Story (9:16)
            </button>
            <button
              onClick={() => setFormat('square')}
              className={cn(
                "flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                format === 'square' ? "bg-[#2a303c] text-white shadow" : "text-[#7d8495] hover:text-white"
              )}
            >
              <Square className="w-3.5 h-3.5" /> Post (1:1)
            </button>
          </div>
          
          <div className="w-full flex justify-center mb-8 overflow-hidden min-h-[300px] items-center">
            <div ref={cardRef} className="shadow-2xl">
              {typeof children === 'function' ? children(format) : children}
            </div>
          </div>

          <div className="flex w-full gap-3 mt-auto">
            <button
              onClick={handleDownload}
              disabled={isExporting}
              className="flex-1 py-3.5 rounded-2xl bg-surface-card border border-[#2a303c] text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 hover:bg-white/5"
            >
              <Download className="w-4 h-4" /> Save
            </button>
            <button
              onClick={handleNativeShare}
              disabled={isExporting}
              className="flex-1 py-3.5 rounded-2xl bg-accent-primary text-black font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 hover:bg-[#a5ff36]"
            >
              <Share2 className="w-4 h-4" /> {isExporting ? 'Preparing...' : 'Share'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
