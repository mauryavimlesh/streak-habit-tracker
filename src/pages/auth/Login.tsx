import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Navigate } from 'react-router';
import { useAuth } from '../../lib/AuthContext';
import { motion } from 'motion/react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      let errorMessage = 'An error occurred. Please try again.';
      const code = err.code || '';
      if (code === 'auth/invalid-email') errorMessage = 'Please enter a valid email address.';
      else if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') errorMessage = 'Email or password is incorrect.';
      else if (code === 'auth/email-already-in-use') errorMessage = 'This email is already registered.';
      else if (code === 'auth/weak-password') errorMessage = 'Password should be at least 6 characters.';
      else if (code === 'auth/network-request-failed') errorMessage = 'Unable to connect. Please check your internet connection.';
      else if (code === 'auth/popup-closed-by-user') errorMessage = 'Sign-in popup was closed before finishing.';
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

    const handleGoogleSignIn = async () => {
      setError('');
      setLoading(true);
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (err: any) {
        console.error('Google Sign-In Error:', err);
        let errorMessage = 'An error occurred with Google Sign-In.';
        const code = err.code || '';
        
        if (code === 'auth/popup-closed-by-user') errorMessage = 'Sign-in popup was closed before finishing.';
        else if (code === 'auth/network-request-failed') errorMessage = 'Unable to connect. Please check your internet connection.';
        else if (code === 'auth/unauthorized-domain') errorMessage = 'This domain is not authorized for Google Sign-In. Please add this URL to Firebase Auth authorized domains.';
        else if (code === 'auth/popup-blocked') errorMessage = 'Sign-in popup was blocked. Please allow popups or open in a new tab.';
        else if (err.message) errorMessage = err.message;
        
        // Check if running in an iframe
        if (window !== window.top) {
          errorMessage += ' Note: Google Sign-In often requires opening this app in a new tab (click the pop-out icon top right).';
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="mb-10 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-accent-primary to-accent-cyan flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(163,230,53,0.3)]">
            <div className="w-14 h-14 bg-background rounded-full flex items-center justify-center">
               <div className="w-8 h-8 rounded-full border-2 border-accent-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold mb-2">STREAK</h1>
          <p className="text-text-secondary">Small actions. Every day.</p>
        </div>

        <div className="liquid-glass p-6">
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <h2 className="text-xl font-medium mb-6 text-center">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <button 
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white/5 border border-white/10 text-text-primary font-medium rounded-xl py-3 flex items-center justify-center gap-3 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
            
            <div className="flex items-center gap-4 py-2 text-text-secondary text-sm">
              <div className="flex-1 h-px bg-white/10" />
              OR
              <div className="flex-1 h-px bg-white/10" />
            </div>
            
            <div>
              <label className="block text-sm text-text-secondary mb-1">Email</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent-primary/50 transition-colors disabled:opacity-50"
                placeholder="you@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm text-text-secondary mb-1">Password</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent-primary/50 transition-colors disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>
            
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-accent-primary text-black font-semibold rounded-xl py-3 mt-4 hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <span className="text-text-secondary">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button 
              onClick={() => setIsLogin(!isLogin)}
              disabled={loading}
              className="text-text-primary hover:text-accent-primary transition-colors disabled:opacity-50"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
