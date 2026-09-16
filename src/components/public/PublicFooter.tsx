import React from 'react';
import { Link } from 'react-router';
import { Flame, Heart } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="border-t border-white/5 bg-[#0a0b0e] text-text-secondary text-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Column 1: Brand & Philosophy */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-accent-primary/20 flex items-center justify-center">
                <Flame className="w-3.5 h-3.5 text-accent-primary fill-accent-primary" />
              </div>
              <span className="font-bold text-white tracking-wide">STREAK</span>
            </Link>
            <p className="text-xs text-text-muted leading-relaxed">
              Small actions. Every day. A personal operating system for daily consistency, habit tracking, and deep focus.
            </p>
          </div>

          {/* Column 2: Product Guides */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-white/70 font-semibold mb-3">Product</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/habits" className="hover:text-white transition-colors">Habit Tracker</Link></li>
              <li><Link to="/goals" className="hover:text-white transition-colors">Goal Tracker</Link></li>
              <li><Link to="/tasks" className="hover:text-white transition-colors">Task Checklists</Link></li>
              <li><Link to="/focus-timer" className="hover:text-white transition-colors">Focus Timer</Link></li>
              <li><Link to="/journal" className="hover:text-white transition-colors">Daily Journal</Link></li>
              <li><Link to="/analytics" className="hover:text-white transition-colors">Consistency Heatmap</Link></li>
              <li><Link to="/ai-coach" className="hover:text-white transition-colors">AI Habit Coach</Link></li>
            </ul>
          </div>

          {/* Column 3: Resources & Support */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-white/70 font-semibold mb-3">Resources</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/about" className="hover:text-white transition-colors">About STREAK</Link></li>
              <li><Link to="/support" className="hover:text-white transition-colors">Help &amp; Support</Link></li>
              <li><Link to="/feedback" className="hover:text-white transition-colors">Feedback &amp; Bug Report</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Sign In / Guest Access</Link></li>
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-white/70 font-semibold mb-3">Legal &amp; Privacy</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><span className="text-text-muted text-[11px] block mt-4">Offline-first local storage supported</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <p>© {new Date().getFullYear()} STREAK. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-text-secondary transition-colors">Privacy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-text-secondary transition-colors">Terms</Link>
            <span>•</span>
            <Link to="/support" className="hover:text-text-secondary transition-colors">Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
