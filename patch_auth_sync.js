import fs from 'fs';
let code = fs.readFileSync('src/lib/AuthContext.tsx', 'utf8');

code = code.replace(
  "import { saveAppearanceSettings, applyAppearanceSettings } from './themeService';",
  "import { saveAppearanceSettings, applyAppearanceSettings } from './themeService';\nimport { syncLocalToCloud } from './habitService';"
);

code = code.replace(
  `            // If local session had onboarding completed or new goals not yet saved in Firestore, backfill Firestore
            if (isCompleted && (!fsData.onboardingCompleted || !fsData.hasCompletedOnboarding)) {`,
  `            // Sync local habits to the cloud
            await syncLocalToCloud(currentUser.uid);
            // If local session had onboarding completed or new goals not yet saved in Firestore, backfill Firestore
            if (isCompleted && (!fsData.onboardingCompleted || !fsData.hasCompletedOnboarding)) {`
);

fs.writeFileSync('src/lib/AuthContext.tsx', code);
