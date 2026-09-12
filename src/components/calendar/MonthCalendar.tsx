import React from 'react';
import { ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface MonthCalendarProps {
  currentMonthDate: Date; // represents which month is being viewed
  selectedDate: Date;
  todayDate: Date;
  taskDatesMap: Record<string, { count: number; completedCount: number; hasHighPriority: boolean }>;
  onSelectDate: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSlideUp: () => void;
  onJumpToday: () => void;
}

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function MonthCalendar({
  currentMonthDate,
  selectedDate,
  todayDate,
  taskDatesMap,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onSlideUp,
  onJumpToday,
}: MonthCalendarProps) {
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  // Determine days in this month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Find weekday of the 1st of this month (0=Sun, 1=Mon, ..., 6=Sat)
  // We want Monday = 0, Tuesday = 1, ..., Sunday = 6
  const firstDayRaw = new Date(year, month, 1).getDay();
  const firstDayMondayBased = (firstDayRaw + 6) % 7;

  // Previous month trailing days
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const prevMonthDays: number[] = [];
  for (let i = firstDayMondayBased - 1; i >= 0; i--) {
    prevMonthDays.push(daysInPrevMonth - i);
  }

  // Current month days
  const currentMonthDays: number[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    currentMonthDays.push(i);
  }

  // Next month leading days to complete the 7-column grid
  const totalCellsSoFar = prevMonthDays.length + currentMonthDays.length;
  const nextMonthDaysCount = (7 - (totalCellsSoFar % 7)) % 7;
  const nextMonthDays: number[] = [];
  for (let i = 1; i <= nextMonthDaysCount; i++) {
    nextMonthDays.push(i);
  }

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const getDateKey = (y: number, m: number, d: number) => {
    const monthStr = String(m + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    return `${y}-${monthStr}-${dayStr}`;
  };

  const monthTitle = currentMonthDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden pb-3 select-none"
    >
      {/* Month Navigation Toolbar */}
      <div className="flex items-center justify-between px-2 py-2 mb-2 bg-[#12141c] border border-[#1e2330] rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white pl-2">{monthTitle}</span>
          <button
            type="button"
            onClick={onJumpToday}
            className="text-[11px] font-semibold text-[#8cee28] px-2 py-0.5 rounded-lg bg-[#23381c] border border-[#375a28] hover:bg-[#2e4a23] transition-colors cursor-pointer"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrevMonth}
            aria-label="Previous month"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#7d8495] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            aria-label="Next month"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#7d8495] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Column Headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAY_LABELS.map((label, idx) => (
          <div key={idx} className="text-[11px] font-semibold text-[#7d8495] py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Previous Month Cells */}
        {prevMonthDays.map((d) => {
          const prevMonthIdx = month === 0 ? 11 : month - 1;
          const prevYear = month === 0 ? year - 1 : year;
          const cellDate = new Date(prevYear, prevMonthIdx, d);
          return (
            <button
              key={`prev-${d}`}
              type="button"
              onClick={() => onSelectDate(cellDate)}
              className="h-10 rounded-xl flex flex-col items-center justify-center text-xs text-white/20 hover:text-white/40 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <span>{d}</span>
            </button>
          );
        })}

        {/* Current Month Cells */}
        {currentMonthDays.map((d) => {
          const cellDate = new Date(year, month, d);
          const isSelected = isSameDay(cellDate, selectedDate);
          const isToday = isSameDay(cellDate, todayDate);
          const dateKey = getDateKey(year, month, d);
          const taskInfo = taskDatesMap[dateKey];
          const hasTasks = taskInfo && taskInfo.count > 0;
          const allCompleted = hasTasks && taskInfo.completedCount === taskInfo.count;

          return (
            <button
              key={`curr-${d}`}
              type="button"
              onClick={() => onSelectDate(cellDate)}
              className={cn(
                'group relative h-10 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer',
                isSelected
                  ? 'bg-[#1b1f2b] border border-[#2e374d] text-white font-extrabold shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
                  : 'hover:bg-white/5 text-white/85'
              )}
            >
              <span
                className={cn(
                  'text-xs font-semibold',
                  isSelected
                    ? 'text-white font-bold'
                    : isToday
                    ? 'text-[#8cee28] font-bold'
                    : 'text-white/80'
                )}
              >
                {d}
              </span>

              {/* Task Indicator Dot */}
              {hasTasks && (
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full mt-0.5',
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

              {/* Today indicator if not selected */}
              {isToday && !isSelected && !hasTasks && (
                <span className="w-1 h-1 rounded-full bg-[#8cee28] mt-0.5" />
              )}
            </button>
          );
        })}

        {/* Next Month Cells */}
        {nextMonthDays.map((d) => {
          const nextMonthIdx = month === 11 ? 0 : month + 1;
          const nextYear = month === 11 ? year + 1 : year;
          const cellDate = new Date(nextYear, nextMonthIdx, d);
          return (
            <button
              key={`next-${d}`}
              type="button"
              onClick={() => onSelectDate(cellDate)}
              className="h-10 rounded-xl flex flex-col items-center justify-center text-xs text-white/20 hover:text-white/40 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <span>{d}</span>
            </button>
          );
        })}
      </div>

      {/* Slide up / collapse handle */}
      <div
        onClick={onSlideUp}
        role="button"
        tabIndex={0}
        aria-label="Collapse to week view"
        className="flex flex-col items-center justify-center pt-2 pb-1 cursor-pointer group text-[#7d8495] hover:text-white transition-colors select-none"
      >
        <div className="w-10 h-1 rounded-full bg-white/20 group-hover:bg-[#8cee28] group-hover:w-12 transition-all duration-200 mb-1.5" />
        <div className="flex items-center gap-1 text-[11px] font-medium bg-white/5 group-hover:bg-[#8cee28]/10 group-hover:text-[#8cee28] px-3.5 py-1 rounded-full border border-white/5 group-hover:border-[#8cee28]/30 transition-all">
          <ChevronUp className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
          <span>Swipe up or tap to collapse</span>
        </div>
      </div>
    </motion.div>
  );
}
