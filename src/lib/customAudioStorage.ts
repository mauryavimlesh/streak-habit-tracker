// STREAK Custom Alarm Audio Storage via client-side IndexedDB
// Keeps user custom audio files local to the device without external uploading.

const DB_NAME = 'streak_alarms_db';
const DB_VERSION = 1;
const STORE_NAME = 'custom_tones';
export const MAX_AUDIO_FILE_SIZE = 15 * 1024 * 1024; // 15 MB limit

interface StoredToneRecord {
  id: string;
  name: string;
  size: number;
  type: string;
  data: Blob;
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported on this device/browser'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open audio database'));
  });
}

/**
 * Saves a user-selected audio file into local IndexedDB.
 */
export async function saveCustomAudioTone(
  id: string,
  file: File
): Promise<{ id: string; name: string; size: number }> {
  if (file.size > MAX_AUDIO_FILE_SIZE) {
    throw new Error(
      `Audio file is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please select a file under 15MB.`
    );
  }

  // Verify it's an audio mime type or extension
  const isAudio =
    file.type.startsWith('audio/') ||
    /\.(mp3|wav|ogg|aac|m4a|weba|webm|flac)$/i.test(file.name);

  if (!isAudio) {
    throw new Error('Please select a valid audio file (MP3, WAV, OGG, M4A, or AAC).');
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record: StoredToneRecord = {
      id,
      name: file.name,
      size: file.size,
      type: file.type || 'audio/mpeg',
      data: file,
      updatedAt: Date.now(),
    };

    const req = store.put(record);
    req.onsuccess = () => {
      resolve({ id, name: file.name, size: file.size });
    };
    req.onerror = () => {
      reject(req.error || new Error('Failed to store audio file locally'));
    };
  });
}

/**
 * Retrieves the Blob for a custom audio tone.
 */
export async function getCustomAudioBlob(id: string): Promise<Blob | null> {
  if (!id) return null;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        const result = req.result as StoredToneRecord | undefined;
        if (result && result.data) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => {
        console.warn('Failed to retrieve custom audio from IndexedDB:', req.error);
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('IndexedDB not accessible:', err);
    return null;
  }
}

/**
 * Deletes a custom audio tone from IndexedDB.
 */
export async function deleteCustomAudioTone(id: string): Promise<void> {
  if (!id) return;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => resolve(); // Non-blocking
    });
  } catch {
    // Ignore
  }
}
