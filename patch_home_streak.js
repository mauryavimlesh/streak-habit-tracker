import fs from 'fs';
let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

// 1. Add calculateGlobalStreak function
const globalStreakCode = `
  const getGlobalStreak = () => {
    // Collect all dates where at least one habit was completed
    const completedDates = new Set<string>();
    allLogs.forEach(l => {
      if (l.status === 'completed' || (l.progressValue && l.progressValue > 0)) {
        completedDates.add(l.date);
      }
    });
    
    // Sort descending
    const sorted = Array.from(completedDates).sort((a, b) => b.localeCompare(a));
    if (sorted.length === 0) return 0;
    
    const today = new Date().toLocaleDateString('en-CA');
    let checkDate = new Date(today);
    
    let currentStreak = 0;
    const hasToday = sorted.includes(today);
    
    const yesterday = new Date(checkDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');
    const hasYesterday = sorted.includes(yesterdayStr);
    
    if (hasToday || hasYesterday) {
      checkDate = new Date(hasToday ? today : yesterdayStr);
    } else {
      return 0; // Streak broken
    }
    
    while (true) {
      const dateStr = checkDate.toLocaleDateString('en-CA');
      if (sorted.includes(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return currentStreak;
  };
  const globalStreak = getGlobalStreak();
`;

content = content.replace(
  `  const getGreeting = () => {`,
  globalStreakCode + `\n  const getGreeting = () => {`
);

// 2. Make sure we have allLogs
content = content.replace(
  `  const [displayedHabits, setDisplayedHabits] = useState<Habit[]>([]);`,
  `  const [displayedHabits, setDisplayedHabits] = useState<Habit[]>([]);\n  const [allLogs, setAllLogs] = useState<HabitLog[]>([]);`
);

content = content.replace(
  `          const userHabits = await getUserHabits(user.uid);`,
  `          const userHabits = await getUserHabits(user.uid);\n          const userLogs = await getHabitLogs(user.uid);\n          setAllLogs(userLogs);`
);

// Update streak display
content = content.replace(
  `              <span>0 days</span>`,
  `              <span>{globalStreak} {globalStreak === 1 ? 'day' : 'days'}</span>`
);
content = content.replace(
  `              Score 0`,
  `              Score {globalStreak * 10}`
);

fs.writeFileSync('src/pages/Home.tsx', content);
