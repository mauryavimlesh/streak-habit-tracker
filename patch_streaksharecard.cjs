const fs = require('fs');
let code = fs.readFileSync('src/components/ui/StreakShareCard.tsx', 'utf8');

code = code.replace(
  "export interface StreakShareCardProps {",
  `export interface StreakShareCardProps {
  studyHours?: number;
  studyMinutes?: number;
  completedTasks?: number;
  totalTasks?: number;
  completedGoals?: number;
  activeGoals?: number;`
);

code = code.replace(
  "  goalTitle,",
  `  goalTitle,
  studyHours = 0,
  studyMinutes = 0,
  completedTasks = 0,
  totalTasks = 0,
  completedGoals = 0,
  activeGoals = 0,`
);

code = code.replace(
  "import { Flame, CheckCircle2, Award } from 'lucide-react';",
  "import { Flame, CheckCircle2, Award, Clock, Target, Calendar } from 'lucide-react';"
);

code = code.replace(
  "          <div className=\"bg-white/5 border border-white/10 rounded-2xl p-3 flex justify-around mt-auto backdrop-blur-md\">",
  `          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col gap-3 mt-auto backdrop-blur-md">
            <div className="flex justify-around">`
);

code = code.replace(
  "          </div>\n        )}",
  `            </div>
            {/* New Stats Row */}
            <div className="flex justify-around pt-2 border-t border-white/10">
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-[#7d8495] uppercase font-bold tracking-wider mb-1">Focus Time</span>
                <span className="text-white font-bold text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-400" />
                  {studyHours}h {studyMinutes}m
                </span>
              </div>
              <div className="w-[1px] bg-white/10"></div>
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-[#7d8495] uppercase font-bold tracking-wider mb-1">Tasks Done</span>
                <span className="text-white font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {completedTasks}/{totalTasks}
                </span>
              </div>
              <div className="w-[1px] bg-white/10"></div>
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-[#7d8495] uppercase font-bold tracking-wider mb-1">Goals</span>
                <span className="text-white font-bold text-xs flex items-center gap-1">
                  <Target className="w-3 h-3 text-purple-400" />
                  {completedGoals} / {activeGoals + completedGoals}
                </span>
              </div>
            </div>
          </div>
        )}`
);


fs.writeFileSync('src/components/ui/StreakShareCard.tsx', code);
