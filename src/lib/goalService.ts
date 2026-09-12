import { db } from './firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  category: string;
  target: number;
  currentProgress: number;
  unit?: string;
  targetDate: string; // YYYY-MM-DD
  priority?: 'low' | 'medium' | 'high';
  milestones?: Milestone[];
  linkedHabitIds?: string[];
  status: 'in_progress' | 'completed' | 'paused' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

const LOCAL_GOALS_KEY = 'streak_goals_v1';

const DEFAULT_GOALS: Goal[] = [
  {
    id: 'goal-seed-1',
    title: 'Run a Half Marathon (21.1 km)',
    description: 'Build aerobic endurance and consistent weekly mileage',
    category: 'Fitness',
    target: 21,
    currentProgress: 14,
    unit: 'km',
    targetDate: '2026-11-15',
    priority: 'high',
    status: 'in_progress',
    milestones: [
      { id: 'm1', title: 'Continuous 5k without stopping', completed: true },
      { id: 'm2', title: 'Continuous 10k race pace', completed: true },
      { id: 'm3', title: '15k long endurance weekend run', completed: false },
      { id: 'm4', title: '21.1k race day completion', completed: false },
    ],
  },
  {
    id: 'goal-seed-2',
    title: 'Read 12 Deep Books',
    description: 'Focus on psychology, biology, systems thinking, and discipline',
    category: 'Study',
    target: 12,
    currentProgress: 7,
    unit: 'books',
    targetDate: '2026-12-31',
    priority: 'medium',
    status: 'in_progress',
    milestones: [
      { id: 'm5', title: 'Atomic Habits', completed: true },
      { id: 'm6', title: 'Thinking Fast & Slow', completed: true },
      { id: 'm7', title: 'Deep Work', completed: true },
      { id: 'm8', title: 'Principles by Ray Dalio', completed: false },
    ],
  },
  {
    id: 'goal-seed-3',
    title: 'Achieve 90 Days Daily Meditation',
    description: 'Mindfulness training for calmness and emotional stability',
    category: 'Health',
    target: 90,
    currentProgress: 42,
    unit: 'days',
    targetDate: '2026-10-30',
    priority: 'high',
    status: 'in_progress',
  },
];

export function readLocalGoals(): Goal[] {
  try {
    const raw = localStorage.getItem(LOCAL_GOALS_KEY);
    if (!raw) {
      saveLocalGoals(DEFAULT_GOALS);
      return DEFAULT_GOALS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_GOALS;
  }
}

export function saveLocalGoals(goals: Goal[]): void {
  try {
    localStorage.setItem(LOCAL_GOALS_KEY, JSON.stringify(goals));
  } catch {
    // Ignore storage issues
  }
}

export async function getUserGoals(userId?: string): Promise<Goal[]> {
  const local = readLocalGoals();
  if (!userId || userId === 'local' || userId === 'default') {
    return local;
  }

  try {
    const q = query(collection(db, 'goals'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const firestoreGoals: Goal[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId,
        title: data.title,
        description: data.description,
        category: data.category || 'General',
        target: data.target || 100,
        currentProgress: data.currentProgress || 0,
        unit: data.unit || '%',
        targetDate: data.targetDate || '',
        priority: data.priority || 'medium',
        milestones: data.milestones || [],
        linkedHabitIds: data.linkedHabitIds || [],
        status: data.status || 'in_progress',
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
      };
    });

    if (firestoreGoals.length > 0) {
      const map = new Map<string, Goal>();
      firestoreGoals.forEach((g) => map.set(g.id, g));
      local.forEach((g) => {
        if (!map.has(g.id)) map.set(g.id, g);
      });
      const merged = Array.from(map.values());
      saveLocalGoals(merged);
      return merged;
    }

    return local;
  } catch (err) {
    console.warn('Firestore goals query fallback to local:', err);
    return local;
  }
}

export async function createGoal(
  goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>,
  userId?: string
): Promise<Goal> {
  const tempId = 'goal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const newGoal: Goal = {
    ...goalData,
    id: tempId,
    userId,
    status: goalData.status || 'in_progress',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const local = readLocalGoals();
  local.unshift(newGoal);
  saveLocalGoals(local);

  if (userId && userId !== 'local' && userId !== 'default') {
    try {
      const docRef = await addDoc(collection(db, 'goals'), {
        userId,
        title: newGoal.title,
        description: newGoal.description || '',
        category: newGoal.category,
        target: newGoal.target,
        currentProgress: newGoal.currentProgress || 0,
        unit: newGoal.unit || '%',
        targetDate: newGoal.targetDate,
        priority: newGoal.priority || 'medium',
        milestones: newGoal.milestones || [],
        linkedHabitIds: newGoal.linkedHabitIds || [],
        status: newGoal.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      newGoal.id = docRef.id;
      const updatedLocal = readLocalGoals().map((g) => (g.id === tempId ? newGoal : g));
      saveLocalGoals(updatedLocal);
    } catch (err) {
      console.warn('Could not sync goal to Firestore:', err);
    }
  }

  return newGoal;
}

export async function updateGoal(
  goalId: string,
  updates: Partial<Goal>,
  userId?: string
): Promise<Goal | null> {
  const local = readLocalGoals();
  const index = local.findIndex((g) => g.id === goalId);
  if (index === -1) return null;

  const updated: Goal = {
    ...local[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  local[index] = updated;
  saveLocalGoals(local);

  if (userId && !goalId.startsWith('goal-seed_') && !goalId.startsWith('goal_')) {
    try {
      await updateDoc(doc(db, 'goals', goalId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Could not sync goal update to Firestore:', err);
    }
  }

  return updated;
}

export async function deleteGoal(goalId: string, userId?: string): Promise<boolean> {
  const local = readLocalGoals();
  const filtered = local.filter((g) => g.id !== goalId);
  saveLocalGoals(filtered);

  if (userId && !goalId.startsWith('goal-seed_') && !goalId.startsWith('goal_')) {
    try {
      await deleteDoc(doc(db, 'goals', goalId));
    } catch (err) {
      console.warn('Could not delete goal in Firestore:', err);
    }
  }

  return true;
}
