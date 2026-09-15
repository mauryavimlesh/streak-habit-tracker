const fs = require('fs');
let code = fs.readFileSync('src/components/calendar/DaySchedule.tsx', 'utf8');

code = code.replace(
  "  Clock,",
  "  Clock,\n  CheckCircle2,\n  Book,"
);

fs.writeFileSync('src/components/calendar/DaySchedule.tsx', code);
