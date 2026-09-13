import fs from 'fs';
let code = fs.readFileSync('src/lib/AuthContext.tsx', 'utf8');

const searchMerge = `            const merged: UserProfile = {
              ...localProfile,
              ...fsData,
              name: resolvedName,`;

const replaceMerge = `            // Clear isGuest flag
            if (localProfile?.isGuest) {
              delete localProfile.isGuest;
            }
            const merged: UserProfile = {
              ...localProfile,
              ...fsData,
              isGuest: false,
              name: resolvedName,`;

code = code.replace(searchMerge, replaceMerge);

const searchInitialName = `            const initialName = localProfile?.name || currentUser.displayName || 'Vimlesh';`;
const replaceInitialName = `            const initialName = (localProfile?.isGuest ? currentUser.displayName : localProfile?.name) || currentUser.displayName || 'Vimlesh';`;

code = code.replace(searchInitialName, replaceInitialName);

const searchSync = `            // Sync local habits to the cloud
            await syncLocalToCloud(currentUser.uid);`;

const replaceSync = `            // Sync local habits to the cloud
            await syncLocalToCloud(currentUser.uid);
            
            // Clear local guest identity if migrating
            if (localProfile?.isGuest) {
              try {
                localStorage.removeItem('streak_tasks');
                localStorage.removeItem('streak_habits');
                localStorage.removeItem('streak_habit_logs');
                localStorage.removeItem('streak_journal');
              } catch (e) {
                // Ignore
              }
            }`;

code = code.replace(searchSync, replaceSync);

fs.writeFileSync('src/lib/AuthContext.tsx', code);
