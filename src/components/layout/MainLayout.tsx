import React, { Suspense, useCallback, memo } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router';
import { Home, Calendar as CalendarIcon, LayoutGrid } from 'lucide-react';
import { cn } from '../../lib/utils';
import { RouteSkeleton } from '../RouteSkeleton';
import { useProgressiveLoad } from '../progressive/DeferredRender';

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

    // 2. Debounce rapid multi-taps (260ms cooldown) to keep the transition animation uninterrupted
    if (now - lastNavTimestamp < 260) {
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
          "relative flex flex-col items-center justify-center min-w-[60px] flex-1 h-full transition-all duration-150 active:scale-95 cursor-pointer touch-manipulation",
          isActive ? "text-accent-primary" : "text-text-muted hover:text-text-secondary"
        )
      }
    >
      {({ isActive }) => (
        <div className="flex flex-col items-center justify-center">
          <div
            className={cn(
              "w-12 h-8 rounded-xl flex items-center justify-center transition-all duration-200",
              isActive ? "bg-accent-primary/15 text-accent-primary" : "bg-transparent text-text-muted"
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
          <span
            className={cn(
              "text-[11px] font-medium tracking-tight mt-0.5",
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
  const isReady = useProgressiveLoad(30);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto bottom-nav" data-pwa-bottom-nav>
      <div className="bg-surface/90 backdrop-blur-2xl border-t border-border min-h-[70px] pb-[env(safe-area-inset-bottom,0px)] pt-1 px-2 sm:px-4 flex items-center justify-between overflow-x-auto no-scrollbar bottom-nav-inner">
        {isReady ? (
          <>
            <NavItem to="/" end Icon={Home} label="Home" />
            <NavItem to="/calendar" Icon={CalendarIcon} label="Calendar" />
            <NavItem to="/more" Icon={LayoutGrid} label="More" />
          </>
        ) : (
          <div className="w-full h-10 flex items-center justify-around opacity-25 animate-pulse">
            <div className="w-12 h-7 bg-white/10 rounded-xl" />
            <div className="w-12 h-7 bg-white/10 rounded-xl" />
            <div className="w-12 h-7 bg-white/10 rounded-xl" />
          </div>
        )}
      </div>
    </nav>
  );
});

export default function MainLayout() {
  return (
    <div className="flex flex-col h-[100dvh] min-h-[100dvh] bg-background text-text-primary overflow-hidden">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pt-[env(safe-area-inset-top,0px)] pb-[calc(env(safe-area-inset-bottom,0px)+88px)] app-main-content overscroll-contain">
        <Suspense fallback={<RouteSkeleton />}>
          <Outlet />
        </Suspense>
      </main>

      {/* Memoized Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

