import fs from 'fs';
let content = fs.readFileSync('src/components/layout/MainLayout.tsx', 'utf8');

content = content.replace(
  `import { Home, Calendar as CalendarIcon, LayoutGrid } from 'lucide-react';`,
  `import { Home, Calendar as CalendarIcon, LayoutGrid, BarChart3, BookOpen, Target } from 'lucide-react';`
);

content = content.replace(
  `        <div className="bg-[#0e1015]/95 backdrop-blur-2xl border-t border-[#1e222b] h-[74px] pb-[env(safe-area-inset-bottom)] px-8 flex items-center justify-around">
          <NavItem to="/" icon={<Home className="w-5 h-5" />} label="Home" />
          <NavItem to="/calendar" icon={<CalendarIcon className="w-5 h-5" />} label="Calendar" />
          <NavItem to="/more" icon={<LayoutGrid className="w-5 h-5" />} label="More" />
        </div>`,
  `        <div className="bg-[#0e1015]/95 backdrop-blur-2xl border-t border-[#1e222b] h-[74px] pb-[env(safe-area-inset-bottom)] px-2 sm:px-4 flex items-center justify-between overflow-x-auto no-scrollbar">
          <NavItem to="/" icon={<Home className="w-5 h-5" />} label="Home" />
          <NavItem to="/calendar" icon={<CalendarIcon className="w-5 h-5" />} label="Calendar" />
          <NavItem to="/goals" icon={<Target className="w-5 h-5" />} label="Goals" />
          <NavItem to="/journal" icon={<BookOpen className="w-5 h-5" />} label="Journal" />
          <NavItem to="/analytics" icon={<BarChart3 className="w-5 h-5" />} label="Analytics" />
          <NavItem to="/more" icon={<LayoutGrid className="w-5 h-5" />} label="More" />
        </div>`
);

content = content.replace(
  `          "relative flex flex-col items-center justify-center w-20 h-full transition-all duration-200 active:scale-95",`,
  `          "relative flex flex-col items-center justify-center min-w-[60px] flex-1 h-full transition-all duration-200 active:scale-95",`
);

fs.writeFileSync('src/components/layout/MainLayout.tsx', content);
