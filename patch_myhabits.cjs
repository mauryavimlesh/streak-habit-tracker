const fs = require('fs');
let code = fs.readFileSync('src/pages/habits/MyHabits.tsx', 'utf8');

code = code.replace(
  "onClick={() => setEditingHabit(habit)}",
  "onClick={() => navigate(`/habits/new?edit=${habit.id}`)}"
);

code = code.replace(
  "onClick={() => setEditingHabit(habit)}",
  "onClick={() => navigate(`/habits/new?edit=${habit.id}`)}"
);

fs.writeFileSync('src/pages/habits/MyHabits.tsx', code);
