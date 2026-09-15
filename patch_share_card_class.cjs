const fs = require('fs');

let file1 = 'src/components/ui/StreakShareCard.tsx';
let code1 = fs.readFileSync(file1, 'utf8');
code1 = code1.replace(
  `"relative rounded-3xl overflow-hidden shadow-2xl flex flex-col bg-gradient-to-br from-[#121820] to-[#0a0c10] border border-[#2a303c]",`,
  `"share-card relative rounded-3xl overflow-hidden shadow-2xl flex flex-col bg-gradient-to-br from-[#121820] to-[#0a0c10] border border-[#2a303c]",`
);
fs.writeFileSync(file1, code1);

let file2 = 'src/components/ui/StudySessionShareCard.tsx';
let code2 = fs.readFileSync(file2, 'utf8');
code2 = code2.replace(
  `"relative rounded-3xl overflow-hidden shadow-2xl flex flex-col bg-gradient-to-br from-[#121820] to-[#0a0c10] border border-[#2a303c]",`,
  `"share-card relative rounded-3xl overflow-hidden shadow-2xl flex flex-col bg-gradient-to-br from-[#121820] to-[#0a0c10] border border-[#2a303c]",`
);
fs.writeFileSync(file2, code2);
