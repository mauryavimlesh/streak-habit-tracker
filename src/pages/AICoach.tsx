import { useState, useEffect, useRef, useMemo } from 'react';
import {  ChevronLeft,
  Sparkles,
  Send,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Bot,
  User as UserIcon,
  Flame,
  Check,
  Bug,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { useAuth } from '../lib/AuthContext';
import { Habit, getUserHabits, readLocalHabits } from '../lib/habitService';
import {
  ChatMessage,
  CoachContext,
  HabitSummary,
  sendCoachMessage,
} from '../lib/aiCoachService';
import { getSystemConfiguration, ConfigStatus } from '../lib/configService';
import { 
  trackAICoachMessageSent, 
  trackAICoachResponseReceived, 
  trackAICoachError, 
  trackAICoachRetry 
} from '../lib/analyticsService';
import ConfigurationDialog from '../components/ui/ConfigurationDialog';

const SUGGESTED_PROMPTS = [
  '⚡ How do I build consistency?',
  '🎯 Review my active habits',
  '🌅 Help me build a morning routine',
  '🔄 I broke a streak, how do I reset?',
  '🧠 How do I beat procrastination?',
];

export default function AICoach() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const userName = useMemo(() => {
    return profile?.displayName || profile?.name || user?.displayName || 'there';
  }, [profile, user]);

  const chatStorageKey = useMemo(() => {
    return user?.uid ? `streak_ai_coach_messages_${user.uid}` : 'streak_ai_coach_messages_guest';
  }, [user?.uid]);

  // Load chat history or initial welcome
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const initialKey = user?.uid ? `streak_ai_coach_messages_${user.uid}` : 'streak_ai_coach_messages_guest';
    try {
      const saved = localStorage.getItem(initialKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved chat history:', e);
    }
    return [
      {
        id: 'initial-welcome',
        role: 'ai',
        text: `Hey ${userName}! 👋 I'm your STREAK AI Coach.\n\nI'm here to help you build momentum through small, consistent actions every day. What habit or routine are we working on today?`,
        timestamp: Date.now(),
      },
    ];
  });

  // Reload messages if user changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(chatStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load user-isolated chat:', e);
    }
    setMessages([
      {
        id: 'initial-welcome',
        role: 'ai',
        text: `Hey ${userName}! 👋 I'm your STREAK AI Coach.\n\nI'm here to help you build momentum through small, consistent actions every day. What habit or routine are we working on today?`,
        timestamp: Date.now(),
      },
    ]);
  }, [chatStorageKey, userName]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState<{ message: string; failedPrompt?: string } | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [isRunningDiag, setIsRunningDiag] = useState(false);

  const addLog = (msg: string) => {
    setDebugLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const runDiagnostics = async () => {
    setIsRunningDiag(true);
    setDebugLogs([]);
    addLog('Starting AI Coach Diagnostics...');
    
    try {
      addLog('GET /api/ai-status');
      const statusRes = await fetch('/api/ai-status', { headers: { 'Accept': 'application/json' }});
      addLog(`Status code: ${statusRes.status}`);
      const statusText = await statusRes.text();
      addLog(`Raw response: ${statusText}`);
      
      addLog('POST /api/ai-coach (Test ping)');
      const coachRes = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'ping' })
      });
      addLog(`Status code: ${coachRes.status}`);
      const coachText = await coachRes.text();
      addLog(`Raw response: ${coachText.substring(0, 200)}${coachText.length > 200 ? '...' : ''}`);
      
      addLog('Diagnostics complete.');
    } catch (err: any) {
      addLog(`NETWORK ERROR: ${err.message || 'Unknown error'}`);
    } finally {
      setIsRunningDiag(false);
    }
  };


  const isSendingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save conversation locally
  useEffect(() => {
    try {
      localStorage.setItem(chatStorageKey, JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed saving messages to localStorage:', e);
    }
  }, [messages, chatStorageKey]);

  const loadConfigStatus = async () => {
    const status = await getSystemConfiguration();
    setConfigStatus(status);
  };

  // Check backend AI availability status
  useEffect(() => {
    let mounted = true;
    if (mounted) {
      loadConfigStatus();
    }
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch habits to feed context to coach
  useEffect(() => {
    let mounted = true;
    async function loadHabits() {
      try {
        let loaded: Habit[] = [];
        if (user?.uid) {
          loaded = await getUserHabits(user.uid);
        }
        if (!loaded || loaded.length === 0) {
          loaded = readLocalHabits();
        }
        if (mounted) {
          setHabits(loaded);
        }
      } catch {
        if (mounted) {
          setHabits(readLocalHabits());
        }
      }
    }
    loadHabits();
    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  // Construct coach context
  const coachContext: CoachContext = useMemo(() => {
    const habitSummaries: HabitSummary[] = (habits || []).map((h) => ({
      id: h.id,
      title: h.title || h.name || 'Habit',
      category: h.category || 'General',
      frequency: h.frequency || 'daily',
      streak: h.streak || 0,
    }));
    const totalStreaks = habitSummaries.reduce((sum, h) => sum + (h.streak || 0), 0);

    return {
      userName,
      habits: habitSummaries,
      activeHabitCount: habitSummaries.length,
      totalStreaks,
    };
  }, [userName, habits]);

  // Auto-scroll when messages change or loading state toggles
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, errorState]);

  // Send message handler
  const handleSendMessage = async (promptToSend?: string, isRetry: boolean = false) => {
    const textToSend = promptToSend || input.trim();
    if (!textToSend || loading || isSendingRef.current) return;

    if (configStatus?.status === 'SERVER ERROR') {
      setErrorState({
        message: 'Coach temporarily unavailable. Please try again later.',
        failedPrompt: textToSend,
      });
      return;
    }

    if (configStatus?.status === 'CONFIGURATION REQUIRED') {
      setErrorState({
        message: 'AI Coach is not configured correctly.',
        failedPrompt: textToSend,
      });
      return;
    }

    isSendingRef.current = true;
    setErrorState(null);
    setInput('');

    let updatedMessages = [...messages];
    
    // Only append user message if it's not a retry
    if (!isRetry) {
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        role: 'user',
        text: textToSend,
        timestamp: Date.now(),
      };
      updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
    }
    
    setLoading(true);
    trackAICoachMessageSent();

    try {
      const reply = await sendCoachMessage(textToSend, updatedMessages, coachContext);

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        role: 'ai',
        text: reply,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      trackAICoachResponseReceived('success');
    } catch (err: any) {
      console.error('AICoach Error:', err);
      const errorMsg = err.message || 'Unable to get a response. Please try again.';
      setErrorState({
        message: errorMsg,
        failedPrompt: textToSend,
      });
      trackAICoachError(errorMsg);
    } finally {
      setLoading(false);
      isSendingRef.current = false;
    }
  };

  // Retry failed prompt
  const handleRetry = () => {
    if (!errorState?.failedPrompt) return;
    trackAICoachRetry();
    const prompt = errorState.failedPrompt;
    setErrorState(null);
    handleSendMessage(prompt, true);
  };

  // Clear chat history
  const handleClearChat = () => {
    if (messages.length <= 1) return;
    const resetGreeting: ChatMessage = {
      id: `initial-${Date.now()}`,
      role: 'ai',
      text: `Chat reset. Ready whenever you are, ${userName}! What would you like to explore?`,
      timestamp: Date.now(),
    };
    setMessages([resetGreeting]);
    setErrorState(null);
    localStorage.removeItem(chatStorageKey);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Safe formatting helper for AI messages (bold, bullet points, numbered items)
  const renderFormattedText = (text: string) => {
    const paragraphs = text.split('\n\n');

    return (
      <div className="space-y-2.5 text-sm leading-relaxed text-[#e4e7ec]">
        {paragraphs.map((para, pIdx) => {
          const lines = para.split('\n');

          // Check if paragraph is a list of bullets
          const isBulletList = lines.every((l) => l.trim().startsWith('* ') || l.trim().startsWith('- '));
          if (isBulletList) {
            return (
              <ul key={pIdx} className="space-y-1.5 my-1 pl-1">
                {lines.map((line, lIdx) => {
                  const itemContent = line.replace(/^[\*\-]\s+/, '');
                  return (
                    <li key={lIdx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-primary mt-2 shrink-0" />
                      <span>{renderInlineFormatting(itemContent)}</span>
                    </li>
                  );
                })}
              </ul>
            );
          }

          // Regular paragraph with potential soft line breaks
          return (
            <p key={pIdx} className="whitespace-pre-wrap">
              {lines.map((line, lIdx) => (
                <span key={lIdx}>
                  {renderInlineFormatting(line)}
                  {lIdx < lines.length - 1 && <br />}
                </span>
              ))}
            </p>
          );
        })}
      </div>
    );
  };

  // Helper to render bold markdown (**bold**)
  const renderInlineFormatting = (content: string) => {
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-screen bg-background text-white max-w-lg mx-auto select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-[#1f232c] bg-background/95 backdrop-blur-md sticky top-0 z-10">
        
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

      </header>

      
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

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}
          >
            <div
              className={`p-4 max-w-[88%] rounded-2xl shadow-sm text-sm relative group ${
                msg.role === 'user'
                  ? 'bg-[#23381c] border border-[#345228] text-white rounded-br-xs'
                  : 'bg-surface-card border border-[#1f232c] text-[#e4e7ec] rounded-bl-xs'
              }`}
            >
              {msg.role === 'ai' && (
                <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[#1f232c]">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[#a78bfa]">
                    <Bot className="w-3.5 h-3.5" />
                    <span>STREAK Coach</span>
                  </div>
                  <button
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="text-[11px] text-[#7d8495] hover:text-white transition-colors cursor-pointer"
                    title="Copy message"
                  >
                    {copiedId === msg.id ? (
                      <span className="flex items-center gap-0.5 text-accent-primary">
                        <Check className="w-3 h-3" /> Copied
                      </span>
                    ) : (
                      'Copy'
                    )}
                  </button>
                </div>
              )}

              {msg.role === 'ai' ? (
                renderFormattedText(msg.text)
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              )}
            </div>

            <span className="text-[10px] text-[#7d8495] px-1">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {/* Loading Indicator State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-start space-y-1"
          >
            <div className="p-4 bg-surface-card border border-[#1f232c] rounded-2xl rounded-bl-xs">
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[#1f232c]/50">
                <Bot className="w-3.5 h-3.5 text-[#a78bfa] animate-pulse" />
                <span className="text-xs font-medium text-[#a78bfa]">STREAK Coach is thinking</span>
                <span className="flex items-center">
                  <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, times: [0, 0.5, 1] }} className="text-[#a78bfa]">.</motion.span>
                  <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2, times: [0, 0.5, 1] }} className="text-[#a78bfa]">.</motion.span>
                  <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4, times: [0, 0.5, 1] }} className="text-[#a78bfa]">.</motion.span>
                </span>
              </div>
              <div className="flex space-x-1.5 py-1">
                <motion.div
                  className="w-2 h-2 rounded-full bg-[#a78bfa]"
                  animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut" }}
                />
                <motion.div
                  className="w-2 h-2 rounded-full bg-[#a78bfa]"
                  animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut", delay: 0.15 }}
                />
                <motion.div
                  className="w-2 h-2 rounded-full bg-[#a78bfa]"
                  animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut", delay: 0.3 }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Error State Card */}
        {errorState && (
          <div className="p-4 bg-[#2a1717] border border-[#522525] rounded-2xl flex flex-col gap-3 shadow-md">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-300">Coach Temporarily Unavailable</h3>
                <p className="text-xs text-red-200/80 mt-0.5 leading-relaxed">{errorState.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-[#522525]/60">
              {errorState.failedPrompt && (
                <button
                  id="ai-coach-retry-btn"
                  onClick={handleRetry}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 border border-red-800 text-xs text-red-200 font-medium transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Try Again
                </button>
              )}
              <button
                onClick={() => setErrorState(null)}
                className="px-3 py-1.5 text-xs text-[#7d8495] hover:text-white transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-4 py-2 border-t border-[#1f232c]/70 bg-background/50 overflow-x-auto no-scrollbar flex gap-2">
        {SUGGESTED_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            disabled={loading}
            onClick={() => handleSendMessage(prompt)}
            className="whitespace-nowrap px-3 py-1.5 rounded-full bg-surface-card border border-[#1f232c] hover:border-accent-primary/40 hover:bg-white/5 text-xs text-[#b0b7c3] hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] border-t border-[#1f232c] bg-background">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center"
        >
          <input
            ref={inputRef}
            id="ai-coach-input"
            type="text"
            value={input}
            disabled={loading}
            onChange={(e) => setInput(e.target.value)}
            placeholder={loading ? 'Coach is typing...' : 'Ask about your habits, routines, or mindset...'}
            className="w-full bg-surface-card border border-[#1f232c] rounded-2xl pl-5 pr-12 py-3.5 outline-none focus:border-accent-primary/50 transition-colors text-sm text-white placeholder-[#7d8495] disabled:opacity-60"
          />
          <button
            id="ai-coach-send-btn"
            type="submit"
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="absolute right-2 w-9 h-9 flex items-center justify-center rounded-xl bg-accent-primary text-black disabled:opacity-40 transition-opacity hover:opacity-90 cursor-pointer"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
      
      {/* Configuration Modal */}
      <ConfigurationDialog 
        isOpen={showConfig} 
        onClose={() => setShowConfig(false)}
        onConfigApplied={loadConfigStatus} 
      />
    </div>
  );
}
