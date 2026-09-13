import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { HabitLog, Habit } from '../../lib/habitService';

interface Props {
  logs: HabitLog[];
  habits: Habit[];
}

export function WeeklyProgressChart({ logs, habits }: Props) {
  if (habits.length === 0) return null;

  // Generate last 7 days
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-CA');
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

    // Calculate completion for this day
    const dayLogs = logs.filter(l => l.date === dateStr);
    
    let completedCount = 0;
    habits.forEach(habit => {
      const log = dayLogs.find(l => l.habitId === habit.id);
      const val = log?.progressValue ?? (log?.status === 'completed' ? 1 : 0);
      const target = habit.targetValue || 1;
      if (val >= target) completedCount++;
    });

    const percent = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;
    data.push({ day: dayName, percent, isToday: i === 0 });
  }

  return (
    <div className="bg-[#1a1d25]/60 backdrop-blur-md rounded-3xl p-5 border border-[#262b36] mt-5 mb-5">
      <h3 className="text-[14px] font-semibold text-white mb-4 tracking-tight">Weekly Progress</h3>
      <div className="h-[120px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#7d8495' }} 
              dy={10} 
            />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
              contentStyle={{ backgroundColor: '#1a1d25', border: '1px solid #262b36', borderRadius: '12px', fontSize: '12px', color: '#fff' }} 
              formatter={(val: number) => [`${val}%`, 'Completed']}
              labelStyle={{ color: '#7d8495', marginBottom: '4px' }}
            />
            <Bar dataKey="percent" radius={[4, 4, 4, 4]} barSize={24}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.isToday ? 'var(--app-accent)' : '#262b36'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
