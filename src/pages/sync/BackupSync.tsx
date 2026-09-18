import { useState, useRef, ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  Cloud,
  CloudCheck,
  Download,
  Upload,
  ShieldCheck,
  RefreshCw,
  HardDrive,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { downloadBackupFile, importBackupData } from '../../lib/settingsService';
import { syncLocalToCloud } from '../../lib/habitService';
import { syncLocalTasksToCloud } from '../../lib/taskService';
import { syncLocalJournalToCloud } from '../../lib/journalService';
import { syncLocalGoalsToCloud } from '../../lib/goalService';
import { syncLocalRemindersToCloud } from '../../lib/reminderService';
import { trackSyncCompleted } from '../../lib/analyticsService';
import { cn } from '../../lib/utils';

export default function BackupSync() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('Everything is up to date');
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatus('Syncing changes with cloud...');
    if (navigator.vibrate) navigator.vibrate(15);

    try {
      if (user?.uid) {
        await Promise.allSettled([
          syncLocalToCloud(user.uid),
          syncLocalTasksToCloud(user.uid),
          syncLocalJournalToCloud(user.uid),
          syncLocalGoalsToCloud(user.uid),
          syncLocalRemindersToCloud(user.uid),
        ]);
        trackSyncCompleted();
      }
      setSyncStatus('Cloud sync completed just now');
      localStorage.setItem('lastSyncTime', Date.now().toString());
    } catch (err) {
      console.warn('Sync failed:', err);
      setSyncStatus('Sync completed with local cache');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = importBackupData(content);
        if (result.success) {
          setImportMessage({ type: 'success', text: 'Backup data restored successfully! Reloading view...' });
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          setImportMessage({ type: 'error', text: result.error || 'Failed to import backup.' });
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-white/10 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/more')}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Backup & Sync</h1>
            <p className="text-xs text-[#7d8495]">Data resilience & portability</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto w-full px-5 pt-4 space-y-4">
        {/* Cloud Sync Status Card */}
        <div className="p-5 rounded-3xl bg-surface-card border border-white/5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-accent-primary/15 border border-accent-primary/30 flex items-center justify-center text-accent-primary">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Cloud Synchronization</h3>
                <p className="text-xs text-[#7d8495]">{syncStatus}</p>
              </div>
            </div>

            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-all cursor-pointer disabled:opacity-50"
              title="Sync Now"
            >
              <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin text-accent-primary')} />
            </button>
          </div>

          <div className="p-3 rounded-2xl bg-black/30 border border-white/5 flex items-center justify-between text-xs">
            <span className="text-[#7d8495]">Account State:</span>
            <span className="font-semibold text-white">
              {user ? user.email || 'Authenticated User' : 'Local Storage Mode'}
            </span>
          </div>
        </div>

        {/* Data Portability (Export & Import) */}
        <div className="p-5 rounded-3xl bg-surface-card border border-white/5 space-y-3.5">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-accent-primary" />
            <h3 className="text-sm font-bold text-white">Data Portability</h3>
          </div>
          <p className="text-xs text-[#7d8495] leading-relaxed">
            Own your habit history. Export your entire STREAK archive as a clean JSON file, or restore it on any device.
          </p>

          {importMessage && (
            <div
              className={cn(
                'p-3 rounded-2xl text-xs flex items-center gap-2',
                importMessage.type === 'success'
                  ? 'bg-accent-primary/15 border border-accent-primary/30 text-accent-primary'
                  : 'bg-red-500/15 border border-red-500/30 text-red-400'
              )}
            >
              {importMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{importMessage.text}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={downloadBackupFile}
              className="py-3 px-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-accent-primary" />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-3 px-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4 text-blue-400" />
              <span>Restore Backup</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Offline-First Privacy Guarantee */}
        <div className="p-4 rounded-3xl bg-surface-card border border-white/5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-white">Offline-First by Design</h4>
            <p className="text-[11px] text-[#7d8495] leading-relaxed">
              STREAK operates completely offline. Your logs and habits reside securely in your browser cache and synchronize seamlessly to the cloud when connected.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
