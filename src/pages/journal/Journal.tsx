import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  Plus,
  Search,
  Smile,
  Flame,
  BatteryCharging,
  CloudSun,
  Meh,
  Tag,
  Sparkles,
  Calendar,
  Clock,
  Trash2,
  X,
  Send,
  BookOpen,
  Eye,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { ImageUpload } from '../../components/ui/ImageUpload';
import {
  JournalEntry,
  JournalMood,
  getUserJournal,
  createJournalEntry,
  deleteJournalEntry,
} from '../../lib/journalService';
import { permanentlyDeleteRecord } from '../../lib/deletionService';
import { sendCoachMessage } from '../../lib/aiCoachService';
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';
import { cn } from '../../lib/utils';

const MOODS: { id: JournalMood; label: string; icon: any; color: string }[] = [
  { id: 'great', label: 'Energized', icon: Flame, color: 'text-orange-400 bg-orange-500/15 border-orange-500/30' },
  { id: 'good', label: 'Positive', icon: Smile, color: 'text-accent-primary bg-accent-primary/15 border-accent-primary/30' },
  { id: 'neutral', label: 'Balanced', icon: Meh, color: 'text-blue-400 bg-blue-500/15 border-blue-500/30' },
  { id: 'tired', label: 'Low Energy', icon: BatteryCharging, color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30' },
  { id: 'stressed', label: 'Overwhelmed', icon: CloudSun, color: 'text-purple-400 bg-purple-500/15 border-purple-500/30' },
];

const PROMPTS = [
  'What went well today?',
  'What gave me the most energy?',
  'What resistance did I face and overcome?',
  'One thing I want to optimize tomorrow',
];

export default function Journal() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [isNewOpen, setIsNewOpen] = useState(false);

  // Form State
  const [mood, setMood] = useState<JournalMood>('good');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [activePrompt, setActivePrompt] = useState(PROMPTS[0]);
  const [tagInput, setTagInput] = useState('Focus, Health');
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [viewingGallery, setViewingGallery] = useState<{ images: string[]; index: number } | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<JournalEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const loadEntries = async () => {
    const list = await getUserJournal(user?.uid || 'local');
    setEntries(list);
  };

  useEffect(() => {
    loadEntries();
  }, [user]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.tags?.forEach((t) => set.add(t)));
    return ['All', ...Array.from(set)];
  }, [entries]);

  const filteredEntries = entries.filter((e) => {
    if (selectedTag !== 'All' && !e.tags?.includes(selectedTag)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = e.title?.toLowerCase().includes(q);
      const matchText = e.text.toLowerCase().includes(q);
      const matchTags = e.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchText && !matchTags) return false;
    }
    return true;
  });

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    await createJournalEntry(
      {
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        mood,
        title: title.trim() || undefined,
        text: text.trim(),
        tags,
        images: attachedImages,
        prompt: activePrompt,
      },
      user?.uid || 'local'
    );

    setIsNewOpen(false);
    setTitle('');
    setText('');
    setAttachedImages([]);
    setAiInsight(null);
    loadEntries();
  };

  const promptDeleteEntry = (entry: JournalEntry) => {
    setDeletingEntry(entry);
  };

  const handleConfirmDelete = async () => {
    if (!deletingEntry?.id) return;
    setIsDeleting(true);
    try {
      await permanentlyDeleteRecord({
        id: deletingEntry.id,
        type: 'journal',
        title: deletingEntry.title || 'Journal Reflection',
        userId: user?.uid || 'local',
      });
      setDeletingEntry(null);
      await loadEntries();
    } catch (err) {
      console.error('Failed to delete journal entry:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAskAiReflection = async () => {
    if (!text.trim()) return;
    setIsAiLoading(true);
    try {
      const insight = await sendCoachMessage(
        `The user wrote this journal reflection: "${text}". Give a 2-sentence encouraging, stoic, and actionable insight to ground their habits and momentum.`
      );
      if (insight) {
        setAiInsight(insight);
      }
    } catch (err) {
      console.warn('AI reflection error:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-white pb-24">
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
            <h1 className="text-lg font-bold text-white tracking-tight">Journal & Notes</h1>
            <p className="text-xs text-[#7d8495]">{entries.length} reflections logged</p>
          </div>
        </div>

        <button
          onClick={() => setIsNewOpen(true)}
          className="px-3.5 py-1.5 rounded-full bg-accent-primary text-black font-semibold text-xs flex items-center gap-1.5 shadow-[0_2px_12px_rgba(140,238,40,0.3)] hover:bg-[#9eff38] active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Reflect</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto w-full px-5 pt-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#7d8495] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries or tags..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-black/40 border border-white/5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent-primary"
          />
        </div>

        {/* Tag Filters */}
        {allTags.length > 2 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer',
                  selectedTag === tag
                    ? 'bg-accent-primary/20 border border-accent-primary/50 text-accent-primary'
                    : 'bg-white/5 text-[#7d8495] hover:text-white'
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Entries Timeline */}
        {filteredEntries.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#7d8495]">
              <BookOpen className="w-6 h-6 text-accent-primary" />
            </div>
            <h3 className="text-base font-semibold text-white">No reflections yet</h3>
            <p className="text-xs text-[#7d8495] max-w-xs mx-auto">
              Capture a brief thought, mood check-in, or daily win to build long-term self-awareness.
            </p>
            <button
              onClick={() => setIsNewOpen(true)}
              className="mt-2 px-5 py-2.5 rounded-xl bg-accent-primary text-black font-semibold text-xs inline-flex items-center gap-2 hover:bg-[#9eff38] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Write First Reflection</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => {
              const moodInfo = MOODS.find((m) => m.id === entry.mood) || MOODS[1];
              const MoodIcon = moodInfo.icon;

              return (
                <motion.div
                  key={entry.id}
                  layout
                  className="p-4 rounded-3xl bg-surface-card border border-white/5 hover:border-white/10 transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-xl flex items-center justify-center border text-xs',
                          moodInfo.color
                        )}
                      >
                        <MoodIcon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-white">
                          {entry.title || moodInfo.label}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-[#7d8495]">
                          <span>{entry.date}</span>
                          <span>•</span>
                          <span>{entry.time}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => promptDeleteEntry(entry)}
                      className="text-[#7d8495] hover:text-red-400 p-1 transition-colors cursor-pointer"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {entry.prompt && (
                    <span className="text-[11px] text-accent-primary/80 font-medium block italic">
                      "{entry.prompt}"
                    </span>
                  )}

                  <p className="text-xs text-white/80 leading-relaxed whitespace-pre-line">
                    {entry.text}
                  </p>

                  {/* Attached Photos Gallery */}
                  {entry.images && entry.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {entry.images.map((img, imgIdx) => (
                        <button
                          key={imgIdx}
                          type="button"
                          onClick={() => setViewingGallery({ images: entry.images!, index: imgIdx })}
                          className="relative group rounded-2xl overflow-hidden border border-white/10 bg-[#0e1015] aspect-square w-16 h-16 shrink-0 cursor-pointer hover:border-accent-primary/50 transition-colors shadow-sm"
                        >
                          <img
                            src={img}
                            alt={`Reflection photo ${imgIdx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye className="w-4 h-4" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {entry.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-[#7d8495] border border-white/5"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* New Reflection Modal */}
      <AnimatePresence>
        {isNewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsNewOpen(false);
                setAttachedImages([]);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-surface-card border border-white/10 rounded-3xl p-5 z-10 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-base font-bold text-white">Daily Reflection</h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewOpen(false);
                    setAttachedImages([]);
                  }}
                  className="text-[#7d8495] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mood Selector */}
              <div>
                <label className="block text-xs text-[#7d8495] mb-1.5">Current State of Mind</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {MOODS.map((m) => {
                    const Icon = m.icon;
                    const isSelected = mood === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMood(m.id)}
                        className={cn(
                          'flex flex-col items-center py-2 rounded-xl text-[10px] font-medium border transition-all cursor-pointer',
                          isSelected
                            ? `${m.color} scale-105 font-bold shadow-md`
                            : 'bg-black/30 border-white/5 text-[#7d8495] hover:text-white'
                        )}
                      >
                        <Icon className="w-4 h-4 mb-1" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Guiding Prompts */}
              <div>
                <label className="block text-xs text-[#7d8495] mb-1">Reflection Prompt</label>
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setActivePrompt(p)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap border transition-all cursor-pointer',
                        activePrompt === p
                          ? 'bg-accent-primary/15 border-accent-primary/40 text-accent-primary'
                          : 'bg-black/30 border-white/5 text-[#7d8495] hover:text-white'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Body */}
              <form onSubmit={handleCreate} className="space-y-3">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title (Optional)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-primary"
                />

                <textarea
                  required
                  rows={4}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Reflect on your habits, breakthroughs, or lessons today..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-primary leading-relaxed"
                />

                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Tags: Health, Discipline"
                    className="flex-1 mr-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-primary"
                  />

                  <button
                    type="button"
                    onClick={handleAskAiReflection}
                    disabled={!text.trim() || isAiLoading}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-accent-primary border border-accent-primary/30 text-xs font-medium flex items-center gap-1.5 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isAiLoading ? 'Analyzing...' : 'AI Perspective'}</span>
                  </button>
                </div>

                {/* AI Insight Box */}
                {aiInsight && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-accent-primary/10 border border-accent-primary/25 text-xs text-accent-primary leading-relaxed space-y-1"
                  >
                    <span className="font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Coach Insight:
                    </span>
                    <p>{aiInsight}</p>
                  </motion.div>
                )}

                {/* Photo Attachments with ImageUpload */}
                <div>
                  <label className="block text-xs font-semibold text-[#7d8495] uppercase tracking-wider mb-1.5">
                    Attach Photos <span className="text-[#5c6272] lowercase font-normal">(optional)</span>
                  </label>
                  <ImageUpload
                    images={attachedImages}
                    onChange={setAttachedImages}
                    maxImages={4}
                    maxSizeMb={10}
                    label="Add photos"
                    description="Attach workout progress, journal page, or moment snapshot"
                    compact={attachedImages.length > 0}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-accent-primary text-black font-bold text-xs tracking-wide hover:bg-[#9eff38] transition-colors cursor-pointer mt-2"
                >
                  Save Entry
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Timeline Entry Photo Lightbox Gallery */}
      <AnimatePresence>
        {viewingGallery && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
            onClick={() => setViewingGallery(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-lg max-h-[85vh] w-full flex flex-col items-center justify-center"
            >
              <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black/50 max-h-[75vh]">
                <img
                  src={viewingGallery.images[viewingGallery.index]}
                  alt={`Reflection view ${viewingGallery.index + 1}`}
                  className="max-w-full max-h-[75vh] object-contain"
                />

                <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-black/75 text-xs font-semibold text-white/90 border border-white/10">
                    {viewingGallery.index + 1} / {viewingGallery.images.length}
                  </span>

                  <button
                    type="button"
                    onClick={() => setViewingGallery(null)}
                    className="w-8 h-8 rounded-full bg-black/80 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {viewingGallery.images.length > 1 && (
                <div className="flex items-center justify-center gap-4 mt-3">
                  <button
                    type="button"
                    onClick={() =>
                      setViewingGallery((prev) =>
                        prev
                          ? {
                              ...prev,
                              index:
                                prev.index === 0
                                  ? prev.images.length - 1
                                  : prev.index - 1,
                            }
                          : null
                      )
                    }
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                    title="Previous"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex gap-1.5">
                    {viewingGallery.images.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          setViewingGallery((prev) => (prev ? { ...prev, index: idx } : null))
                        }
                        className={cn(
                          'w-2.5 h-2.5 rounded-full transition-all cursor-pointer',
                          viewingGallery.index === idx ? 'bg-accent-primary w-5' : 'bg-white/30'
                        )}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setViewingGallery((prev) =>
                        prev
                          ? {
                              ...prev,
                              index:
                                prev.index === prev.images.length - 1
                                  ? 0
                                  : prev.index + 1,
                            }
                          : null
                      )
                    }
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                    title="Next"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Consistent Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingEntry)}
        onClose={() => setDeletingEntry(null)}
        onConfirm={handleConfirmDelete}
        title={deletingEntry?.title || 'Journal reflection'}
        itemType="journal reflection"
        isDeleting={isDeleting}
      />
    </div>
  );
}
