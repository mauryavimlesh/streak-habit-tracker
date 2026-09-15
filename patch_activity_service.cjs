const fs = require('fs');
let code = fs.readFileSync('src/lib/activityService.ts', 'utf8');

code = code.replace(
  "durationSeconds: number;\n  date: string;\n  time: string;",
  `durationSeconds: number;
  date: string;
  time: string;
  startTime?: string;
  endTime?: string;`
);

fs.writeFileSync('src/lib/activityService.ts', code);
