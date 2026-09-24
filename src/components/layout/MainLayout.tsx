import React, { Suspense, useCallback, memo } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router';
import { Home, Calendar as CalendarIcon, LayoutGrid } from 'lucide-react';
import { cn } from '../../lib/utils';
import { RouteSkeleton } from '../RouteSkeleton';

// Global throttle tracker to debounce rapid multi-taps during route switches
let lastNavTimestamp = 0;

interface NavItemProps {
  to: string;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  end?: boolean;
}

const NavItem = memo(function NavItem({ to, Icon, label, end }: NavItemProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  const isCurrentlyActive = end
    ? currentPath === to
    : (to === '/' ? currentPath === '/' : currentPath.startsWith(to));

  const handleTap = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const now = Date.now();

    // 1. Prevent redundant mount cycle if already on this route
    if (isCurrentlyActive) {
      e.preventDefault();
      return;
    }

    // 2. Debounce rapid multi-taps (240ms cooldown) to keep transition smooth
    if (now - lastNavTimestamp < 240) {
      e.preventDefault();
      return;
    }
    lastNavTimestamp = now;

    // Haptic feedback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(8);
      } catch {
        // Ignore
      }
    }
  }, [isCurrentlyActive]);

  return (
    <NavLink
      to={to}
      end={end}
      onClick={handleTap}
      className={({ isActive }) =>
        cn(
          "relative flex flex-col items-center justify-center min-w-[64px] flex-1 h-full py-1 transition-all duration-150 active:scale-95 cursor-pointer touch-manipulation select-none",
          isActive ? "text-accent-primary" : "text-text-muted hover:text-text-secondary"
        )
      }
    >
      {({ isActive }) => (
        <div className="flex flex-col items-center justify-center">
          <div
            className={cn(
              "w-12 h-8 rounded-xl flex items-center justify-center transition-all duration-200",
              isActive ? "bg-accent-primary/15 text-accent-primary shadow-[0_0_12px_rgba(140,238,40,0.15)]" : "bg-transparent text-text-muted"
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
          <span
            className={cn(
              "text-[11px] font-medium tracking-tight mt-0.5 transition-colors",
              isActive ? "text-accent-primary font-semibold" : "text-text-muted"
            )}
          >
            {label}
          </span>
        </div>
      )}
    </NavLink>
  );
});

const BottomNav = memo(function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto bottom-nav" data-pwa-bottom-nav>
      <div className="bg-surface/90 backdrop-blur-2xl border-t border-border min-h-[64px] pb-[max(env(safe-area-inset-bottom,0px),8px)] pt-1 px-3 sm:px-6 flex items-center justify-around overflow-x-auto no-scrollbar bottom-nav-inner">
        <NavItem to="/" end Icon={Home} label="Home" />
        <NavItem to="/calendar" Icon={CalendarIcon} label="Calendar" />
        <NavItem to="/more" Icon={LayoutGrid} label="More" />
      </div>
    </nav>
  );
});

export default function MainLayout() {
  return (
    <div className="flex flex-col h-[100dvh] min-h-[100dvh] bg-background text-text-primary overflow-hidden">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pt-[env(safe-area-inset-top,0px)] pb-[calc(env(safe-area-inset-bottom,0px)+84px)] app-main-content overscroll-contain">
        <Suspense fallback={<RouteSkeleton />}>
          <Outlet />
        </Suspense>
      </main>

      {/* Persistent Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
