import fs from 'fs';
let code = fs.readFileSync('src/lib/taskService.ts', 'utf8');

code += `

export const syncLocalTasksToCloud = async (userId: string) => {
  if (!userId || userId === 'local' || userId === 'default') return;
  const localTasks = readLocalTasks();
  let syncCount = 0;
  for (const task of localTasks) {
    if (!task.userId || task.userId === 'local' || task.userId !== userId) {
       task.userId = userId;
       try {
         await setDoc(doc(db, 'tasks', task.id || 'task_' + Date.now()), {
           ...task,
           updatedAt: serverTimestamp(),
           createdAt: task.createdAt || serverTimestamp(),
         }, { merge: true });
         syncCount++;
       } catch (e) {
         console.error('Failed to sync task', e);
       }
    }
  }
  if (syncCount > 0) {
    saveLocalTasks([]); // clear local after migration
  }
};
`;

fs.writeFileSync('src/lib/taskService.ts', code);
