import fs from 'fs';
let code = fs.readFileSync('src/pages/sync/BackupSync.tsx', 'utf8');

code = code.replace(
  "import { downloadBackupFile, importBackupData } from '../../lib/settingsService';",
  "import { downloadBackupFile, importBackupData } from '../../lib/settingsService';\nimport { syncLocalToCloud } from '../../lib/habitService';"
);

const search = `  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatus('Syncing changes with cloud...');
    if (navigator.vibrate) navigator.vibrate(15);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncStatus('Cloud sync completed just now');
      localStorage.setItem('lastSyncTime', Date.now().toString());
    }, 1200);
  };`;

const replace = `  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatus('Syncing changes with cloud...');
    if (navigator.vibrate) navigator.vibrate(15);
    
    try {
      if (user && !user.isAnonymous) {
        await syncLocalToCloud(user.uid);
      }
      setTimeout(() => {
        setIsSyncing(false);
        setSyncStatus('Cloud sync completed just now');
        localStorage.setItem('lastSyncTime', Date.now().toString());
      }, 500);
    } catch (e) {
      setIsSyncing(false);
      setSyncStatus('Sync failed. Please try again.');
    }
  };`;

code = code.replace(search, replace);
fs.writeFileSync('src/pages/sync/BackupSync.tsx', code);
