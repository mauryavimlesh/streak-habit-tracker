import fs from 'fs';
let code = fs.readFileSync('src/components/profile/EditProfileModal.tsx', 'utf8');

const search = `  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md">`;

const replace = `  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md">
          {profile?.isGuest ? (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="w-full max-w-md bg-surface-card border border-[#212633] rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Account Required</h2>
                  <p className="text-sm text-[#7d8495]">Create a free account to customize your profile, name, and photo, and save them permanently across devices.</p>
                </div>
                <button onClick={onClose} className="p-2 rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full py-3.5 rounded-xl font-bold text-black bg-accent-primary hover:bg-accent-primary/90 transition-colors"
                >
                  Create Account / Sign In
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 rounded-xl font-semibold text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Continue as Guest
                </button>
              </div>
            </motion.div>
          ) : (
          {/* Modal / Bottom Sheet */}`;

const searchEnd = `        </div>
      </AnimatePresence>`;

const replaceEnd = `          )}
        </div>
      </AnimatePresence>`;

code = code.replace(search, replace).replace(searchEnd, replaceEnd);
fs.writeFileSync('src/components/profile/EditProfileModal.tsx', code);
