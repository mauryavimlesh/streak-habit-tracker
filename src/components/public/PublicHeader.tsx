import React from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../lib/AuthContext';
import { Flame, ArrowRight, Compass, ShieldCheck } from 'lucide-react';

export function PublicHeader() {
  const { user, profile, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const isAuthenticated = Boolean(user || profile?.isGuest);

  const handleStart = () => {
    if (isAuthenticated) {
      navigate('/');
    } else {
      continueAsGuest();
      navigate('/');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0d0e12]/85 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src="/logo.png"
            alt="STREAK Logo"
            width={32}
            height={32}
            className="w-8 h-8 aspect-square object-contain select-none group-hover:scale-105 transition-transform drop-shadow-[0_0_12px_rgba(140,238,40,0.3)]"
          />
          <span className="font-bold text-lg tracking-wider text-white">STREAK</span>
        </Link>

        {/* Feature Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-text-secondary">
          <Link to="/habits" className="hover:text-white transition-colors">Habits</Link>
          <Link to="/goals" className="hover:text-white transition-colors">Goals</Link>
          <Link to="/tasks" className="hover:text-white transition-colors">Tasks</Link>
          <Link to="/focus-timer" className="hover:text-white transition-colors">Focus Timer</Link>
          <Link to="/journal" className="hover:text-white transition-colors">Journal</Link>
          <Link to="/analytics" className="hover:text-white transition-colors">Analytics</Link>
          <Link to="/ai-coach" className="hover:text-white transition-colors">AI Coach</Link>
        </nav>

        {/* Action CTAs */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/"
              className="px-4 py-2 text-sm font-semibold text-black bg-accent-primary rounded-xl hover:bg-accent-primary/90 transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(163,230,53,0.3)]"
            >
              <span>Open App</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden sm:inline-block px-3.5 py-1.5 text-sm font-medium text-text-secondary hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <button
                onClick={handleStart}
                className="px-4 py-2 text-sm font-semibold text-black bg-accent-primary rounded-xl hover:bg-accent-primary/90 transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(163,230,53,0.3)] cursor-pointer"
              >
                <span>Start Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
