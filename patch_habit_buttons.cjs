const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

// For Habits
code = code.replace(
  `                      </p>
                    </div>
                  </div>
                  {/* Right Action Stepper / Completion Button */}`,
  `                      </p>
                    </div>
                  </div>
                  
                  {/* Internal Edit/Delete Actions */}
                  <div className="flex items-center gap-1 mr-3 shrink-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate(\`/habits/new?edit=\${habit.id}\`); }}
                      className="p-2 rounded-full hover:bg-white/10 text-[#7d8495] hover:text-white transition-colors"
                      title="Edit Habit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDeletingHabit(habit); }}
                      className="p-2 rounded-full hover:bg-red-500/10 text-[#7d8495] hover:text-red-400 transition-colors"
                      title="Delete Habit"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Right Action Stepper / Completion Button */}`
);

// Remove the old below-card habit buttons
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

// For Tasks
code = code.replace(
  `                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",`,
  `                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",`
);

code = code.replace(
  `                      </span>
                    </div>
                  </div>
                  {task.time && (`,
  `                      </span>
                    </div>
                  </div>
                  
                  {/* Internal Edit/Delete Actions */}
                  <div className="flex items-center gap-1 shrink-0 ml-4">
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
                
                {task.time && (`
);

code = code.replace(
  `              <div className="flex justify-end gap-2 px-4 pb-1">
                <button 
                  onClick={() => navigate('/calendar')}
                  className="p-1 rounded-lg hover:bg-white/10 text-[#7d8495] hover:text-white transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setDeletingTask(task)}
                  className="p-1 rounded-lg hover:bg-red-500/10 text-[#7d8495] hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>`,
  ``
);

fs.writeFileSync('src/pages/Home.tsx', code);
