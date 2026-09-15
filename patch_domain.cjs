const fs = require('fs');

// 1. Update StreakShareCard.tsx
let file1 = 'src/components/ui/StreakShareCard.tsx';
let code1 = fs.readFileSync(file1, 'utf8');
code1 = code1.replace(
  /streakloop\.vercel\.com/g,
  'streakloop.vercel.app'
);
fs.writeFileSync(file1, code1);

// 2. Update StudySessionShareCard.tsx
let file2 = 'src/components/ui/StudySessionShareCard.tsx';
let code2 = fs.readFileSync(file2, 'utf8');
code2 = code2.replace(
  /streakloop\.vercel\.com/g,
  'streakloop.vercel.app'
);
fs.writeFileSync(file2, code2);

// 3. Update ShareModal.tsx
let file3 = 'src/components/ui/ShareModal.tsx';
let code3 = fs.readFileSync(file3, 'utf8');
code3 = code3.replace(
  /streakloop\.vercel\.com/g,
  'streakloop.vercel.app'
);
fs.writeFileSync(file3, code3);

console.log("Domain text patched successfully!");
