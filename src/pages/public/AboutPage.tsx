import React from 'react';
import { Link } from 'react-router';
import { SEO } from '../../components/seo/SEO';
import { GUIDE_SOCIAL_REGISTRY } from '../../lib/seo/socialMetadata';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import { Flame, Target, ShieldCheck, Zap, Heart } from 'lucide-react';

export default function AboutPage() {
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
        name: 'About STREAK',
        item: 'https://streakloop.vercel.app/about',
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] text-white flex flex-col selection:bg-accent-primary selection:text-black">
      <SEO
        socialConfig={GUIDE_SOCIAL_REGISTRY['/about']}
        schema={breadcrumbSchema}
      />

      <PublicHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-12">
        <nav aria-label="Breadcrumb" className="text-xs text-text-muted flex items-center gap-2">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <span className="text-accent-primary">About</span>
        </nav>

        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-xs font-semibold text-accent-primary">
            <Flame className="w-3.5 h-3.5 fill-accent-primary" />
            <span>Our Philosophy</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Small actions. Every day.
          </h1>
          <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-2xl">
            STREAK was created on a single guiding premise: lasting human transformation is not caused by sporadic heroic efforts, but by unglamorous daily consistency.
          </p>
        </header>

        <section className="space-y-8 pt-4">
          <article className="space-y-3">
            <h2 className="text-2xl font-bold text-white">Why We Built STREAK</h2>
            <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
              Modern productivity software has become cluttered with bloated enterprise tooling, endless notifications, social feeds, and intrusive monetization. We designed STREAK with an Apple-inspired, minimalist aesthetic where your attention remains focused on execution.
            </p>
          </article>

          <article className="space-y-3">
            <h2 className="text-2xl font-bold text-white">Core Principles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center text-accent-primary font-bold">
                  ⚡
                </div>
                <h3 className="font-semibold text-white text-base">Frictionless Speed</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Logging a habit or checking a to-do should take less than two seconds. No lag, no unnecessary dialog boxes.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 flex items-center justify-center text-accent-cyan font-bold">
                  🔒
                </div>
                <h3 className="font-semibold text-white text-base">Privacy by Default</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Start in Guest Mode without an account. Your habits and journal stay on your device unless you choose cloud backup.
                </p>
              </div>
            </div>
          </article>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
