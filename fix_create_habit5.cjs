const fs = require('fs');
let code = fs.readFileSync('src/pages/habits/CreateHabit.tsx', 'utf8');

code = code.replace(
  "import { useState } from 'react';",
  "import { useState, useEffect } from 'react';"
);

fs.writeFileSync('src/pages/habits/CreateHabit.tsx', code);
