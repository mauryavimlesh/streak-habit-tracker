const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

const target = `                <span
                  className={cn(
                    'text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0',
                    task.completed
                      ? 'bg-white/5 text-white/40'
                      : task.priority === 'high'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-[#1a1d25] text-[#9ca2b2] border border-[#262b36]'
                  )}
                >
                  {task.completed ? 'Done' : task.type || 'Task'}
                </span>
              </div>
              </div>`;

const replacement = `                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      'text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0',
                      task.completed
                        ? 'bg-white/5 text-white/40'
                        : task.priority === 'high'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-[#1a1d25] text-[#9ca2b2] border border-[#262b36]'
                    )}
                  >
                    {task.completed ? 'Done' : task.type || 'Task'}
                  </span>
                  
                  {/* Internal Edit/Delete Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate('/calendar'); }}
                      className="p-1.5 rounded-full hover:bg-white/10 text-[#7d8495] hover:text-white transition-colors"
                      title="Edit Task"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeletingTask(task); }}
                      className="p-1.5 rounded-full hover:bg-red-500/10 text-[#7d8495] hover:text-red-400 transition-colors"
                      title="Delete Task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              </div>`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/pages/Home.tsx', code);
  console.log("Success");
} else {
  console.log("Target string not found, wait let me try regex...");
}
