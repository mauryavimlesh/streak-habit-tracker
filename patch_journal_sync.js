import fs from 'fs';
let code = fs.readFileSync('src/lib/journalService.ts', 'utf8');

code += `

export const syncLocalJournalToCloud = async (userId: string) => {
  if (!userId || userId === 'local' || userId === 'default') return;
  const localJournal = readLocalJournal();
  let syncCount = 0;
  for (const entry of localJournal) {
    if (!entry.userId || entry.userId === 'local' || entry.userId !== userId) {
       entry.userId = userId;
       try {
         await setDoc(doc(db, 'journal_logs', entry.id || 'journal_' + Date.now()), {
           ...entry,
           updatedAt: serverTimestamp(),
           createdAt: entry.createdAt || serverTimestamp(),
         }, { merge: true });
         syncCount++;
       } catch (e) {
         console.error('Failed to sync journal entry', e);
       }
    }
  }
  if (syncCount > 0) {
    saveLocalJournal([]); // clear local after migration
  }
};
`;

fs.writeFileSync('src/lib/journalService.ts', code);
