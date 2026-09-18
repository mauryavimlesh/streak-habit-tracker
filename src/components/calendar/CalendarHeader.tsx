import React from 'react';
import { Menu, Watch, CalendarDays, Archive } from 'lucide-react';

interface CalendarHeaderProps {
  selectedDate: Date;
  viewMode: 'week' | 'month';
  onToggleViewMode: () => void;
  onResetToday: () => void;
  onOpenArchive?: () => void;
  archivedCount?: number;
  streakScore?: number;
}

export const CalendarHeader = React.memo(function CalendarHeader({
  selectedDate,
  viewMode,
  onToggleViewMode,
  onResetToday,
  onOpenArchive,
  archivedCount = 0,
  streakScore = 68,
}: CalendarHeaderProps) {
  const dayNumber = selectedDate.getDate();
  const weekdayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
  const monthYearName = selectedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <header className="flex items-center justify-between pt-3 pb-2 px-1">
      {viewMode === 'week' ? (
        /* Week View Header (matches Screen 1 in reference) */
        <>
          <div className="flex items-center gap-3">
            {/* Circular score pill */}
            <div className="relative w-10 h-10 rounded-full bg-[#13171e] border border-[#232d20] flex items-center justify-center">
              <svg className="w-9 h-9 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-white/10"
                  strokeWidth="2.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-accent-primary"
                  strokeDasharray={`${streakScore}, 100`}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[11px] font-bold text-white font-mono">
                {streakScore}
              </span>
            </div>

            {/* Date Title: e.g. "26 Sunday" */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white tracking-tight">{dayNumber}</span>
              <span className="text-xl font-semibold text-white/90">{weekdayName}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onOpenArchive && (
              <button
                type="button"
                id="header-open-archive-btn"
                onClick={onOpenArchive}
                title="Archived Tasks (>30 days)"
                className="relative w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <Archive className="w-5 h-5" />
                {archivedCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#38bdf8]" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onToggleViewMode}
              title="Expand to Full Month"
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <CalendarDays className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onResetToday}
              title="Jump to Today"
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="space-y-1">
                <div className="w-4 h-0.5 bg-white/80 rounded-full" />
                <div className="w-4 h-0.5 bg-white/80 rounded-full" />
              </div>
            </button>
          </div>
        </>
      ) : (
        /* Month View Header (matches Screen 2 in reference) */
        <>
          <button
            type="button"
            onClick={onToggleViewMode}
            title="Collapse to Week View"
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Centered Month Year: e.g. "Sep 2026" */}
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white tracking-tight">
              {monthYearName}
            </h1>
          </div>

          <div className="flex items-center gap-1">
            {onOpenArchive && (
              <button
                type="button"
                id="header-open-archive-month-btn"
                onClick={onOpenArchive}
                title="Archived Tasks (>30 days)"
                className="relative w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <Archive className="w-5 h-5" />
                {archivedCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#38bdf8]" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onResetToday}
              title="Jump to Today"
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Watch className="w-5 h-5 text-white/80" />
            </button>
          </div>
        </>
      )}
    </header>
  );
});
