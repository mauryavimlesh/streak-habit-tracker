const fs = require('fs');
let code = fs.readFileSync('src/pages/analytics/Analytics.tsx', 'utf8');

code = code.replace(
  "const uniqueDates = [...new Set(logs.filter(l => l.status === 'completed').map(l => l.date))].sort();",
  "const uniqueDates = [...new Set<string>(logs.filter(l => l.status === 'completed').map(l => l.date))].sort();"
);

code = code.replace(
  "const uDates = [...new Set(habitLogs.map(l => l.date))].sort();",
  "const uDates = [...new Set<string>(habitLogs.map(l => l.date))].sort();"
);

fs.writeFileSync('src/pages/analytics/Analytics.tsx', code);
