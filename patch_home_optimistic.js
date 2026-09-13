import fs from 'fs';
let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

content = content.replace(
  `        await logHabit({
          userId: user.uid,
          habitId: habitId,
          date: todayStr,
          status: nextVal >= target ? 'completed' : 'missed',
          progressValue: nextVal,
          note: habitNotes[habitId] || undefined,
        });`,
  `        const status = nextVal >= target ? 'completed' : 'missed';
        await logHabit({
          userId: user.uid,
          habitId: habitId,
          date: todayStr,
          status,
          progressValue: nextVal,
          note: habitNotes[habitId] || undefined,
        });
        setAllLogs(prev => {
          const idx = prev.findIndex(l => l.habitId === habitId && l.date === todayStr);
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], status, progressValue: nextVal };
            return copy;
          }
          return [...prev, { habitId, date: todayStr, status, progressValue: nextVal } as any];
        });`
);

fs.writeFileSync('src/pages/Home.tsx', content);
