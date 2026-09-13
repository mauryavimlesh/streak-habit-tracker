import fs from 'fs';
let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

content = content.replace(
  `        if (fetchedHabits.length > 0) {
          setHabits(fetchedHabits);`,
  `        setAllLogs(fetchedLogs);
        if (fetchedHabits.length > 0) {
          setHabits(fetchedHabits);`
);

fs.writeFileSync('src/pages/Home.tsx', content);
