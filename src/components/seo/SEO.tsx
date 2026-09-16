import { useEffect } from 'react';
import {
  injectSocialMetadata,
  GuideSocialConfig,
  BASE_SITE_URL,
  DEFAULT_OG_IMAGE,
} from '../../lib/seo/socialMetadata';

export interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
  ogType?: 'website' | 'article';
  ogImage?: string;
  ogImageAlt?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  section?: string;
  schema?: Record<string, any> | Record<string, any>[];
  socialConfig?: GuideSocialConfig;
}

const DEFAULT_TITLE = 'STREAK — Habit Tracker, Goals & Productivity App';
const DEFAULT_DESC =
  'Build better habits, track your streaks, manage goals and tasks, journal your progress, and stay focused with STREAK.';

export function SEO({
  title,
  description = DEFAULT_DESC,
  canonical,
  noindex = false,
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  ogImageAlt,
  twitterCard = 'summary_large_image',
  section,
  schema,
  socialConfig,
}: SEOProps) {
  useEffect(() => {
    // 1. Robots meta
    const setMeta = (attrName: 'name' | 'property', attrValue: string, content: string) => {
      let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    if (noindex) {
      setMeta('name', 'robots', 'noindex, nofollow');
      const finalTitle = title
        ? (title.includes('STREAK') ? title : `${title} — STREAK`)
        : DEFAULT_TITLE;
      document.title = finalTitle;
    } else {
      setMeta(
        'name',
        'robots',
        'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
      );

      // Determine path
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
      const finalCanonical = canonical || `${BASE_SITE_URL}${currentPath === '/' ? '/' : currentPath.replace(/\/$/, '')}`;

      const config: GuideSocialConfig = socialConfig || {
        title: title || DEFAULT_TITLE,
        description,
        path: finalCanonical,
        ogType,
        ogImage,
        ogImageAlt,
        twitterCard,
        section,
      };

      // Injects all Open Graph, Twitter, and canonical tags
      injectSocialMetadata(config);
    }

    // 2. Dynamic Schema.org JSON-LD
    const scriptId = 'page-json-ld';
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (schema) {
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = scriptId;
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(schema);
    } else if (scriptEl) {
      scriptEl.remove();
    }
  }, [
    title,
    description,
    canonical,
    noindex,
    ogType,
    ogImage,
    ogImageAlt,
    twitterCard,
    section,
    schema,
    socialConfig,
  ]);

  return null;
}

