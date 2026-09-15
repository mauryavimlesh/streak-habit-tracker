const fs = require('fs');
let code = fs.readFileSync('src/pages/activity/Activity.tsx', 'utf8');

code = code.replace(
  `          <DeleteConfirmModal
            isOpen={showDiscardConfirm}
            onClose={() => setShowDiscardConfirm(false)}
            onConfirm={confirmDiscard}
            title="Discard this session"
            itemType="session"
            description="Are you sure you want to discard this active session? All progress will be lost."
          />
        </div>
      </div>
    );
  }`,
  `          <DeleteConfirmModal
            isOpen={showDiscardConfirm}
            onClose={() => setShowDiscardConfirm(false)}
            onConfirm={confirmDiscard}
            title="Discard this session"
            itemType="session"
            description="Are you sure you want to discard this active session? All progress will be lost."
          />
      </div>
    );
  }`
);

fs.writeFileSync('src/pages/activity/Activity.tsx', code);
