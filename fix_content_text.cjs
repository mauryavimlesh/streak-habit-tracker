const fs = require('fs');
let code = fs.readFileSync('src/pages/analytics/Analytics.tsx', 'utf8');
code = code.replace(/j\.content/g, 'j.text');
fs.writeFileSync('src/pages/analytics/Analytics.tsx', code);

code = fs.readFileSync('src/components/calendar/DaySchedule.tsx', 'utf8');
code = code.replace(/j\.content/g, 'j.text');
fs.writeFileSync('src/components/calendar/DaySchedule.tsx', code);
