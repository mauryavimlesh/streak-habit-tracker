/**
 * Centralized Event-Driven Pipeline for STREAKLOOP
 *
 * SPECIFICATION REQUIREMENTS (Part 20):
 * Completing an action triggers a deterministic chain:
 * 1. Validate completion & prevent duplicate completion.
 * 2. Store completion.
 * 3. Calculate streak.
 * 4. Calculate XP event & update lifetime XP.
 * 5. Recalculate level.
 * 6. Recalculate momentum.
 * 7. Check achievements eligibility.
 * 8. Update daily progress & analytics.
 * 9. Update shared-habit & challenge progress.
 * 10. Update UI and trigger feedback.
 */

import { awardXP, calculateLevel, getStoredLifetimeXP } from './xpService';
import { checkAndUnlockAchievement } from './achievementService';
import { getTodayDateKey } from './dateUtils';
import { triggerHaptic } from './haptics';

export type SystemEventType =
  | 'HABIT_COMPLETED'
  | 'TASK_COMPLETED'
  | 'GOAL_MILESTONE'
  | 'FOCUS_COMPLETED'
  | 'JOURNAL_LOGGED'
  | 'CHALLENGE_COMPLETED';

export interface HabitCompletionEventPayload {
  userId: string;
  habitId: string;
  habitName: string;
  category?: string;
  isShared?: boolean;
  streakCount?: number;
  totalCompletions?: number;
}

export interface TaskCompletionEventPayload {
  userId: string;
  taskId: string;
  taskTitle: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface FocusSessionEventPayload {
  userId: string;
  durationMinutes: number;
}

export interface GoalEventPayload {
  userId: string;
  goalId: string;
  goalTitle: string;
  isComplete: boolean;
}

/**
 * Handle HABIT_COMPLETED event
 */
export async function onHabitCompleted(payload: HabitCompletionEventPayload) {
  triggerHaptic('success');
  const todayStr = getTodayDateKey();

  // 1. Award XP (10 base XP, idempotent per habit per day)
  const xpResult = await awardXP({
    userId: payload.userId,
    sourceType: 'habit',
    sourceId: payload.habitId,
    dateStr: todayStr,
    baseXP: 10,
    description: `Completed habit: ${payload.habitName}`,
  });

  // 2. Check Achievements
  await checkAndUnlockAchievement('first_habit', payload.userId);

  const streak = payload.streakCount || 1;
  if (streak >= 3) await checkAndUnlockAchievement('streak_3', payload.userId);
  if (streak >= 7) await checkAndUnlockAchievement('streak_7', payload.userId);
  if (streak >= 21) await checkAndUnlockAchievement('streak_21', payload.userId);
  if (streak >= 50) await checkAndUnlockAchievement('streak_50', payload.userId);
  if (streak >= 100) await checkAndUnlockAchievement('streak_100', payload.userId);

  if ((payload.totalCompletions || 0) >= 100) {
    await checkAndUnlockAchievement('completions_100', payload.userId);
  }

  if (payload.isShared) {
    await checkAndUnlockAchievement('first_shared_habit', payload.userId);
  }

  const currentLifetimeXP = getStoredLifetimeXP();
  if (currentLifetimeXP >= 1000) {
    await checkAndUnlockAchievement('xp_1000', payload.userId);
  }

  // 3. Notify UI
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('streak_canonical_updated'));
  }

  return xpResult;
}

/**
 * Handle TASK_COMPLETED event
 */
export async function onTaskCompleted(payload: TaskCompletionEventPayload) {
  triggerHaptic('tap');
  const todayStr = getTodayDateKey();

  // Low = 10, Medium = 15, High = 25
  const baseXP = payload.priority === 'high' ? 25 : payload.priority === 'medium' ? 15 : 10;

  const xpResult = await awardXP({
    userId: payload.userId,
    sourceType: 'task',
    sourceId: payload.taskId,
    dateStr: todayStr,
    baseXP,
    description: `Completed task: ${payload.taskTitle}`,
  });

  const currentLifetimeXP = getStoredLifetimeXP();
  if (currentLifetimeXP >= 1000) {
    await checkAndUnlockAchievement('xp_1000', payload.userId);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('streak_canonical_updated'));
  }

  return xpResult;
}

/**
 * Handle FOCUS_COMPLETED event
 */
export async function onFocusSessionCompleted(payload: FocusSessionEventPayload) {
  triggerHaptic('success');
  const todayStr = getTodayDateKey();

  // 5 XP per 25 min block (capped at 50 XP/day inside awardXP)
  const blocks = Math.max(1, Math.floor(payload.durationMinutes / 25));
  const baseXP = blocks * 5;

  const xpResult = await awardXP({
    userId: payload.userId,
    sourceType: 'focus',
    sourceId: `focus_${Date.now()}`,
    dateStr: todayStr,
    baseXP,
    description: `Completed ${payload.durationMinutes} min focus session`,
  });

  return xpResult;
}

/**
 * Handle GOAL milestone or completion
 */
export async function onGoalMilestone(payload: GoalEventPayload) {
  triggerHaptic('success');
  const todayStr = getTodayDateKey();

  const baseXP = payload.isComplete ? 100 : 25;
  const xpResult = await awardXP({
    userId: payload.userId,
    sourceType: 'goal',
    sourceId: `${payload.goalId}_${payload.isComplete ? 'complete' : todayStr}`,
    dateStr: todayStr,
    baseXP,
    description: payload.isComplete ? `Completed Goal: ${payload.goalTitle}` : `Progress on: ${payload.goalTitle}`,
  });

  if (payload.isComplete) {
    await checkAndUnlockAchievement('first_goal', payload.userId);
  }

  return xpResult;
}

/**
 * Handle JOURNAL_LOGGED event
 */
export async function onJournalLogged(userId: string, journalId: string) {
  triggerHaptic('tap');
  const todayStr = getTodayDateKey();

  // 5 XP with daily cap of 5
  return await awardXP({
    userId,
    sourceType: 'journal',
    sourceId: journalId,
    dateStr: todayStr,
    baseXP: 5,
    description: 'Daily reflection entry',
  });
}
