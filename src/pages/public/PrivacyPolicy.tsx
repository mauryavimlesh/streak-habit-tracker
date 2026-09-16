import React from 'react';
import { Link } from 'react-router';
import { SEO } from '../../components/seo/SEO';
import { GUIDE_SOCIAL_REGISTRY } from '../../lib/seo/socialMetadata';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import { ShieldCheck } from 'lucide-react';

export default function PrivacyPolicy() {
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
        name: 'Privacy Policy',
        item: 'https://streakloop.vercel.app/privacy',
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] text-white flex flex-col selection:bg-accent-primary selection:text-black">
      <SEO
        socialConfig={GUIDE_SOCIAL_REGISTRY['/privacy']}
        schema={breadcrumbSchema}
      />

      <PublicHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-10">
        <nav aria-label="Breadcrumb" className="text-xs text-text-muted flex items-center gap-2">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <span className="text-accent-primary">Privacy Policy</span>
        </nav>

        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-xs font-semibold text-accent-primary">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Data Security</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-text-muted">Last Updated: September 15, 2026</p>
        </header>

        <section className="space-y-6 text-sm text-text-secondary leading-relaxed">
          <article className="space-y-2">
            <h2 className="text-lg font-bold text-white">1. Overview</h2>
            <p>
              STREAK ("we", "our", or "us") respects your privacy. This policy outlines how information is collected, stored, and protected when you access or use the STREAK web application at streakloop.vercel.app.
            </p>
          </article>

          <article className="space-y-2">
            <h2 className="text-lg font-bold text-white">2. Guest Mode &amp; Local Storage</h2>
            <p>
              When using STREAK in Guest Mode, your habit definitions, logs, goals, tasks, timer activities, and journal reflections remain strictly stored locally within your browser's IndexedDB and localStorage partitions. None of this data is transmitted to our servers or indexed by search engines.
            </p>
          </article>

          <article className="space-y-2">
            <h2 className="text-lg font-bold text-white">3. Authenticated Accounts &amp; Cloud Sync</h2>
            <p>
              If you choose to create an account or sign in with Google, your account identifier, email address, and habit records are securely stored via Firebase Authentication and Firestore under strict security rules that prohibit unauthorized access.
            </p>
          </article>

          <article className="space-y-2">
            <h2 className="text-lg font-bold text-white">4. Search Engine Indexing Protection</h2>
            <p>
              All authenticated dashboards, personal habit heatmaps, reflection logs, and private AI conversations are explicitly protected using <code className="text-accent-primary text-xs bg-white/5 px-1 py-0.5 rounded">noindex, nofollow</code> robot meta directives and authentication barriers. Google and other web crawlers cannot index your personal data.
            </p>
          </article>

          <article className="space-y-2">
            <h2 className="text-lg font-bold text-white">5. Contact &amp; Inquiries</h2>
            <p>
              For questions regarding this privacy policy or your stored data, visit our{' '}
              <Link to="/support" className="text-accent-primary hover:underline">
                Help &amp; Support center
              </Link>.
            </p>
          </article>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
