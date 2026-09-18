import fs from 'fs';
import path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${message}`);
}

const rootDir = process.cwd();
const manifestWebmanifestPath = path.join(rootDir, 'public', 'manifest.webmanifest');
const manifestJsonPath = path.join(rootDir, 'public', 'manifest.json');
const swPath = path.join(rootDir, 'public', 'sw.js');
const htmlPath = path.join(rootDir, 'index.html');
const serverPath = path.join(rootDir, 'server.ts');

console.log('======================================================================');
console.log('🚀 STREAK PWA INSTALLATION & RELIABILITY AUDIT MATRIX');
console.log('======================================================================');

// 1. Manifest
assert(fs.existsSync(manifestWebmanifestPath), 'manifest.webmanifest exists');
const manifest = JSON.parse(fs.readFileSync(manifestWebmanifestPath, 'utf8'));
assert(manifest.name === 'STREAK', 'Manifest name is "STREAK"');
assert(manifest.short_name === 'STREAK', 'Manifest short_name is "STREAK"');
assert(manifest.start_url === '/', 'Manifest start_url is "/"');
assert(manifest.scope === '/', 'Manifest scope is "/"');
assert(manifest.display === 'standalone', 'Manifest display is "standalone"');
assert(manifest.background_color === '#0d0e12', 'Manifest background_color is #0d0e12');
assert(manifest.theme_color === '#0d0e12', 'Manifest theme_color is #0d0e12');

// 2. Fallback manifest.json
assert(fs.existsSync(manifestJsonPath), 'manifest.json exists for legacy tooling');

// 3. Icons
const icons = manifest.icons as Array<{ src: string; sizes: string; purpose?: string }>;
assert(
  icons.some((i) => i.sizes === '192x192' && (i.purpose === 'any' || !i.purpose)),
  '192x192 icon with purpose "any" declared'
);
assert(
  icons.some((i) => i.sizes === '512x512' && (i.purpose === 'any' || !i.purpose)),
  '512x512 icon with purpose "any" declared'
);
assert(
  icons.some((i) => i.sizes === '192x192' && i.purpose === 'maskable'),
  '192x192 icon with purpose "maskable" declared'
);
assert(
  icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable'),
  '512x512 icon with purpose "maskable" declared'
);

for (const icon of icons) {
  const iconOnDisk = path.join(rootDir, 'public', icon.src.replace(/^\//, ''));
  assert(fs.existsSync(iconOnDisk), `Icon asset exists on disk: ${icon.src}`);
}

// 4. HTML Meta tags
const html = fs.readFileSync(htmlPath, 'utf8');
assert(html.includes('rel="manifest" href="/manifest.webmanifest"'), 'HTML links to manifest.webmanifest');
assert(html.includes('name="theme-color" content="#0d0e12"'), 'HTML specifies theme-color');
assert(html.includes('name="apple-mobile-web-app-capable" content="yes"'), 'HTML sets apple-mobile-web-app-capable');
assert(html.includes('name="apple-mobile-web-app-status-bar-style" content="black-translucent"'), 'HTML sets apple status bar');
assert(html.includes('name="apple-mobile-web-app-title" content="STREAK"'), 'HTML sets apple app title to STREAK');
assert(html.includes('rel="apple-touch-icon"'), 'HTML specifies apple-touch-icon');

// 5. Service Worker Strategies
const sw = fs.readFileSync(swPath, 'utf8');
assert(sw.includes("url.pathname.startsWith('/api/')"), 'sw.js excludes /api/ routes from cache');
assert(sw.includes('firestore.googleapis.com'), 'sw.js excludes firestore from caching');
assert(sw.includes('identitytoolkit.googleapis.com'), 'sw.js excludes Firebase auth endpoints');
assert(sw.includes("request.mode === 'navigate'"), 'sw.js handles navigation requests with SPA fallback');
assert(sw.includes('PAGES_CACHE'), 'sw.js manages versioned pages cache');
assert(sw.includes('STATIC_CACHE'), 'sw.js manages versioned static cache');
assert(sw.includes('SKIP_WAITING'), 'sw.js supports SKIP_WAITING client signal');

// 6. Server Routing
const server = fs.readFileSync(serverPath, 'utf8');
assert(server.includes('/sw.js'), 'server.ts has dedicated /sw.js route');
assert(server.includes('Service-Worker-Allowed'), 'server.ts sets Service-Worker-Allowed header');
assert(server.includes('no-cache, no-store, must-revalidate'), 'server.ts enforces no-cache on sw.js');

console.log('======================================================================');
console.log('🎉 PWA AUDIT PASSED ALL VERIFICATION CHECKS');
console.log('======================================================================');
