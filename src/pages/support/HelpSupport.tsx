import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { SEO } from '../../components/seo/SEO';
import { GUIDE_SOCIAL_REGISTRY } from '../../lib/seo/socialMetadata';
import {
  ChevronLeft,
  MessageCircle,
  Instagram,
  Send,
  ChevronDown,
  CheckCircle2,
  Mail,
  ExternalLink,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import {
  CREATOR_PROFILE,
  SOCIAL_LINKS,
} from '../../lib/supportConfig';
import { FeedbackForm } from '../../components/feedback/FeedbackForm';
import { DeveloperFooter } from '../../components/layout/DeveloperFooter';
import { triggerHaptic } from '../../lib/haptics';
import { cn } from '../../lib/utils';

const FAQS = [
  {
    q: 'How does STREAK preserve data when offline?',
    a: 'STREAK operates on a local-first architecture. All your habits, calendar tasks, journal entries, and goals are saved immediately to resilient local storage in your browser. When you are connected and signed in, everything synchronizes automatically to the cloud.',
  },
  {
    q: 'How are habit streaks calculated?',
    a: 'A streak increments each consecutive day you mark a habit complete. For count-based targets (like drinking 8 glasses of water), reaching or exceeding the daily target maintains the active chain.',
  },
  {
    q: 'Can I link calendar tasks to my goals?',
    a: 'Yes! Calendar tasks represent tactical execution blocks for today and upcoming dates, while Goals represent your overarching milestones.',
  },
];

export default function HelpSupport() {
  const navigate = useNavigate();

  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  return (
    <div className="flex flex-col min-h-screen bg-background text-white pb-24">
      <SEO
        socialConfig={GUIDE_SOCIAL_REGISTRY['/support']}
      />
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-white/10 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/more')}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Help & Support</h1>
            <p className="text-xs text-[#7d8495]">Community, feedback & direct assistance</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto w-full px-5 pt-4 space-y-5">
        {/* Feedback Form Component */}
        <FeedbackForm />

        {/* Section: Connect with Vimlesh */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-surface-card to-[#181d13] border border-accent-primary/20 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent-primary to-[#9eff38] text-black font-black text-xl flex items-center justify-center shadow-[0_4px_16px_rgba(140,238,40,0.3)]">
              V
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-white tracking-tight">Connect with Vimlesh</h3>
              </div>
              <p className="text-xs text-[#7d8495] mt-0.5">{CREATOR_PROFILE.role}</p>
            </div>
          </div>
          <p className="text-xs text-white/75 leading-relaxed">{CREATOR_PROFILE.bio}</p>

          {/* Social Links Buttons */}
          <div className="grid grid-cols-1 gap-2 pt-1">
            {SOCIAL_LINKS.map((link) => {
              const Icon =
                link.id === 'instagram'
                  ? Instagram
                  : link.id === 'whatsapp'
                  ? MessageCircle
                  : Send;

              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => triggerHaptic('tap')}
                  className="p-3.5 rounded-2xl bg-black/40 border border-white/5 hover:border-accent-primary/40 flex items-center justify-between transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 group-hover:bg-accent-primary/20 group-hover:text-accent-primary flex items-center justify-center text-white/70 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-accent-primary transition-colors flex items-center gap-1.5">
                        <span>{link.name}</span>
                        {link.badge && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-[#7d8495] font-semibold">
                            {link.badge}
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-[#7d8495] mt-0.5 font-mono">{link.handle}</p>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-[#7d8495] group-hover:text-white transition-colors" />
                </a>
              );
            })}
          </div>
        </div>

        {/* FAQs Accordion */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-[#7d8495] uppercase tracking-wider block ml-1">
            Frequently Answered
          </span>
          <div className="space-y-2">
            {FAQS.map((item, idx) => {
              const isOpen = faqOpen === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-surface-card border border-white/5 overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setFaqOpen(isOpen ? null : idx);
                    }}
                    className="w-full p-3.5 text-left flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-white">{item.q}</span>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 text-[#7d8495] transition-transform duration-200',
                        isOpen && 'rotate-180 text-white'
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-3.5 pb-3.5 pt-0 text-xs text-[#7d8495] leading-relaxed border-t border-white/5 pt-2">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 6: Subtle Developer Footer */}
        <DeveloperFooter />
      </main>
    </div>
  );
}

