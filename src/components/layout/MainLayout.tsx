import React from 'react';
import { Outlet, NavLink } from 'react-router';
import { Home, Calendar as CalendarIcon, LayoutGrid, BarChart3, BookOpen, Target } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function MainLayout() {
  return (
    <div className="flex flex-col h-screen bg-background text-white overflow-hidden select-none">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pt-[env(safe-area-inset-top,0px)] pb-[calc(env(safe-area-inset-bottom,0px)+88px)] scroll-smooth app-main-content">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto bottom-nav" data-pwa-bottom-nav>
        <div className="bg-[#0e1015]/95 backdrop-blur-2xl border-t border-[#1e222b] min-h-[70px] pb-[env(safe-area-inset-bottom,0px)] pt-1 px-2 sm:px-4 flex items-center justify-between overflow-x-auto no-scrollbar bottom-nav-inner">
          <NavItem to="/" icon={<Home className="w-5 h-5" />} label="Home" />
          <NavItem to="/calendar" icon={<CalendarIcon className="w-5 h-5" />} label="Calendar" />
          <NavItem to="/more" icon={<LayoutGrid className="w-5 h-5" />} label="More" />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "relative flex flex-col items-center justify-center min-w-[60px] flex-1 h-full transition-all duration-200 active:scale-95",
          isActive ? "text-accent-primary" : "text-[#737988] hover:text-[#a0a6b5]"
        )
      }
    >
      {({ isActive }) => (
        <div className="flex flex-col items-center justify-center">
          <div
            className={cn(
              "w-12 h-8 rounded-xl flex items-center justify-center transition-all duration-200",
              isActive ? "bg-[#23381c] text-accent-primary" : "bg-transparent text-[#737988]"
            )}
          >
            {icon}
          </div>
          <span
            className={cn(
              "text-[11px] font-medium tracking-tight mt-0.5",
              isActive ? "text-accent-primary font-semibold" : "text-[#737988]"
            )}
          >
            {label}
          </span>
        </div>
      )}
    </NavLink>
  );
}

