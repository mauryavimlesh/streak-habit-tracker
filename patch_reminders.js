import fs from 'fs';

let content = fs.readFileSync('src/pages/reminders/Reminders.tsx', 'utf8');

// Add imports
content = content.replace(
  `import { readLocalHabits } from '../../lib/habitService';`,
  `import { readLocalHabits, getUserHabits, Habit } from '../../lib/habitService';\nimport { useAuth } from '../../lib/AuthContext';`
);

// Replace sync methods
content = content.replace(
  `import {\n  ReminderItem,\n  ReminderRepeat,\n  ReminderCategory,\n  readLocalReminders,\n  saveLocalReminders,\n  toggleReminder,\n  createReminder,\n  updateReminder,\n  deleteReminder,\n  requestNotificationPermission,\n  sendSystemNotification,\n} from '../../lib/reminderService';`,
  `import {\n  ReminderItem,\n  ReminderRepeat,\n  ReminderCategory,\n  readLocalReminders,\n  getUserReminders,\n  saveLocalReminders,\n  toggleReminder,\n  createReminder,\n  updateReminder,\n  deleteReminder,\n  requestNotificationPermission,\n  sendSystemNotification,\n} from '../../lib/reminderService';`
);

// Replace component setup
content = content.replace(
  `  const [notificationEnabled, setNotificationEnabled] = useState(true);

  const habits = readLocalHabits();

  useEffect(() => {
    setReminders(readLocalReminders());
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }
  }, []);

  const handleToggle = (id: string) => {
    triggerHaptic('tap');
    const updated = toggleReminder(id);
    setReminders(updated);
  };

  const handleDelete = (id: string) => {
    triggerHaptic('light');
    const updated = deleteReminder(id);
    setReminders(updated);
  };`,
  `  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [habits, setHabits] = useState<Habit[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    async function loadData() {
      setReminders(readLocalReminders());
      setHabits(readLocalHabits());
      if (user) {
        const [fetchedReminders, fetchedHabits] = await Promise.all([
          getUserReminders(user.uid),
          getUserHabits(user.uid)
        ]);
        setReminders(fetchedReminders);
        setHabits(fetchedHabits);
      }
    }
    loadData();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }
  }, [user]);

  const handleToggle = async (id: string) => {
    triggerHaptic('tap');
    const updated = await toggleReminder(id, user?.uid);
    setReminders(updated);
  };

  const handleDelete = async (id: string) => {
    triggerHaptic('light');
    const updated = await deleteReminder(id, user?.uid);
    setReminders(updated);
  };`
);

// Handle save
content = content.replace(
  `  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    triggerHaptic('success');
    
    let linkedName = '';
    if (linkedHabitId) {
      linkedName = habits.find(h => h.id === linkedHabitId)?.name || '';
    }

    if (editingReminder) {
      const updated = updateReminder(editingReminder.id, {
        title,
        description,
        time,
        date,
        repeat,
        category,
        days: selectedDays,
        linkedHabitId,
        linkedEntityName: linkedName,
        notificationEnabled,
      });
      setReminders(updated);
    } else {
      const newReminder = createReminder({
        title,
        description,
        time,
        date,
        repeat,
        category,
        days: selectedDays,
        linkedHabitId,
        linkedEntityName: linkedName,
        enabled: true,
        notificationEnabled,
      });
      setReminders(readLocalReminders());
    }
    setIsNewOpen(false);
  };`,
  `  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    triggerHaptic('success');
    
    let linkedName = '';
    if (linkedHabitId) {
      linkedName = habits.find(h => h.id === linkedHabitId)?.name || '';
    }

    if (editingReminder) {
      const updated = await updateReminder(editingReminder.id, {
        title,
        description,
        time,
        date,
        repeat,
        category,
        days: selectedDays,
        linkedHabitId,
        linkedEntityName: linkedName,
        notificationEnabled,
      }, user?.uid);
      setReminders(updated);
    } else {
      const newReminder = await createReminder({
        title,
        description,
        time,
        date,
        repeat,
        category,
        days: selectedDays,
        linkedHabitId,
        linkedEntityName: linkedName,
        enabled: true,
        notificationEnabled,
      }, user?.uid);
      if (user) {
        setReminders(await getUserReminders(user.uid));
      } else {
        setReminders(readLocalReminders());
      }
    }
    setIsNewOpen(false);
  };`
);

fs.writeFileSync('src/pages/reminders/Reminders.tsx', content);
