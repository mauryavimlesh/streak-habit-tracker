import React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface WeekStripProps {
  currentWeekDays: Date[];
  selectedDate: Date;
  todayDate: Date;
  taskDatesMap: Record<string, { count: number; completedCount: number; hasHighPriority: boolean }>;
  onSelectDate: (date: Date) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onSlideDown: () => void;
}

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function WeekStrip({
  currentWeekDays,
  selectedDate,
  todayDate,
  taskDatesMap,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
  onSlideDown,
}: WeekStripProps) {
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const getDateKey = (d: Date) => d.toISOString().split('T')[0];

  return (
    <div className="relative select-none pb-2 pt-1">
      {/* Navigation arrows (desktop & mobile accessible) */}
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={onPrevWeek}
          aria-label="Previous week"
          className="w-7 h-10 flex items-center justify-center text-[#7d8495] hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* 7 Days Row */}
        <div className="flex-1 grid grid-cols-7 gap-1 sm:gap-2">
          {currentWeekDays.map((day, idx) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, todayDate);
            const dateKey = getDateKey(day);
            const taskInfo = taskDatesMap[dateKey];
            const hasTasks = taskInfo && taskInfo.count > 0;
            const allCompleted = hasTasks && taskInfo.completedCount === taskInfo.count;

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelectDate(day)}
                className={cn(
                  'group flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all cursor-pointer relative',
                  isSelected
                    ? 'bg-[#1b1f2b] border border-[#2e374d] shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
                    : 'hover:bg-white/5 border border-transparent'
                )}
              >
                {/* Weekday initial */}
                <span
                  className={cn(
                    'text-[11px] font-semibold tracking-wider mb-1.5 transition-colors',
                    isSelected ? 'text-white' : 'text-[#7d8495]'
                  )}
                >
                  {WEEKDAY_LABELS[idx]}
                </span>

                {/* Day number */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all relative',
                    isSelected
                      ? 'text-white font-extrabold'
                      : isToday
                      ? 'text-[#8cee28] font-bold'
                      : 'text-white/80 group-hover:text-white'
                  )}
                >
                  {day.getDate()}

                  {/* Task Indicator Dot */}
                  {hasTasks && (
                    <span
                      className={cn(
                        'absolute -bottom-1 w-1.5 h-1.5 rounded-full ring-2 ring-[#0d0e12]',
                        isSelected
                          ? taskInfo.hasHighPriority
                            ? 'bg-[#f87171]'
                            : 'bg-[#8cee28]'
                          : allCompleted
                          ? 'bg-[#8cee28]'
                          : taskInfo.hasHighPriority
                          ? 'bg-[#f87171]'
                          : 'bg-[#60a5fa]'
                      )}
                    />
                  )}
                </div>

                {/* Today small indicator ring if not selected */}
                {isToday && !isSelected && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#8cee28]" />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onNextWeek}
          aria-label="Next week"
          className="w-7 h-10 flex items-center justify-center text-[#7d8495] hover:text-white transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Slide down drag bar / handle with pull affordance */}
      <div
        onClick={onSlideDown}
        role="button"
        tabIndex={0}
        aria-label="Pull down or tap to view full month calendar"
        className="flex flex-col items-center justify-center pt-2 pb-0.5 cursor-pointer group select-none"
      >
        <div className="w-10 h-1 rounded-full bg-white/20 group-hover:bg-[#8cee28] group-hover:w-12 transition-all duration-200" />
        <div className="flex items-center gap-1 text-[10px] font-medium text-white/30 group-hover:text-[#8cee28] mt-1 transition-colors">
          <ChevronDown className="w-3 h-3 group-hover:translate-y-0.5 transition-transform" />
          <span>Swipe or tap for Month</span>
        </div>
      </div>
    </div>
  );
}
