import fs from 'fs';
let code = fs.readFileSync('firestore.rules', 'utf8');

code = code.replace(
  "return data.keys().hasAll(['title', 'date', 'completed'])\n        && (!('userId' in data) || data.userId == request.auth.uid)",
  "return data.keys().hasAll(['userId', 'title', 'date', 'completed'])\n        && data.userId == request.auth.uid"
);

code = code.replace(
  "allow get: if request.auth != null && (resource.data.userId == request.auth.uid || !('userId' in resource.data));",
  "allow get: if request.auth != null && resource.data.userId == request.auth.uid;"
);

code = code.replace(
  "allow list: if request.auth != null && (resource.data.userId == request.auth.uid || !('userId' in resource.data));",
  "allow list: if request.auth != null && resource.data.userId == request.auth.uid;"
);

code = code.replace(
  "allow update: if request.auth != null\n        && (existing().userId == request.auth.uid || !('userId' in existing()))",
  "allow update: if request.auth != null\n        && existing().userId == request.auth.uid\n        && incoming().userId == existing().userId"
);

code = code.replace(
  "allow delete: if request.auth != null && (existing().userId == request.auth.uid || !('userId' in existing()));",
  "allow delete: if request.auth != null && existing().userId == request.auth.uid;"
);

fs.writeFileSync('firestore.rules', code);
