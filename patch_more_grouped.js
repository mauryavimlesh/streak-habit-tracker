import fs from 'fs';
let code = fs.readFileSync('src/pages/More.tsx', 'utf8');

const search = `      {/* Menu List */}
      <div className="bg-surface-card border border-[#1f232c] rounded-[24px] p-2 divide-y divide-[#1e222c] shadow-sm">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => item.path && navigate(item.path)}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[#181c26] transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className={\`w-9 h-9 rounded-xl flex items-center justify-center \${item.bg} \${item.color}\`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-medium text-white/90 group-hover:text-white transition-colors">
                  {item.label}
                </span>
                {item.sub && (
                  <span className="text-[13px] text-[#7d8495]">{item.sub}</span>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#7d8495] group-hover:text-white transition-colors" />
          </button>
        ))}
      </div>`;

const replace = `      {/* Menu List */}
      <div className="space-y-6">
        
        <div>
          <h3 className="text-xs font-semibold text-[#7d8495] uppercase tracking-wider mb-2 ml-4">Personalization</h3>
          <div className="bg-surface-card border border-[#1f232c] rounded-[24px] p-2 divide-y divide-[#1e222c] shadow-sm">
            {menuItems.filter(i => ['themes', 'reminders'].includes(i.id)).map((item) => (
              <button key={item.id} onClick={() => item.path && navigate(item.path)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[#181c26] transition-colors group cursor-pointer">
                <div className="flex items-center gap-3.5">
                  <div className={\`w-9 h-9 rounded-xl flex items-center justify-center \${item.bg} \${item.color}\`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[15px] font-medium text-white/90 group-hover:text-white transition-colors">{item.label}</span>
                    {item.sub && <span className="text-[11px] text-[#7d8495]">{item.sub}</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#7d8495] group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-[#7d8495] uppercase tracking-wider mb-2 ml-4">Productivity</h3>
          <div className="bg-surface-card border border-[#1f232c] rounded-[24px] p-2 divide-y divide-[#1e222c] shadow-sm">
            {menuItems.filter(i => ['goals', 'habits', 'analytics', 'ai', 'journal'].includes(i.id)).map((item) => (
              <button key={item.id} onClick={() => item.path && navigate(item.path)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[#181c26] transition-colors group cursor-pointer">
                <div className="flex items-center gap-3.5">
                  <div className={\`w-9 h-9 rounded-xl flex items-center justify-center \${item.bg} \${item.color}\`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[15px] font-medium text-white/90 group-hover:text-white transition-colors">{item.label}</span>
                    {item.sub && <span className="text-[11px] text-[#7d8495]">{item.sub}</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#7d8495] group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="text-xs font-semibold text-[#7d8495] uppercase tracking-wider mb-2 ml-4">Account & Data</h3>
          <div className="bg-surface-card border border-[#1f232c] rounded-[24px] p-2 divide-y divide-[#1e222c] shadow-sm">
            {menuItems.filter(i => ['settings', 'sync'].includes(i.id)).map((item) => (
              <button key={item.id} onClick={() => item.path && navigate(item.path)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[#181c26] transition-colors group cursor-pointer">
                <div className="flex items-center gap-3.5">
                  <div className={\`w-9 h-9 rounded-xl flex items-center justify-center \${item.bg} \${item.color}\`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[15px] font-medium text-white/90 group-hover:text-white transition-colors">{item.label}</span>
                    {item.sub && <span className="text-[11px] text-[#7d8495]">{item.sub}</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#7d8495] group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-[#7d8495] uppercase tracking-wider mb-2 ml-4">Other</h3>
          <div className="bg-surface-card border border-[#1f232c] rounded-[24px] p-2 divide-y divide-[#1e222c] shadow-sm">
            {menuItems.filter(i => ['help', 'onboarding'].includes(i.id)).map((item) => (
              <button key={item.id} onClick={() => item.path && navigate(item.path)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[#181c26] transition-colors group cursor-pointer">
                <div className="flex items-center gap-3.5">
                  <div className={\`w-9 h-9 rounded-xl flex items-center justify-center \${item.bg} \${item.color}\`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[15px] font-medium text-white/90 group-hover:text-white transition-colors">{item.label}</span>
                    {item.sub && <span className="text-[11px] text-[#7d8495]">{item.sub}</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#7d8495] group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>`;

code = code.replace(search, replace);
fs.writeFileSync('src/pages/More.tsx', code);
