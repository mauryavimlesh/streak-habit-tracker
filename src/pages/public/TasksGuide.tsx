import React from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../lib/AuthContext';
import { SEO } from '../../components/seo/SEO';
import { GUIDE_SOCIAL_REGISTRY } from '../../lib/seo/socialMetadata';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import { CheckCircle2, ArrowRight, ListCheck, Sparkles } from 'lucide-react';

export default function TasksGuide() {
  const { user, profile, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const isAuthenticated = Boolean(user || profile?.isGuest);

  const handleStart = () => {
    if (isAuthenticated) {
      navigate('/');
    } else {
      continueAsGuest();
      navigate('/');
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
        name: 'Task Manager',
        item: 'https://streakloop.vercel.app/tasks',
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] text-white flex flex-col selection:bg-accent-primary selection:text-black">
      <SEO
        socialConfig={GUIDE_SOCIAL_REGISTRY['/tasks']}
        schema={breadcrumbSchema}
      />

      <PublicHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-12">
        <nav aria-label="Breadcrumb" className="text-xs text-text-muted flex items-center gap-2">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <span className="text-emerald-400">Task Manager</span>
        </nav>

        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Daily Execution</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Daily Task Manager &amp; Priority Checklists
          </h1>
          <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-2xl">
            Keep your daily agenda clear and actionable. STREAK unites recurring habits with one-off tasks in a streamlined, zero-distraction view.
          </p>
        </header>

        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Clear your daily to-do list</h2>
            <p className="text-xs text-text-secondary">Instant guest access with offline persistence.</p>
          </div>
          <button
            onClick={handleStart}
            className="px-6 py-3 bg-emerald-400 text-black font-bold rounded-xl hover:bg-emerald-400/90 transition-all flex items-center gap-2 text-sm shrink-0 cursor-pointer shadow-[0_0_20px_rgba(52,211,153,0.3)]"
          >
            <span>{isAuthenticated ? 'Open App Checklist' : 'Start Managing Tasks Free'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <section className="space-y-8 pt-4">
          <article className="space-y-3">
            <h2 className="text-2xl font-bold text-white">Why Separating Habits and Tasks Creates Friction</h2>
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
              Most productivity apps force you to use one tool for your recurring habits and a completely separate app for your daily to-do items. Switching between multiple apps creates cognitive fragmentation. STREAK brings both onto a unified dashboard, so you can execute your recurring routines and clear one-time errands in one place.
            </p>
          </article>

          <article className="space-y-3">
            <h2 className="text-2xl font-bold text-white">Tactile Completion Feedback</h2>
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
              Every completed item in STREAK triggers satisfying haptic vibration and rewarding animations, providing instant positive reinforcement that makes completing your checklist feel satisfying.
            </p>
          </article>
        </section>

        <section className="p-6 rounded-2xl bg-[#12141a] border border-white/5 space-y-4">
          <h3 className="text-sm uppercase tracking-wider font-semibold text-text-muted">Complementary Tools</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <Link to="/habits" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors block">
              <span className="font-semibold text-white block">Habit Tracker</span>
              <span className="text-xs text-text-secondary">Automate daily routines</span>
            </Link>
            <Link to="/focus-timer" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors block">
              <span className="font-semibold text-white block">Focus Timer</span>
              <span className="text-xs text-text-secondary">Timebox task execution</span>
            </Link>
            <Link to="/journal" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors block">
              <span className="font-semibold text-white block">Daily Journal</span>
              <span className="text-xs text-text-secondary">Evening reflection on daily wins</span>
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
