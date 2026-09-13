import fs from 'fs';
let code = fs.readFileSync('firestore.rules', 'utf8');

// For habit_logs, goals, journal_logs, tasks, habits
const removeCreatedAt = (str) => {
  return str.replace(/&& incoming\(\)\.createdAt == request\.time/g, '')
            .replace(/&& incoming\(\)\.createdAt == existing\(\)\.createdAt/g, '');
};

code = removeCreatedAt(code);
fs.writeFileSync('firestore.rules', code);
