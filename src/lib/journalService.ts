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

export type JournalMood = 'great' | 'good' | 'neutral' | 'tired' | 'stressed';

export interface JournalEntry {
  id: string;
  userId?: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "9:30 PM"
  mood: JournalMood;
  title?: string;
  text: string;
  tags?: string[];
  images?: string[];
  linkedHabitIds?: string[];
  linkedGoalIds?: string[];
  prompt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const LOCAL_JOURNAL_KEY = 'streak_journal_v1';

const DEFAULT_ENTRIES: JournalEntry[] = [
  {
    id: 'entry-seed-1',
    date: new Date().toISOString().split('T')[0],
    time: '8:45 PM',
    mood: 'great',
    title: 'Focused deep-work sprint & morning 5k',
    text: 'Hit flow state early in the morning after the outdoor run. Consistency is becoming natural rather than forced. Tomorrow I will tackle the highest-friction task first.',
    tags: ['Fitness', 'Deep Work', 'Consistency'],
    prompt: 'What went well today?',
  },
  {
    id: 'entry-seed-2',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    time: '9:15 PM',
    mood: 'good',
    title: 'Clean recovery & hydration check',
    text: 'Drank all 8 glasses of water. Felt more sustained energy throughout the late afternoon without reaching for extra caffeine. Sleep discipline is improving.',
    tags: ['Health', 'Hydration', 'Energy'],
    prompt: 'What gave me energy today?',
  },
];

export function readLocalJournal(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_JOURNAL_KEY);
    if (!raw) {
      saveLocalJournal(DEFAULT_ENTRIES);
      return DEFAULT_ENTRIES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_ENTRIES;
  }
}

export function saveLocalJournal(entries: JournalEntry[]): void {
  try {
    localStorage.setItem(LOCAL_JOURNAL_KEY, JSON.stringify(entries));
  } catch {
    // Ignore
  }
}

export async function getUserJournal(userId?: string): Promise<JournalEntry[]> {
  const local = readLocalJournal();
  if (!userId || userId === 'local' || userId === 'default') {
    return local;
  }

  try {
    const q = query(collection(db, 'journal_logs'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const firestoreEntries: JournalEntry[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId,
        date: data.date,
        time: data.time || '8:00 PM',
        mood: (data.mood as JournalMood) || 'good',
        title: data.title,
        text: data.text || '',
        tags: data.tags || [],
        images: data.images || [],
        linkedHabitIds: data.linkedHabitIds || [],
        linkedGoalIds: data.linkedGoalIds || [],
        prompt: data.prompt,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
      };
    });

    if (firestoreEntries.length > 0) {
      const map = new Map<string, JournalEntry>();
      firestoreEntries.forEach((e) => map.set(e.id, e));
      local.forEach((e) => {
        if (!map.has(e.id)) map.set(e.id, e);
      });
      const merged = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
      saveLocalJournal(merged);
      return merged;
    }

    return local;
  } catch (err) {
    console.warn('Firestore journal query fallback to local:', err);
    return local;
  }
}

export async function createJournalEntry(
  entryData: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>,
  userId?: string
): Promise<JournalEntry> {
  const tempId = 'journal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const newEntry: JournalEntry = {
    ...entryData,
    id: tempId,
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const local = readLocalJournal();
  local.unshift(newEntry);
  saveLocalJournal(local);

  if (userId && userId !== 'local' && userId !== 'default') {
    try {
      const docRef = await addDoc(collection(db, 'journal_logs'), {
        userId,
        date: newEntry.date,
        time: newEntry.time,
        mood: newEntry.mood,
        title: newEntry.title || '',
        text: newEntry.text,
        tags: newEntry.tags || [],
        images: newEntry.images || [],
        linkedHabitIds: newEntry.linkedHabitIds || [],
        linkedGoalIds: newEntry.linkedGoalIds || [],
        prompt: newEntry.prompt || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      newEntry.id = docRef.id;
      const updatedLocal = readLocalJournal().map((e) => (e.id === tempId ? newEntry : e));
      saveLocalJournal(updatedLocal);
    } catch (err) {
      console.warn('Could not sync journal entry to Firestore:', err);
    }
  }

  return newEntry;
}

export async function updateJournalEntry(
  entryId: string,
  updates: Partial<JournalEntry>,
  userId?: string
): Promise<JournalEntry | null> {
  const local = readLocalJournal();
  const index = local.findIndex((e) => e.id === entryId);
  if (index === -1) return null;

  const updated: JournalEntry = {
    ...local[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  local[index] = updated;
  saveLocalJournal(local);

  if (userId && !entryId.startsWith('entry-seed_') && !entryId.startsWith('journal_')) {
    try {
      await updateDoc(doc(db, 'journal_logs', entryId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Could not sync journal update to Firestore:', err);
    }
  }

  return updated;
}

export async function deleteJournalEntry(entryId: string, userId?: string): Promise<boolean> {
  const local = readLocalJournal();
  const filtered = local.filter((e) => e.id !== entryId);
  saveLocalJournal(filtered);

  if (userId && !entryId.startsWith('entry-seed_') && !entryId.startsWith('journal_')) {
    try {
      await deleteDoc(doc(db, 'journal_logs', entryId));
    } catch (err) {
      console.warn('Could not delete journal in Firestore:', err);
    }
  }

  return true;
}
