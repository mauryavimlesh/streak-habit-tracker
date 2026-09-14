import { Analytics, getAnalytics, isSupported, logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { app } from './firebase';

let analyticsInstance: Analytics | null = null;
let isAnalyticsInitialized = false;
let currentUserId: string | null = null;
let lastTrackedScreen = '';

// Keeps track of the last tracked event to prevent duplicate double-fires (React strict mode etc)
const recentEvents = new Set<string>();

// Prevent rapid duplicate events
function isDuplicateEvent(eventName: string, paramString: string): boolean {
  const eventKey = `${eventName}:${paramString}`;
  if (recentEvents.has(eventKey)) return true;
  recentEvents.add(eventKey);
  setTimeout(() => recentEvents.delete(eventKey), 1000); // 1-second debounce window
  return false;
}

export function getAnalyticsStatus() {
  const config = app.options;
  return {
    initialized: isAnalyticsInitialized,
    hasInstance: analyticsInstance !== null,
    measurementId: config.measurementId || 'MISSING',
    projectId: config.projectId,
    userId: currentUserId,
    isDevelopment: import.meta.env.DEV
  };
}

// Global debug helper for developers
if (typeof window !== 'undefined') {
  (window as any).__STREAK_ANALYTICS_DEBUG = getAnalyticsStatus;
}

// Initialize analytics if supported in current browser / environment
export async function initAnalytics(): Promise<Analytics | null> {
  if (isAnalyticsInitialized) return analyticsInstance;
  isAnalyticsInitialized = true;
  
  if (typeof window === 'undefined') return null;

  try {
    const config = app.options;
    if (!config.measurementId) {
      console.warn('Analytics Config Status: Missing measurementId in Firebase configuration. Analytics will be disabled.');
      return null;
    }

    const supported = await isSupported();
    if (supported) {
      analyticsInstance = getAnalytics(app);
      if (import.meta.env.DEV) {
        console.info('Firebase Analytics Initialized', getAnalyticsStatus());
      }
    }
  } catch (err) {
    // Non-blocking in environments where analytics scripts or cookies are restricted
    console.debug('Firebase Analytics not supported in this environment:', err);
  }
  return analyticsInstance;
}

// Bind authenticated user to analytics
export async function identifyUser(userId: string | null) {
  currentUserId = userId;
  try {
    const analytics = await initAnalytics();
    if (analytics) {
      setUserId(analytics, userId); // sending null clears the association
      if (import.meta.env.DEV) {
        console.debug(`Analytics user association ${userId ? 'set' : 'cleared'}`);
      }
    }
  } catch (err) {
    console.debug('Failed to identify user for analytics:', err);
  }
}

export async function setUserProperty(key: string, value: string | null) {
  try {
    const analytics = await initAnalytics();
    if (analytics) {
      setUserProperties(analytics, { [key]: value });
    }
  } catch (err) {}
}

// Ensure non-PII, sanitized event parameters
function sanitizeParams(params?: Record<string, any>): Record<string, any> {
  if (!params) return {};
  const clean: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(params)) {
    const lowerKey = key.toLowerCase();
    // Exclude any keys that sound like sensitive info
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('token') ||
      lowerKey.includes('text') ||
      lowerKey.includes('note') ||
      lowerKey.includes('email') ||
      lowerKey.includes('phone') ||
      lowerKey.includes('prompt') ||
      lowerKey.includes('response') ||
      lowerKey.includes('apikey')
    ) {
      continue;
    }
    
    if (typeof value === 'string') {
      clean[key] = value.slice(0, 100);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      clean[key] = value;
    }
  }
  return clean;
}

export async function trackEvent(eventName: string, eventParams?: Record<string, any>): Promise<void> {
  try {
    const safeParams = sanitizeParams(eventParams);
    const paramString = JSON.stringify(safeParams);
    
    if (isDuplicateEvent(eventName, paramString)) {
      return; // Skip duplicate event
    }

    const analytics = await initAnalytics();
    if (analytics) {
      logEvent(analytics, eventName, safeParams);
      if (import.meta.env.DEV) {
        console.info(`[Analytics] ${eventName}`, safeParams);
      }
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

export async function trackScreenView(screenName: string): Promise<void> {
  // Deduplicate rapid screen transitions (e.g. Strict Mode mounts)
  if (lastTrackedScreen === screenName) return;
  lastTrackedScreen = screenName;
  
  // Clear after a while so they can view it again later
  setTimeout(() => {
    if (lastTrackedScreen === screenName) lastTrackedScreen = '';
  }, 2000);
  
  trackEvent('screen_view', { firebase_screen: screenName, screen_name: screenName });
}

// ==========================================
// CENTRAL EVENT MAP
// ==========================================

// Lifecycle & Auth
export const trackAppOpen = () => trackEvent('app_open');
export const trackSignUp = (method: string) => trackEvent('sign_up', { method });
export const trackLogin = (method: string) => trackEvent('login', { method });
export const trackLogout = () => trackEvent('logout');

// Habit events
export const trackHabitCreated = (category?: string, frequency?: string) =>
  trackEvent('habit_created', { category: category || 'general', frequency: frequency || 'daily' });
export const trackHabitEdited = (category?: string) =>
  trackEvent('habit_edited', { category: category || 'general' });
export const trackHabitCompleted = (category?: string, completion_status?: string) =>
  trackEvent('habit_completed', { category: category || 'general', completion_status: completion_status || 'completed' });
export const trackHabitUncompleted = (category?: string) =>
  trackEvent('habit_uncompleted', { category: category || 'general' });
export const trackHabitDeleted = () => trackEvent('habit_deleted');

// Task events (Calendar)
export const trackTaskCreated = (category?: string, priority?: string) =>
  trackEvent('task_created', { category: category || 'general', priority: priority || 'medium' });
export const trackTaskCompleted = (category?: string) =>
  trackEvent('task_completed', { category: category || 'general' });
export const trackCalendarOpened = () => trackEvent('calendar_opened');
export const trackCalendarDateSelected = () => trackEvent('calendar_date_selected');

// Goal events
export const trackGoalCreated = (category?: string) =>
  trackEvent('goal_created', { category: category || 'general' });
export const trackGoalUpdated = (category?: string) =>
  trackEvent('goal_updated', { category: category || 'general' });
export const trackGoalCompleted = (category?: string, completion_status?: string) =>
  trackEvent('goal_completed', { category: category || 'general', completion_status: completion_status || 'completed' });
export const trackGoalDeleted = () => trackEvent('goal_deleted');

// Reminder events
export const trackReminderCreated = (category?: string, repeat?: string) =>
  trackEvent('reminder_created', { category: category || 'general', repeat: repeat || 'daily' });
export const trackReminderTriggered = (category?: string) =>
  trackEvent('reminder_triggered', { category: category || 'general' });

// Journal events (STRICTLY METADATA ONLY)
export const trackJournalOpened = () => trackEvent('journal_opened');
export const trackJournalEntryCreated = (mood?: string) =>
  trackEvent('journal_entry_created', { mood: mood || 'neutral' });
export const trackJournalEntryEdited = (mood?: string) =>
  trackEvent('journal_entry_edited', { mood: mood || 'neutral' });
export const trackJournalEntryDeleted = () => trackEvent('journal_entry_deleted');

// AI Coach events
export const trackAICoachOpened = () => trackEvent('ai_coach_opened');
export const trackAICoachMessageSent = () => trackEvent('ai_coach_message_sent');
export const trackAICoachResponseReceived = (response_status: string) => 
  trackEvent('ai_coach_response_received', { response_status });
export const trackAICoachError = (error_type: string) => 
  trackEvent('ai_coach_error', { error_type });
export const trackAICoachRetry = () => trackEvent('ai_coach_retry');

// Navigation / View events
export const trackAnalyticsViewed = () => trackEvent('analytics_viewed');
export const trackStreakViewed = () => trackEvent('streak_viewed');
export const trackSyncCompleted = () => trackEvent('sync_completed');
