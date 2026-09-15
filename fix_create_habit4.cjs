const fs = require('fs');
let code = fs.readFileSync('src/pages/habits/CreateHabit.tsx', 'utf8');

code = code.replace(
  "import { createHabit, HabitFrequency, TargetType } from '../../lib/habitService';",
  "import { createHabit, updateHabit, getUserHabits, HabitFrequency, TargetType } from '../../lib/habitService';"
);

fs.writeFileSync('src/pages/habits/CreateHabit.tsx', code);
