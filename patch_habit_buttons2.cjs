const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

// Habits
code = code.replace(
  /                  \{\/\* Right Action Stepper \/ Completion Button \*\/\}/g,
  `                  {/* Internal Edit/Delete Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mr-1 shrink-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate(\`/habits/new?edit=\${habit.id}\`); }}
                      className="p-2 rounded-full hover:bg-white/10 text-[#7d8495] hover:text-white transition-colors"
                      title="Edit Habit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeletingHabit(habit); }}
                      className="p-2 rounded-full hover:bg-red-500/10 text-[#7d8495] hover:text-red-400 transition-colors"
                      title="Delete Habit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  {/* Right Action Stepper / Completion Button */}`
);

code = code.replace(
  `                <div className="flex justify-end gap-2 px-4 pb-1">
                  <button 
                    onClick={() => navigate(\`/habits/new?edit=\${habit.id}\`)}
                    className="p-1 rounded-lg hover:bg-white/10 text-[#7d8495] hover:text-white transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setDeletingHabit(habit)}
                    className="p-1 rounded-lg hover:bg-red-500/10 text-[#7d8495] hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>`,
  ``
);

fs.writeFileSync('src/pages/Home.tsx', code);
