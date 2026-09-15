import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');
code = "import fs from 'fs';\n" + code;
fs.writeFileSync('server.ts', code);
