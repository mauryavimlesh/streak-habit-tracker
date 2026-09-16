import React from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../lib/AuthContext';
import { SEO } from '../../components/seo/SEO';
import { GUIDE_SOCIAL_REGISTRY } from '../../lib/seo/socialMetadata';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import { BookOpen, ArrowRight, Heart, Sparkles } from 'lucide-react';

export default function JournalGuide() {
  const { user, profile, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const isAuthenticated = Boolean(user || profile?.isGuest);

  const handleStart = () => {
    if (isAuthenticated) {
      navigate('/journal');
    } else {
      continueAsGuest();
      navigate('/journal');
    }
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://streakloop.vercel.app/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Productivity Journal',
        item: 'https://streakloop.vercel.app/journal',
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] text-white flex flex-col selection:bg-accent-primary selection:text-black">
      <SEO
        socialConfig={GUIDE_SOCIAL_REGISTRY['/journal']}
        schema={breadcrumbSchema}
      />

      <PublicHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-12">
        <nav aria-label="Breadcrumb" className="text-xs text-text-muted flex items-center gap-2">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <span className="text-indigo-400">Journal</span>
        </nav>

        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-400/10 border border-indigo-400/20 text-xs font-semibold text-indigo-400">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Mindful Reflection</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Daily Reflection &amp; Productivity Journal
          </h1>
          <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-2xl">
            Productivity without reflection leads to burnout. STREAK provides guided daily prompts, gratitude logs, and mood tracking to keep you grounded.
          </p>
        </header>

        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Start journaling your progress</h2>
            <p className="text-xs text-text-secondary">Your journal entries are encrypted and stored privately.</p>
          </div>
          <button
            onClick={handleStart}
            className="px-6 py-3 bg-indigo-400 text-black font-bold rounded-xl hover:bg-indigo-400/90 transition-all flex items-center gap-2 text-sm shrink-0 cursor-pointer shadow-[0_0_20px_rgba(129,140,248,0.3)]"
          >
            <span>{isAuthenticated ? 'Open My Journal' : 'Start Journaling Free'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <section className="space-y-8 pt-4">
          <article className="space-y-3">
            <h2 className="text-2xl font-bold text-white">The Habit-Reflection Loop</h2>
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
              When you write a 2-minute evening reflection on what went well and what caused friction, you gain direct insight into why certain habits were easy to complete while others were skipped. STREAK connects your daily habit logs with your journal entries for holistic self-awareness.
            </p>
          </article>

          <article className="space-y-3">
            <h2 className="text-2xl font-bold text-white">Privacy and Local Encryption</h2>
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
              Your journal thoughts are strictly personal. Private journal content is protected from indexing, never shared with third parties, and stored on your device or your private cloud partition.
            </p>
          </article>
        </section>

        <section className="p-6 rounded-2xl bg-[#12141a] border border-white/5 space-y-4">
          <h3 className="text-sm uppercase tracking-wider font-semibold text-text-muted">Connected Features</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <Link to="/habits" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors block">
              <span className="font-semibold text-white block">Habit Tracker</span>
              <span className="text-xs text-text-secondary">Track daily behaviors</span>
            </Link>
            <Link to="/analytics" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors block">
              <span className="font-semibold text-white block">Analytics Heatmap</span>
              <span className="text-xs text-text-secondary">View weekly consistency</span>
            </Link>
            <Link to="/ai-coach" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors block">
              <span className="font-semibold text-white block">AI Habit Coach</span>
              <span className="text-xs text-text-secondary">Get personalized guidance</span>
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
