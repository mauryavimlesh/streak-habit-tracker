import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

const search = `  if (!user) {
    return <Navigate to="/login" replace />;
  }`;

code = code.replace(search, '');

fs.writeFileSync('src/App.tsx', code);
