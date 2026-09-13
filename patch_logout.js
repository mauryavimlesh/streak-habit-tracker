import fs from 'fs';
let content = fs.readFileSync('src/pages/More.tsx', 'utf8');

content = content.replace(
  `            onClick={() => logout()}`,
  `            onClick={async () => {\n              await logout();\n              navigate('/login');\n            }}`
);
fs.writeFileSync('src/pages/More.tsx', content);
