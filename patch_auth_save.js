import fs from 'fs';
let code = fs.readFileSync('src/lib/AuthContext.tsx', 'utf8');

const search = `      if (data.email !== undefined) fsData.email = data.email;`;
const replace = `      if (data.email !== undefined) fsData.email = data.email;
      else if (!fsData.email && auth.currentUser?.email) fsData.email = auth.currentUser.email;
      else if (!fsData.email) fsData.email = profile?.email || '';`;

code = code.replace(search, replace);
fs.writeFileSync('src/lib/AuthContext.tsx', code);
