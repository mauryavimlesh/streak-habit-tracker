import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
  AreaChart,
  Area,
} from 'recharts';
import {
  Flame,
  TrendingUp,
  Grid3X3,
  BarChart3,
  Dumbbell,
  Droplets,
  Moon,
  Activity,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { Habit, HabitLog } from '../../lib/habitService';
import { triggerHaptic } from '../../lib/haptics';

interface HabitConsistencyHeatmapProps {
  habits: Habit[];
  logs: HabitLog[];
  localProgress?: Record<string, number>;
  onSelectHabit?: (habitId: string) => void;
}

interface DayData {
  dateStr: string; // YYYY-MM-DD
  displayDate: string; // e.g. "Sep 15"
  shortWeekday: string; // "Tue"
  dayNumber: number; // 15
  isToday: boolean;
  completionRate: number; // 0 - 100
  completedCount: number;
  totalHabits: number;
  habitDetails: Record<
    string,
    {
      progress: number;
      target: number;
      unit: string;
      percentage: number;
      status: 'completed' | 'partial' | 'missed';
    }
  >;
}

export function HabitConsistencyHeatmap({
  habits,
  logs,
  localProgress = {},
  onSelectHabit,
}: HabitConsistencyHeatmapProps) {
  // Currently selected habit ('all' or habit.id)
  const [selectedHabitId, setSelectedHabitId] = useState<string>('all');
  // Visual presentation mode: 'matrix' (grid cells + mini trend) or 'trend' (expanded Recharts area/bars)
  const [viewMode, setViewMode] = useState<'matrix' | 'trend'>('matrix');
  // Interactive hover or selected day for detailed inspection
  const [inspectedDateStr, setInspectedDateStr] = useState<string | null>(null);

  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

  // Filter out archived habits to focus purely on active habits
  const activeHabits = useMemo(() => {
    return habits.filter((h) => !h.archived);
  }, [habits]);

  // Selected habit object (if any)
  const selectedHabit = useMemo(() => {
    if (selectedHabitId === 'all') return null;
    return activeHabits.find((h) => h.id === selectedHabitId) || null;
  }, [activeHabits, selectedHabitId]);

  // Generate 30-day timeline ending today
  const thirtyDaysData: DayData[] = useMemo(() => {
    const list: DayData[] = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);

      const dateStr = d.toLocaleDateString('en-CA');
      const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const shortWeekday = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNumber = d.getDate();
      const isToday = dateStr === todayStr;

      const dayLogs = logs.filter((l) => l.date === dateStr);
      let completedHabitsCount = 0;
      const habitDetails: DayData['habitDetails'] = {};

      activeHabits.forEach((habit) => {
        const habitId = habit.id!;
        const target = habit.targetValue || 1;
        const unit = habit.targetUnit || 'times';

        let progress = 0;
        if (isToday && localProgress[habitId] !== undefined) {
          progress = localProgress[habitId];
        } else {
          const matchedLog = dayLogs.find((l) => l.habitId === habitId);
          if (matchedLog) {
            progress =
              typeof matchedLog.progressValue === 'number'
                ? matchedLog.progressValue
                : matchedLog.status === 'completed'
                ? target
                : 0;
          }
        }

        const percentage = Math.min(100, Math.round((progress / target) * 100));
        let status: 'completed' | 'partial' | 'missed' = 'missed';
        if (progress >= target) {
          status = 'completed';
          completedHabitsCount++;
        } else if (progress > 0) {
          status = 'partial';
        }

        habitDetails[habitId] = {
          progress,
          target,
          unit,
          percentage,
          status,
        };
      });

      const completionRate =
        activeHabits.length > 0
          ? Math.round((completedHabitsCount / activeHabits.length) * 100)
          : 0;

      list.push({
        dateStr,
        displayDate,
        shortWeekday,
        dayNumber,
        isToday,
        completionRate,
        completedCount: completedHabitsCount,
        totalHabits: activeHabits.length,
        habitDetails,
      });
    }

    return list;
  }, [activeHabits, logs, localProgress, todayStr]);

  // Pre-select today as default inspected date if none chosen
  const activeInspectedDate = inspectedDateStr || todayStr;
  const currentInspectedDay = useMemo(() => {
    return thirtyDaysData.find((d) => d.dateStr === activeInspectedDate) || thirtyDaysData[thirtyDaysData.length - 1];
  }, [thirtyDaysData, activeInspectedDate]);

  // Statistics calculation for the current selection (All or specific habit)
  const stats = useMemo(() => {
    let totalDaysMet = 0;
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let totalScoreSum = 0;

    thirtyDaysData.forEach((day, index) => {
      let isMet = false;
      let score = 0;

      if (selectedHabit) {
        const detail = day.habitDetails[selectedHabit.id!];
        if (detail) {
          isMet = detail.status === 'completed';
          score = detail.percentage;
        }
      } else {
        // For All Habits, consider day met if completionRate >= 70% or at least 1 habit completed if few
        isMet = day.completionRate >= 66 || (activeHabits.length <= 2 && day.completedCount > 0);
        score = day.completionRate;
      }

      totalScoreSum += score;
      if (isMet) {
        totalDaysMet++;
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }

      // If this is today or yesterday, check current streak backwards
      if (index === thirtyDaysData.length - 1) {
        let backCount = 0;
        for (let j = thirtyDaysData.length - 1; j >= 0; j--) {
          const d = thirtyDaysData[j];
          const met = selectedHabit
            ? d.habitDetails[selectedHabit.id!]?.status === 'completed'
            : d.completionRate >= 66 || (activeHabits.length <= 2 && d.completedCount > 0);
          if (met) {
            backCount++;
          } else {
            // If today is not done yet, allow streak to count from yesterday
            if (j === thirtyDaysData.length - 1) {
              continue;
            }
            break;
          }
        }
        currentStreak = backCount;
      }
    });

    const avgConsistency = Math.round(totalScoreSum / Math.max(1, thirtyDaysData.length));

    return {
      daysMet: totalDaysMet,
      totalDays: thirtyDaysData.length,
      consistencyRate: avgConsistency,
      currentStreak,
      longestStreak,
    };
  }, [thirtyDaysData, selectedHabit, activeHabits.length]);

  // Recharts Chart Dataset mapped for the selected habit or aggregate
  const chartData = useMemo(() => {
    return thirtyDaysData.map((day) => {
      if (selectedHabit) {
        const detail = day.habitDetails[selectedHabit.id!];
        return {
          dateStr: day.dateStr,
          displayDate: day.displayDate,
          shortWeekday: day.shortWeekday,
          isToday: day.isToday,
          percentage: detail ? detail.percentage : 0,
          progress: detail ? detail.progress : 0,
          target: detail ? detail.target : selectedHabit.targetValue || 1,
          unit: detail ? detail.unit : selectedHabit.targetUnit || 'times',
          status: detail ? detail.status : 'missed',
          rate: detail ? detail.percentage : 0,
        };
      }
      return {
        dateStr: day.dateStr,
        displayDate: day.displayDate,
        shortWeekday: day.shortWeekday,
        isToday: day.isToday,
        percentage: day.completionRate,
        progress: day.completedCount,
        target: day.totalHabits,
        unit: 'habits',
        status: day.completionRate >= 100 ? 'completed' : day.completionRate > 0 ? 'partial' : 'missed',
        rate: day.completionRate,
      };
    });
  }, [thirtyDaysData, selectedHabit]);

  // Habit visual icon selector
  const getHabitIcon = (habit: Habit) => {
    const nameLower = habit.name.toLowerCase();
    if (nameLower.includes('workout') || nameLower.includes('exercise') || habit.icon === 'dumbbell') {
      return <Dumbbell className="w-3.5 h-3.5" />;
    }
    if (nameLower.includes('water') || habit.icon === 'droplets') {
      return <Droplets className="w-3.5 h-3.5" />;
    }
    if (nameLower.includes('sleep') || habit.icon === 'moon') {
      return <Moon className="w-3.5 h-3.5" />;
    }
    return <Activity className="w-3.5 h-3.5" />;
  };

  // Color generator based on intensity (0% to 100%)
  const getCellColor = (percentage: number, isSelectedDay: boolean, habitColor?: string) => {
    if (percentage === 0) {
      return isSelectedDay ? 'bg-[#2a3040] border-white/40' : 'bg-[#181c25] border-[#222838]';
    }
    if (percentage < 40) {
      return isSelectedDay
        ? 'bg-[#8cee28]/35 border-[#8cee28]'
        : 'bg-[#8cee28]/25 border-[#8cee28]/35';
    }
    if (percentage < 80) {
      return isSelectedDay
        ? 'bg-[#8cee28]/60 border-[#8cee28]'
        : 'bg-[#8cee28]/50 border-[#8cee28]/60';
    }
    // 100%+ completion
    return isSelectedDay
      ? 'bg-accent-primary border-white shadow-[0_0_8px_rgba(140,238,40,0.6)]'
      : 'bg-accent-primary border-accent-primary/80';
  };

  if (activeHabits.length === 0) {
    return (
      <div className="glass-effect rounded-[28px] p-6 border border-[#212633] text-center">
        <Calendar className="w-8 h-8 text-[#7d8495] mx-auto mb-2 opacity-60" />
        <h3 className="text-[15px] font-bold text-white mb-1">Habit Consistency Heatmap</h3>
        <p className="text-xs text-[#7d8495]">Create your first habit to visualize 30-day consistency progress.</p>
      </div>
    );
  }

  return (
    <section className="glass-effect rounded-[28px] p-5 border border-[#212633] space-y-4 select-none relative overflow-hidden">
      {/* Header with Title and Mode Switcher */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#1e2f18] border border-[#2d5025] flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-accent-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[15.5px] font-bold text-white tracking-tight">
                Habit Consistency Heatmap
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-[#8c94a5]">
                Last 30 Days
              </span>
            </div>
            <p className="text-[12px] text-[#7d8495] mt-0.5">
              {selectedHabit ? `${selectedHabit.name} progress` : 'Active habits completion overview'}
            </p>
          </div>
        </div>

        {/* View Mode Toggle: Matrix vs Trend */}
        <div className="flex items-center p-0.5 rounded-xl bg-[#13161f] border border-[#232938] shrink-0">
          <button
            type="button"
            title="Heatmap Matrix"
            onClick={() => {
              triggerHaptic('tap');
              setViewMode('matrix');
            }}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'matrix'
                ? 'bg-[#222837] text-white shadow-sm'
                : 'text-[#6c7487] hover:text-[#9ea6b8]'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Recharts 30-Day Trend"
            onClick={() => {
              triggerHaptic('tap');
              setViewMode('trend');
            }}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'trend'
                ? 'bg-[#222837] text-white shadow-sm'
                : 'text-[#6c7487] hover:text-[#9ea6b8]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Active Habit Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        {/* 'All Habits' tab */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            setSelectedHabitId('all');
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all border cursor-pointer ${
            selectedHabitId === 'all'
              ? 'bg-accent-primary text-black border-accent-primary shadow-[0_2px_10px_rgba(140,238,40,0.25)]'
              : 'bg-[#161922] text-[#8c94a5] border-[#222736] hover:text-white hover:border-[#32394c]'
          }`}
        >
          <Layers className="w-3 h-3" />
          <span>All Active ({activeHabits.length})</span>
        </button>

        {/* Individual Active Habits */}
        {activeHabits.map((habit) => {
          const isSelected = selectedHabitId === habit.id;
          // Calculate 30-day completion rate for this habit
          let completedDays = 0;
          thirtyDaysData.forEach((d) => {
            if (d.habitDetails[habit.id!]?.status === 'completed') {
              completedDays++;
            }
          });
          const habitRate = Math.round((completedDays / 30) * 100);

          return (
            <button
              key={habit.id}
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setSelectedHabitId(habit.id!);
                if (onSelectHabit && habit.id) {
                  onSelectHabit(habit.id);
                }
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all border cursor-pointer ${
                isSelected
                  ? 'bg-accent-primary text-black border-accent-primary shadow-[0_2px_10px_rgba(140,238,40,0.25)]'
                  : 'bg-[#161922] text-[#8c94a5] border-[#222736] hover:text-white hover:border-[#32394c]'
              }`}
            >
              <span className={isSelected ? 'text-black' : 'text-accent-primary'}>
                {getHabitIcon(habit)}
              </span>
              <span className="truncate max-w-[110px]">{habit.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-black/20 text-black' : 'bg-[#222838] text-[#a0a8b9]'
                }`}
              >
                {habitRate}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-[#12151d]/90 border border-[#202533]">
        <div className="text-center">
          <span className="text-[11px] text-[#7d8495] block font-medium">30d Consistency</span>
          <span className="text-lg font-black text-accent-primary tracking-tight">
            {stats.consistencyRate}%
          </span>
        </div>
        <div className="text-center border-x border-[#232838]">
          <span className="text-[11px] text-[#7d8495] block font-medium">Completed</span>
          <span className="text-lg font-black text-white tracking-tight">
            {stats.daysMet}
            <span className="text-xs text-[#7d8495] font-normal">/30d</span>
          </span>
        </div>
        <div className="text-center">
          <span className="text-[11px] text-[#7d8495] block font-medium">Best Streak</span>
          <span className="text-lg font-black text-white tracking-tight flex items-center justify-center gap-1">
            <Flame className="w-3.5 h-3.5 fill-accent-primary text-accent-primary inline" />
            {stats.longestStreak}d
          </span>
        </div>
      </div>

      {/* Recharts Consistency Visualization Chart */}
      <div className="p-3.5 rounded-2xl bg-[#12151d]/90 border border-[#202533] relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
            <span className="text-[11.5px] font-semibold text-white">
              {selectedHabit ? `${selectedHabit.name} Daily Completion` : 'Daily Active Consistency Rate'}
            </span>
          </div>
          <span className="text-[10px] text-[#7d8495]">Target: 100%</span>
        </div>

        <div className="h-[130px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'trend' ? (
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 4, left: -25, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const d = e.activePayload[0].payload;
                    triggerHaptic('tap');
                    setInspectedDateStr(d.dateStr);
                  }
                }}
              >
                <defs>
                  <linearGradient id="consistencyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--app-accent, #8cee28)" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="var(--app-accent, #8cee28)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="displayDate"
                  axisLine={false}
                  tickLine={false}
                  interval={6}
                  tick={{ fontSize: 10, fill: '#6c7487' }}
                  dy={6}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  ticks={[0, 50, 100]}
                  tick={{ fontSize: 9, fill: '#6c7487' }}
                  unit="%"
                />
                <ReferenceLine y={100} stroke="#2e384c" strokeDasharray="3 3" />
                <Tooltip
                  cursor={{ stroke: 'rgba(140,238,40,0.3)', strokeWidth: 1.5 }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="p-2.5 rounded-xl bg-[#1a1e29] border border-[#2b3346] shadow-xl text-xs space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-bold text-white">
                            {data.shortWeekday}, {data.displayDate}
                          </span>
                          {data.isToday && (
                            <span className="text-[9px] bg-accent-primary/20 text-accent-primary font-bold px-1.5 py-0.2 rounded-md">
                              TODAY
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[#9da5b7]">
                          <span>Progress:</span>
                          <span className="font-semibold text-accent-primary">
                            {data.progress} / {data.target} {data.unit} ({data.percentage}%)
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="percentage"
                  stroke="var(--app-accent, #8cee28)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#consistencyGradient)"
                  activeDot={{ r: 5, fill: 'var(--app-accent, #8cee28)', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            ) : (
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 0, left: -25, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const d = e.activePayload[0].payload;
                    triggerHaptic('tap');
                    setInspectedDateStr(d.dateStr);
                  }
                }}
              >
                <XAxis
                  dataKey="displayDate"
                  axisLine={false}
                  tickLine={false}
                  interval={6}
                  tick={{ fontSize: 10, fill: '#6c7487' }}
                  dy={6}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  ticks={[0, 50, 100]}
                  tick={{ fontSize: 9, fill: '#6c7487' }}
                  unit="%"
                />
                <ReferenceLine y={100} stroke="#2e384c" strokeDasharray="3 3" />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="p-2.5 rounded-xl bg-[#1a1e29] border border-[#2b3346] shadow-xl text-xs space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-bold text-white">
                            {data.shortWeekday}, {data.displayDate}
                          </span>
                          {data.isToday && (
                            <span className="text-[9px] bg-accent-primary/20 text-accent-primary font-bold px-1.5 py-0.2 rounded-md">
                              TODAY
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[#9da5b7]">
                          <span>Progress:</span>
                          <span className="font-semibold text-accent-primary">
                            {data.progress} / {data.target} {data.unit} ({data.percentage}%)
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="percentage" radius={[3, 3, 1, 1]} maxBarSize={9}>
                  {chartData.map((entry, idx) => {
                    const isSelectedDay = entry.dateStr === activeInspectedDate;
                    let fill = '#1c2230';
                    if (entry.percentage >= 100) fill = 'var(--app-accent, #8cee28)';
                    else if (entry.percentage >= 50) fill = 'rgba(140,238,40,0.6)';
                    else if (entry.percentage > 0) fill = 'rgba(140,238,40,0.3)';

                    if (isSelectedDay) fill = '#ffffff';

                    return (
                      <Cell
                        key={`bar-${idx}`}
                        fill={fill}
                        className="cursor-pointer transition-colors hover:opacity-80"
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 30-Day Heatmap Grid Matrix */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Grid3X3 className="w-3.5 h-3.5 text-accent-primary" />
            30-Day Heatmap Grid
          </span>
          {/* Heatmap Legend */}
          <div className="flex items-center gap-1.5 text-[10px] text-[#6c7487]">
            <span>Less</span>
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#181c25] border border-[#222838]" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#8cee28]/25" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#8cee28]/60" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-accent-primary" />
            <span>More</span>
          </div>
        </div>

        {/* If 'all' is selected, render multi-habit matrix rows so users can compare habits side by side! */}
        {selectedHabitId === 'all' ? (
          <div className="space-y-2.5 p-3 rounded-2xl bg-[#12151d]/70 border border-[#202533] overflow-x-auto scrollbar-none">
            {activeHabits.map((habit) => {
              return (
                <div key={habit.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[#8c94a5]">
                    <div className="flex items-center gap-1.5 font-medium text-white truncate max-w-[200px]">
                      <span className="text-accent-primary">{getHabitIcon(habit)}</span>
                      <span className="truncate">{habit.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        setSelectedHabitId(habit.id!);
                      }}
                      className="text-[10px] font-semibold text-accent-primary hover:underline"
                    >
                      Focus
                    </button>
                  </div>

                  {/* 30 day squares for this habit */}
                  <div className="flex items-center gap-1 justify-between">
                    {thirtyDaysData.map((day) => {
                      const detail = day.habitDetails[habit.id!];
                      const pct = detail ? detail.percentage : 0;
                      const isSelected = day.dateStr === activeInspectedDate;

                      return (
                        <button
                          key={`${habit.id}-${day.dateStr}`}
                          type="button"
                          title={`${day.shortWeekday}, ${day.displayDate}: ${detail?.progress || 0}/${detail?.target || 1} ${detail?.unit || ''} (${pct}%)`}
                          onClick={() => {
                            triggerHaptic('tap');
                            setInspectedDateStr(day.dateStr);
                          }}
                          className={`flex-1 aspect-square rounded-[3px] border transition-all cursor-pointer ${getCellColor(
                            pct,
                            isSelected
                          )} ${day.isToday ? 'ring-1 ring-white/50' : ''}`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Single habit focused 30-day block grid */
          <div className="p-3 rounded-2xl bg-[#12151d]/70 border border-[#202533]">
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
              {thirtyDaysData.map((day) => {
                const detail = selectedHabit ? day.habitDetails[selectedHabit.id!] : null;
                const pct = detail ? detail.percentage : day.completionRate;
                const isSelected = day.dateStr === activeInspectedDate;

                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setInspectedDateStr(day.dateStr);
                    }}
                    className={`h-9 rounded-xl border p-1 flex flex-col justify-between items-center transition-all cursor-pointer ${getCellColor(
                      pct,
                      isSelected
                    )} ${day.isToday ? 'ring-2 ring-white' : ''}`}
                  >
                    <span
                      className={`text-[9px] font-semibold leading-none ${
                        pct >= 80 ? 'text-black' : isSelected ? 'text-white' : 'text-[#828a9b]'
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                    <span
                      className={`text-[8px] font-bold uppercase leading-none ${
                        pct >= 80 ? 'text-black/80' : isSelected ? 'text-white/80' : 'text-[#616878]'
                      }`}
                    >
                      {day.shortWeekday.slice(0, 1)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Inspector Detail Banner for selected day */}
        {currentInspectedDay && (
          <div className="p-3 rounded-2xl bg-[#161a24] border border-[#242b3b] flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-accent-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">
                    {currentInspectedDay.shortWeekday}, {currentInspectedDay.displayDate}
                  </span>
                  {currentInspectedDay.isToday && (
                    <span className="text-[9px] bg-accent-primary text-black font-extrabold px-1.5 py-0.2 rounded-md">
                      TODAY
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#8c94a5] truncate">
                  {selectedHabit ? (
                    (() => {
                      const detail = currentInspectedDay.habitDetails[selectedHabit.id!];
                      if (!detail) return 'No log recorded';
                      return `${detail.progress} of ${detail.target} ${detail.unit} (${detail.percentage}%)`;
                    })()
                  ) : (
                    `${currentInspectedDay.completedCount} of ${currentInspectedDay.totalHabits} active habits completed (${currentInspectedDay.completionRate}%)`
                  )}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-right">
              {(() => {
                const pct = selectedHabit
                  ? currentInspectedDay.habitDetails[selectedHabit.id!]?.percentage ?? 0
                  : currentInspectedDay.completionRate;

                if (pct >= 100) {
                  return (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-accent-primary bg-accent-primary/10 border border-accent-primary/20 px-2 py-0.5 rounded-lg">
                      <CheckCircle2 className="w-3 h-3" /> Done
                    </span>
                  );
                }
                if (pct > 0) {
                  return (
                    <span className="text-[11px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-lg">
                      Partial
                    </span>
                  );
                }
                return (
                  <span className="text-[11px] font-medium text-[#7d8495] bg-white/5 px-2 py-0.5 rounded-lg">
                    Missed
                  </span>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
