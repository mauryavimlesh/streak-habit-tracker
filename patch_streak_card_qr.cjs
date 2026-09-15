const fs = require('fs');

let code = fs.readFileSync('src/components/ui/StreakShareCard.tsx', 'utf8');

const qrHtml = `            </div>
            
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
        )}
        
        {/* Footer with QR and Brand */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <div className="bg-white p-1 rounded-lg">
            <img src="/streakloop_qr.png" alt="STREAK QR Code" className="w-12 h-12 object-contain" crossOrigin="anonymous" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-black tracking-tight text-lg leading-none">STREAK</span>
            <span className="text-[#a1a8b9] text-[10px] font-medium tracking-wide">streakloop.vercel.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}`;

code = code.replace(
  `            </div>
            {/* New Stats Row */}`,
  qrHtml.split(`{/* New Stats Row */}`)[0] + `{/* New Stats Row */}`
);
code = code.replace(
  `            </div>
          </div>
        )}
      </div>
    </div>
  );
}`,
  `            </div>
          </div>
        )}
        
        {/* Footer with QR and Brand */}
        <div className={cn("flex items-center justify-center gap-3", isSquare ? "mt-4" : "mt-5")}>
          <div className="bg-white p-1 rounded-xl shadow-lg">
            <img src="/streakloop_qr.png" alt="STREAK QR Code" className="w-14 h-14 object-contain" crossOrigin="anonymous" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-white font-black tracking-tighter text-xl leading-none mb-0.5">STREAK</span>
            <span className="text-[#a1a8b9] text-[11px] font-semibold tracking-wide">streakloop.vercel.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}`
);

fs.writeFileSync('src/components/ui/StreakShareCard.tsx', code);

// Same for StudySessionShareCard.tsx
let studyCode = fs.readFileSync('src/components/ui/StudySessionShareCard.tsx', 'utf8');

studyCode = studyCode.replace(
  `          </div>
        )}
      </div>
    </div>
  );
}`,
  `          </div>
        )}
        
        {/* Footer with QR and Brand */}
        <div className={cn("flex items-center justify-center gap-3", isSquare ? "mt-4" : "mt-5")}>
          <div className="bg-white p-1 rounded-xl shadow-lg">
            <img src="/streakloop_qr.png" alt="STREAK QR Code" className="w-14 h-14 object-contain" crossOrigin="anonymous" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-white font-black tracking-tighter text-xl leading-none mb-0.5">STREAK</span>
            <span className="text-[#a1a8b9] text-[11px] font-semibold tracking-wide">streakloop.vercel.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}`
);
fs.writeFileSync('src/components/ui/StudySessionShareCard.tsx', studyCode);
