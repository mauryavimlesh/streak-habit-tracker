import { deleteTask } from './taskService';
import { deleteHabit } from './habitService';
import { deleteJournalEntry } from './journalService';

export type DeletableEntityType = 'task' | 'habit' | 'journal';

export interface DeleteOptions {
  id: string;
  type: DeletableEntityType;
  title?: string;
  userId?: string;
}

/**
 * Unified deletion service across all modules (tasks, habits, journal).
 * Ensures the record is permanently removed from both local state/cache and cloud Firestore storage.
 */
export async function permanentlyDeleteRecord(options: DeleteOptions): Promise<boolean> {
  const { id, type, userId } = options;
  if (!id) return false;

  try {
    switch (type) {
      case 'task':
        await deleteTask(id, userId);
        return true;
      case 'habit':
        await deleteHabit(id, userId);
        return true;
      case 'journal':
        await deleteJournalEntry(id, userId);
        return true;
      default:
        console.warn('Unknown deletion entity type:', type);
        return false;
    }
  } catch (error) {
    console.error(`Failed to permanently delete ${type} record (${id}):`, error);
    throw error;
  }
}
