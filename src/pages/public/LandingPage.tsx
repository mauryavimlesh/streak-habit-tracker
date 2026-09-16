import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../lib/AuthContext';
import { SEO } from '../../components/seo/SEO';
import { GUIDE_SOCIAL_REGISTRY } from '../../lib/seo/socialMetadata';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import {
  Flame,
  CheckCircle2,
  Target,
  Clock,
  BookOpen,
  BarChart3,
  Sparkles,
  Smartphone,
  ChevronDown,
  ArrowRight,
  Shield,
  Zap,
} from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'What is STREAK?',
    a: 'STREAK is an all-in-one habit and productivity tracker that brings daily habit tracking, goal milestones, task checklists, study focus timers, reflection journaling, and visual consistency heatmaps into one unified workspace.',
  },
  {
    q: 'Is STREAK free to use?',
    a: 'Yes. STREAK is completely free to use. You can start tracking habits immediately in Guest Mode without creating an account or providing a credit card. Your progress is saved locally, with optional cloud backup when you sign in.',
  },
  {
    q: 'Can I track daily habits and maintain consistency streaks?',
    a: 'Yes. STREAK calculates real-time daily completion streaks, longest consistency records, and percentage completion rates. You can customize habit frequencies, target quantities, and daily reminder alerts.',
  },
  {
    q: 'Can I track goals and tasks alongside daily habits?',
    a: 'Yes. STREAK allows you to map overarching life and career goals into actionable milestones, and organize daily to-do tasks alongside your recurring habit routines.',
  },
  {
    q: 'Does STREAK include a study and focus timer?',
    a: 'Yes. STREAK includes an integrated Focus & Study Timer with stopwatch and countdown modes, customizable session durations, and persistent focus history to boost concentration.',
  },
  {
    q: 'Does STREAK work offline?',
    a: 'Yes. STREAK is engineered offline-first. All your habits, streak counts, completed tasks, and journal entries are instantly saved locally in your browser and automatically sync when online.',
  },
  {
    q: 'How does the AI Habit Coach help improve consistency?',
    a: 'STREAK features an intelligent AI Coach powered by modern Gemini models that evaluates your habit consistency patterns, suggests evidence-based routines, and answers productivity questions.',
  },
  {
    q: 'Does STREAK work on iPhone, Android, and desktop browsers?',
    a: 'Yes. STREAK is responsive and runs seamlessly across iPhone (Safari & PWA), Android (Chrome & PWA), iPad, Mac, and Windows desktop workstations.',
  },
  {
    q: 'Is my habit and journal data private and secure?',
    a: 'Yes. Your personal habits, daily logs, and reflection journals remain completely private. Personal data is never indexed by search engines and is stored securely.',
  },
  {
    q: 'Can I export or backup my habit data?',
    a: 'Yes. STREAK supports account-based cloud synchronization with Google or email, ensuring your consistency streaks and journal records are backed up and accessible across all your devices.',
  },
];

export default function LandingPage() {
  const { continueAsGuest, user, profile } = useAuth();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const isAuthenticated = Boolean(user || profile?.isGuest);

  const handleStart = () => {
    if (isAuthenticated) {
      navigate('/');
    } else {
      continueAsGuest();
      navigate('/');
    }
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] text-white flex flex-col selection:bg-accent-primary selection:text-black">
      <SEO
        socialConfig={GUIDE_SOCIAL_REGISTRY['/']}
        schema={faqSchema}
      />

      <PublicHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-32 px-4 sm:px-6">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-accent-cyan/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-accent-primary tracking-wide">
              <Flame className="w-3.5 h-3.5 fill-accent-primary" />
              <span>Small actions. Every day.</span>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
              Build Better Habits. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary via-[#bef264] to-accent-cyan">
                Stay Consistent.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed font-normal">
              STREAK is a habit and productivity tracker that helps you build habits, manage goals, complete tasks, track focus time, journal your progress, and understand your consistency.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={handleStart}
                className="w-full sm:w-auto px-8 py-4 bg-accent-primary text-black font-bold rounded-2xl hover:bg-accent-primary/95 transition-all flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(163,230,53,0.35)] cursor-pointer text-base"
              >
                <span>{isAuthenticated ? 'Open App Dashboard' : 'Start Free (Guest Mode)'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              {!isAuthenticated && (
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-2xl border border-white/10 transition-colors flex items-center justify-center text-base"
                >
                  Sign In to Cloud Sync
                </Link>
              )}
            </div>

            {/* Micro reassurance badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-xs text-text-muted">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-accent-primary" />
                <span>No sign-up required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-accent-primary" />
                <span>Offline-first local storage</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-accent-primary" />
                <span>PWA &amp; mobile ready</span>
              </div>
            </div>
          </div>

          {/* Interactive Visual Preview Showcase */}
          <div className="max-w-5xl mx-auto mt-16 relative">
            <div className="p-2 sm:p-4 rounded-3xl bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-sm">
              <div className="rounded-2xl bg-[#12141a] border border-white/5 p-5 sm:p-8 space-y-6">
                {/* Simulated Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center">
                      <Flame className="w-5 h-5 text-accent-primary fill-accent-primary" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Daily Consistency Dashboard</h2>
                      <p className="text-xs text-text-secondary">Visualizing active momentum</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-accent-primary/10 text-accent-primary text-xs font-semibold">
                      🔥 14 Day Streak
                    </span>
                  </div>
                </div>

                {/* Simulated Habits Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-accent-primary font-medium">Fitness</span>
                      <p className="text-sm font-semibold text-white">Morning Workout</p>
                      <p className="text-xs text-text-muted">Target: 30 min</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary font-bold">
                      ✓
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-accent-cyan font-medium">Health</span>
                      <p className="text-sm font-semibold text-white">Drink 8 Glasses Water</p>
                      <p className="text-xs text-text-muted">Progress: 8/8</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-accent-cyan/20 flex items-center justify-center text-accent-cyan font-bold">
                      ✓
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-violet-400 font-medium">Focus</span>
                      <p className="text-sm font-semibold text-white">Deep Work Session</p>
                      <p className="text-xs text-text-muted">Timer: 45 min</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-violet-400/20 flex items-center justify-center text-violet-400 font-bold">
                      ✓
                    </div>
                  </div>
                </div>

                {/* Consistency Heatmap Simulation */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>30-Day Completion Heatmap</span>
                    <span className="text-accent-primary font-medium">92% Consistency</span>
                  </div>
                  <div className="grid grid-cols-10 sm:grid-cols-15 gap-1.5 pt-1">
                    {Array.from({ length: 30 }).map((_, i) => {
                      const completed = i > 2 && i !== 12 && i !== 22;
                      return (
                        <div
                          key={i}
                          className={`h-6 rounded-md transition-all ${
                            completed
                              ? 'bg-accent-primary/80 shadow-[0_0_8px_rgba(163,230,53,0.3)]'
                              : 'bg-white/5'
                          }`}
                          title={`Day ${i + 1}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Breakdown: What is STREAK & How it helps */}
        <section className="py-20 border-t border-white/5 px-4 sm:px-6 bg-[#0a0b0f]">
          <div className="max-w-6xl mx-auto space-y-16">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Everything You Need to Build Daily Momentum
              </h2>
              <p className="text-text-secondary text-base sm:text-lg">
                STREAK integrates your habits, milestones, daily checklists, focus sessions, and reflection into a unified, distraction-free workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <article className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4 hover:border-white/10 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                  <Flame className="w-6 h-6 fill-accent-primary" />
                </div>
                <h3 className="text-xl font-semibold text-white">Daily Habit Tracking</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Log your daily routines with custom counts, units, and categories. Track your active streak count, longest records, and see daily progress at a glance.
                </p>
                <Link to="/habits" className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-primary hover:underline">
                  <span>Explore Habit Tracker</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </article>

              {/* Feature 2 */}
              <article className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4 hover:border-white/10 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-accent-cyan/10 flex items-center justify-center text-accent-cyan">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-white">Goals &amp; Milestones</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Bridge the gap between daily actions and big goals. Break long-term objectives down into measurable milestone steps with visual progress indicators.
                </p>
                <Link to="/goals" className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-cyan hover:underline">
                  <span>Explore Goal Tracking</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </article>

              {/* Feature 3 */}
              <article className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4 hover:border-white/10 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-white">Task Management</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Prioritize your day with lightweight, responsive checklists. Complete critical to-dos alongside recurring habits without jumping between separate apps.
                </p>
                <Link to="/tasks" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:underline">
                  <span>Explore Task Manager</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </article>

              {/* Feature 4 */}
              <article className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4 hover:border-white/10 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/10 flex items-center justify-center text-amber-400">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-white">Focus &amp; Study Timer</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Deep work made simple. Run stopwatch or countdown focus sessions with ambient sounds, full-screen mode, and automatic activity history logs.
                </p>
                <Link to="/focus-timer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:underline">
                  <span>Explore Focus Timer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </article>

              {/* Feature 5 */}
              <article className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4 hover:border-white/10 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-indigo-400/10 flex items-center justify-center text-indigo-400">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-white">Daily Reflection Journal</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Capture gratitude, wins, energy levels, and mood notes. Track how your daily habits correlate with your mental clarity and overall productivity.
                </p>
                <Link to="/journal" className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:underline">
                  <span>Explore Journal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </article>

              {/* Feature 6 */}
              <article className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4 hover:border-white/10 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-purple-400/10 flex items-center justify-center text-purple-400">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-white">Consistency Heatmap</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Clear visual proof of your progress. The 30-day consistency heatmap transforms your daily actions into high-density motivation cards.
                </p>
                <Link to="/analytics" className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:underline">
                  <span>Explore Analytics</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </article>
            </div>
          </div>
        </section>

        {/* AI Coach Spotlight */}
        <section className="py-20 px-4 sm:px-6 border-t border-white/5">
          <div className="max-w-5xl mx-auto p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-accent-primary to-accent-cyan flex items-center justify-center shadow-[0_0_30px_rgba(163,230,53,0.3)] shrink-0">
              <Sparkles className="w-8 h-8 text-black" />
            </div>
            <div className="space-y-3 text-center md:text-left flex-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Meet Your Personal AI Habit Coach
              </h2>
              <p className="text-text-secondary text-sm sm:text-base leading-relaxed">
                Need advice on overcoming habit plateaus or structuring your morning routine? STREAK’s AI Coach analyzes your consistency trends and provides concise, evidence-based habit recommendations.
              </p>
            </div>
            <Link
              to="/ai-coach"
              className="px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl border border-white/10 transition-colors shrink-0 text-sm flex items-center gap-2"
            >
              <span>Learn About AI Coach</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Mobile & Desktop Usability */}
        <section className="py-16 px-4 sm:px-6 border-t border-white/5 bg-[#0a0b0f]">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Use STREAK on Mobile, Tablet, and Desktop
            </h2>
            <p className="text-text-secondary text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Designed with Apple-inspired ergonomics, high contrast, and tactile haptic feedback. Install STREAK as a lightweight Progressive Web App on iPhone or Android, or use it fullscreen on your desktop workstation.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-accent-primary font-medium">
              <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">📱 iOS Safari &amp; PWA</span>
              <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">🤖 Android Chrome</span>
              <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">💻 Mac &amp; Windows Browsers</span>
              <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">⚡ Instant Offline Mode</span>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 px-4 sm:px-6 border-t border-white/5">
          <div className="max-w-3xl mx-auto space-y-10">
            <div className="text-center space-y-3">
              <h2 className="text-3xl sm:text-4xl font-bold text-white">Frequently Asked Questions</h2>
              <p className="text-text-secondary text-sm sm:text-base">
                Common questions about STREAK’s habit tracking, privacy, and functionality.
              </p>
            </div>

            <div className="space-y-3">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden transition-colors"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                    >
                      <h3 className="text-base font-medium text-white">{item.q}</h3>
                      <ChevronDown
                        className={`w-5 h-5 text-text-muted transition-transform shrink-0 ${
                          isOpen ? 'rotate-180 text-accent-primary' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-4 pt-1 text-sm text-text-secondary leading-relaxed border-t border-white/5">
                        <p>{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="py-20 px-4 sm:px-6 border-t border-white/5 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Start Building Your Consistency Today
            </h2>
            <p className="text-text-secondary text-base sm:text-lg max-w-xl mx-auto">
              Small actions repeated every day yield monumental results. Join thousands of users tracking habits with STREAK.
            </p>
            <div>
              <button
                onClick={handleStart}
                className="px-8 py-4 bg-accent-primary text-black font-bold rounded-2xl hover:bg-accent-primary/95 transition-all inline-flex items-center gap-2 shadow-[0_0_35px_rgba(163,230,53,0.35)] cursor-pointer text-base"
              >
                <span>{isAuthenticated ? 'Open App Dashboard' : 'Launch STREAK Free'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
