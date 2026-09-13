import fs from 'fs';
let code = fs.readFileSync('src/lib/themeService.ts', 'utf8');

code += `
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    const settings = readAppearanceSettings();
    if (settings.theme === 'system') {
      applyAppearanceSettings(settings);
    }
  });
}
`;

fs.writeFileSync('src/lib/themeService.ts', code);
