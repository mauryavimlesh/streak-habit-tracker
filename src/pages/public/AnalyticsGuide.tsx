import React from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../lib/AuthContext';
import { SEO } from '../../components/seo/SEO';
import { GUIDE_SOCIAL_REGISTRY } from '../../lib/seo/socialMetadata';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import { BarChart3, ArrowRight, Flame, TrendingUp } from 'lucide-react';

export default function AnalyticsGuide() {
  const { user, profile, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const isAuthenticated = Boolean(user || profile?.isGuest);

  const handleStart = () => {
    if (isAuthenticated) {
      navigate('/analytics');
    } else {
      continueAsGuest();
      navigate('/analytics');
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
        name: 'Productivity Analytics',
        item: 'https://streakloop.vercel.app/analytics',
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] text-white flex flex-col selection:bg-accent-primary selection:text-black">
      <SEO
        socialConfig={GUIDE_SOCIAL_REGISTRY['/analytics']}
        schema={breadcrumbSchema}
      />

      <PublicHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-12">
        <nav aria-label="Breadcrumb" className="text-xs text-text-muted flex items-center gap-2">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <span className="text-purple-400">Analytics</span>
        </nav>

        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-400/10 border border-purple-400/20 text-xs font-semibold text-purple-400">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Visual Evidence</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Habit Consistency Heatmap &amp; Productivity Analytics
          </h1>
          <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-2xl">
            You can't improve what you don't measure. STREAK transforms your daily logs into clear, actionable visual analytics and 30-day completion heatmaps.
          </p>
        </header>

        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">See your consistency data</h2>
            <p className="text-xs text-text-secondary">Generate instant analytics without signing up.</p>
          </div>
          <button
            onClick={handleStart}
            className="px-6 py-3 bg-purple-400 text-black font-bold rounded-xl hover:bg-purple-400/90 transition-all flex items-center gap-2 text-sm shrink-0 cursor-pointer shadow-[0_0_20px_rgba(192,132,252,0.3)]"
          >
            <span>{isAuthenticated ? 'Open My Analytics' : 'View Consistency Heatmap'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <section className="space-y-8 pt-4">
          <article className="space-y-3">
            <h2 className="text-2xl font-bold text-white">GitHub-Style Consistency Heatmaps for Habits</h2>
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
              Software engineers have long utilized contribution heatmaps to stay disciplined with code. STREAK applies this exact psychological mechanic to human habit formation. Each habit features a 30-day matrix showing every day you succeeded, turning your daily effort into an undeniable chain of green tiles.
            </p>
          </article>

          <article className="space-y-3">
            <h2 className="text-2xl font-bold text-white">Completion Rates &amp; Peak Performance Days</h2>
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
              Discover which days of the week you are most consistent. Whether Mondays are your strongest execution days or weekends present challenges, STREAK’s analytics reveal the exact friction points so you can adjust your schedules realistically.
            </p>
          </article>
        </section>

        <section className="p-6 rounded-2xl bg-[#12141a] border border-white/5 space-y-4">
          <h3 className="text-sm uppercase tracking-wider font-semibold text-text-muted">Associated Workflows</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <Link to="/habits" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors block">
              <span className="font-semibold text-white block">Habit Tracker</span>
              <span className="text-xs text-text-secondary">Feed data to your heatmap</span>
            </Link>
            <Link to="/focus-timer" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors block">
              <span className="font-semibold text-white block">Focus Timer</span>
              <span className="text-xs text-text-secondary">Study and deep work records</span>
            </Link>
            <Link to="/ai-coach" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors block">
              <span className="font-semibold text-white block">AI Habit Coach</span>
              <span className="text-xs text-text-secondary">Get algorithmic suggestions</span>
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
