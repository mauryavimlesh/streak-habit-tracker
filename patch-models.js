import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace("const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash'];", "const candidateModels = ['gemini-3.1-pro-preview', 'gemini-2.5-flash'];");
fs.writeFileSync('server.ts', code);
