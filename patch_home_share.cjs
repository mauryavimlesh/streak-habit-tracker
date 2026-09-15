const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

code = code.replace(
  "import { TaskItem, subscribeToTasks, toggleTaskComplete, deleteTask } from '../lib/taskService';",
  `import { TaskItem, subscribeToTasks, toggleTaskComplete, deleteTask } from '../lib/taskService';
import { getUserActivities, Activity as FocusActivity } from '../lib/activityService';
import { getUserGoals, Goal } from '../lib/goalService';`
);

code = code.replace(
  "const [todayTasks, setTodayTasks] = useState<TaskItem[]>([]);",
  `const [todayTasks, setTodayTasks] = useState<TaskItem[]>([]);
  const [allTasks, setAllTasks] = useState<TaskItem[]>([]);
  const [activities, setActivities] = useState<FocusActivity[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);`
);

code = code.replace(
  `    const unsubscribe = subscribeToTasks(user?.uid, (allTasks) => {
      const filtered = allTasks.filter((t) => t.date === todayStr);
      setTodayTasks(filtered);
    });`,
  `    const unsubscribe = subscribeToTasks(user?.uid, (tasksData) => {
      setAllTasks(tasksData);
      const filtered = tasksData.filter((t) => t.date === todayStr);
      setTodayTasks(filtered);
    });`
);

code = code.replace(
  "  }, [user?.uid, todayStr]);",
  `  }, [user?.uid, todayStr]);

  // Fetch activities and goals for sharing
  useEffect(() => {
    async function fetchExtraData() {
      if (user) {
        const [a, g] = await Promise.all([
          getUserActivities(user.uid),
          getUserGoals(user.uid)
        ]);
        setActivities(a);
        setGoals(g);
      }
    }
    fetchExtraData();
  }, [user]);

  // Derived stats for share card
  const totalStudyMinutes = activities.reduce((acc, a) => acc + (a.durationMinutes || 0) + Math.floor((a.durationSeconds || 0)/60), 0);
  const shareStudyHours = Math.floor(totalStudyMinutes / 60);
  const shareStudyMinutes = totalStudyMinutes % 60;
  
  const completedTasksCountShare = allTasks.filter(t => t.completed).length;
  const totalTasksCountShare = allTasks.length;
  
  const activeGoalsShare = goals.filter(g => g.status === 'in_progress').length;
  const completedGoalsShare = goals.filter(g => g.status === 'completed').length;
`
);

code = code.replace(
  `<StreakShareCard
            streak={globalStreak}
            userName={userName}
            totalHabits={totalCount}
            completedHabits={completedHabitsCount}
            format={format}
          />`,
  `<StreakShareCard
            streak={globalStreak}
            userName={userName}
            totalHabits={totalCount}
            completedHabits={completedHabitsCount}
            format={format}
            studyHours={shareStudyHours}
            studyMinutes={shareStudyMinutes}
            completedTasks={completedTasksCountShare}
            totalTasks={totalTasksCountShare}
            activeGoals={activeGoalsShare}
            completedGoals={completedGoalsShare}
          />`
);

fs.writeFileSync('src/pages/Home.tsx', code);
