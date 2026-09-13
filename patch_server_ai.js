import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const search = `    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }`;
const replace = `    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'AI is not configured. Missing GEMINI_API_KEY environment variable.' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }`;

code = code.replace(search, replace);
fs.writeFileSync('server.ts', code);
