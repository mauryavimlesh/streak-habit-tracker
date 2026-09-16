export interface GoogleCalendarConfig {
  connected: boolean;
  syncGoals: boolean;
  syncTasks: boolean;
  syncHabits: boolean;
  syncFocusSessions: boolean;
  syncStudyActivities: boolean;
  accessToken?: string;
  tokenExpiry?: number;
  userEmail?: string;
}

const GCAL_CONFIG_KEY = 'streak_google_calendar_config_v1';

const DEFAULT_CONFIG: GoogleCalendarConfig = {
  connected: false,
  syncGoals: false,
  syncTasks: false,
  syncHabits: false,
  syncFocusSessions: false,
  syncStudyActivities: false,
};

export function getGoogleCalendarConfig(): GoogleCalendarConfig {
  try {
    const raw = localStorage.getItem(GCAL_CONFIG_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveGoogleCalendarConfig(config: Partial<GoogleCalendarConfig>): GoogleCalendarConfig {
  const current = getGoogleCalendarConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(GCAL_CONFIG_KEY, JSON.stringify(updated));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('streak_gcal_config_updated', { detail: updated }));
  }
  return updated;
}

export function disconnectGoogleCalendar(): void {
  const current = getGoogleCalendarConfig();
  const updated: GoogleCalendarConfig = {
    ...DEFAULT_CONFIG,
    connected: false,
    accessToken: undefined,
    tokenExpiry: undefined,
    userEmail: undefined,
  };
  localStorage.setItem(GCAL_CONFIG_KEY, JSON.stringify(updated));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('streak_gcal_config_updated', { detail: updated }));
  }
}

/**
 * Creates a Google Calendar web template link that opens calendar.google.com
 * with all details pre-filled so user can add with a single click.
 */
export function createGoogleCalendarEventUrl(event: {
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm or "10:00 AM"
  endTime?: string;
  durationMinutes?: number;
}): string {
  const title = encodeURIComponent(event.title || 'STREAK Study Session');
  const details = encodeURIComponent(
    `${event.description || ''}\n\nManaged by STREAK - Student Productivity Ecosystem\nhttps://streakloop.vercel.app`
  );

  let startDateTime = `${event.date.replace(/-/g, '')}T090000Z`;
  let endDateTime = `${event.date.replace(/-/g, '')}T100000Z`;

  if (event.startTime) {
    // Basic time parser
    const timeMatch = event.startTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const meridiem = timeMatch[3]?.toUpperCase();

      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;

      const durMinutes = event.durationMinutes || 60;
      const endHours = hours + Math.floor((minutes + durMinutes) / 60);
      const endMins = (minutes + durMinutes) % 60;

      const pad = (n: number) => n.toString().padStart(2, '0');
      startDateTime = `${event.date.replace(/-/g, '')}T${pad(hours)}${pad(minutes)}00`;
      endDateTime = `${event.date.replace(/-/g, '')}T${pad(endHours)}${pad(endMins)}00`;
    }
  }

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${startDateTime}/${endDateTime}`;
}

export interface SmartScheduleSlot {
  id: string;
  title: string;
  subject?: string;
  type: string;
  startTime: string; // e.g. "10:00 AM"
  endTime: string; // e.g. "11:00 AM"
  durationMinutes: number;
}

/**
 * Calculates a balanced, chronological smart study schedule for a list of daily goal activities.
 */
export function calculateSmartStudySchedule(
  activities: { id?: string; title: string; subject?: string; type?: string; estimatedDuration?: number }[],
  options: {
    startHour?: number; // default 10 (10:00 AM)
    bufferMinutes?: number; // default 10 mins break between sessions
    slotDurationMinutes?: number; // default 50 mins
  } = {}
): SmartScheduleSlot[] {
  const startHour = options.startHour ?? 10;
  const buffer = options.bufferMinutes ?? 10;
  const defaultSlotDur = options.slotDurationMinutes ?? 50;

  let currentMinutesFromMidnight = startHour * 60;
  const slots: SmartScheduleSlot[] = [];

  const formatTime = (totalMinutes: number): string => {
    const hours24 = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    const meridiem = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return `${hours12}:${mins.toString().padStart(2, '0')} ${meridiem}`;
  };

  for (let i = 0; i < activities.length; i++) {
    const act = activities[i];
    const dur = act.estimatedDuration || defaultSlotDur;
    const startTime = formatTime(currentMinutesFromMidnight);
    const endMinutes = currentMinutesFromMidnight + dur;
    const endTime = formatTime(endMinutes);

    slots.push({
      id: act.id || 'slot_' + i,
      title: act.title,
      subject: act.subject,
      type: act.type || 'Lecture',
      startTime,
      endTime,
      durationMinutes: dur,
    });

    currentMinutesFromMidnight = endMinutes + buffer;
  }

  return slots;
}

/**
 * Exports a list of scheduled slots as an iCalendar (.ics) file for Google Calendar / Apple Calendar.
 */
export function downloadICSFile(filename: string, events: { title: string; date: string; startTime?: string; durationMinutes?: number; description?: string }[]) {
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//STREAK//Student Productivity Ecosystem//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  events.forEach((ev, idx) => {
    const cleanDate = ev.date.replace(/-/g, '');
    let dtStart = `${cleanDate}T090000Z`;
    let dtEnd = `${cleanDate}T100000Z`;

    if (ev.startTime) {
      const match = ev.startTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        if (match[3]?.toUpperCase() === 'PM' && h < 12) h += 12;
        if (match[3]?.toUpperCase() === 'AM' && h === 12) h = 0;
        const dur = ev.durationMinutes || 60;
        const pad = (n: number) => n.toString().padStart(2, '0');
        dtStart = `${cleanDate}T${pad(h)}${pad(m)}00`;
        const endTotal = h * 60 + m + dur;
        const endH = Math.floor(endTotal / 60) % 24;
        const endM = endTotal % 60;
        dtEnd = `${cleanDate}T${pad(endH)}${pad(endM)}00`;
      }
    }

    icsContent.push(
      'BEGIN:VEVENT',
      `UID:streak-${Date.now()}-${idx}@streakloop.app`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${ev.title}`,
      `DESCRIPTION:${ev.description || 'Study session managed by STREAK'}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  });

  icsContent.push('END:VCALENDAR');
  const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
