import fs from 'fs';
let code = fs.readFileSync('src/index.css', 'utf8');

code = code.replace(
  "--color-surface-secondary: #1a1d25;",
  "--color-surface-secondary: var(--app-surface-secondary, #1a1d25);"
);
code = code.replace(
  "--color-surface-border: #1f232c;",
  "--color-surface-border: var(--app-surface-border, #1f232c);"
);
code = code.replace(
  "--color-text-primary: #FFFFFF;",
  "--color-text-primary: var(--app-text-primary, #FFFFFF);"
);
code = code.replace(
  "--color-text-secondary: #7d8495;",
  "--color-text-secondary: var(--app-text-secondary, #7d8495);"
);
code = code.replace(
  "--color-text-muted: #5c6272;",
  "--color-text-muted: var(--app-text-muted, #5c6272);"
);

// We need to also add transition to body background
code = code.replace(
  "background-color: var(--app-bg);",
  "background-color: var(--app-bg);\n    color: var(--app-text-primary, #FFFFFF);\n    transition: background-color 0.3s ease, color 0.3s ease;"
);

fs.writeFileSync('src/index.css', code);
