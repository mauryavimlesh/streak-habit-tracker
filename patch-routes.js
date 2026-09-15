import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

// Replace status endpoint model
code = code.replace(
  "model: 'gemini-3.8-flash',",
  "model: 'gemini-2.5-flash',"
);

// Replace candidateModels
code = code.replace(
  "const candidateModels = ['gemini-3.1-pro-preview', 'gemini-3.8-flash', 'gemini-flash-latest'];",
  "const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash'];"
);

fs.writeFileSync('server.ts', code);
console.log("Patched models successfully");
