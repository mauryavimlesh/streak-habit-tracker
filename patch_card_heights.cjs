const fs = require('fs');

let file1 = 'src/components/ui/StreakShareCard.tsx';
let code1 = fs.readFileSync(file1, 'utf8');
code1 = code1.replace(
  `isSquare ? "w-[300px] h-[300px]" : "w-[260px] h-[462px]"`,
  `isSquare ? "w-[320px] min-h-[320px]" : "w-[280px] min-h-[480px] pb-6"`
);
// Make top margins slightly tighter to make room
code1 = code1.replace(
  `mb-6`,
  `mb-4`
);
fs.writeFileSync(file1, code1);


let file2 = 'src/components/ui/StudySessionShareCard.tsx';
let code2 = fs.readFileSync(file2, 'utf8');
code2 = code2.replace(
  `isSquare ? "w-[300px] h-[300px]" : "w-[260px] h-[462px]"`,
  `isSquare ? "w-[320px] min-h-[320px]" : "w-[280px] min-h-[480px] pb-6"`
);
code2 = code2.replace(
  `mb-6`,
  `mb-4`
);
fs.writeFileSync(file2, code2);
