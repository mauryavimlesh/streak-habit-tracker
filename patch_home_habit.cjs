const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

code = code.replace(
  "onClick={() => navigate('/habits')}",
  "onClick={() => navigate(`/habits/new?edit=${habit.id}`)}"
);

fs.writeFileSync('src/pages/Home.tsx', code);
