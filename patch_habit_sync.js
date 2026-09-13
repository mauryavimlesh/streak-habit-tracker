import fs from 'fs';
let code = fs.readFileSync('src/lib/habitService.ts', 'utf8');

code = code.replace(
  "const localHabits = readLocalHabits();",
  "const localHabits = readLocalHabits();\n  let syncedHabits = 0;"
);

code = code.replace(
  "console.error('Failed to sync habit', e);\n       }\n    }\n  }",
  "console.error('Failed to sync habit', e);\n       }\n       syncedHabits++;\n    }\n  }\n  if (syncedHabits > 0) saveLocalHabits([]);"
);

code = code.replace(
  "const localLogs = readLocalLogs();",
  "const localLogs = readLocalLogs();\n  let syncedLogs = 0;"
);

code = code.replace(
  "console.error('Failed to sync log', e);\n       }\n    }\n  }",
  "console.error('Failed to sync log', e);\n       }\n       syncedLogs++;\n    }\n  }\n  if (syncedLogs > 0) saveLocalLogs([]);"
);

fs.writeFileSync('src/lib/habitService.ts', code);
