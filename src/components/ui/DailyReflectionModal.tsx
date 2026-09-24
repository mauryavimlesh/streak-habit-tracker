import React, { useState } from 'react';
import { X, Sparkles, Star, Check } from 'lucide-react';
import { MomentumResult } from '../../lib/momentumService';
import { createJournalEntry, JournalMood } from '../../lib/journalService';
import { getTodayDateKey } from '../../lib/dateUtils';

interface DailyReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  momentum: MomentumResult;
  userId?: string;
  onSaved?: () => void;
}

export const DailyReflectionModal: React.FC<DailyReflectionModalProps> = ({
  isOpen,
  onClose,
  momentum,
  userId,
  onSaved,
}) => {
  const [mood, setMood] = useState<JournalMood>('great');
  const [productivityRating, setProductivityRating] = useState<number>(4);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !title.trim()) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await createJournalEntry(
        {
          date: getTodayDateKey(),
          time: timeStr,
          mood,
          title: title.trim() || 'Daily Reflection',
          text: text.trim(),
          productivityRating,
          momentum: momentum.score,
        },
        userId
      );
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save reflection:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const { score, isZeroPlanDay, breakdown } = momentum;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#141722] border border-[#23293a] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#212635]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Daily Reflection</h2>
              <p className="text-xs text-[#7d8495]">Review your momentum and close out the day</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1b1f2b] hover:bg-[#252b3b] text-[#8e95a5] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Momentum & Real Progress Summary */}
        <div className="px-6 py-4 bg-[#11131c] border-b border-[#212635]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#7d8495]">
              Today's Performance
            </span>
            <span className="text-xs font-bold text-accent-primary bg-accent-primary/10 border border-accent-primary/20 px-2.5 py-0.5 rounded-full">
              {isZeroPlanDay ? 'No plans' : `${score}% Momentum`}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-[#181a24] p-2 rounded-xl border border-[#222736]">
              <span className="block font-bold text-white">{breakdown.habits.completed}/{breakdown.habits.target}</span>
              <span className="text-[10px] text-[#7d8495]">Habits</span>
            </div>
            <div className="bg-[#181a24] p-2 rounded-xl border border-[#222736]">
              <span className="block font-bold text-white">{breakdown.tasks.completed}/{breakdown.tasks.target}</span>
              <span className="text-[10px] text-[#7d8495]">Tasks</span>
            </div>
            <div className="bg-[#181a24] p-2 rounded-xl border border-[#222736]">
              <span className="block font-bold text-white">{breakdown.goals.completed}/{breakdown.goals.target}</span>
              <span className="text-[10px] text-[#7d8495]">Goals</span>
            </div>
            <div className="bg-[#181a24] p-2 rounded-xl border border-[#222736]">
              <span className="block font-bold text-white">{breakdown.focus.completed}m</span>
              <span className="text-[10px] text-[#7d8495]">Focus</span>
            </div>
          </div>
        </div>

        {/* Reflection Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-white">How was your day?</label>
            <p className="text-xs text-[#7d8495]">
              Optional quick self-check. No pressure to write extensive essays.
            </p>
          </div>

          {/* Mood Selection */}
          <div className="space-y-1.5">
            <span className="text-xs text-[#7d8495] font-medium">Mood:</span>
            <div className="grid grid-cols-5 gap-2">
              {[
                { key: 'great', label: 'Great', emoji: '🔥' },
                { key: 'good', label: 'Good', emoji: '✨' },
                { key: 'neutral', label: 'Neutral', emoji: '😐' },
                { key: 'tired', label: 'Tired', emoji: '🥱' },
                { key: 'stressed', label: 'Stressed', emoji: '🌪️' },
              ].map((m) => (
                <button
                  type="button"
                  key={m.key}
                  onClick={() => setMood(m.key as JournalMood)}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    mood === m.key
                      ? 'bg-accent-primary/10 border-accent-primary text-white'
                      : 'bg-[#181b26] border-[#222738] text-[#7d8495] hover:text-white'
                  }`}
                >
                  <span className="text-base">{m.emoji}</span>
                  <span className="text-[10px] font-semibold">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Productivity Rating (1-5 Stars) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#7d8495] font-medium">Productivity Rating:</span>
              <span className="font-semibold text-white">{productivityRating} / 5</span>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setProductivityRating(star)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    star <= productivityRating
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-[#181b26] border-[#222738] text-[#5e6678]'
                  }`}
                >
                  <Star className="w-5 h-5 fill-current" />
                </button>
              ))}
            </div>
          </div>

          {/* Title & Content */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Headline (e.g. Focused morning sprint)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#181a24] border border-[#222736] text-white text-sm placeholder-[#5e6678] focus:outline-hidden focus:border-accent-primary"
            />
            <textarea
              rows={3}
              placeholder="What went well today? What will you improve tomorrow?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#181a24] border border-[#222736] text-white text-sm placeholder-[#5e6678] focus:outline-hidden focus:border-accent-primary resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8e95a5] hover:text-white transition-colors cursor-pointer"
            >
              Skip for today
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-accent-primary hover:bg-accent-primary/90 text-black text-xs font-bold transition-colors cursor-pointer shadow-md"
            >
              {isSaving ? 'Saving...' : 'Save Reflection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
