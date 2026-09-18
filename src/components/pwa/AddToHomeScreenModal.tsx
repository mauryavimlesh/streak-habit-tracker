import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share2, PlusSquare, Download, Smartphone, Check, ArrowRight } from 'lucide-react';
import { usePWAInstall } from '../../lib/pwa/usePWAInstall';

interface AddToHomeScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddToHomeScreenModal: React.FC<AddToHomeScreenModalProps> = ({ isOpen, onClose }) => {
  const { hasNativePrompt, isInstalled, isIOS, isAndroid, browser, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div 
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md rounded-2xl bg-[#0d0e12] border border-[#232733] p-6 text-white shadow-2xl overflow-hidden cursor-default"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#a5ff36]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3.5 mb-5">
            <div className="relative w-14 h-14 rounded-2xl bg-zinc-900 p-2.5 border border-[#232733] flex items-center justify-center shadow-lg">
              <img
                src="/icon-192.png"
                alt="STREAK App Icon"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-lg font-bold tracking-tight text-white">Install STREAK</h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#a5ff36]/15 text-[#a5ff36] rounded-full border border-[#a5ff36]/30">
                  PWA
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Add to your home screen for fast, offline access
              </p>
            </div>
          </div>

          {isInstalled ? (
            <div className="py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[#a5ff36]/10 border border-[#a5ff36]/30 text-[#a5ff36] flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-white">Already Installed!</h4>
              <p className="text-xs text-zinc-400 mt-1">
                STREAK is already running as a standalone app on your device.
              </p>
              <button
                onClick={onClose}
                className="mt-5 w-full py-2.5 rounded-xl bg-zinc-800 text-white text-xs font-semibold hover:bg-zinc-700 transition"
              >
                Done
              </button>
            </div>
          ) : hasNativePrompt ? (
            /* Android / Chromium with BeforeInstallPrompt */
            <div className="space-y-4">
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 text-xs text-zinc-300 space-y-2">
                <div className="flex items-center gap-2 text-white font-medium">
                  <Smartphone className="w-4 h-4 text-[#a5ff36]" />
                  <span>Native App Experience</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  Enjoy fullscreen tracking, instant background sync, offline habit logging, and zero browser toolbar distraction.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  onClick={handleNativeInstall}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#a5ff36] text-black font-bold text-xs tracking-wide hover:bg-[#b8ff5c] active:scale-[0.98] transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Install App Now</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 text-xs text-zinc-400 hover:text-white transition"
                >
                  Maybe later
                </button>
              </div>
            </div>
          ) : isIOS ? (
            /* iOS Safari Instructions */
            <div className="space-y-4">
              <div className="text-xs text-zinc-300">
                To install on your iPhone or iPad using Safari:
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 bg-zinc-900/80 border border-zinc-800/80 rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 text-[#38bdf8]">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">Step 1</span>
                    <span className="text-xs text-zinc-400">
                      Tap the <strong className="text-white">Share</strong> button in Safari's bottom toolbar.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-zinc-900/80 border border-zinc-800/80 rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 text-[#a5ff36]">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">Step 2</span>
                    <span className="text-xs text-zinc-400">
                      Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-zinc-900/80 border border-zinc-800/80 rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 text-white">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">Step 3</span>
                    <span className="text-xs text-zinc-400">
                      Tap <strong className="text-white">Add</strong> in the top right corner.
                    </span>
                  </div>
                </div>
              </div>

              {browser !== 'safari' && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                  Tip: On iOS, please open this link in <strong>Safari</strong> to enable the Add to Home Screen option.
                </div>
              )}

              <button
                onClick={onClose}
                className="mt-2 w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition"
              >
                Got It
              </button>
            </div>
          ) : isAndroid ? (
            /* Android Fallback Instructions (when beforeinstallprompt hasn't fired or is suppressed) */
            <div className="space-y-4">
              <div className="text-xs text-zinc-300">
                To install on your Android device:
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 bg-zinc-900/80 border border-zinc-800/80 rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 text-[#a5ff36] font-bold text-xs">
                    ⋮
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">Step 1</span>
                    <span className="text-xs text-zinc-400">
                      Tap the <strong className="text-white">three dots menu</strong> (⋮) in the top right of Chrome.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-zinc-900/80 border border-zinc-800/80 rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 text-[#38bdf8]">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">Step 2</span>
                    <span className="text-xs text-zinc-400">
                      Select <strong className="text-white">Install app</strong> or <strong className="text-white">Add to Home screen</strong>.
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="mt-2 w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition"
              >
                Got It
              </button>
            </div>
          ) : (
            /* Desktop Instructions */
            <div className="space-y-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Click the install icon in your browser's address bar (or menu &rarr; Install STREAK) to run STREAK as a standalone desktop app.
              </p>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition"
              >
                Understood
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
