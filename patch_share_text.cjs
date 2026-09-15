const fs = require('fs');
let code = fs.readFileSync('src/components/ui/ShareModal.tsx', 'utf8');

code = code.replace(
  `text: 'Check out my progress on STREAK! 🔥',`,
  `text: 'Check out my progress on STREAK! 🔥\\nstreakloop.vercel.com',`
);

code = code.replace(
  `const shareText = encodeURIComponent('Check out my progress on STREAK! 🔥 ' + window.location.href);`,
  `const shareText = encodeURIComponent('Check out my progress on STREAK! 🔥 \\nstreakloop.vercel.com');`
);

code = code.replace(
  `&text=Check out my progress on STREAK! 🔥\``,
  `&text=' + encodeURIComponent('Check out my progress on STREAK! 🔥 \\nstreakloop.vercel.com'))`
);

fs.writeFileSync('src/components/ui/ShareModal.tsx', code);
