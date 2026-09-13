import fs from 'fs';
let code = fs.readFileSync('src/lib/habitService.ts', 'utf8');

const searchGetLogs = `export const getHabitLogs = async (userId: string, startDate?: string, endDate?: string): Promise<HabitLog[]> => {
  try {
    const q = query(`;
const replaceGetLogs = `export const getHabitLogs = async (userId: string, startDate?: string, endDate?: string): Promise<HabitLog[]> => {
  const local = readLocalLogs();
  if (!userId || userId === 'local' || userId === 'default') {
    let logs = local;
    if (startDate) logs = logs.filter(l => l.date >= startDate);
    if (endDate) logs = logs.filter(l => l.date <= endDate);
    return logs.sort((a, b) => b.date.localeCompare(a.date));
  }
  try {
    const q = query(`;

code = code.replace(searchGetLogs, replaceGetLogs);

const searchGetLogsEnd = `    if (endDate) {
      logs = logs.filter(l => l.date <= endDate);
    }
    
    return logs.sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {`;
const replaceGetLogsEnd = `    if (endDate) {
      logs = logs.filter(l => l.date <= endDate);
    }
    
    // Merge local logs
    const map = new Map<string, HabitLog>();
    logs.forEach(l => map.set(l.id || (l.habitId + '_' + l.date), l));
    local.forEach(l => {
      const key = l.id || (l.habitId + '_' + l.date);
      if (!map.has(key)) {
        if ((!startDate || l.date >= startDate) && (!endDate || l.date <= endDate)) {
          map.set(key, l);
        }
      }
    });
    const merged = Array.from(map.values());
    saveLocalLogs(merged);
    
    return merged.sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {`;

code = code.replace(searchGetLogsEnd, replaceGetLogsEnd);

fs.writeFileSync('src/lib/habitService.ts', code);
