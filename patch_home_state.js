import fs from 'fs';
let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

content = content.replace(
  `  const [displayedHabits, setDisplayedHabits] = useState<Habit[]>([]);`,
  `  const [displayedHabits, setDisplayedHabits] = useState<Habit[]>([]);\n  const [allLogs, setAllLogs] = useState<HabitLog[]>([]);`
);

fs.writeFileSync('src/pages/Home.tsx', content);
