const fs = require('fs');
let code = fs.readFileSync('src/components/calendar/DaySchedule.tsx', 'utf8');

const targetStr = `        {filteredTasks.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-xs font-bold text-[#7d8495] uppercase tracking-wider">Tasks</h4>
        {filteredTasks.length > 0 ? (`;

const replaceStr = `        {filteredTasks.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-xs font-bold text-[#7d8495] uppercase tracking-wider">Tasks</h4>
            <div className="space-y-2.5">
              <AnimatePresence mode="popLayout">
                {filteredTasks.map((task) => (
                  <TaskItemCard
                    key={task.id}
                    task={task}
                    onToggle={onToggleTask}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
        
        {filteredTasks.length === 0 && dayLogs.length === 0 && dayActivities.length === 0 && dayJournals.length === 0 && (
          /* Empty State for the Day */
          <div className="py-8 px-4 rounded-[24px] bg-[#12141c] border border-dashed border-[#242a38] text-center">
            <div className="w-12 h-12 rounded-full bg-[#1b202c] border border-[#2b3345] flex items-center justify-center text-[#7d8495] mx-auto mb-3">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-white">No items for this date</h4>
            <p className="text-xs text-[#7d8495] mt-1 max-w-xs mx-auto">
              Keep your momentum going by scheduling a task, workout, or meeting for today.
            </p>
            <button
              type="button"
              onClick={() => onOpenAddModal('task')}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-primary hover:bg-[#9eff38] active:scale-95 text-background font-bold text-xs shadow-[0_4px_16px_rgba(140,238,40,0.25)] transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add Task</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}`;

// need to replace from targetStr to the end of the file.
// Since the file has some mess at the end, let's just slice it.
const idx = code.indexOf('        {filteredTasks.length > 0 && (\n          <div className="space-y-2 mb-4">');
if (idx !== -1) {
  code = code.substring(0, idx) + replaceStr;
  fs.writeFileSync('src/components/calendar/DaySchedule.tsx', code);
}
