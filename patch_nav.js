import fs from 'fs';
let code = fs.readFileSync('src/components/layout/MainLayout.tsx', 'utf8');

code = code.replace(
  `          <NavItem to="/" icon={<Home className="w-5 h-5" />} label="Home" />
          <NavItem to="/calendar" icon={<CalendarIcon className="w-5 h-5" />} label="Calendar" />
          <NavItem to="/goals" icon={<Target className="w-5 h-5" />} label="Goals" />
          <NavItem to="/journal" icon={<BookOpen className="w-5 h-5" />} label="Journal" />
          <NavItem to="/analytics" icon={<BarChart3 className="w-5 h-5" />} label="Analytics" />
          <NavItem to="/more" icon={<LayoutGrid className="w-5 h-5" />} label="More" />`,
  `          <NavItem to="/" icon={<Home className="w-5 h-5" />} label="Home" />
          <NavItem to="/calendar" icon={<CalendarIcon className="w-5 h-5" />} label="Calendar" />
          <NavItem to="/more" icon={<LayoutGrid className="w-5 h-5" />} label="More" />`
);

fs.writeFileSync('src/components/layout/MainLayout.tsx', code);
