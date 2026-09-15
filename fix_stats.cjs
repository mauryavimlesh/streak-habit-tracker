const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

const targetStr = `  useEffect(() => {
    async function loadData() {`;

const newCode = `  // Fetch activities and goals for sharing
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

  useEffect(() => {
    async function loadData() {`;

code = code.replace(targetStr, newCode);
fs.writeFileSync('src/pages/Home.tsx', code);
