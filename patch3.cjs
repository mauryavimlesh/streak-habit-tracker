const fs = require('fs');
let code = fs.readFileSync('src/pages/habits/CreateHabit.tsx', 'utf8');

code = code.replace(
  `  if (initialLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-t-2 border-accent-primary rounded-full animate-spin"></div></div>;
  }
    if (!name.trim()) return;
    setLoading(true);    
        
    try {
    <div className="flex flex-col min-h-screen bg-background text-white">`,
  `  if (initialLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-t-2 border-accent-primary rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-white">`
);

fs.writeFileSync('src/pages/habits/CreateHabit.tsx', code);
