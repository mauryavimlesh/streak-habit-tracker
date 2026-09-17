/**
 * Unified Date and Time Utilities for STREAK
 * Ensures canonical local date formatting (YYYY-MM-DD) without timezone shifts or UTC midnight drift.
 */

/**
 * Unified Date and Time Utilities for STREAK
 * Ensures canonical local and timezone-aware date formatting (YYYY-MM-DD) without timezone shifts or UTC midnight drift.
 */

/**
 * Returns the active user or system timezone string (e.g. 'America/New_York', 'Asia/Tokyo').
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Formats a Date object or timestamp into canonical YYYY-MM-DD.
 * If a timeZone is specified, formats the calendar date for that specific timezone.
 */
export function formatDateKey(d: Date | number = new Date(), timeZone?: string): string {
  const date = typeof d === 'number' ? new Date(d) : d;
  if (!timeZone) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

/**
 * Safely parses a YYYY-MM-DD string into a local midday Date.
 * Avoids the UTC-parsing bug of new Date("YYYY-MM-DD") and DST shifts.
 */
export function parseDateKey(dateStr: string): Date {
  if (!dateStr || !dateStr.includes('-')) {
    return new Date();
  }
  const parts = dateStr.split('T')[0].split('-').map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = (parts[1] || 1) - 1;
  const day = parts[2] || 1;
  return new Date(year, month, day, 12, 0, 0, 0);
}

export function getTodayDateKey(timeZone?: string): string {
  return formatDateKey(new Date(), timeZone);
}

export function getYesterdayDateKey(timeZone?: string): string {
  if (timeZone) {
    const today = getTodayDateKey(timeZone);
    return addDays(today, -1);
  }
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateKey(d);
}

export function getTomorrowDateKey(timeZone?: string): string {
  if (timeZone) {
    const today = getTodayDateKey(timeZone);
    return addDays(today, 1);
  }
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDateKey(d);
}

/**
 * Computes the epoch millisecond timestamps for the start (00:00:00.000)
 * and end (23:59:59.999) of a given dateKey in the specified timezone.
 */
export function getDayBoundaryTimestamps(dateKey: string, timeZone: string = getUserTimezone()): { startMs: number; endMs: number } {
  // We approximate the start of day in that timezone using noon reference
  const noon = parseDateKey(dateKey);
  // Search boundary within +/- 14 hours
  let testTime = noon.getTime() - 12 * 3600 * 1000;
  
  // Refine start of day (first ms where formatDateKey matches dateKey)
  while (formatDateKey(testTime, timeZone) < dateKey) {
    testTime += 3600 * 1000;
  }
  while (formatDateKey(testTime - 60000, timeZone) === dateKey) {
    testTime -= 60000;
  }
  while (formatDateKey(testTime - 1000, timeZone) === dateKey) {
    testTime -= 1000;
  }
  while (formatDateKey(testTime - 1, timeZone) === dateKey) {
    testTime -= 1;
  }
  const startMs = testTime;

  // Search end of day (last ms where formatDateKey matches dateKey)
  testTime = noon.getTime() + 12 * 3600 * 1000;
  while (formatDateKey(testTime, timeZone) > dateKey) {
    testTime -= 3600 * 1000;
  }
  while (formatDateKey(testTime + 60000, timeZone) === dateKey) {
    testTime += 60000;
  }
  while (formatDateKey(testTime + 1000, timeZone) === dateKey) {
    testTime += 1000;
  }
  while (formatDateKey(testTime + 1, timeZone) === dateKey) {
    testTime += 1;
  }
  const endMs = testTime;

  return { startMs, endMs };
}

/**
 * Adds (or subtracts) a number of days to a YYYY-MM-DD date key.
 */
export function addDays(dateKey: string, days: number): string {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + days);
  return formatDateKey(d);
}

/**
 * Calculates exact integer difference in days between two date keys (dateKey2 - dateKey1).
 */
export function diffDays(dateKey1: string, dateKey2: string): number {
  const d1 = parseDateKey(dateKey1);
  const d2 = parseDateKey(dateKey2);
  const msDiff = d2.getTime() - d1.getTime();
  return Math.round(msDiff / (1000 * 60 * 60 * 24));
}

/**
 * Checks if a dateKey is strictly before today.
 */
export function isPastDate(dateKey: string): boolean {
  return dateKey < getTodayDateKey();
}

/**
 * Checks if two dates are the same local calendar day.
 */
export function isSameDay(d1: Date | string, d2: Date | string): boolean {
  const k1 = typeof d1 === 'string' ? d1.split('T')[0] : formatDateKey(d1);
  const k2 = typeof d2 === 'string' ? d2.split('T')[0] : formatDateKey(d2);
  return k1 === k2;
}

/**
 * Human-readable date string (e.g. "Today, Oct 14" or "Mon, Oct 12").
 */
export function formatDisplayDate(dateKey: string): string {
  const today = getTodayDateKey();
  const yesterday = getYesterdayDateKey();
  const tomorrow = getTomorrowDateKey();

  if (dateKey === today) return 'Today';
  if (dateKey === yesterday) return 'Yesterday';
  if (dateKey === tomorrow) return 'Tomorrow';

  const d = parseDateKey(dateKey);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Formats a 24-hour time "HH:mm" or ISO string to 12-hour "h:mm AM/PM".
 */
export function formatTime12(timeStr?: string): string {
  if (!timeStr) return '';
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;

  const [hoursStr, minutesStr] = timeStr.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr ? minutesStr.substring(0, 2) : '00';
  if (isNaN(hours)) return timeStr;

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}
