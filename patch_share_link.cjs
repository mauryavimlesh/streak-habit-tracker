const fs = require('fs');
let code = fs.readFileSync('src/components/ui/ShareModal.tsx', 'utf8');

code = code.replace(
  `href={\`https://t.me/share/url?url=\${encodeURIComponent(window.location.href)}&text=' + encodeURIComponent('Check out my progress on STREAK! 🔥 \\nstreakloop.vercel.com'))}`,
  `href={\`https://t.me/share/url?url=\${encodeURIComponent(window.location.href)}&text=\${shareText}\`}`
);

fs.writeFileSync('src/components/ui/ShareModal.tsx', code);
