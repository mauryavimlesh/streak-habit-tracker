import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace("res.status(500).json({ error: 'AI Coach server error. Please try again.' });", "res.status(500).json({ error: 'AI Coach server error: ' + (error?.stack || error?.message || String(error)) });");
fs.writeFileSync('server.ts', code);
