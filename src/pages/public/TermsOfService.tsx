import React from 'react';
import { Link } from 'react-router';
import { SEO } from '../../components/seo/SEO';
import { GUIDE_SOCIAL_REGISTRY } from '../../lib/seo/socialMetadata';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import { FileText } from 'lucide-react';

export default function TermsOfService() {
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
        name: 'Terms of Service',
        item: 'https://streakloop.vercel.app/terms',
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] text-white flex flex-col selection:bg-accent-primary selection:text-black">
      <SEO
        socialConfig={GUIDE_SOCIAL_REGISTRY['/terms']}
        schema={breadcrumbSchema}
      />

      <PublicHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-10">
        <nav aria-label="Breadcrumb" className="text-xs text-text-muted flex items-center gap-2">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <span className="text-accent-primary">Terms of Service</span>
        </nav>

        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-xs font-semibold text-accent-primary">
            <FileText className="w-3.5 h-3.5" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-text-muted">Last Updated: September 15, 2026</p>
        </header>

        <section className="space-y-6 text-sm text-text-secondary leading-relaxed">
          <article className="space-y-2">
            <h2 className="text-lg font-bold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using STREAK (streakloop.vercel.app), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may cease use of the service.
            </p>
          </article>

          <article className="space-y-2">
            <h2 className="text-lg font-bold text-white">2. Permitted Use</h2>
            <p>
              STREAK is provided for personal habit tracking, productivity management, time tracking, and self-reflection. You agree not to misuse the service, attempt unauthorized server access, or circumvent security features.
            </p>
          </article>

          <article className="space-y-2">
            <h2 className="text-lg font-bold text-white">3. Disclaimer of Warranties</h2>
            <p>
              The application is provided "as is" without warranty of any kind. While we make every effort to maintain continuous availability and data integrity, we recommend utilizing cloud backup or account registration for long-term records.
            </p>
          </article>

          <article className="space-y-2">
            <h2 className="text-lg font-bold text-white">4. Modifications</h2>
            <p>
              We reserve the right to revise these terms as necessary. Continued use of STREAK following updates represents acceptance of modified terms.
            </p>
          </article>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
