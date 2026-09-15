import fs from 'fs';
let code = fs.readFileSync('vite.config.ts', 'utf8');
code = code.replace("target: 'http://127.0.0.1:3001'", "target: 'http://127.0.0.1:3000'");
fs.writeFileSync('vite.config.ts', code);
