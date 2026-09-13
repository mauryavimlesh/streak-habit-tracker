import fs from 'fs';
let code = fs.readFileSync('firestore.rules', 'utf8');

code = code.replace(
  "&& data.keys().hasAll(['email', 'name', 'createdAt', 'updatedAt'])",
  "&& data.keys().hasAll(['name', 'updatedAt'])"
);

code = code.replace(
  "&& incoming().createdAt == request.time",
  "&& (!('createdAt' in incoming()) || incoming().createdAt == request.time)"
);

code = code.replace(
  "&& incoming().createdAt == existing().createdAt",
  "&& (!('createdAt' in incoming()) || !('createdAt' in existing()) || incoming().createdAt == existing().createdAt)"
);

fs.writeFileSync('firestore.rules', code);
