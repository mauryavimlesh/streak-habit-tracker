const fs = require('fs');
let code = fs.readFileSync('src/pages/activity/Activity.tsx', 'utf8');

code = code.replace(
  `const handleSaveOnly = async () => {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    await saveActivity({
      userId: user?.uid || 'local',
      name: state.activityName,
      durationMinutes: Math.floor(totalSeconds / 60),
      durationSeconds: totalSeconds % 60,
      date: new Date().toLocaleDateString('en-CA'),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }, user?.uid);`,
  `const handleSaveOnly = async () => {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const endTime = new Date();
    const startTime = state.startedAt ? new Date(state.startedAt) : new Date(endTime.getTime() - elapsedMs);
    
    await saveActivity({
      userId: user?.uid || 'local',
      name: state.activityName,
      durationMinutes: Math.floor(totalSeconds / 60),
      durationSeconds: totalSeconds % 60,
      date: new Date().toLocaleDateString('en-CA'),
      time: endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    }, user?.uid);`
);

code = code.replace(
  `await saveActivity({
      userId: user?.uid || 'local',
      name: state.activityName,
      durationMinutes: Math.floor(totalSeconds / 60),
      durationSeconds: totalSeconds % 60,
      date: today,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      linkedHabitId: matchingHabit.id
    }, user?.uid);`,
  `const endTime = new Date();
    const startTime = state.startedAt ? new Date(state.startedAt) : new Date(endTime.getTime() - elapsedMs);
    
    await saveActivity({
      userId: user?.uid || 'local',
      name: state.activityName,
      durationMinutes: Math.floor(totalSeconds / 60),
      durationSeconds: totalSeconds % 60,
      date: today,
      time: endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      linkedHabitId: matchingHabit.id
    }, user?.uid);`
);

fs.writeFileSync('src/pages/activity/Activity.tsx', code);
