import fs from 'fs';

let content = fs.readFileSync('src/pages/analytics/Analytics.tsx', 'utf8');

// Replace synchronous reads with state
content = content.replace(
  /const habits = useMemo\(\(\) => readLocalHabits\(\), \[\]\);\n  const logs = useMemo\(\(\) => readLocalLogs\(\), \[\]\);\n  const tasks = useMemo\(\(\) => readLocalTasks\(\), \[\]\);\n  const goals = useMemo\(\(\) => readLocalGoals\(\), \[\]\);/g,
  `const [habits, setHabits] = useState(readLocalHabits());
  const [logs, setLogs] = useState(readLocalLogs());
  const [tasks, setTasks] = useState(readLocalTasks());
  const [goals, setGoals] = useState(readLocalGoals());
  const { user } = useAuth();
  
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const [fetchedHabits, fetchedLogs, fetchedTasks, fetchedGoals] = await Promise.all([
        getUserHabits(user.uid),
        getHabitLogs(user.uid),
        getAllTasks(user.uid),
        getUserGoals(user.uid)
      ]);
      setHabits(fetchedHabits);
      setLogs(fetchedLogs);
      setTasks(fetchedTasks);
      setGoals(fetchedGoals);
    }
    loadData();
  }, [user]);`
);

content = content.replace(
  `import { readLocalHabits, readLocalLogs } from '../../lib/habitService';
import { readLocalTasks } from '../../lib/taskService';
import { readLocalGoals } from '../../lib/goalService';`,
  `import { readLocalHabits, readLocalLogs, getUserHabits, getHabitLogs } from '../../lib/habitService';
import { readLocalTasks, getAllTasks } from '../../lib/taskService';
import { readLocalGoals, getUserGoals } from '../../lib/goalService';
import { useAuth } from '../../lib/AuthContext';
import { useEffect } from 'react';`
);

fs.writeFileSync('src/pages/analytics/Analytics.tsx', content);
