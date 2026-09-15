const fs = require('fs');
let code = fs.readFileSync('src/components/calendar/DaySchedule.tsx', 'utf8');

code = code.replace(
  "interface DayScheduleProps {",
  `import { Habit, HabitLog } from '../../lib/habitService';
import { Activity } from '../../lib/activityService';
import { Goal } from '../../lib/goalService';
import { JournalEntry } from '../../lib/journalService';

interface DayScheduleProps {
  habits?: Habit[];
  logs?: HabitLog[];
  activities?: Activity[];
  goals?: Goal[];
  journals?: JournalEntry[];`
);

code = code.replace(
  "export function DaySchedule({",
  `export function DaySchedule({
  habits = [],
  logs = [],
  activities = [],
  goals = [],
  journals = [],`
);

fs.writeFileSync('src/components/calendar/DaySchedule.tsx', code);
