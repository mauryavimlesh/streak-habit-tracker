import fs from 'fs';
let code = fs.readFileSync('src/lib/AuthContext.tsx', 'utf8');

code = code.replace(
  "import { syncLocalToCloud } from './habitService';",
  "import { syncLocalToCloud } from './habitService';\nimport { syncLocalTasksToCloud } from './taskService';\nimport { syncLocalJournalToCloud } from './journalService';"
);

code = code.replace(
  "// Sync local habits to the cloud\n            await syncLocalToCloud(currentUser.uid);",
  "// Sync local habits to the cloud\n            await syncLocalToCloud(currentUser.uid);\n            await syncLocalTasksToCloud(currentUser.uid);\n            await syncLocalJournalToCloud(currentUser.uid);"
);

fs.writeFileSync('src/lib/AuthContext.tsx', code);
