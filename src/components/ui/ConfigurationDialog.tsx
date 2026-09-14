import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getSystemConfiguration, ConfigStatus } from '../../lib/configService';

interface ConfigurationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigApplied?: () => void;
}

export default function ConfigurationDialog({ isOpen, onClose }: ConfigurationDialogProps) {
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);

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
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                        <p className="text-xs text-amber-200 leading-relaxed font-medium">
                          The AI Coach requires server-side configuration. The <code className="bg-black/30 px-1 py-0.5 rounded text-amber-100 font-mono text-[10px]">GEMINI_API_KEY</code> environment variable is missing on the deployment server.
                        </p>
                      </div>
                      <p className="text-xs text-[#7d8495] leading-relaxed">
                        To enable the AI Coach, the application administrator must add their Google Gemini API key to the server secrets. This key is processed securely on the backend and is never exposed to the client.
                      </p>
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
