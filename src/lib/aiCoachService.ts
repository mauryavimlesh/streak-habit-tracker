import { auth } from './firebase';

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
  text?: string;
  reply?: string;
  error?: string;
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
      return { configured: false, model: 'gemini-3.8-flash' };
    }
    const data = await res.json();
    return {
      configured: Boolean(data.configured),
      model: data.model || 'gemini-3.8-flash',
    };
  } catch {
    return { configured: false, model: 'gemini-3.8-flash' };
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

  let response: Response;
  try {
    response = await fetch('/api/ai-coach', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        message: trimmed,
        messages: recentHistory,
        context: context || null,
      }),
    });
  } catch (netErr: any) {
    throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
  }

  let data: CoachApiResponse;
  try {
    data = await response.json();
  } catch {
    throw new Error('Received an unexpected response from the server. Please try again.');
  }

  if (!response.ok) {
    if (response.status === 429 || response.status === 503) {
      throw new Error(data.error || 'The AI Coach is experiencing high demand right now. Please wait a few seconds and try again.');
    }
    if (response.status === 500 && data.error?.includes('GEMINI_API_KEY')) {
      throw new Error('The Gemini API key is not configured. Please add GEMINI_API_KEY to your workspace Secrets.');
    }
    throw new Error(data.error || 'Failed to generate coaching response. Please try again.');
  }

  const replyText = data.text || data.reply;
  if (!replyText || typeof replyText !== 'string') {
    throw new Error('The AI Coach returned an empty response. Please try asking in a different way.');
  }

  return replyText;
}
