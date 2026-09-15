const fs = require('fs');
let code = fs.readFileSync('src/pages/habits/CreateHabit.tsx', 'utf8');

code = code.replace(
  `  if (initialLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-t-2 border-accent-primary rounded-full animate-spin"></div></div>;
  }
    if (!name.trim()) return;
    setLoading(true);    
        
    try {
      await createHabit({
        userId: user?.uid || 'local',
        name: name.trim(),
        description: description.trim(),
        category: 'general', // Default for now
        icon: selectedIcon,
        color: selectedColor,
        frequencyType,
        frequencyValue: [], // Used for specific days
        targetType,
        targetValue,
        targetUnit,
        reminderTime,
      });
      
      navigate(-1);
    } catch (err) {
      console.error('Failed to create habit:', err);
      // Handle error gracefully if needed
    } finally {
      setLoading(false);
    }
  };`,
  `  if (initialLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-t-2 border-accent-primary rounded-full animate-spin"></div></div>;
  }`
);

fs.writeFileSync('src/pages/habits/CreateHabit.tsx', code);
