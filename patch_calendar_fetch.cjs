const fs = require('fs');
let code = fs.readFileSync('src/pages/Calendar.tsx', 'utf8');

code = code.replace(
  "import { trackCalendarOpened, trackCalendarDateSelected } from '../lib/analyticsService';",
  `import { trackCalendarOpened, trackCalendarDateSelected } from '../lib/analyticsService';
import { getHabitLogs, getUserHabits, Habit, HabitLog } from '../lib/habitService';
import { getUserActivities, Activity } from '../lib/activityService';
import { getUserGoals, Goal } from '../lib/goalService';
import { getUserJournal, JournalEntry } from '../lib/journalService';`
);

code = code.replace(
  "const [tasks, setTasks] = useState<TaskItem[]>([]);",
  `const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);`
);

code = code.replace(
  `useEffect(() => {
    let unsubscribe: () => void;
    async function loadTasks() {
      if (!user) return;
      try {
        setIsLoading(true);
        const localTasks = await getAllTasks(user.uid);
        setTasks(localTasks);
        unsubscribe = subscribeToTasks(user.uid, (cloudTasks) => {
          setTasks(cloudTasks);
        });
      } catch (err) {
        console.error('Failed to load tasks:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadTasks();
    
    trackCalendarOpened();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);`,
  `useEffect(() => {
    let unsubscribe: () => void;
    async function loadData() {
      if (!user) return;
      try {
        setIsLoading(true);
        const [localTasks, h, l, a, g, j] = await Promise.all([
          getAllTasks(user.uid),
          getUserHabits(user.uid),
          getHabitLogs(user.uid),
          getUserActivities(user.uid),
          getUserGoals(user.uid),
          getUserJournal(user.uid)
        ]);
        setTasks(localTasks);
        setHabits(h);
        setLogs(l);
        setActivities(a);
        setGoals(g);
        setJournals(j);
        
        unsubscribe = subscribeToTasks(user.uid, (cloudTasks) => {
          setTasks(cloudTasks);
        });
      } catch (err) {
        console.error('Failed to load calendar data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
    
    trackCalendarOpened();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);`
);

fs.writeFileSync('src/pages/Calendar.tsx', code);
