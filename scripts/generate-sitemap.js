#!/usr/bin/env node
/**
 * STREAK Sitemap Generator Script
 * 
 * Scans all files in the 'src/pages' directory, excluding those in 'pages/auth',
 * 'pages/settings', and 'pages/onboarding', and filters out private/authenticated
 * views to ensure ONLY public-facing content is included for search engine crawlers.
 * 
 * Usage:
 *   node scripts/generate-sitemap.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const pagesDir = path.join(rootDir, 'src', 'pages');

// Production Canonical Domain
const DOMAIN = (process.env.CANONICAL_DOMAIN || process.env.SITE_URL || 'https://streakloop.vercel.app').replace(/\/$/, '');

// Directories explicitly excluded as requested
const EXCLUDED_DIRECTORIES = [
  'pages/auth',
  'pages/settings',
  'pages/onboarding',
  'auth',
  'settings',
  'onboarding',
];

// Internal authenticated/protected sections excluded from public search indexing
const PROTECTED_DIRECTORIES = [
  'activity',
  'appearance',
  'sync',
  'reminders',
];

// Known component-to-route and SEO priority configurations for public pages
const PUBLIC_PAGE_REGISTRY = {
  'LandingPage': {
    route: '/',
    priority: '1.0',
    changefreq: 'daily',
    name: 'Home / Landing Page',
  },
  'HabitsGuide': {
    route: '/habits',
    priority: '0.9',
    changefreq: 'weekly',
    name: 'Habits Guide & Daily Streak Counter',
  },
  'GoalsGuide': {
    route: '/goals',
    priority: '0.8',
    changefreq: 'weekly',
    name: 'Goals Guide & Milestone Planning',
  },
  'TasksGuide': {
    route: '/tasks',
    priority: '0.8',
    changefreq: 'weekly',
    name: 'Daily Task Manager & Priority Checklists',
  },
  'FocusTimerGuide': {
    route: '/focus-timer',
    priority: '0.8',
    changefreq: 'weekly',
    name: 'Focus & Study Timer Deep Work Guide',
  },
  'JournalGuide': {
    route: '/journal',
    priority: '0.8',
    changefreq: 'weekly',
    name: 'Daily Reflection & Productivity Journal Guide',
  },
  'AnalyticsGuide': {
    route: '/analytics',
    priority: '0.8',
    changefreq: 'weekly',
    name: 'Habit Consistency Heatmap & Analytics Guide',
  },
  'AICoachGuide': {
    route: '/ai-coach',
    priority: '0.8',
    changefreq: 'weekly',
    name: 'AI Habit Coach & Productivity Assistant Guide',
  },
  'AboutPage': {
    route: '/about',
    priority: '0.7',
    changefreq: 'monthly',
    name: 'About STREAK — Philosophy & Mission',
  },
  'HelpSupport': {
    route: '/support',
    priority: '0.7',
    changefreq: 'monthly',
    name: 'Help & Support Center',
  },
  'PrivacyPolicy': {
    route: '/privacy',
    priority: '0.5',
    changefreq: 'monthly',
    name: 'Privacy Policy',
  },
  'TermsOfService': {
    route: '/terms',
    priority: '0.5',
    changefreq: 'monthly',
    name: 'Terms of Service',
  },
};

// Internal authenticated counterpart components that are NOT the public guides
const PROTECTED_COMPONENTS = new Set([
  'Home',
  'Calendar',
  'More',
  'CreateHabit',
  'MyHabits',
  'Goals',
  'Analytics',
  'Journal',
  'AICoach',
]);

/**
 * Recursively scans a directory and collects all file paths
 * @param {string} dir
 * @returns {string[]} Array of absolute file paths
 */
export function getFilesRecursively(dir) {
  if (!fs.existsSync(dir)) return [];
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Checks whether a given file matches any excluded directories
 * @param {string} relativePath Relative path from src/pages
 * @returns {string | null} Exclusion reason or null
 */
export function getExclusionReason(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');

  // 1. Explicitly requested exclusions: pages/auth, pages/settings, pages/onboarding
  for (const excluded of EXCLUDED_DIRECTORIES) {
    if (
      normalized.startsWith(`${excluded}/`) ||
      normalized === excluded ||
      normalized.includes(`/${excluded}/`) ||
      `pages/${normalized}`.startsWith(`${excluded}/`) ||
      `pages/${normalized}` === excluded
    ) {
      return `matches excluded directory (${excluded})`;
    }
  }

  // 2. Protected user app directories (authenticated-only)
  for (const protectedDir of PROTECTED_DIRECTORIES) {
    if (normalized.startsWith(`${protectedDir}/`) || normalized === protectedDir) {
      return `protected authenticated directory (${protectedDir})`;
    }
  }

  return null;
}

/**
 * Scans the src/pages directory and identifies all public-facing pages
 * @param {string} targetDir
 * @returns {{ publicPages: Array<any>, excludedFiles: Array<any> }}
 */
export function scanPagesDirectory(targetDir = pagesDir) {
  const allFiles = getFilesRecursively(targetDir);
  const publicPagesMap = new Map();
  const excludedFiles = [];

  for (const filePath of allFiles) {
    const relativeToPages = path.relative(targetDir, filePath);
    const parsed = path.parse(filePath);

    // Skip non-code or test files
    if (!['.tsx', '.ts', '.jsx', '.js'].includes(parsed.ext) || parsed.name.includes('.test') || parsed.name.includes('.spec')) {
      excludedFiles.push({
        file: relativeToPages,
        reason: 'non-page source or test file',
      });
      continue;
    }

    // Check directory exclusion rules (pages/auth, pages/settings, pages/onboarding, etc.)
    const dirExclusion = getExclusionReason(relativeToPages);
    if (dirExclusion) {
      excludedFiles.push({
        file: relativeToPages,
        reason: dirExclusion,
      });
      continue;
    }

    // Inspect file content
    const content = fs.readFileSync(filePath, 'utf-8');

    // If page explicitly declares noindex, exclude from public sitemap
    if (content.includes('noindex={true}') || content.includes('noindex: true')) {
      excludedFiles.push({
        file: relativeToPages,
        reason: 'contains explicit noindex directive',
      });
      continue;
    }

    // If file is an internal protected counterpart component
    if (PROTECTED_COMPONENTS.has(parsed.name)) {
      excludedFiles.push({
        file: relativeToPages,
        reason: 'authenticated internal component (public guide is preferred for index)',
      });
      continue;
    }

    // Resolve public route configuration
    const config = PUBLIC_PAGE_REGISTRY[parsed.name];
    let route = config ? config.route : null;
    let priority = config ? config.priority : '0.7';
    let changefreq = config ? config.changefreq : 'weekly';
    let name = config ? config.name : parsed.name;

    // Fallback detection if not in registry
    if (!route) {
      const socialMatch = content.match(/GUIDE_SOCIAL_REGISTRY\['([^']+)'\]/);
      const canonicalMatch = content.match(/canonical=['"]https?:\/\/[^/]+([^'"]*)['"]/);
      if (socialMatch) {
        route = socialMatch[1];
      } else if (canonicalMatch) {
        route = canonicalMatch[1];
      } else if (parsed.name.toLowerCase().includes('landing') || parsed.name.toLowerCase() === 'index') {
        route = '/';
      } else {
        // Derive route from component/file name
        const cleanName = parsed.name
          .replace(/Guide$/, '')
          .replace(/Page$/, '')
          .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
          .toLowerCase();
        route = `/${cleanName}`;
      }
    }

    // Get file last modification date
    let lastmod;
    try {
      const stat = fs.statSync(filePath);
      lastmod = stat.mtime.toISOString().split('T')[0];
    } catch {
      lastmod = new Date().toISOString().split('T')[0];
    }

    // Ensure route is unique and formatted
    const normalizedRoute = route === '/' ? '/' : route.replace(/\/$/, '');
    if (!publicPagesMap.has(normalizedRoute)) {
      publicPagesMap.set(normalizedRoute, {
        route: normalizedRoute,
        file: relativeToPages,
        name,
        priority,
        changefreq,
        lastmod,
      });
    }
  }

  // Sort public pages: root first, then by priority descending
  const publicPages = Array.from(publicPagesMap.values()).sort((a, b) => {
    if (a.route === '/') return -1;
    if (b.route === '/') return 1;
    return parseFloat(b.priority) - parseFloat(a.priority);
  });

  return { publicPages, excludedFiles };
}

/**
 * Builds standard XML conforming strictly to http://www.sitemaps.org/schemas/sitemap/0.9
 * @param {Array<any>} pages
 * @param {string} domain
 * @returns {string} XML content
 */
export function buildSitemapXml(pages, domain = DOMAIN) {
  const urlEntries = pages
    .map((page) => {
      const fullUrl = `${domain}${page.route === '/' ? '/' : page.route}`;
      return `  <url>
    <loc>${fullUrl}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;
}

/**
 * Executes scanner, generates sitemap XML, and writes to public/ and dist/ directories
 */
export function generateSitemapFile(customPagesDir = pagesDir, domain = DOMAIN) {
  console.log('='.repeat(70));
  console.log('  STREAK Dynamic Sitemap Generator');
  console.log(`  Scanning Directory: ${path.relative(rootDir, customPagesDir)}`);
  console.log(`  Target Domain:     ${domain}`);
  console.log('='.repeat(70));

  const { publicPages, excludedFiles } = scanPagesDirectory(customPagesDir);

  const xmlContent = buildSitemapXml(publicPages, domain);

  // Target output paths: public/sitemap.xml and dist/sitemap.xml (if dist exists)
  const publicDir = path.join(rootDir, 'public');
  const distDir = path.join(rootDir, 'dist');

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const publicSitemapPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(publicSitemapPath, xmlContent, 'utf-8');
  console.log(`\n✔ Successfully generated: ${path.relative(rootDir, publicSitemapPath)}`);

  if (fs.existsSync(distDir)) {
    const distSitemapPath = path.join(distDir, 'sitemap.xml');
    fs.writeFileSync(distSitemapPath, xmlContent, 'utf-8');
    console.log(`✔ Synced to production build: ${path.relative(rootDir, distSitemapPath)}`);
  }

  // Summary Table of Public Pages
  console.log(`\nDiscovered Public Pages (${publicPages.length} URLs):`);
  console.table(
    publicPages.map((p) => ({
      URL: `${domain}${p.route}`,
      Priority: p.priority,
      Changefreq: p.changefreq,
      SourceFile: p.file,
      Name: p.name,
    }))
  );

  // Excluded summary
  console.log(`\nExcluded Non-Public / Private Files (${excludedFiles.length} files):`);
  excludedFiles.forEach((item) => {
    console.log(`  [EXCLUDED] ${item.file.padEnd(32)} -> ${item.reason}`);
  });

  console.log('\nSitemap generation complete!\n');

  return {
    sitemapPath: publicSitemapPath,
    publicPages,
    excludedFiles,
  };
}

// Run immediately if executed via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateSitemapFile();
}

