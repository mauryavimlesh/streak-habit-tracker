import React, { useState, FormEvent, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  Sparkles,
  Send,
  Mail,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { FeedbackType } from '../../lib/supportConfig';
import { useAuth } from '../../lib/AuthContext';
import { triggerHaptic } from '../../lib/haptics';
import { cn } from '../../lib/utils';

export interface FeedbackFormProps {
  onSuccess?: () => void;
  initialCategory?: FeedbackType;
  compact?: boolean;
  className?: string;
  showTitle?: boolean;
}

const FEEDBACK_TYPES: { id: FeedbackType; label: string; desc: string }[] = [
  { id: 'general', label: 'General Feedback', desc: 'General thoughts or compliments' },
  { id: 'bug', label: 'Bug Report', desc: 'Report an issue, glitch, or unexpected behavior' },
  { id: 'feature', label: 'Feature Request', desc: 'Suggest a habit tracker or workflow feature' },
  { id: 'ui', label: 'UI/Design', desc: 'Spacing, typography, contrast, or themes' },
  { id: 'other', label: 'Other', desc: 'Questions or direct notes' },
];

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  onSuccess,
  initialCategory = 'general',
  compact = false,
  className,
  showTitle = true,
}) => {
  const { user } = useAuth();

  const [category, setCategory] = useState<FeedbackType>(initialCategory);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [copied, setCopied] = useState(false);

  // Clear fallback state when fields change
  useEffect(() => {
    setShowFallback(false);
  }, [category, subject, message, email]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    const trimmedEmail = email.trim();

    if (!trimmedSubject) {
      setErrorMessage('Please enter a subject for your feedback.');
      triggerHaptic('error');
      return;
    }

    if (!trimmedMessage) {
      setErrorMessage('Please enter your message or details.');
      triggerHaptic('error');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    triggerHaptic('selection');

    // Prepare email content
    const selectedCategoryName = FEEDBACK_TYPES.find(t => t.id === category)?.label || 'Feedback';
    const emailSubject = `[STREAK Feedback] ${selectedCategoryName} - ${trimmedSubject}`;
    
    let emailBody = `Category: ${selectedCategoryName}\n`;
    emailBody += `Subject: ${trimmedSubject}\n\n`;
    emailBody += `Message:\n${trimmedMessage}\n\n`;
    emailBody += `User contact: ${trimmedEmail || 'Not provided'}\n`;
    emailBody += `Date/time: ${new Date().toLocaleString()}\n`;
    if (user) {
      emailBody += `User ID: ${user.uid}\n`;
    }
    
    // Add basic device context
    if (typeof navigator !== 'undefined') {
      emailBody += `Platform: ${navigator.platform}\n`;
    }

    const mailtoLink = `mailto:vim74590@gmail.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    try {
      window.location.href = mailtoLink;
      
      // We don't show "successfully submitted" because we just handed it off to the email client.
      // We'll show a fallback message in case the email client didn't open.
      setTimeout(() => {
        setIsSubmitting(false);
        setShowFallback(true);
        triggerHaptic('completion');
      }, 500);
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage('Could not open your email client. Please see the fallback below.');
      setShowFallback(true);
      triggerHaptic('error');
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('vim74590@gmail.com');
    setCopied(true);
    triggerHaptic('completion');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'p-5 rounded-3xl bg-surface-card border border-white/10 space-y-4 shadow-sm',
        className
      )}
    >
      {showTitle && (
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-accent-primary" />
              <span>Help us improve STREAK</span>
            </h3>
            <p className="text-xs text-[#7d8495] mt-0.5">
              Share bug reports, feature ideas, or thoughts directly with the creator
            </p>
          </div>
        </div>
      )}

      {showFallback ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-2xl bg-black/40 border border-white/10 text-center space-y-3"
        >
          <div className="w-12 h-12 rounded-full bg-accent-primary/20 text-accent-primary flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white">
            Opening your email client...
          </h4>
          <p className="text-xs text-[#7d8495] max-w-[280px] mx-auto leading-relaxed">
            If your email app didn't open automatically, please send your feedback directly to:
          </p>
          
          <div className="flex items-center justify-center gap-2 mt-2">
            <code className="px-3 py-1.5 rounded-lg bg-white/5 text-accent-primary text-xs font-medium border border-white/10">
              vim74590@gmail.com
            </code>
            <button
              onClick={handleCopyEmail}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors cursor-pointer border border-white/10"
              title="Copy email address"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-accent-primary" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowFallback(false)}
            className="mt-4 text-xs text-[#7d8495] hover:text-white font-medium cursor-pointer transition-colors"
          >
            Go back to edit feedback
          </button>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {errorMessage && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Feedback Category Tabs */}
          <div>
            <label className="block text-[11px] font-semibold text-[#7d8495] uppercase tracking-wider mb-1.5">
              Feedback Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/5 text-[11px]">
              {FEEDBACK_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setCategory(type.id);
                  }}
                  className={cn(
                    'py-2 px-2 rounded-xl font-medium transition-all cursor-pointer text-center truncate',
                    category === type.id
                      ? 'bg-white/15 text-white font-semibold shadow-sm border border-white/10'
                      : 'text-[#7d8495] hover:text-white'
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[11px] font-semibold text-[#7d8495] uppercase tracking-wider mb-1">
              Subject
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your feedback"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-[#5c6272] focus:outline-none focus:border-accent-primary"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-[11px] font-semibold text-[#7d8495] uppercase tracking-wider mb-1">
              Message / Details
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what's working well or what needs improvement. Steps to reproduce if reporting a bug."
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-[#5c6272] focus:outline-none focus:border-accent-primary leading-relaxed"
            />
          </div>

          {/* Optional Contact Email */}
          <div>
            <label className="block text-[11px] font-semibold text-[#7d8495] uppercase tracking-wider mb-1">
              Email / Contact <span className="text-[#5c6272] font-normal lowercase">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com (for follow-up)"
              className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder-[#5c6272] focus:outline-none focus:border-accent-primary"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !message.trim()}
            className="w-full py-3 rounded-2xl bg-accent-primary text-black font-bold text-xs tracking-wide hover:bg-[#9eff38] disabled:opacity-40 transition-colors cursor-pointer shadow-[0_2px_12px_rgba(140,238,40,0.25)] flex items-center justify-center gap-2 mt-1"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Opening Mail Client...' : 'Send via Email'}</span>
          </button>
        </form>
      )}
    </div>
  );
};

export default FeedbackForm;
