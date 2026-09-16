import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

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
  const local = getLocalActivities();
  const newActivity: Activity = { ...activity, id: 'act_' + Date.now() };
  local.unshift(newActivity);
  saveLocalActivities(local);

  if (userId && userId !== 'local' && userId !== 'default') {
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

export async function getUserActivities(userId: string): Promise<Activity[]> {
  if (!userId || userId === 'local' || userId === 'default') {
    return getLocalActivities();
  }
  try {
    const q = query(collection(db, 'activities'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
    saveLocalActivities(activities);
    return activities;
  } catch (e) {
    return getLocalActivities();
  }
}

export async function deleteActivity(id: string, userId?: string) {
  const local = getLocalActivities().filter(a => a.id !== id);
  saveLocalActivities(local);

  if (userId && userId !== 'local' && userId !== 'default' && !id.startsWith('act_')) {
    try {
      await deleteDoc(doc(db, 'activities', id));
    } catch (e) {
      console.warn('Error deleting activity', e);
    }
  }
}

export function calculateStudyStatistics(activities: Activity[]): StudyStatistics {
  const todayStr = new Date().toLocaleDateString('en-CA');
  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoStr = oneWeekAgo.toLocaleDateString('en-CA');

  const oneMonthAgo = new Date(now);
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  const oneMonthAgoStr = oneMonthAgo.toLocaleDateString('en-CA');

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
    if (act.date >= oneWeekAgoStr) {
      weeklyMinutes += mins;
    }
    if (act.date >= oneMonthAgoStr) {
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
  const checkDate = new Date();
  while (true) {
    const dateStr = checkDate.toLocaleDateString('en-CA');
    if ((dayTotals[dateStr] || 0) > 0) {
      studyStreakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // If today has 0 so far, check if yesterday was active
      if (dateStr === todayStr) {
        checkDate.setDate(checkDate.getDate() - 1);
        const yestStr = checkDate.toLocaleDateString('en-CA');
        if ((dayTotals[yestStr] || 0) > 0) {
          // continue checking from yesterday
          continue;
        }
      }
      break;
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
