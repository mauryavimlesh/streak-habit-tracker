import { auth } from './firebase';
import { generateFallbackCoaching } from './fallbackCoach';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
  error?: boolean;
  failedPrompt?: string;
}

export interface HabitSummary {
  id: string;
  title: string;
  category?: string;
  frequency?: string;
  streak?: number;
}

export interface CoachContext {
  userName?: string;
  habits?: HabitSummary[];
  activeHabitCount?: number;
  totalStreaks?: number;
}

export interface CoachApiResponse {
  success?: boolean;
  text?: string;
  reply?: string;
  error?: string;
  details?: string;
}

/**
 * Checks if the backend AI service is online and configured with an API key.
 */
export async function getAiCoachStatus(): Promise<{ configured: boolean; model: string }> {
  try {
    const res = await fetch('/api/ai-status', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      return { configured: false, model: 'gemini-3.6-flash' };
    }
    const data = await res.json();
    return {
      configured: Boolean(data.configured),
      model: data.model || 'gemini-3.6-flash',
    };
  } catch {
    return { configured: false, model: 'gemini-3.6-flash' };
  }
}

/**
 * Sends a message and contextual habit data to the server-side Gemini API route.
 * Keeps API keys strictly on the server and provides descriptive, user-friendly error handling.
 */
export async function sendCoachMessage(
  message: string,
  history: ChatMessage[] = [],
  context?: CoachContext
): Promise<string> {
  const trimmed = message.trim();
  if (!trimmed) {
    throw new Error('Please enter a message.');
  }

  // Format the last 8 messages for multi-turn dialogue context
  const recentHistory = history
    .slice(-8)
    .filter((msg) => !msg.error && msg.text.trim())
    .map((msg) => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      text: msg.text,
    }));

  let token = '';
  try {
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    }
  } catch (err) {
    console.warn('Unable to get auth token:', err);
  }

  let response: Response | null = null;
  let lastNetworkError: any = null;

  // Attempt up to 2 times with a brief delay in case of transient dev server restart or connection jitter
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      response = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: trimmed,
          messages: recentHistory,
          context: context || null,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response) {
        break; // Successfully got a response from the server
      }
    } catch (netErr: any) {
      lastNetworkError = netErr;
      if (attempt < 2) {
        // Wait 1.5s before retrying
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }

  if (!response) {
    console.warn('Network request could not reach server, using STREAK local habit coach.');
    return generateFallbackCoaching(trimmed, context);
  }

  let rawText = '';
  let data: CoachApiResponse | null = null;

  try {
    rawText = await response.text();
    data = JSON.parse(rawText);
  } catch {
    // If response is not JSON (e.g. HTML proxy page, gateway message), seamlessly use STREAK coaching
    console.warn('Server returned non-JSON response, using STREAK habit coach.');
    return generateFallbackCoaching(trimmed, context);
  }

  if (!response.ok || (data && data.success === false)) {
    console.warn('Server returned non-OK status, activating STREAK habit coach.');
    return generateFallbackCoaching(trimmed, context);
  }

  const replyText = data?.text || data?.reply;
  if (!replyText || typeof replyText !== 'string') {
    return generateFallbackCoaching(trimmed, context);
  }

  return replyText;
}
