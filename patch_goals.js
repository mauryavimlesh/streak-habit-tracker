import fs from 'fs';
let content = fs.readFileSync('src/pages/goals/Goals.tsx', 'utf8');

content = content.replace(
  `  const [newTargetDate, setNewTargetDate] = useState('2026-12-31');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');`,
  `  const [newTargetDate, setNewTargetDate] = useState('2026-12-31');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newMilestones, setNewMilestones] = useState<string[]>([]);
  const [milestoneInput, setMilestoneInput] = useState('');`
);

content = content.replace(
  `        status: 'in_progress',
        milestones: [],`,
  `        status: 'in_progress',
        milestones: newMilestones.map((m, idx) => ({ id: 'm_' + Date.now() + '_' + idx, title: m, completed: false, order: idx })),`
);

content = content.replace(
  `    setNewDesc('');
    loadGoals();`,
  `    setNewDesc('');
    setNewMilestones([]);
    setMilestoneInput('');
    loadGoals();`
);

const milestoneUI = `
                <div>
                  <label className="block text-xs text-[#7d8495] mb-1">Milestones (Optional)</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={milestoneInput}
                      onChange={(e) => setMilestoneInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (milestoneInput.trim()) {
                            setNewMilestones([...newMilestones, milestoneInput.trim()]);
                            setMilestoneInput('');
                          }
                        }
                      }}
                      placeholder="Add a milestone and press Enter"
                      className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#8cee28]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (milestoneInput.trim()) {
                          setNewMilestones([...newMilestones, milestoneInput.trim()]);
                          setMilestoneInput('');
                        }
                      }}
                      className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {newMilestones.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {newMilestones.map((m, i) => (
                        <div key={i} className="flex items-center justify-between bg-black/30 px-3 py-2 rounded-lg text-xs text-white/80">
                          <span>{m}</span>
                          <button
                            type="button"
                            onClick={() => setNewMilestones(newMilestones.filter((_, idx) => idx !== i))}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
`;

content = content.replace(
  `                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-[#7d8495] mb-1">Target Amount</label>`,
  milestoneUI + `\n                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-[#7d8495] mb-1">Target Amount</label>`
);

fs.writeFileSync('src/pages/goals/Goals.tsx', content);
