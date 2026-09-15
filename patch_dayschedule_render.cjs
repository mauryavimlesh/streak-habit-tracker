const fs = require('fs');
let code = fs.readFileSync('src/components/calendar/DaySchedule.tsx', 'utf8');

code = code.replace(
  "  const filteredTasks = tasks.filter((t) => {",
  `  const selectedDateStr = selectedDate.toLocaleDateString('en-CA');
  
  // Aggregate all events for the selected date
  const dayLogs = logs.filter(l => l.date === selectedDateStr && l.status === 'completed');
  const dayActivities = activities.filter(a => a.date === selectedDateStr);
  const dayJournals = journals.filter(j => j.date === selectedDateStr);
  
  const filteredTasks = tasks.filter((t) => {`
);

code = code.replace(
  "{/* Task Cards List */}",
  `{/* Task Cards List & Other Events */}
        {dayLogs.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-xs font-bold text-[#7d8495] uppercase tracking-wider">Completed Habits</h4>
            {dayLogs.map(log => {
              const habit = habits.find(h => h.id === log.habitId);
              return (
                <div key={log.id} className="p-3 rounded-2xl bg-surface-card border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary"><CheckCircle2 className="w-4 h-4" /></div>
                    <span className="text-sm font-semibold text-white">{habit?.name || 'Habit'}</span>
                  </div>
                  <span className="text-xs text-[#7d8495]">Done</span>
                </div>
              );
            })}
          </div>
        )}
        
        {dayActivities.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-xs font-bold text-[#7d8495] uppercase tracking-wider">Focus Sessions</h4>
            {dayActivities.map(act => (
              <div key={act.id} className="p-3 rounded-2xl bg-surface-card border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400"><Clock className="w-4 h-4" /></div>
                  <span className="text-sm font-semibold text-white">{act.name}</span>
                </div>
                <span className="text-xs font-semibold text-blue-400">{act.durationMinutes}m {act.durationSeconds}s</span>
              </div>
            ))}
          </div>
        )}
        
        {dayJournals.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-xs font-bold text-[#7d8495] uppercase tracking-wider">Journal Entries</h4>
            {dayJournals.map(j => (
              <div key={j.id} className="p-3 rounded-2xl bg-surface-card border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400"><Book className="w-4 h-4" /></div>
                  <span className="text-sm font-semibold text-white line-clamp-1 flex-1">{j.content}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {filteredTasks.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-xs font-bold text-[#7d8495] uppercase tracking-wider">Tasks</h4>
`
);

fs.writeFileSync('src/components/calendar/DaySchedule.tsx', code);
