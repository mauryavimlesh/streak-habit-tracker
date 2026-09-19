import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { isCloudSyncableUser } from './authUtils';
import { getTodayDateKey, addDays } from './dateUtils';

export interface Activity {
  id?: string;
  userId: string;
  name: string;
  durationMinutes: number;
  durationSeconds: number;
  date: string;
  time: string;
  startTime?: string;
  endTime?: string;
  category?: string;
  subject?: string;
  goalId?: string;
  activityId?: string;
  linkedHabitId?: string;
  completionStatus?: 'completed' | 'partial' | 'abandoned';
  notes?: string;
  createdAt?: any;
}

export interface StudyStatistics {
  totalStudyMinutes: number;
  todayStudyMinutes: number;
  weeklyStudyMinutes: number;
  monthlyStudyMinutes: number;
  sessionCount: number;
  averageSessionMinutes: number;
  longestSessionMinutes: number;
  bestStudyDay: { date: string; minutes: number } | null;
  studyStreakDays: number;
  subjectBreakdown: Record<string, { minutes: number; sessions: number }>;
}

const LOCAL_ACTIVITIES_KEY = 'streak_activities_v1';

export function getLocalActivities(): Activity[] {
  try {
    const raw = localStorage.getItem(LOCAL_ACTIVITIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalActivities(activities: Activity[]) {
  localStorage.setItem(LOCAL_ACTIVITIES_KEY, JSON.stringify(activities));
}

export async function saveActivity(activity: Omit<Activity, 'id' | 'createdAt'>, userId?: string) {
  activitiesMemoryCache = null;
  const local = getLocalActivities();
  const newActivity: Activity = { ...activity, id: 'act_' + Date.now() };
  local.unshift(newActivity);
  saveLocalActivities(local);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('streak_activities_updated'));
  }

  if (isCloudSyncableUser(userId)) {
    try {
      const docRef = await addDoc(collection(db, 'activities'), {
        ...activity,
        userId,
        createdAt: serverTimestamp(),
      });
      newActivity.id = docRef.id;
      saveLocalActivities(local.map(a => a.id === 'act_' + Date.now() ? newActivity : a));
    } catch (e) {
      console.warn('Error saving activity to firestore', e);
    }
  }
  return newActivity;
}

let activitiesMemoryCache: Activity[] | null = null;
let activitiesCacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

export function clearActivitiesCache() { activitiesMemoryCache = null; }
export async function getUserActivities(userId: string, force = false): Promise<Activity[]> {
  if (!isCloudSyncableUser(userId)) {
    return getLocalActivities();
  }
  if (!force && activitiesMemoryCache && Date.now() - activitiesCacheTimestamp < CACHE_TTL) {
    return activitiesMemoryCache;
  }
  try {
    const q = query(collection(db, 'activities'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
    saveLocalActivities(activities);
    activitiesMemoryCache = activities;
    activitiesCacheTimestamp = Date.now();
    return activities;
  } catch (e) {
    return getLocalActivities();
  }
}

export async function deleteActivity(id: string, userId?: string) {
  activitiesMemoryCache = null;
  const local = getLocalActivities().filter((a) => a.id !== id);
  saveLocalActivities(local);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('streak_activities_updated'));
  }

  if (isCloudSyncableUser(userId) && !id.startsWith('act_')) {
    try {
      await deleteDoc(doc(db, 'activities', id));
    } catch (e) {
      console.warn('Error deleting activity', e);
    }
  }
}

export function calculateStudyStatistics(activities: Activity[]): StudyStatistics {
  const todayStr = getTodayDateKey();
  const oneWeekAgoStr = addDays(todayStr, -7);
  const oneMonthAgoStr = addDays(todayStr, -30);

  let totalMinutes = 0;
  let todayMinutes = 0;
  let weeklyMinutes = 0;
  let monthlyMinutes = 0;
  let longestSession = 0;
  const dayTotals: Record<string, number> = {};
  const subjectBreakdown: Record<string, { minutes: number; sessions: number }> = {};

  for (const act of activities) {
    const mins = act.durationMinutes + (act.durationSeconds ? Math.round(act.durationSeconds / 60) : 0);
    totalMinutes += mins;
    if (mins > longestSession) longestSession = mins;

    if (act.date === todayStr) {
      todayMinutes += mins;
    }
    if (act.date >= oneWeekAgoStr && act.date <= todayStr) {
      weeklyMinutes += mins;
    }
    if (act.date >= oneMonthAgoStr && act.date <= todayStr) {
      monthlyMinutes += mins;
    }

    dayTotals[act.date] = (dayTotals[act.date] || 0) + mins;

    const subj = act.subject || act.category || 'General';
    if (!subjectBreakdown[subj]) {
      subjectBreakdown[subj] = { minutes: 0, sessions: 0 };
    }
    subjectBreakdown[subj].minutes += mins;
    subjectBreakdown[subj].sessions += 1;
  }

  // Calculate best study day
  let bestStudyDay: { date: string; minutes: number } | null = null;
  let maxDayMins = 0;
  for (const [date, mins] of Object.entries(dayTotals)) {
    if (mins > maxDayMins) {
      maxDayMins = mins;
      bestStudyDay = { date, minutes: mins };
    }
  }

  // Calculate consecutive active study streak days
  let studyStreakDays = 0;
  const yesterdayStr = addDays(todayStr, -1);
  const hasToday = (dayTotals[todayStr] || 0) > 0;
  const hasYesterday = (dayTotals[yesterdayStr] || 0) > 0;

  if (hasToday || hasYesterday) {
    let cursor = hasToday ? todayStr : yesterdayStr;
    while ((dayTotals[cursor] || 0) > 0) {
      studyStreakDays++;
      cursor = addDays(cursor, -1);
    }
  }

  const sessionCount = activities.length;
  const averageSessionMinutes = sessionCount > 0 ? Math.round(totalMinutes / sessionCount) : 0;

  return {
    totalStudyMinutes: totalMinutes,
    todayStudyMinutes: todayMinutes,
    weeklyStudyMinutes: weeklyMinutes,
    monthlyStudyMinutes: monthlyMinutes,
    sessionCount,
    averageSessionMinutes,
    longestSessionMinutes: longestSession,
    bestStudyDay,
    studyStreakDays,
    subjectBreakdown,
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('streak_activities_updated', () => {
    // Invalidate activity cache
    // Because activitiesMemoryCache is not exported, we need a function or just do it if we exported it
  });
}
if (typeof window !== 'undefined') {
  window.addEventListener('streak_activities_updated', () => clearActivitiesCache());
}
