import React from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../lib/AuthContext';
import { SEO } from '../../components/seo/SEO';
import { GUIDE_SOCIAL_REGISTRY } from '../../lib/seo/socialMetadata';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import { Flame, Check, ArrowRight, Shield, Zap, Sparkles } from 'lucide-react';

export default function HabitsGuide() {
  const { user, profile, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const isAuthenticated = Boolean(user || profile?.isGuest);

  const handleStart = () => {
    if (isAuthenticated) {
      navigate('/habits');
    } else {
      continueAsGuest();
      navigate('/habits');
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
        name: 'Habit Tracker',
        item: 'https://streakloop.vercel.app/habits',
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] text-white flex flex-col selection:bg-accent-primary selection:text-black">
      <SEO
        socialConfig={GUIDE_SOCIAL_REGISTRY['/habits']}
        schema={breadcrumbSchema}
      />

      <PublicHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-12">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="text-xs text-text-muted flex items-center gap-2">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <span className="text-accent-primary">Habit Tracker</span>
        </nav>

        {/* Hero Header */}
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-xs font-semibold text-accent-primary">
            <Flame className="w-3.5 h-3.5 fill-accent-primary" />
            <span>Consistency Engine</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Habit Tracker &amp; Daily Streak Counter
          </h1>
          <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-2xl">
            Consistency is built through small, repeated actions. STREAK provides the frictionless tracking tools, haptic feedback, and visual momentum you need to form habits that stick.
          </p>
        </header>

        {/* CTA Banner */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Ready to start tracking?</h2>
            <p className="text-xs text-text-secondary">Free guest mode available. No credit card required.</p>
          </div>
          <button
            onClick={handleStart}
            className="px-6 py-3 bg-accent-primary text-black font-bold rounded-xl hover:bg-accent-primary/90 transition-all flex items-center gap-2 text-sm shrink-0 cursor-pointer shadow-[0_0_20px_rgba(163,230,53,0.3)]"
          >
            <span>{isAuthenticated ? 'Open My Habits' : 'Start Tracking Habits Free'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Deep Informative Content Section */}
        <section className="space-y-8 pt-4">
          <article className="space-y-3">
            <h2 className="text-2xl font-bold text-white">How Daily Streaks Build Lasting Momentum</h2>
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
              When you log a habit daily, you activate the psychological power of loss aversion. As your streak counter grows from 3 days to 7, 14, and 30 days, your desire to protect that streak becomes a natural intrinsic motivator. STREAK highlights your active streaks, celebrates milestones with celebratory haptics, and calculates your personal best records.
            </p>
          </article>

          <article className="space-y-3">
            <h2 className="text-2xl font-bold text-white">Flexible Habit Types for Real-Life Routines</h2>
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
              Not every habit is a simple yes/no checkbox. STREAK supports:
            </p>
            <ul className="space-y-2 text-sm text-text-secondary list-disc pl-5">
              <li><strong className="text-white">Numeric Targets:</strong> Track measurable units such as 8 glasses of water, 10,000 steps, or 30 minutes of reading.</li>
              <li><strong className="text-white">Custom Frequencies:</strong> Schedule habits for every day, weekdays only, weekends, or specific days of the week.</li>
              <li><strong className="text-white">Time-based Reminders:</strong> Set smart daily alarms and reminder times to ensure you never miss your routine cues.</li>
            </ul>
          </article>

          <article className="space-y-3">
            <h2 className="text-2xl font-bold text-white">Visual Consistency Heatmaps</h2>
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
              Rather than looking at abstract numbers, STREAK renders an authentic 30-day completion heatmap on your dashboard. Every day you complete your habits, your heatmap fills with vibrant high-contrast squares, offering tangible visual proof of your discipline.
            </p>
          </article>
        </section>

        {/* Related Feature Links */}
        <section className="p-6 rounded-2xl bg-[#12141a] border border-white/5 space-y-4">
          <h3 className="text-sm uppercase tracking-wider font-semibold text-text-muted">Connected Features</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <Link to="/goals" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors block">
              <span className="font-semibold text-white block">Goal Tracker</span>
              <span className="text-xs text-text-secondary">Align habits with milestones</span>
            </Link>
            <Link to="/focus-timer" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors block">
              <span className="font-semibold text-white block">Focus Timer</span>
              <span className="text-xs text-text-secondary">Deep study and work sessions</span>
            </Link>
            <Link to="/analytics" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors block">
              <span className="font-semibold text-white block">Productivity Heatmap</span>
              <span className="text-xs text-text-secondary">Analyze completion trends</span>
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
