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

const LOCAL_FEEDBACK_KEY = 'streak_feedback_v1';

