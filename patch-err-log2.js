import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace("lastError = err; console.log(err);", "lastError = err; fs.appendFileSync('error.log', `Model ${model} error: ` + (err?.stack || err) + '\\n');");
fs.writeFileSync('server.ts', code);
