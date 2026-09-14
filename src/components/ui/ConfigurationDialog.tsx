import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Copy, Check, Eye, EyeOff, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getSystemConfiguration, updateAiConfiguration, ConfigStatus } from '../../lib/configService';
import { cn } from '../../lib/utils';

interface ConfigurationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigApplied?: () => void;
}

export default function ConfigurationDialog({ isOpen, onClose, onConfigApplied }: ConfigurationDialogProps) {
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [geminiKey, setGeminiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setLoading(true);
    const status = await getSystemConfiguration();
    setConfig(status);
    setLoading(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText('GEMINI_API_KEY');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleApply = async () => {
    if (!geminiKey.trim()) return;
    
    setApplying(true);
    const success = await updateAiConfiguration(geminiKey.trim());
    if (success) {
      setApplySuccess(true);
      await loadConfig();
      if (onConfigApplied) {
        onConfigApplied();
      }
      setTimeout(() => {
        setApplySuccess(false);
        setGeminiKey('');
      }, 2000);
    }
    setApplying(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-[#14161e] border border-[#232938] rounded-2xl p-6 shadow-2xl z-10 overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#7d8495]" />
              STREAK Configuration
            </h2>
            <button
              onClick={onClose}
              className="text-[#7d8495] hover:text-white transition-colors"
            >
              &times;
            </button>
          </div>
          
          <p className="text-sm text-[#7d8495] mb-6">
            Configure the services required by your app.
          </p>

          {loading ? (
            <div className="py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
              
              {/* AI Coach Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Coach</h3>
                  <div className="flex-1 h-px bg-[#232938] ml-4"></div>
                </div>

                <div className="bg-[#0b0c10] border border-[#232938] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-white font-semibold">Gemini AI</span>
                    {config?.isAiConfigured ? (
                      <span className="text-xs font-medium text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Connected
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-full">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Configuration Required
                      </span>
                    )}
                  </div>

                  {!config?.isAiConfigured && (
                    <div className="space-y-4">
                      <p className="text-xs text-[#7d8495]">
                        Used by STREAK AI Coach to communicate with the AI service. Get this from your Gemini API configuration.
                      </p>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[#7d8495]">Variable (Required • Secret)</label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-[#14161e] border border-[#232938] rounded-lg px-3 py-2.5 text-sm text-white font-mono">
                            GEMINI_API_KEY
                          </code>
                          <button
                            onClick={handleCopy}
                            className="p-2.5 bg-[#14161e] border border-[#232938] rounded-lg text-[#7d8495] hover:text-white transition-colors"
                            title="Copy variable name"
                          >
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[#7d8495]">Value</label>
                        <div className="relative">
                          <input
                            type={showKey ? 'text' : 'password'}
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            placeholder="Enter your API key"
                            className="w-full bg-[#14161e] border border-[#232938] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4b5563] focus:outline-none focus:border-indigo-500 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7d8495] hover:text-white"
                          >
                            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={handleApply}
                        disabled={!geminiKey.trim() || applying}
                        className="w-full py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:bg-[#232938] disabled:text-[#7d8495] text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 mt-2"
                      >
                        {applying ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          'Apply Configuration'
                        )}
                      </button>

                      <AnimatePresence>
                        {applySuccess && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-xs text-emerald-400 flex items-center justify-center gap-1 mt-2"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Configuration saved successfully
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </section>

              {/* Firebase Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Firebase</h3>
                  <div className="flex-1 h-px bg-[#232938] ml-4"></div>
                </div>

                <div className="bg-[#0b0c10] border border-[#232938] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-white font-semibold">Firebase configuration</span>
                      <span className="text-xs text-[#7d8495]">Provides Auth and Firestore</span>
                    </div>
                    {config?.isFirebaseConfigured ? (
                      <span className="text-xs font-medium text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Connected
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-full">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Missing Configuration
                      </span>
                    )}
                  </div>
                </div>
              </section>

            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
