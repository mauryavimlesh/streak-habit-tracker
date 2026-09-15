const fs = require('fs');
let code = fs.readFileSync('src/pages/activity/Activity.tsx', 'utf8');

// Imports
code = code.replace(
  "import { useTimer, TimerMode } from '../../lib/timer/TimerContext';",
  `import { useTimer, TimerMode } from '../../lib/timer/TimerContext';
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';
import { ShareModal } from '../../components/ui/ShareModal';
import { StudySessionShareCard } from '../../components/ui/StudySessionShareCard';
import { Share, X, Maximize2 } from 'lucide-react';`
);

// State hooks
code = code.replace(
  "const [showMatchModal, setShowMatchModal] = useState(false);",
  `const [showMatchModal, setShowMatchModal] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);`
);

// Handlers
code = code.replace(
  "const handleDiscard = () => {\n    resetTimer();\n    navigate(-1);\n  };",
  `const handleDiscard = () => {
    setShowDiscardConfirm(true);
  };
  
  const confirmDiscard = () => {
    resetTimer();
    setShowDiscardConfirm(false);
    navigate(-1);
  };`
);

// JSX completed view
code = code.replace(
  `<button 
          onClick={handleDiscard}
          className="mt-6 text-sm font-semibold text-[#7d8495] hover:text-white transition-colors relative z-10"
        >
          Discard
        </button>`,
  `<div className="flex items-center gap-4 mt-6 relative z-10">
          <button 
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 text-sm font-semibold text-white hover:text-accent-primary transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl"
          >
            <Share className="w-4 h-4" /> Share
          </button>
          <button 
            onClick={handleDiscard}
            className="text-sm font-semibold text-[#7d8495] hover:text-red-400 transition-colors px-4 py-2"
          >
            Discard
          </button>
        </div>`
);

// Modals inside completed view
code = code.replace(
  `</AnimatePresence>
      </div>`,
  `</AnimatePresence>
        
        <DeleteConfirmModal
          isOpen={showDiscardConfirm}
          onClose={() => setShowDiscardConfirm(false)}
          onConfirm={confirmDiscard}
          title="Discard this session"
          itemType="session"
          description="Are you sure you want to discard this session? It will not be saved to your history."
        />
        
        <ShareModal 
          isOpen={showShareModal} 
          onClose={() => setShowShareModal(false)}
          fileName={\`\${state.activityName}-session\`}
        >
          {(format) => (
            <StudySessionShareCard
              durationMinutes={Math.floor(totalSeconds / 60)}
              durationSeconds={totalSeconds % 60}
              activityName={state.activityName}
              userName={user?.displayName || user?.email?.split('@')[0] || 'I'}
              format={format}
            />
          )}
        </ShareModal>
      </div>`
);

// Maximize logic inside running/paused view
code = code.replace(
  `// Running or paused state
  if (state.status === 'running' || state.status === 'paused') {`,
  `// Running or paused state
  if (state.status === 'running' || state.status === 'paused') {`
);

// Change the running view header
code = code.replace(
  `<header className="px-5 py-4 flex items-center justify-between border-b border-white/5 bg-background/95 backdrop-blur-md sticky top-0 z-10">
          <button onClick={handleMinimize} className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors">
            <Minimize2 className="w-6 h-6" />
          </button>
          <span className="font-semibold text-[15px] tracking-wide">Focus Session</span>
          <div className="w-10"></div>
        </header>`,
  `<AnimatePresence>
          {!isMaximized && (
            <motion.header 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-5 py-4 flex items-center justify-between border-b border-white/5 bg-background/95 backdrop-blur-md sticky top-0 z-10"
            >
              <button onClick={handleMinimize} className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors">
                <Minimize2 className="w-6 h-6" />
              </button>
              <span className="font-semibold text-[15px] tracking-wide line-clamp-1 max-w-[150px] text-center">{state.activityName}</span>
              <button onClick={handleDiscard} className="p-2 -mr-2 rounded-full hover:bg-white/5 text-[#7d8495] hover:text-red-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </motion.header>
          )}
        </AnimatePresence>
        
        {isMaximized && (
          <div className="absolute top-6 right-6 z-20 flex gap-2">
            <button onClick={handleDiscard} className="p-3 rounded-full bg-black/20 hover:bg-red-500/20 text-[#7d8495] hover:text-red-400 transition-colors">
              <X className="w-6 h-6" />
            </button>
            <button onClick={() => setIsMaximized(false)} className="p-3 rounded-full bg-black/20 hover:bg-white/10 text-white transition-colors">
              <Minimize2 className="w-6 h-6" />
            </button>
          </div>
        )}
        
        {!isMaximized && (
          <div className="absolute top-20 right-6 z-20 hidden md:block">
            <button onClick={() => setIsMaximized(true)} className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors">
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        )}`
);

// Scale up timer when maximized
code = code.replace(
  `<div className="flex-1 p-6 flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="text-lg font-bold text-[#7d8495] mb-8 uppercase tracking-[0.2em]">{state.activityName}</div>`,
  `<div className={cn("flex-1 p-6 flex flex-col items-center justify-center animate-in fade-in duration-500", isMaximized ? "scale-110 md:scale-150" : "")}>
          {!isMaximized && (
            <div className="text-lg font-bold text-[#7d8495] mb-8 uppercase tracking-[0.2em] text-center max-w-sm truncate">{state.activityName}</div>
          )}
          {isMaximized && (
             <div className="text-xl md:text-2xl font-bold text-white mb-12 uppercase tracking-[0.2em] text-center drop-shadow-md">{state.activityName}</div>
          )}`
);

// Add DeleteConfirmModal to running view
code = code.replace(
  `</div>
      </div>
    );
  }`,
  `</div>
          
          <DeleteConfirmModal
            isOpen={showDiscardConfirm}
            onClose={() => setShowDiscardConfirm(false)}
            onConfirm={confirmDiscard}
            title="Discard this session"
            itemType="session"
            description="Are you sure you want to discard this active session? All progress will be lost."
          />
        </div>
      </div>
    );
  }`
);

fs.writeFileSync('src/pages/activity/Activity.tsx', code);
