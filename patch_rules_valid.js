import fs from 'fs';
let code = fs.readFileSync('firestore.rules', 'utf8');

code = code.replace(
  "data.keys().hasAll(['userId', 'name', 'category', 'frequencyType', 'targetType', 'createdAt', 'updatedAt'])",
  "data.keys().hasAll(['userId', 'name', 'category', 'frequencyType', 'targetType'])"
);

code = code.replace(
  "data.keys().hasAll(['userId', 'habitId', 'date', 'status', 'createdAt', 'updatedAt'])",
  "data.keys().hasAll(['userId', 'habitId', 'date', 'status'])"
);

code = code.replace(
  "data.keys().hasAll(['userId', 'title', 'createdAt', 'updatedAt'])",
  "data.keys().hasAll(['userId', 'title'])"
);

code = code.replace(
  "data.keys().hasAll(['userId', 'date', 'text', 'createdAt', 'updatedAt'])",
  "data.keys().hasAll(['userId', 'date', 'text'])"
);

code = code.replace(
  "data.keys().hasAll(['userId', 'title', 'time', 'repeat', 'enabled', 'notificationEnabled', 'category', 'createdAt'])",
  "data.keys().hasAll(['userId', 'title', 'time', 'repeat', 'enabled', 'notificationEnabled', 'category'])"
);

fs.writeFileSync('firestore.rules', code);
