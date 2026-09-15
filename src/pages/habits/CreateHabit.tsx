import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { useAuth } from '../../lib/AuthContext';
import { createHabit, updateHabit, getUserHabits, HabitFrequency, TargetType } from '../../lib/habitService';
import { HABIT_ICONS, HABIT_COLORS } from '../../lib/constants';

export default function CreateHabit() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const editId = searchParams.get('edit');
  const [initialLoading, setInitialLoading] = useState(!!editId);
  const navigate = useNavigate();
  const { user } = useAuth();
  
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
  }, [editId, user]);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(HABIT_ICONS[0].id);
  const [selectedColor, setSelectedColor] = useState(HABIT_COLORS[0].id);
  
  const [frequencyType, setFrequencyType] = useState<HabitFrequency>('daily');
  const [targetType, setTargetType] = useState<TargetType>('binary');
  const [targetValue, setTargetValue] = useState(1);
  const [targetUnit, setTargetUnit] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
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

  return (
    <div className="flex flex-col min-h-screen bg-background text-white">
      <header className="flex items-center justify-between p-6 pb-4 sticky top-0 bg-background/90 backdrop-blur-xl z-10 border-b border-[#1f232c]">
        <button 
          onClick={() => navigate(-1)}
          className="text-[#7d8495] hover:text-white transition-colors cursor-pointer text-sm font-medium"
        >
          Cancel
        </button>
        <h1 className="text-base font-semibold text-white">{editId ? 'Edit Habit' : 'New Habit'}</h1>
        <button 
          onClick={handleSave}
          disabled={!name.trim() || loading}
          className="text-accent-primary font-bold text-sm disabled:opacity-40 transition-opacity cursor-pointer"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32 max-w-md mx-auto w-full">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#7d8495] uppercase tracking-wider mb-2 ml-1">Habit Name</label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning Workout"
              className="w-full bg-surface-card border border-[#1f232c] rounded-2xl px-5 py-3.5 outline-none focus:border-accent-primary/50 transition-colors text-base text-white placeholder-[#7d8495]"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#7d8495] uppercase tracking-wider mb-2 ml-1">Description (Optional)</label>
            <input 
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why is this habit important to you?"
              className="w-full bg-surface-card border border-[#1f232c] rounded-2xl px-5 py-3.5 outline-none focus:border-accent-primary/50 transition-colors text-sm text-white placeholder-[#7d8495]"
            />
          </div>
        </div>

        {/* Visuals */}
        <div className="bg-surface-card border border-[#1f232c] rounded-[24px] p-5 space-y-6 shadow-sm">
          <div>
            <label className="block text-xs font-semibold text-[#7d8495] uppercase tracking-wider mb-3">Icon</label>
            <div className="grid grid-cols-4 gap-3">
              {HABIT_ICONS.map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setSelectedIcon(id)}
                  className={`aspect-square rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                    selectedIcon === id 
                      ? 'bg-[#23381c] border-2 border-accent-primary text-accent-primary' 
                      : 'bg-background border border-[#1f232c] text-[#7d8495] hover:text-white'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#7d8495] uppercase tracking-wider mb-3">Color</label>
            <div className="flex gap-4">
              {HABIT_COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color.id)}
                  className={`w-10 h-10 rounded-full transition-all flex items-center justify-center cursor-pointer ${color.bg}`}
                >
                  <div className={`w-8 h-8 rounded-full border-2 transition-all ${color.class} ${
                    selectedColor === color.id ? 'scale-100 border-white' : 'scale-75 opacity-50 border-transparent'
                  }`} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-[#7d8495] uppercase tracking-wider ml-1">Target</label>
          <div className="bg-surface-card border border-[#1f232c] rounded-[24px] p-2">
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'binary', label: 'Yes / No' },
                { id: 'count', label: 'Amount' }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setTargetType(type.id as TargetType)}
                  className={`py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    targetType === type.id 
                      ? 'bg-[#23381c] text-accent-primary border border-[#345228]' 
                      : 'text-[#7d8495] hover:text-white'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            
            {targetType === 'count' && (
              <div className="flex gap-3 p-3 mt-2 border-t border-[#1f232c]">
                <input
                  type="number"
                  min="1"
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  className="w-20 bg-background border border-[#1f232c] rounded-xl px-3 py-2 text-center text-white outline-none"
                />
                <input
                  type="text"
                  value={targetUnit}
                  onChange={(e) => setTargetUnit(e.target.value)}
                  placeholder="e.g. glasses, mins, pages"
                  className="flex-1 bg-background border border-[#1f232c] rounded-xl px-3 py-2 text-white outline-none placeholder-[#7d8495]"
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-[#7d8495] uppercase tracking-wider ml-1">Frequency</label>
          <div className="bg-surface-card border border-[#1f232c] rounded-[24px] p-2">
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'daily', label: 'Daily' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'custom', label: 'Specific' }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setFrequencyType(type.id as HabitFrequency)}
                  className={`py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    frequencyType === type.id 
                      ? 'bg-[#23381c] text-accent-primary border border-[#345228]' 
                      : 'text-[#7d8495] hover:text-white'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold text-[#7d8495] uppercase tracking-wider ml-1">Reminder</label>
          <div className="bg-surface-card border border-[#1f232c] rounded-[24px] p-4 flex items-center justify-between shadow-sm">
            <span className="text-white text-sm font-medium">Notification Time</span>
            <input 
              type="time" 
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="bg-background border border-[#1f232c] rounded-xl px-3 py-2 outline-none text-sm font-semibold text-white"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
