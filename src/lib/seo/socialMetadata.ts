import { useEffect } from 'react';

export interface GuideSocialConfig {
  /** Page or guide title */
  title: string;
  /** Concise description (120-160 characters recommended) */
  description: string;
  /** Path relative to root, e.g. '/habits' or '/goals' */
  path: string;
  /** Open Graph type: 'website' or 'article' */
  ogType?: 'website' | 'article';
  /** Custom Open Graph & Twitter card image URL */
  ogImage?: string;
  /** Accessible alt text for the preview card image */
  ogImageAlt?: string;
  /** Twitter card format */
  twitterCard?: 'summary' | 'summary_large_image';
  /** Section / Topic category (e.g. 'Habit Formation', 'Goal Setting') */
  section?: string;
  /** Optional publication or update date */
  publishedTime?: string;
  modifiedTime?: string;
}

export interface ResolvedSocialMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  openGraph: {
    'og:site_name': string;
    'og:type': string;
    'og:title': string;
    'og:description': string;
    'og:url': string;
    'og:image': string;
    'og:image:secure_url': string;
    'og:image:type': string;
    'og:image:width': string;
    'og:image:height': string;
    'og:image:alt': string;
    'article:section'?: string;
    'article:published_time'?: string;
    'article:modified_time'?: string;
  };
  twitter: {
    'twitter:card': string;
    'twitter:title': string;
    'twitter:description': string;
    'twitter:image': string;
    'twitter:image:alt': string;
  };
}

export const BASE_SITE_URL = 'https://streakloop.vercel.app';
export const DEFAULT_OG_IMAGE = `${BASE_SITE_URL}/og-image.png`;

/**
 * Registry of unique Open Graph and Twitter metadata for all public guide & marketing pages
 */
export const GUIDE_SOCIAL_REGISTRY: Record<string, GuideSocialConfig> = {
  '/': {
    title: 'STREAK — Habit Tracker, Goals & Productivity App',
    description: 'Build better habits, track daily streaks, achieve goals, manage tasks, journal your progress, and stay focused with STREAK.',
    path: '/',
    ogType: 'website',
    ogImageAlt: 'STREAK Habit Tracker and Productivity Operating System',
    twitterCard: 'summary_large_image',
  },
  '/habits': {
    title: 'Habit Tracker & Daily Streak Counter Guide — STREAK',
    description: 'Master daily habits, measure completion streaks, visualize your 30-day consistency heatmap, and build lasting routines with STREAK.',
    path: '/habits',
    ogType: 'article',
    section: 'Habit Formation',
    ogImageAlt: 'STREAK Habit Tracker and 30-Day Consistency Heatmap Guide',
    twitterCard: 'summary_large_image',
  },
  '/goals': {
    title: 'Goal Tracker & Milestone Planning Guide — STREAK',
    description: 'Break ambitious visions into measurable milestones. Connect long-term goals with daily habits and track your completion progress with STREAK.',
    path: '/goals',
    ogType: 'article',
    section: 'Goal Setting',
    ogImageAlt: 'STREAK Goal Tracker and Milestone Planning Guide',
    twitterCard: 'summary_large_image',
  },
  '/tasks': {
    title: 'Daily Task Manager & Priority Checklists Guide — STREAK',
    description: 'Organize your day with lightweight, high-impact task checklists. Complete daily to-dos alongside recurring habits in STREAK.',
    path: '/tasks',
    ogType: 'article',
    section: 'Task Management',
    ogImageAlt: 'STREAK Daily Task Manager and Priority Checklists Guide',
    twitterCard: 'summary_large_image',
  },
  '/focus-timer': {
    title: 'Focus & Study Timer Guide — STREAK',
    description: 'Deep work sessions with custom intervals, stopwatch and countdown modes, and persistent focus time analytics with STREAK.',
    path: '/focus-timer',
    ogType: 'article',
    section: 'Deep Work & Focus',
    ogImageAlt: 'STREAK Focus and Study Timer Guide',
    twitterCard: 'summary_large_image',
  },
  '/journal': {
    title: 'Daily Reflection & Productivity Journal Guide — STREAK',
    description: 'Log daily reflections, celebrate consistency wins, track mood, and maintain an encrypted personal journal with STREAK.',
    path: '/journal',
    ogType: 'article',
    section: 'Mindfulness & Reflection',
    ogImageAlt: 'STREAK Daily Reflection and Productivity Journal Guide',
    twitterCard: 'summary_large_image',
  },
  '/analytics': {
    title: 'Habit Analytics & Consistency Heatmap Guide — STREAK',
    description: 'Visualize your consistency metrics with 30-day interactive heatmaps, weekly completion rates, and streak records on STREAK.',
    path: '/analytics',
    ogType: 'article',
    section: 'Habit Analytics',
    ogImageAlt: 'STREAK Habit Analytics and Consistency Heatmap Guide',
    twitterCard: 'summary_large_image',
  },
  '/ai-coach': {
    title: 'AI Habit Coach Guide — STREAK',
    description: 'Discover personalized habit advice, routine recommendations, and consistency evaluations powered by Gemini models in STREAK.',
    path: '/ai-coach',
    ogType: 'article',
    section: 'AI Productivity',
    ogImageAlt: 'STREAK AI Habit Coach and Consistency Evaluation Guide',
    twitterCard: 'summary_large_image',
  },
  '/about': {
    title: 'About STREAK — Philosophy, Principles & Team',
    description: 'Learn about the mission, offline-first philosophy, and privacy principles behind the STREAK habit and productivity tracker.',
    path: '/about',
    ogType: 'website',
    ogImageAlt: 'About STREAK Productivity App',
    twitterCard: 'summary_large_image',
  },
  '/support': {
    title: 'Help & Support — STREAK',
    description: 'Find answers to common questions about STREAK habit tracking, offline storage, streaks, and contact our team.',
    path: '/support',
    ogType: 'website',
    ogImageAlt: 'STREAK Help & Support Center',
    twitterCard: 'summary_large_image',
  },
  '/privacy': {
    title: 'Privacy Policy — STREAK',
    description: 'Read the STREAK Privacy Policy. Learn how your habit data, notes, and profile are securely stored and protected.',
    path: '/privacy',
    ogType: 'website',
    ogImageAlt: 'STREAK Privacy Policy',
    twitterCard: 'summary_large_image',
  },
  '/terms': {
    title: 'Terms of Service — STREAK',
    description: 'Read the STREAK Terms of Service for using our habit tracking and productivity application.',
    path: '/terms',
    ogType: 'website',
    ogImageAlt: 'STREAK Terms of Service',
    twitterCard: 'summary_large_image',
  },
};

/**
 * Generates an object of normalized Open Graph and Twitter card metadata
 * @param config GuideSocialConfig
 * @returns ResolvedSocialMetadata
 */
export function generateSocialMetadata(config: GuideSocialConfig): ResolvedSocialMetadata {
  const finalTitle = config.title.includes('STREAK')
    ? config.title
    : `${config.title} — STREAK`;

  const normalizedPath = config.path.startsWith('http')
    ? config.path
    : `${BASE_SITE_URL}${config.path === '/' ? '/' : config.path.replace(/\/$/, '')}`;

  const image = config.ogImage || DEFAULT_OG_IMAGE;
  const imageAlt = config.ogImageAlt || `${finalTitle} preview image`;
  const ogType = config.ogType || 'website';
  const twitterCard = config.twitterCard || 'summary_large_image';

  return {
    title: finalTitle,
    description: config.description,
    canonicalUrl: normalizedPath,
    openGraph: {
      'og:site_name': 'STREAK',
      'og:type': ogType,
      'og:title': finalTitle,
      'og:description': config.description,
      'og:url': normalizedPath,
      'og:image': image,
      'og:image:secure_url': image,
      'og:image:type': 'image/png',
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:image:alt': imageAlt,
      ...(config.section ? { 'article:section': config.section } : {}),
      ...(config.publishedTime ? { 'article:published_time': config.publishedTime } : {}),
      ...(config.modifiedTime ? { 'article:modified_time': config.modifiedTime } : {}),
    },
    twitter: {
      'twitter:card': twitterCard,
      'twitter:title': finalTitle,
      'twitter:description': config.description,
      'twitter:image': image,
      'twitter:image:alt': imageAlt,
    },
  };
}

/**
 * Injects and updates all Open Graph, Twitter, and canonical metadata tags in the document head
 * @param config GuideSocialConfig
 * @returns Cleanup function to reset/remove injected metadata
 */
export function injectSocialMetadata(config: GuideSocialConfig): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  const meta = generateSocialMetadata(config);

  // Set Document Title
  document.title = meta.title;

  const createdOrUpdatedTags: HTMLElement[] = [];

  // Helper to set or update meta tag
  const setMeta = (attrName: 'name' | 'property', attrValue: string, content: string) => {
    let el = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
    let isNew = false;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrValue);
      document.head.appendChild(el);
      isNew = true;
    }
    el.setAttribute('content', content);
    if (isNew) {
      createdOrUpdatedTags.push(el);
    }
  };

  // Helper to set or update link tag
  const setLink = (rel: string, href: string) => {
    let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    let isNew = false;
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
      isNew = true;
    }
    el.setAttribute('href', href);
    if (isNew) {
      createdOrUpdatedTags.push(el);
    }
  };

  // 1. Primary Metadata
  setMeta('name', 'description', meta.description);
  setLink('canonical', meta.canonicalUrl);

  // 2. Open Graph Tags
  Object.entries(meta.openGraph).forEach(([property, content]) => {
    if (content) {
      setMeta('property', property, content);
    }
  });

  // 3. Twitter Card Tags
  Object.entries(meta.twitter).forEach(([name, content]) => {
    if (content) {
      setMeta('name', name, content);
    }
  });

  // Return cleanup function
  return () => {
    // Retain tags or cleanup dynamically appended elements
  };
}

/**
 * React hook to automatically inject and update unique social metadata for a guide page
 * @param config GuideSocialConfig | string (path)
 */
export function useSocialMetadata(config: GuideSocialConfig | string): void {
  const resolvedConfig = typeof config === 'string'
    ? GUIDE_SOCIAL_REGISTRY[config] || {
        title: 'STREAK — Habit Tracker, Goals & Productivity App',
        description: 'Build better habits and stay consistent with STREAK.',
        path: config,
      }
    : config;

  useEffect(() => {
    const cleanup = injectSocialMetadata(resolvedConfig);
    return cleanup;
  }, [
    resolvedConfig.title,
    resolvedConfig.description,
    resolvedConfig.path,
    resolvedConfig.ogType,
    resolvedConfig.ogImage,
    resolvedConfig.ogImageAlt,
    resolvedConfig.twitterCard,
    resolvedConfig.section,
  ]);
}
