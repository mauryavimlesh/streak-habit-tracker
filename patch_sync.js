import fs from 'fs';
let code = fs.readFileSync('src/lib/habitService.ts', 'utf8');

const newFunc = `
export const syncLocalToCloud = async (userId: string) => {
  if (!userId || userId === 'local' || userId === 'default') return;
  const localHabits = readLocalHabits();
  for (const habit of localHabits) {
    if (!habit.userId || habit.userId === 'local' || habit.userId !== userId) {
       habit.userId = userId;
       try {
         await setDoc(doc(db, 'habits', habit.id || 'habit_' + Date.now()), {
           ...habit,
           updatedAt: serverTimestamp(),
           createdAt: habit.createdAt || serverTimestamp(),
         }, { merge: true });
       } catch (e) {
         console.error('Failed to sync habit', e);
       }
    }
  }
  
  const localLogs = readLocalLogs();
  for (const log of localLogs) {
    if (!log.userId || log.userId === 'local' || log.userId !== userId) {
       log.userId = userId;
       try {
         await setDoc(doc(db, 'habit_logs', log.id || 'log_' + Date.now()), {
           ...log,
           updatedAt: serverTimestamp(),
           createdAt: log.createdAt || serverTimestamp(),
         }, { merge: true });
       } catch (e) {
         console.error('Failed to sync log', e);
       }
    }
  }
  
  // After sync, save back with updated userIds
  saveLocalHabits(localHabits);
  saveLocalLogs(localLogs);
};
`;

code += newFunc;
fs.writeFileSync('src/lib/habitService.ts', code);
