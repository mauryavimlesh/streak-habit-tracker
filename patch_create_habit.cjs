const fs = require('fs');
let code = fs.readFileSync('src/pages/habits/CreateHabit.tsx', 'utf8');

code = code.replace(
  "import { useNavigate } from 'react-router';",
  "import { useNavigate, useLocation } from 'react-router';"
);

code = code.replace(
  "import { createHabit } from '../../lib/habitService';",
  "import { createHabit, updateHabit, getUserHabits } from '../../lib/habitService';"
);

code = code.replace(
  "export default function CreateHabit() {",
  `export default function CreateHabit() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const editId = searchParams.get('edit');
  const [initialLoading, setInitialLoading] = useState(!!editId);`
);

code = code.replace(
  "const { user } = useAuth();",
  `const { user } = useAuth();
  
  useEffect(() => {
    if (editId && user) {
      getUserHabits(user.uid).then(habits => {
        const habit = habits.find(h => h.id === editId);
        if (habit) {
          setName(habit.name || '');
          setDescription(habit.description || '');
          setSelectedIcon(habit.icon || 'star');
          setSelectedColor(habit.color || 'blue');
          setTargetType(habit.targetType || 'binary');
          setTargetValue(habit.targetValue || 1);
          setTargetUnit(habit.targetUnit || '');
          setFrequencyType(habit.frequencyType || 'daily');
          setReminderTime(habit.reminderTime || '');
        }
        setInitialLoading(false);
      });
    }
  }, [editId, user]);`
);

code = code.replace(
  "const handleSave = async () => {",
  `const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    
    try {
      if (editId) {
        await updateHabit(editId, {
          name: name.trim(),
          description: description.trim(),
          category: 'general',
          icon: selectedIcon,
          color: selectedColor,
          frequencyType,
          frequencyValue: [],
          targetType,
          targetValue,
          targetUnit,
          reminderTime,
        });
      } else {
        await createHabit({
          userId: user?.uid || 'local',
          name: name.trim(),
          description: description.trim(),
          category: 'general',
          icon: selectedIcon,
          color: selectedColor,
          frequencyType,
          frequencyValue: [],
          targetType,
          targetValue,
          targetUnit,
          reminderTime,
        });
      }
      
      navigate(-1);
    } catch (err) {
      console.error('Failed to save habit:', err);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-t-2 border-accent-primary rounded-full animate-spin"></div></div>;
  }
`
);

code = code.replace(
  "<h1 className=\"text-base font-semibold text-white\">New Habit</h1>",
  "<h1 className=\"text-base font-semibold text-white\">{editId ? 'Edit Habit' : 'New Habit'}</h1>"
);

fs.writeFileSync('src/pages/habits/CreateHabit.tsx', code);
