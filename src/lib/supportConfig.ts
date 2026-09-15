export interface SupportSocialLink {
  id: string;
  name: string;
  handle: string;
  url: string;
  description: string;
  iconName: string;
  badge?: string;
}

export const CREATOR_PROFILE = {
  name: 'Vimlesh',
  role: 'Creator & Lead Engineer of STREAK',
  tagline: 'Designing calm, enduring habits through mindful engineering',
  bio: 'Building STREAK to help individuals reclaim discipline, daily momentum, and personal focus with zero clutter.',
  avatarUrl: '',
};

export const SOCIAL_LINKS: SupportSocialLink[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    handle: '@vimx.4',
    url: 'https://www.instagram.com/vimx.4?stkn=MTR1OHB1NXI1Y3kwMQ==',
    description: 'Updates, habit architecture & behind the scenes',
    iconName: 'Instagram',
    badge: 'Direct Message',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    handle: 't.me/streak_habits',
    url: 'https://t.me/streak_habits',
    description: 'Community channel, changelogs & updates',
    iconName: 'Send',
    badge: 'Channel',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    handle: '+91 7459031790',
    url: 'https://wa.me/917459031790?text=Hi%20Vimlesh,%20I%20am%20using%20the%20STREAK%20app!',
    description: 'Instant direct messaging & feedback',
    iconName: 'MessageCircle',
    badge: 'Chat',
  },
];

export type FeedbackType = 'general' | 'bug' | 'feature' | 'ui' | 'other';

export interface FeedbackSubmission {
  id: string;
  category: FeedbackType;
  subject: string;
  message: string;
  images?: string[];
  email?: string;
  submittedAt: string;
  userId?: string;
}

export interface SubmitFeedbackResult {
  success: boolean;
  error?: string;
  deliveryId?: string;
}

const LOCAL_FEEDBACK_KEY = 'streak_feedback_v1';

export async function submitFeedback(
  data: Omit<FeedbackSubmission, 'id' | 'submittedAt'>
): Promise<SubmitFeedbackResult> {
  try {
    // 1. Gather safe client device information
    const deviceInfo = {
      platform: typeof navigator !== 'undefined' ? navigator.platform || 'Unknown' : 'Unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      language: typeof navigator !== 'undefined' ? navigator.language : 'en',
      screen: typeof window !== 'undefined' && window.screen ? `${window.screen.width}x${window.screen.height}` : undefined,
      viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : undefined,
      appUrl: typeof window !== 'undefined' ? window.location.href : undefined,
    };

    // 2. Call backend transactional email API
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        category: data.category,
        subject: data.subject,
        message: data.message,
        email: data.email,
        images: data.images,
        userId: data.userId,
        deviceInfo,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      const errorMessage =
        result.error ||
        `Server returned ${response.status}: ${response.statusText || 'Failed to send feedback'}`;
      return {
        success: false,
        error: errorMessage,
      };
    }

    // 3. On successful backend submission, persist local history
    try {
      const raw = localStorage.getItem(LOCAL_FEEDBACK_KEY);
      const list: FeedbackSubmission[] = raw ? JSON.parse(raw) : [];
      const newSubmission: FeedbackSubmission = {
        ...data,
        id: 'fb_' + Date.now(),
        submittedAt: result.submittedAt || new Date().toISOString(),
      };
      list.unshift(newSubmission);
      localStorage.setItem(LOCAL_FEEDBACK_KEY, JSON.stringify(list));
    } catch {
      // Ignore local storage quota
    }

    // 4. Also store in client Firestore if available
    try {
      const { db } = await import('./firebase');
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      if (db) {
        await addDoc(collection(db, 'feedback'), {
          category: data.category,
          subject: data.subject,
          message: data.message,
          imagesCount: data.images?.length || 0,
          images: data.images || [],
          email: data.email || null,
          userId: data.userId || null,
          deliveryId: result.deliveryId || null,
          createdAt: serverTimestamp(),
        });
      }
    } catch {
      // Firestore client write fallback, server already handled or logged
    }

    return {
      success: true,
      deliveryId: result.deliveryId,
    };
  } catch (err: any) {
    console.error('Failed to submit feedback:', err);
    return {
      success: false,
      error: err?.message || 'Network error communicating with the feedback server. Please check your connection.',
    };
  }
}

