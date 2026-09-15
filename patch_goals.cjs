const fs = require('fs');
let code = fs.readFileSync('src/pages/goals/Goals.tsx', 'utf8');

code = code.replace(
  "import { ShareMilestoneModal } from '../../components/ui/ShareMilestoneModal';",
  `import { ShareModal } from '../../components/ui/ShareModal';
import { StreakShareCard } from '../../components/ui/StreakShareCard';`
);

code = code.replace(
  `<ShareMilestoneModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        streak={Math.round(totalProgress)}
        userName={user?.displayName || user?.email?.split('@')[0] || 'I'}
        totalHabits={100}
        completedHabits={Math.round(totalProgress)}
        goalTitle={selectedGoalForShare?.title}
      />`,
  `<ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        fileName={\`goal-\${selectedGoalForShare?.title?.replace(/\\s+/g, '-').toLowerCase() || 'progress'}\`}
      >
        {(format) => (
          <StreakShareCard
            streak={Math.round(totalProgress)}
            userName={user?.displayName || user?.email?.split('@')[0] || 'I'}
            totalHabits={100}
            completedHabits={Math.round(totalProgress)}
            goalTitle={selectedGoalForShare?.title}
            format={format}
          />
        )}
      </ShareModal>`
);

fs.writeFileSync('src/pages/goals/Goals.tsx', code);
