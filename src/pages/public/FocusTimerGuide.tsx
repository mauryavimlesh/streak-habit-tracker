import React from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../lib/AuthContext';
import { SEO } from '../../components/seo/SEO';
import { GUIDE_SOCIAL_REGISTRY } from '../../lib/seo/socialMetadata';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import { Clock, ArrowRight, Play, Volume2, Shield } from 'lucide-react';

export default function FocusTimerGuide() {
  const { user, profile, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const isAuthenticated = Boolean(user || profile?.isGuest);

  const handleStart = () => {
    if (isAuthenticated) {
      navigate('/activity');
    } else {
      continueAsGuest();
      navigate('/activity');
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
        name: 'Focus Timer',
        item: 'https://streakloop.vercel.app/focus-timer',
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] text-white flex flex-col selection:bg-accent-primary selection:text-black">
      <SEO
        socialConfig={GUIDE_SOCIAL_REGISTRY['/focus-timer']}
        schema={breadcrumbSchema}
      />

      <PublicHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-12">
        <nav aria-label="Breadcrumb" className="text-xs text-text-muted flex items-center gap-2">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <span className="text-amber-400">Focus Timer</span>
        </nav>

        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-xs font-semibold text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Deep Work Engine</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Focus Timer &amp; Study Tracker Online
          </h1>
          <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-2xl">
            Protect your attention from digital distraction. STREAK provides an immersive, full-screen focus and study timer designed for deep work sessions and academic focus.
          </p>
        </header>

        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Ready to start a focus session?</h2>
            <p className="text-xs text-text-secondary">Open the live timer in guest mode instantly.</p>
          </div>
          <button
            onClick={handleStart}
            className="px-6 py-3 bg-amber-400 text-black font-bold rounded-xl hover:bg-amber-400/90 transition-all flex items-center gap-2 text-sm shrink-0 cursor-pointer shadow-[0_0_20px_rgba(251,191,36,0.3)]"
          >
            <span>{isAuthenticated ? 'Open Focus Timer' : 'Launch Focus Timer Free'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <section className="space-y-8 pt-4">
          <article className="space-y-3">
            <h2 className="text-2xl font-bold text-white">Stopwatch and Countdown Modes</h2>
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
              Whether you prefer classic Pomodoro intervals (25/50 minutes) or open-ended flow states with an upward stopwatch, STREAK adapts to your cognitive style. Toggle between countdown intervals or continuous tracking with a single click.
            </p>
          </article>

          <article className="space-y-3">
            <h2 className="text-2xl font-bold text-white">Full-Screen Immersion &amp; Ambient Focus</h2>
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
              Eliminate browser tabs and desktop noise. STREAK's focus timer features full-screen Zen mode, high-contrast digital displays, and optional relaxing ambient sounds to help you lock into uninterrupted concentration.
            </p>
          </article>

          <article className="space-y-3">
            <h2 className="text-2xl font-bold text-white">Automatic Activity Logs</h2>
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
              Every completed study or work session is saved directly to your personal activity log. Track your total focus minutes per day, identify peak cognitive hours, and see your cumulative focus time grow.
            </p>
          </article>
        </section>

        <section className="p-6 rounded-2xl bg-[#12141a] border border-white/5 space-y-4">
          <h3 className="text-sm uppercase tracking-wider font-semibold text-text-muted">Associated Workflows</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <Link to="/tasks" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors block">
              <span className="font-semibold text-white block">Task Manager</span>
              <span className="text-xs text-text-secondary">Select to-dos to timebox</span>
            </Link>
            <Link to="/analytics" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors block">
              <span className="font-semibold text-white block">Analytics Heatmap</span>
              <span className="text-xs text-text-secondary">View daily focus volume</span>
            </Link>
            <Link to="/journal" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors block">
              <span className="font-semibold text-white block">Daily Journal</span>
              <span className="text-xs text-text-secondary">Record focus session takeaways</span>
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
