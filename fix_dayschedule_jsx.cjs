const fs = require('fs');
let code = fs.readFileSync('src/components/calendar/DaySchedule.tsx', 'utf8');

code = code.replace(
  `        {filteredTasks.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-xs font-bold text-[#7d8495] uppercase tracking-wider">Tasks</h4>
        {filteredTasks.length > 0 ? (`,
  `        {filteredTasks.length > 0 ? (`
);

fs.writeFileSync('src/components/calendar/DaySchedule.tsx', code);
