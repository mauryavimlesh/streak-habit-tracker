const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

code = code.replace(
  "import { ShareMilestoneModal } from '../components/ui/ShareMilestoneModal';",
  `import { ShareModal } from '../components/ui/ShareModal';
import { StreakShareCard } from '../components/ui/StreakShareCard';`
);

code = code.replace(
  `<ShareMilestoneModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        streak={globalStreak}
        userName={userName}
        totalHabits={totalCount}
        completedHabits={completedCount}
      />`,
  `<ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        fileName={\`streak-\${globalStreak}-days\`}
      >
        {(format) => (
          <StreakShareCard
            streak={globalStreak}
            userName={userName}
            totalHabits={totalCount}
            completedHabits={completedCount}
            format={format}
          />
        )}
      </ShareModal>`
);

fs.writeFileSync('src/pages/Home.tsx', code);
