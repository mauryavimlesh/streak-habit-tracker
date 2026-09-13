import fs from 'fs';
let rules = fs.readFileSync('firestore.rules', 'utf8');

rules = rules.replace(/isSignedInRelaxed\(\)/g, 'request.auth != null');
rules = rules.replace(
`    function isSignedInRelaxed() {
      // Allow if standard auth token exists or if a guest token is provided
      // WARNING: In production, rely only on request.auth != null
      return request.auth != null || (request.resource.data != null && request.resource.data.userId == 'local');
    }`, '');

const reminderRules = `
    function isValidReminder(data) {
      return data.keys().hasAll(['userId', 'title', 'time', 'repeat', 'enabled', 'notificationEnabled', 'category', 'createdAt'])
        && data.userId == request.auth.uid
        && data.title is string && data.title.size() > 0 && data.title.size() <= 200
        && data.time is string
        && data.repeat is string
        && data.enabled is bool
        && data.notificationEnabled is bool
        && data.category is string;
    }

    // Reminders
    match /reminders/{reminderId} {
      allow get: if request.auth != null && existing().userId == request.auth.uid;
      allow list: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null
        && isValidId(reminderId)
        && isValidReminder(incoming())
        && incoming().createdAt == request.time;
      allow update: if request.auth != null
        && existing().userId == request.auth.uid
        && isValidReminder(incoming())
        && incoming().userId == existing().userId;
      allow delete: if request.auth != null && existing().userId == request.auth.uid;
    }
`;

rules = rules.replace('    // Tasks', reminderRules + '\n    // Tasks');
fs.writeFileSync('firestore.rules', rules);
