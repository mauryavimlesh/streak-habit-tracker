const fs = require('fs');
let code = fs.readFileSync('src/pages/habits/CreateHabit.tsx', 'utf8');

code = code.replace(
  `  }
    if (!name.trim()) return;
    setLoading(true);    
        
    try {
    <div className="flex flex-col min-h-screen bg-background text-white">`,
  `  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-white">`
);

fs.writeFileSync('src/pages/habits/CreateHabit.tsx', code);
