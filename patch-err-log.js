import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace("console.warn(`Model ${model} attempt failed:`, err?.message || err); lastError = err;", "console.warn(`Model ${model} attempt failed:`, err?.message || err); lastError = err; console.log(err);");
fs.writeFileSync('server.ts', code);
