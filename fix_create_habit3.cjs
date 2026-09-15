const fs = require('fs');
let code = fs.readFileSync('src/pages/habits/CreateHabit.tsx', 'utf8');

code = code.replace(
  "import React, { useState } from 'react';",
  "import React, { useState, useEffect } from 'react';"
);

code = code.replace(
  "import { createHabit, updateHabit, getUserHabits } from '../../lib/habitService';",
  "import { createHabit, updateHabit, getUserHabits } from '../../lib/habitService';"
); // Just in case it wasn't there

fs.writeFileSync('src/pages/habits/CreateHabit.tsx', code);
