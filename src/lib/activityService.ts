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
  linkedHabitId?: string;
  createdAt?: any;
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
