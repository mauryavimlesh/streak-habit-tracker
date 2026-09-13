import { useState, useEffect } from 'react';
import { logReflection, getReflection } from '../../lib/habitService';
import { BookOpen, Check, Loader2, Sparkles, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface DailyReflectionProps {
  userId: string;
  date: string;
  className?: string;
}

const INSPIRATION_PROMPTS = [
  'One win from today...',
  'What kept my momentum alive?',
  'One lesson learned today...',
  'Grateful for...',
];

const MAX_LENGTH = 140;

export function DailyReflection({ userId, date, className }: DailyReflectionProps) {
  const [text, setText] = useState('');
  const [savedText, setSavedText] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadReflection() {
      setIsLoading(true);
      const reflection = await getReflection(userId, date);
      if (isMounted) {
        if (reflection && reflection.text) {
          setText(reflection.text);
          setSavedText(reflection.text);
          setIsEditing(false);
        } else {
          setText('');
          setSavedText(null);
          setIsEditing(true);
        }
        setHasSaved(false);
        setIsLoading(false);
      }
    }
    loadReflection();
    return () => {
      isMounted = false;
    };
  }, [userId, date]);

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setIsSaving(true);
    try {
      await logReflection({
        userId,
        date,
        text: trimmed,
      });

      // Physical feedback on save
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([25, 35]);
        } catch {
          // ignore
        }
      }

      setSavedText(trimmed);
      setIsEditing(false);
      setHasSaved(true);
      setTimeout(() => setHasSaved(false), 2400);
    } catch (error) {
      console.error('Failed to save daily reflection:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const applyPrompt = (prompt: string) => {
    setText(prompt + ' ');
    setIsEditing(true);
  };

  return (
    <div
      id="daily-reflection-card"
      className={cn(
        'glass-effect rounded-[28px] p-5 relative overflow-hidden transition-all duration-300 select-none',
        className
      )}
    >
      {/* Subtle top accent gradient */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#a78bfa]/40 to-transparent" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#281e39] text-[#a78bfa] flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-white text-sm font-semibold tracking-tight">Daily Reflection</h3>
              <p className="text-[11px] text-[#7d8495] font-medium">One-line daily journal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {savedText && !isEditing && (
              <button
                id="edit-daily-reflection-btn"
                onClick={() => setIsEditing(true)}
                className="text-xs text-[#a78bfa] hover:text-white flex items-center gap-1 font-medium transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-white/5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
            {hasSaved && (
              <span className="text-[11px] font-semibold text-accent-primary flex items-center gap-1 bg-[#22361b] px-2 py-0.5 rounded-full border border-[#2d5025]">
                <Check className="w-3 h-3 stroke-[3]" /> Saved
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="h-14 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-[#7d8495] animate-spin" />
          </div>
        ) : savedText && !isEditing ? (
          /* View Mode */
          <div
            onClick={() => setIsEditing(true)}
            className="group cursor-pointer p-4 rounded-2xl bg-[#0e1015]/80 border border-white/5 hover:border-[#a78bfa]/30 transition-all duration-200"
          >
            <p className="text-sm text-white/90 italic font-medium leading-relaxed">
              "{savedText}"
            </p>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/5 text-[11px] text-[#7d8495]">
              <span>Appended to today's habit log</span>
              <span className="text-[#a78bfa] group-hover:underline">Tap to edit</span>
            </div>
          </div>
        ) : (
          /* Edit / Input Mode */
          <div className="space-y-2.5">
            <div className="flex items-center bg-[#0e1015]/90 border border-white/10 rounded-2xl overflow-hidden focus-within:border-[#a78bfa]/60 transition-colors shadow-inner">
              <input
                id="daily-reflection-input"
                type="text"
                value={text}
                maxLength={MAX_LENGTH}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                placeholder="What is one thought or win from today?"
                className="flex-1 bg-transparent border-none px-4 py-3.5 text-sm text-white placeholder-[#5c6272] focus:outline-none focus:ring-0"
              />

              <div className="flex items-center gap-1.5 pr-2">
                <span className="text-[10px] text-[#5c6272] font-mono px-1">
                  {text.length}/{MAX_LENGTH}
                </span>

                <AnimatePresence mode="wait">
                  {hasSaved ? (
                    <motion.div
                      key="saved"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      className="p-2 text-accent-primary"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </motion.div>
                  ) : text.trim().length > 0 ? (
                    <motion.button
                      id="save-daily-reflection-btn"
                      key="save"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-3 py-1.5 rounded-xl bg-[#281e39] border border-[#a78bfa]/40 text-[#a78bfa] hover:bg-[#a78bfa] hover:text-black font-semibold text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1"
                    >
                      {isSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span>Save</span>
                      )}
                    </motion.button>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            {/* Quick Inspiration Chips */}
            {(!text || text.length === 0) && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                <Sparkles className="w-3 h-3 text-[#a78bfa] shrink-0 ml-1" />
                {INSPIRATION_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => applyPrompt(prompt)}
                    className="shrink-0 text-[11px] text-[#7d8495] hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-full border border-white/5 transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
