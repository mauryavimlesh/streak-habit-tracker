import fs from 'fs';

// 1. Patch main.tsx to apply theme on load
let mainTsx = fs.readFileSync('src/main.tsx', 'utf8');
mainTsx = mainTsx.replace(
  `import './index.css';`,
  `import './index.css';\nimport { readAppearanceSettings, applyAppearanceSettings } from './lib/themeService';\n\napplyAppearanceSettings(readAppearanceSettings());`
);
fs.writeFileSync('src/main.tsx', mainTsx);

// 2. Patch ThemesAppearance.tsx to sync with AuthContext
let themeTsx = fs.readFileSync('src/pages/appearance/ThemesAppearance.tsx', 'utf8');

themeTsx = themeTsx.replace(
  `import { ChevronLeft, Palette, Sparkles, Moon, Monitor, LayoutTemplate } from 'lucide-react';`,
  `import { ChevronLeft, Palette, Sparkles, Moon, Monitor, LayoutTemplate } from 'lucide-react';\nimport { useAuth } from '../../lib/AuthContext';`
);

themeTsx = themeTsx.replace(
  `  const [settings, setSettings] = useState<AppearanceSettings>(readAppearanceSettings());`,
  `  const { updateProfile } = useAuth();\n  const [settings, setSettings] = useState<AppearanceSettings>(readAppearanceSettings());`
);

themeTsx = themeTsx.replace(
  `    saveAppearanceSettings(updated);\n    setSettings(updated);`,
  `    saveAppearanceSettings(updated);\n    setSettings(updated);\n    updateProfile({ appearancePreference: JSON.stringify(updated) });`
);

fs.writeFileSync('src/pages/appearance/ThemesAppearance.tsx', themeTsx);

// 3. Patch AuthContext.tsx to load theme from cloud on login
let authTsx = fs.readFileSync('src/lib/AuthContext.tsx', 'utf8');
authTsx = authTsx.replace(
  `import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';\nimport { clearAllLocalData } from './settingsService';`,
  `import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';\nimport { clearAllLocalData } from './settingsService';\nimport { saveAppearanceSettings, applyAppearanceSettings } from './themeService';`
);

authTsx = authTsx.replace(
  `            const merged: UserProfile = {`,
  `            if (fsData.appearancePreference) {\n              try {\n                const parsedTheme = JSON.parse(fsData.appearancePreference);\n                saveAppearanceSettings(parsedTheme);\n                applyAppearanceSettings(parsedTheme);\n              } catch (e) {}\n            }\n            const merged: UserProfile = {`
);

fs.writeFileSync('src/lib/AuthContext.tsx', authTsx);
