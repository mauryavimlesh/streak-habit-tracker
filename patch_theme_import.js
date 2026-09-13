import fs from 'fs';
let content = fs.readFileSync('src/pages/appearance/ThemesAppearance.tsx', 'utf8');

if (!content.includes('useAuth')) {
  content = content.replace(
    `import { ChevronLeft, Palette, Sparkles, Moon, Monitor, LayoutTemplate } from 'lucide-react';`,
    `import { ChevronLeft, Palette, Sparkles, Moon, Monitor, LayoutTemplate } from 'lucide-react';\nimport { useAuth } from '../../lib/AuthContext';`
  );
} else {
  // If useAuth is used but not imported
  if (!content.includes('import { useAuth }')) {
    content = content.replace(
      `import { ChevronLeft, Palette, Sparkles, Moon, Monitor, LayoutTemplate } from 'lucide-react';`,
      `import { ChevronLeft, Palette, Sparkles, Moon, Monitor, LayoutTemplate } from 'lucide-react';\nimport { useAuth } from '../../lib/AuthContext';`
    );
  }
}

fs.writeFileSync('src/pages/appearance/ThemesAppearance.tsx', content);
