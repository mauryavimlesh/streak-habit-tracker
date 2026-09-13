import { Analytics, getAnalytics, isSupported, logEvent } from 'firebase/analytics';
import { app } from './firebase';

let analyticsInstance: Analytics | null = null;
let isAnalyticsInitialized = false;

// Initialize analytics if supported in current browser / environment
async function initAnalytics(): Promise<Analytics | null> {
  if (isAnalyticsInitialized) return analyticsInstance;
  isAnalyticsInitialized = true;

  if (typeof window === 'undefined') return null;

  try {
    const supported = await isSupported();
    if (supported) {
      analyticsInstance = getAnalytics(app);
    }
  } catch (err) {
    // Non-blocking in environments where analytics scripts or cookies are restricted
    console.debug('Firebase Analytics not supported in this environment:', err);
  }
  return analyticsInstance;
}

// Ensure non-PII, sanitized event parameters
function sanitizeParams(params?: Record<string, any>): Record<string, any> {
  if (!params) return {};
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    // Exclude any keys that sound like sensitive info
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('token') ||
      lowerKey.includes('text') ||
      lowerKey.includes('note') ||
      lowerKey.includes('email') ||
      lowerKey.includes('phone')
    ) {
      continue;
    }
    if (typeof value === 'string') {
      // Limit length to avoid bloating telemetry
      clean[key] = value.slice(0, 100);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      clean[key] = value;
    }
  }
  return clean;
}

export async function trackEvent(eventName: string, eventParams?: Record<string, any>): Promise<void> {
  try {
    const analytics = await initAnalytics();
    const safeParams = sanitizeParams(eventParams);
    if (analytics) {
      logEvent(analytics, eventName, safeParams);
    }
    // Also record in session event buffer for in-app diagnostics if needed
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = sessionStorage.getItem('streak_recent_events');
      const events: Array<{ name: string; time: number }> = stored ? JSON.parse(stored) : [];
      events.unshift({ name: eventName, time: Date.now() });
      if (events.length > 50) events.pop();
      sessionStorage.setItem('streak_recent_events', JSON.stringify(events));
    }
  } catch {
    // Silently ignore telemetry failures to keep user flow seamless
  }
}

// Lifecycle events
export const trackAppOpen = () => trackEvent('app_open');
export const trackSignUp = (method: string) => trackEvent('sign_up', { method });
export const trackLogin = (method: string) => trackEvent('login', { method });
export const trackLogout = () => trackEvent('logout');

// Habit events
export const trackHabitCreated = (category?: string, frequency?: string) =>
  trackEvent('habit_created', { category: category || 'general', frequency: frequency || 'daily' });

export const trackHabitCompleted = (category?: string, streak?: number) =>
  trackEvent('habit_completed', { category: category || 'general', streak: streak || 1 });

export const trackHabitDeleted = () => trackEvent('habit_deleted');

// Task events
export const trackTaskCreated = (category?: string, priority?: string) =>
  trackEvent('task_created', { category: category || 'general', priority: priority || 'medium' });

export const trackTaskCompleted = (category?: string) =>
  trackEvent('task_completed', { category: category || 'general' });

// Goal events
export const trackGoalCreated = (category?: string) =>
  trackEvent('goal_created', { category: category || 'general' });

export const trackGoalCompleted = (category?: string) =>
  trackEvent('goal_completed', { category: category || 'general' });

// Reminder events
export const trackReminderCreated = (category?: string, repeat?: string) =>
  trackEvent('reminder_created', { category: category || 'general', repeat: repeat || 'daily' });

export const trackReminderTriggered = (category?: string) =>
  trackEvent('reminder_triggered', { category: category || 'general' });

// Journal events
export const trackJournalCreated = (mood?: string) =>
  trackEvent('journal_created', { mood: mood || 'neutral' });

// Navigation / View events
export const trackAnalyticsViewed = () => trackEvent('analytics_viewed');
export const trackStreakViewed = () => trackEvent('streak_viewed');
export const trackSyncCompleted = () => trackEvent('sync_completed');
