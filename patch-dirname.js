import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

// Replace __dirname with process.cwd()
code = code.replace(/__dirname/g, 'process.cwd()');

// Also we don't need fileURLToPath or import.meta.url anymore
code = code.replace(/import { fileURLToPath } from 'url';/, '');
code = code.replace(/const __filename = fileURLToPath\(import.meta.url\);/, '');
code = code.replace(/const process\.cwd\(\) = path.dirname\(__filename\);/, '');

fs.writeFileSync('server.ts', code);
console.log("Replaced __dirname successfully");
