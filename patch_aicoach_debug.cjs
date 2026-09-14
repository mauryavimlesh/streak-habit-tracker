const fs = require('fs');
let code = fs.readFileSync('src/pages/AICoach.tsx', 'utf8');

// Add Bug icon to imports
code = code.replace(
  /Check,\n} from 'lucide-react';/g,
  "Check,\n  Bug,\n} from 'lucide-react';"
);

// Add states and functions
const statesToInject = `
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [isRunningDiag, setIsRunningDiag] = useState(false);

  const addLog = (msg: string) => {
    setDebugLogs(prev => [...prev, \`[\${new Date().toLocaleTimeString()}] \${msg}\`]);
  };

  const runDiagnostics = async () => {
    setIsRunningDiag(true);
    setDebugLogs([]);
    addLog('Starting AI Coach Diagnostics...');
    
    try {
      addLog('GET /api/ai-status');
      const statusRes = await fetch('/api/ai-status', { headers: { 'Accept': 'application/json' }});
      addLog(\`Status code: \${statusRes.status}\`);
      const statusText = await statusRes.text();
      addLog(\`Raw response: \${statusText}\`);
      
      addLog('POST /api/ai-coach (Test ping)');
      const coachRes = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'ping' })
      });
      addLog(\`Status code: \${coachRes.status}\`);
      const coachText = await coachRes.text();
      addLog(\`Raw response: \${coachText.substring(0, 200)}\${coachText.length > 200 ? '...' : ''}\`);
      
      addLog('Diagnostics complete.');
    } catch (err: any) {
      addLog(\`NETWORK ERROR: \${err.message || 'Unknown error'}\`);
    } finally {
      setIsRunningDiag(false);
    }
  };
`;

code = code.replace(
  "const [copiedId, setCopiedId] = useState<string | null>(null);",
  "const [copiedId, setCopiedId] = useState<string | null>(null);\n" + statesToInject
);

// Update header buttons
const headerButtons = `
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDebug(!showDebug)}
            title="Toggle Debug Console"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-card border border-[#1f232c] hover:bg-white/10 text-[#7d8495] hover:text-amber-400 transition-colors cursor-pointer"
            aria-label="Toggle Debug"
          >
            <Bug className="w-4 h-4" />
          </button>
          <button
            id="ai-coach-clear-btn"
            onClick={handleClearChat}
            title="Clear conversation"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-card border border-[#1f232c] hover:bg-white/10 text-[#7d8495] hover:text-white transition-colors cursor-pointer"
            aria-label="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
`;

code = code.replace(
  /<button[\s\S]*?id="ai-coach-clear-btn"[\s\S]*?<\/button>/,
  headerButtons
);

const debugConsole = `
      {/* Debug Console */}
      {showDebug && (
        <div className="bg-black border-b border-[#1f232c] p-4 text-xs font-mono text-green-400 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold">Diagnostic Console</span>
            <button 
              onClick={runDiagnostics}
              disabled={isRunningDiag}
              className="px-2 py-1 bg-green-900/30 border border-green-800 rounded text-green-300 hover:bg-green-900/50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isRunningDiag ? 'Running...' : 'Run Diagnostics'}
            </button>
          </div>
          <div className="space-y-1">
            {debugLogs.length === 0 ? (
              <span className="text-green-800">Click 'Run Diagnostics' to test backend connection...</span>
            ) : (
              debugLogs.map((log, i) => (
                <div key={i} className="break-all">{log}</div>
              ))
            )}
          </div>
        </div>
      )}
`;

code = code.replace(
  "{/* Messages List */}",
  debugConsole + "\n      {/* Messages List */}"
);

fs.writeFileSync('src/pages/AICoach.tsx', code);
