import React from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../lib/AuthContext';
import { SEO } from '../../components/seo/SEO';
import { GUIDE_SOCIAL_REGISTRY } from '../../lib/seo/socialMetadata';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import { Target, ArrowRight, CheckCircle2, TrendingUp } from 'lucide-react';

export default function GoalsGuide() {
  const { user, profile, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const isAuthenticated = Boolean(user || profile?.isGuest);

  const handleStart = () => {
    if (isAuthenticated) {
      navigate('/goals');
    } else {
      continueAsGuest();
      navigate('/goals');
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
        name: 'Goal Tracker',
        item: 'https://streakloop.vercel.app/goals',
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] text-white flex flex-col selection:bg-accent-primary selection:text-black">
      <SEO
        socialConfig={GUIDE_SOCIAL_REGISTRY['/goals']}
        schema={breadcrumbSchema}
      />

      <PublicHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-12">
        <nav aria-label="Breadcrumb" className="text-xs text-text-muted flex items-center gap-2">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <span className="text-accent-cyan">Goal Tracker</span>
        </nav>

        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-cyan/10 border border-accent-cyan/20 text-xs font-semibold text-accent-cyan">
            <Target className="w-3.5 h-3.5" />
            <span>Milestone Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Goal Tracker &amp; Milestone Planning
          </h1>
          <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-2xl">
            A goal without a plan is just a wish. STREAK bridges high-level vision with day-to-day execution, turning big dreams into tangible milestone steps.
          </p>
        </header>

        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Define your next milestone</h2>
            <p className="text-xs text-text-secondary">Start free with zero friction in guest mode.</p>
          </div>
          <button
            onClick={handleStart}
            className="px-6 py-3 bg-accent-cyan text-black font-bold rounded-xl hover:bg-accent-cyan/90 transition-all flex items-center gap-2 text-sm shrink-0 cursor-pointer shadow-[0_0_20px_rgba(56,189,248,0.3)]"
          >
            <span>{isAuthenticated ? 'Open My Goals' : 'Track Your Goals Free'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <section className="space-y-8 pt-4">
          <article className="space-y-3">
            <h2 className="text-2xl font-bold text-white">The Power of Measurable Milestones</h2>
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
              When working towards major achievements—such as running a marathon, learning a language, or launching a business—the sheer distance to the finish line can cause burnout. By decomposing large objectives into intermediate milestones, you receive regular dopamine hits and continuous progress visibility.
            </p>
          </article>

          <article className="space-y-3">
            <h2 className="text-2xl font-bold text-white">Connecting Goals to Daily Habits</h2>
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
              STREAK was designed around the principle that goals determine your direction, but systems (habits) determine your progress. With STREAK, your active goals are linked directly to your recurring habits on your home screen, ensuring daily actions match your overarching priorities.
            </p>
          </article>
        </section>

        <section className="p-6 rounded-2xl bg-[#12141a] border border-white/5 space-y-4">
          <h3 className="text-sm uppercase tracking-wider font-semibold text-text-muted">Explore Connected Workflows</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <Link to="/habits" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors block">
              <span className="font-semibold text-white block">Habit Tracker</span>
              <span className="text-xs text-text-secondary">The engine of goal achievement</span>
            </Link>
            <Link to="/tasks" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors block">
              <span className="font-semibold text-white block">Task Manager</span>
              <span className="text-xs text-text-secondary">Daily to-do checklists</span>
            </Link>
            <Link to="/analytics" className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors block">
              <span className="font-semibold text-white block">Consistency Heatmap</span>
              <span className="text-xs text-text-secondary">View milestone velocity</span>
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
