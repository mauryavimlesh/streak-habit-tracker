import React, { useState, useEffect, useRef } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  linkWithPopup,
  linkWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { SEO } from '../../components/seo/SEO';
import { triggerHaptic } from '../../lib/haptics';
import {
  checkUsernameAvailability,
  claimUsername,
  validateUsernameSyntax,
} from '../../lib/usernameService';
import { hasGuestDataToMigrate } from '../../lib/guestMigrationService';
import { readLocalHabits, readLocalLogs } from '../../lib/habitService';
import { getStoredLifetimeXP } from '../../lib/xpService';
import { calculateGlobalHabitStreak } from '../../lib/habitEngine';
import AuthVisualPanel from '../../components/auth/AuthVisualPanel';
import { UserAvatar } from '../../components/profile/UserAvatar';
import {
  Flame,
  Zap,
  Sparkles,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  AtSign,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  AlertCircle,
  Camera,
  Upload,
  RefreshCw,
  Shield,
  Layers,
} from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot_password';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, continueAsGuest, updateProfile, saveUserProfileToFirestore, migrateGuestData } = useAuth();

  // Mode & Step state
  const [mode, setMode] = useState<AuthMode>(() => {
    return searchParams.get('tab') === 'signup' ? 'signup' : 'login';
  });
  const [signupStep, setSignupStep] = useState<1 | 2 | 3 | 4>(1);

  // Form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string>('');

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message?: string;
  }>({ checking: false, available: null });

  // Guest conversion stats
  const [migratedStats, setMigratedStats] = useState<{
    habits: number;
    xp: number;
    streak: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect if already authenticated
  if (user && !user.isAnonymous && signupStep !== 4) {
    const redirectUrl = searchParams.get('redirect') || '/';
    return <Navigate to={redirectUrl} replace />;
  }

  // Debounced username availability checker
  useEffect(() => {
    if (mode !== 'signup' || signupStep !== 2) return;

    const clean = username.trim().toLowerCase();
    if (!clean) {
      setUsernameStatus({ checking: false, available: null });
      return;
    }

    const syntax = validateUsernameSyntax(clean);
    if (!syntax.isValid) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: syntax.error || 'Invalid username syntax.',
      });
      return;
    }

    setUsernameStatus({ checking: true, available: null });
    const timer = setTimeout(async () => {
      const result = await checkUsernameAvailability(clean, user?.uid);
      setUsernameStatus({
        checking: false,
        available: result.available,
        message: result.available ? 'Username is available!' : result.error || 'Username already taken.',
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [username, mode, signupStep, user]);

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: '', bg: '', width: '0%' };
    const hasLength = pwd.length >= 6;
    const hasNumber = /\d/.test(pwd);
    const hasSpecialOrUpper = /[A-Z!@#$%^&*(),.?":{}|<>]/.test(pwd);
    const count = [hasLength, hasNumber, hasSpecialOrUpper].filter(Boolean).length;

    if (!hasLength || count <= 1) {
      return { score: 1, label: 'Weak', color: 'text-rose-400', bg: 'bg-rose-500', width: '33%' };
    }
    if (count === 2) {
      return { score: 2, label: 'Fair', color: 'text-amber-400', bg: 'bg-amber-500', width: '66%' };
    }
    return { score: 3, label: 'Strong', color: 'text-emerald-400', bg: 'bg-emerald-500', width: '100%' };
  };

  const passwordStrength = getPasswordStrength(password);

  // Handle Photo File selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setError('Please select an image smaller than 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarDataUrl(reader.result as string);
      triggerHaptic('selection');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Convert technical Firebase auth codes to human messages
  const formatAuthError = (err: any): string => {
    const code = err?.code || '';
    if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return 'Incorrect email or password.';
    }
    if (code === 'auth/email-already-in-use') return 'An account with this email already exists.';
    if (code === 'auth/weak-password') return 'Password must be at least 6 characters.';
    if (code === 'auth/network-request-failed') return 'Network error. Please check your connection.';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return '';
    }
    if (code === 'auth/popup-blocked') {
      return 'Pop-up was blocked by your browser. Please allow pop-ups for this site.';
    }
    if (code === 'auth/too-many-requests') return 'Too many attempts. Please try again in a moment.';
    return err?.message || 'Something went wrong. Please try again.';
  };

  // 1. LOGIN SUBMIT
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    triggerHaptic('tap');

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      triggerHaptic('success');
      const redirectUrl = searchParams.get('redirect') || '/';
      navigate(redirectUrl);
    } catch (err: any) {
      setError(formatAuthError(err));
      triggerHaptic('warning');
    } finally {
      setLoading(false);
    }
  };

  // 2. FORGOT PASSWORD SUBMIT
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setError(null);
    setLoading(true);
    triggerHaptic('tap');

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setForgotSuccess(true);
      triggerHaptic('success');
    } catch (err: any) {
      setError(formatAuthError(err));
      triggerHaptic('warning');
    } finally {
      setLoading(false);
    }
  };

  // 3. PROGRESSIVE SIGNUP STEP TRANSITIONS
  const handleSignupStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    triggerHaptic('tap');
    setSignupStep(2);
  };

  const handleSignupStep2Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanDisplay = displayName.trim();
    if (!cleanDisplay) {
      setError('Please enter your display name.');
      return;
    }
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser) {
      setError('Please choose a username.');
      return;
    }
    if (!usernameStatus.available) {
      setError(usernameStatus.message || 'Please choose an available username.');
      return;
    }
    triggerHaptic('tap');
    setSignupStep(3);
  };

  // Final step: account creation + username claim + guest migration
  const handleSignupFinalSubmit = async () => {
    setError(null);
    setLoading(true);
    triggerHaptic('tap');

    try {
      const cleanEmail = email.trim();
      const cleanDisplay = displayName.trim();
      const cleanUser = username.trim().toLowerCase();

      // Check if guest has data to preserve
      const hadGuestData = hasGuestDataToMigrate();
      const localHabits = readLocalHabits();
      const localLogs = readLocalLogs();
      const localXP = getStoredLifetimeXP();
      const localStreak = calculateGlobalHabitStreak(localHabits, localLogs).currentStreak;

      let signedInUser = auth.currentUser;

      // 1. Create or link user in Firebase Auth
      if (user && user.isAnonymous) {
        const credential = EmailAuthProvider.credential(cleanEmail, password);
        try {
          const res = await linkWithCredential(user, credential);
          signedInUser = res.user;
        } catch (linkErr: any) {
          if (linkErr.code === 'auth/credential-already-in-use') {
            const res = await signInWithEmailAndPassword(auth, cleanEmail, password);
            signedInUser = res.user;
          } else {
            throw linkErr;
          }
        }
      } else {
        const res = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        signedInUser = res.user;
      }

      if (!signedInUser) {
        throw new Error('Authentication failed. Please try again.');
      }

      const uid = signedInUser.uid;

      // 2. ATOMIC Username Claim in Firestore
      const claimResult = await claimUsername(uid, cleanUser);
      if (!claimResult.success) {
        throw new Error(claimResult.error || 'Failed to claim username.');
      }

      // 3. Save Profile in Firestore
      await saveUserProfileToFirestore({
        name: cleanDisplay,
        displayName: cleanDisplay,
        userName: cleanUser,
        avatarUrl: avatarDataUrl || '',
        onboardingCompleted: true,
        hasCompletedOnboarding: true,
      }, uid);

      // 4. Update memory profile
      await updateProfile({
        name: cleanDisplay,
        displayName: cleanDisplay,
        userName: cleanUser,
        avatarUrl: avatarDataUrl || '',
        onboardingCompleted: true,
        hasCompletedOnboarding: true,
      });

      // 5. Migrate Guest Records if applicable
      if (hadGuestData || localHabits.length > 0 || localXP > 0) {
        try {
          await migrateGuestData();
          setMigratedStats({
            habits: localHabits.length,
            xp: localXP,
            streak: localStreak,
          });
          setSignupStep(4); // Show "Your progress is coming with you" celebration step
          triggerHaptic('success');
          return;
        } catch (mErr) {
          console.warn('Non-blocking migration note:', mErr);
        }
      }

      // Direct success
      triggerHaptic('success');
      const redirectUrl = searchParams.get('redirect') || '/';
      navigate(redirectUrl);
    } catch (err: any) {
      setError(formatAuthError(err));
      triggerHaptic('warning');
    } finally {
      setLoading(false);
    }
  };

  // 4. GOOGLE AUTHENTICATION
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    triggerHaptic('tap');

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      let result;
      if (user && user.isAnonymous) {
        try {
          result = await linkWithPopup(user, provider);
        } catch (linkErr: any) {
          if (linkErr.code === 'auth/credential-already-in-use') {
            result = await signInWithPopup(auth, provider);
          } else {
            throw linkErr;
          }
        }
      } else {
        result = await signInWithPopup(auth, provider);
      }

      // If successful, migrate guest data if available
      if (hasGuestDataToMigrate()) {
        try {
          await migrateGuestData();
        } catch {}
      }

      triggerHaptic('success');
      const redirectUrl = searchParams.get('redirect') || '/';
      navigate(redirectUrl);
    } catch (err: any) {
      const code = err?.code || '';
      // User closed the popup or initiated another popup: intentional dismissal, do not treat as an error
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }

      if (code === 'auth/popup-blocked') {
        setError('The Google sign-in window was blocked by your browser. Please allow popups for this site or open in a full window.');
        triggerHaptic('warning');
        return;
      }

      console.warn('Google Sign-In non-fatal exception:', err);
      let msg = formatAuthError(err);
      if (msg) {
        if (window !== window.top) {
          msg += ' (Note: If inside an embedded preview, click the pop-out button in the top-right toolbar)';
        }
        setError(msg);
        triggerHaptic('warning');
      }
    } finally {
      setLoading(false);
    }
  };

  // 5. GUEST MODE
  const handleContinueAsGuest = () => {
    triggerHaptic('tap');
    continueAsGuest();
    const redirectUrl = searchParams.get('redirect') || '/';
    navigate(redirectUrl);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col justify-center relative overflow-hidden">
      <SEO title="Authentication — STREAK" noindex={true} />

      {/* Main Grid: Desktop Split-Screen, Mobile Single Column */}
      <div className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-12 relative z-10">
        {/* LEFT / VISUAL EXPERIENCE PANEL (Desktop & Tablet Landscape) */}
        <div className="hidden lg:block lg:col-span-6 xl:col-span-7 h-full">
          <AuthVisualPanel />
        </div>

        {/* RIGHT / AUTHENTICATION PANEL */}
        <div className="col-span-1 lg:col-span-6 xl:col-span-5 flex flex-col justify-center items-center px-4 py-8 sm:px-8 xl:px-14 relative bg-[#090b11]">
          {/* Subtle Ambient Glow for Auth panel */}
          <div className="absolute top-10 right-10 w-72 h-72 bg-accent-primary/5 rounded-full blur-3xl pointer-events-none" />

          {/* Form Container */}
          <div className="w-full max-w-[420px] mx-auto space-y-6">
            {/* Top Brand Logo & Mobile Storytelling Header */}
            <div className="text-center space-y-3">
              <div 
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 cursor-pointer group"
              >
                <img
                  src="/logo.png"
                  alt="STREAK Logo"
                  width={44}
                  height={44}
                  className="w-11 h-11 object-contain drop-shadow-[0_0_20px_rgba(140,238,40,0.35)] group-hover:scale-105 transition-transform"
                />
                <span className="text-2xl font-black tracking-tight text-white group-hover:text-accent-primary transition-colors">
                  STREAK
                </span>
              </div>

              {/* Mobile Compact Momentum Indicator */}
              <div className="lg:hidden flex items-center justify-center gap-3 py-1 px-3 rounded-full bg-white/[0.03] border border-white/5 mx-auto max-w-fit text-[11px] text-[#8c94a8]">
                <span className="flex items-center gap-1 text-amber-400 font-semibold">
                  <Flame className="w-3.5 h-3.5 fill-amber-400" />
                  21d Streak
                </span>
                <span className="text-white/20">·</span>
                <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                  <Zap className="w-3.5 h-3.5" />
                  +240 XP
                </span>
                <span className="text-white/20">·</span>
                <span className="text-accent-primary font-semibold">85% Momentum</span>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-xs text-rose-300"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </motion.div>
            )}

            {/* ======================================================== */}
            {/* VIEW 1: LOGIN MODE */}
            {/* ======================================================== */}
            {mode === 'login' && (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="p-6 sm:p-7 rounded-[32px] bg-[#121622]/90 border border-white/10 shadow-2xl backdrop-blur-xl space-y-5"
              >
                <div className="space-y-1 text-left">
                  <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back.</h1>
                  <p className="text-xs text-[#8c94a8]">
                    Your consistency and progress are waiting for you.
                  </p>
                </div>

                {/* Primary Google Login */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] border border-white/10 text-white font-medium text-xs tracking-tight transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm hover:border-white/20"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="flex items-center gap-3 text-[11px] text-[#555f75]">
                  <div className="flex-1 h-px bg-white/10" />
                  <span>OR WITH EMAIL</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  {/* Email Input */}
                  <div className="space-y-1 text-left">
                    <label className="text-[11px] font-semibold text-[#8c94a8] tracking-wider uppercase flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#555f75]" />
                      <span>Email address</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        required
                        disabled={loading}
                        className="w-full py-3 px-4 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-[#555f75] text-xs outline-none focus:border-accent-primary/60 focus:bg-white/[0.06] transition-all"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1 text-left">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-[#8c94a8] tracking-wider uppercase flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#555f75]" />
                        <span>Password</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setMode('forgot_password');
                        }}
                        className="text-[11px] text-accent-primary hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        disabled={loading}
                        className="w-full py-3 pl-4 pr-10 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-[#555f75] text-xs outline-none focus:border-accent-primary/60 focus:bg-white/[0.06] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7d8495] hover:text-white transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl bg-accent-primary hover:bg-[#9eff38] active:scale-[0.98] text-black font-extrabold text-xs tracking-tight transition-all cursor-pointer shadow-lg shadow-accent-primary/25 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Logging in...</span>
                      </span>
                    ) : (
                      <>
                        <span>Log In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Switch to Signup */}
                <div className="pt-2 text-center text-xs text-[#8c94a8] border-t border-white/5 space-y-3">
                  <p>
                    New to STREAK?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setMode('signup');
                        setSignupStep(1);
                      }}
                      className="font-bold text-white hover:text-accent-primary underline transition-colors cursor-pointer"
                    >
                      Create account →
                    </button>
                  </p>

                  {/* Tertiary Guest Option */}
                  <div>
                    <button
                      type="button"
                      onClick={handleContinueAsGuest}
                      className="text-[11px] text-[#555f75] hover:text-[#8c94a8] transition-colors cursor-pointer underline decoration-dotted"
                    >
                      Continue as Guest (explore locally)
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ======================================================== */}
            {/* VIEW 2: PROGRESSIVE MULTI-STEP SIGNUP */}
            {/* ======================================================== */}
            {mode === 'signup' && (
              <motion.div
                key={`signup-step-${signupStep}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="p-6 sm:p-7 rounded-[32px] bg-[#121622]/90 border border-white/10 shadow-2xl backdrop-blur-xl space-y-5"
              >
                {/* Minimal Progress Indicator */}
                {signupStep < 4 && (
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2 text-[11px] font-semibold">
                      <span className={`px-2 py-0.5 rounded-full ${signupStep === 1 ? 'bg-accent-primary text-black font-bold' : 'text-[#7d8495] bg-white/5'}`}>
                        01 Account
                      </span>
                      <span className="text-[#3b4356]">──</span>
                      <span className={`px-2 py-0.5 rounded-full ${signupStep === 2 ? 'bg-accent-primary text-black font-bold' : 'text-[#7d8495] bg-white/5'}`}>
                        02 Identity
                      </span>
                      <span className="text-[#3b4356]">──</span>
                      <span className={`px-2 py-0.5 rounded-full ${signupStep === 3 ? 'bg-accent-primary text-black font-bold' : 'text-[#7d8495] bg-white/5'}`}>
                        03 Profile
                      </span>
                    </div>

                    <span className="text-[10px] text-[#555f75] font-mono">
                      Step {signupStep} of 3
                    </span>
                  </div>
                )}

                {/* ── STEP 1: ACCOUNT (Email + Password) ── */}
                {signupStep === 1 && (
                  <form onSubmit={handleSignupStep1Next} className="space-y-4 text-left">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold text-white tracking-tight">
                        Let's start your streak.
                      </h2>
                      <p className="text-xs text-[#8c94a8]">
                        Build consistency with a permanent, private account.
                      </p>
                    </div>

                    {/* Google Signup Shortcut */}
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="w-full py-3 px-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] border border-white/10 text-white font-medium text-xs tracking-tight transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm hover:border-white/20"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
                        <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z" />
                        <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
                      </svg>
                      <span>Sign up with Google</span>
                    </button>

                    <div className="flex items-center gap-3 text-[11px] text-[#555f75]">
                      <div className="flex-1 h-px bg-white/10" />
                      <span>OR CHOOSE EMAIL</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#8c94a8] uppercase tracking-wider flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-[#555f75]" />
                        <span>Email Address</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        required
                        className="w-full py-3 px-4 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-[#555f75] text-xs outline-none focus:border-accent-primary/60 focus:bg-white/[0.06] transition-all"
                      />
                    </div>

                    {/* Password + Strength meter */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#8c94a8] uppercase tracking-wider flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#555f75]" />
                        <span>Password</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          required
                          className="w-full py-3 pl-4 pr-10 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-[#555f75] text-xs outline-none focus:border-accent-primary/60 focus:bg-white/[0.06] transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7d8495] hover:text-white transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Password strength bar */}
                      {password.length > 0 && (
                        <div className="pt-1.5 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-[#7d8495]">Password strength:</span>
                            <span className={`font-semibold ${passwordStrength.color}`}>
                              {passwordStrength.label}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className={`h-full ${passwordStrength.bg} transition-all duration-300 rounded-full`}
                              style={{ width: passwordStrength.width }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 px-4 rounded-xl bg-accent-primary hover:bg-[#9eff38] active:scale-[0.98] text-black font-extrabold text-xs tracking-tight transition-all cursor-pointer shadow-lg shadow-accent-primary/25 flex items-center justify-center gap-2 mt-2"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <div className="pt-2 text-center text-xs text-[#8c94a8]">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setMode('login');
                        }}
                        className="font-bold text-white hover:text-accent-primary underline transition-colors cursor-pointer"
                      >
                        Log in →
                      </button>
                    </div>
                  </form>
                )}

                {/* ── STEP 2: IDENTITY (Display Name + Unique Username) ── */}
                {signupStep === 2 && (
                  <form onSubmit={handleSignupStep2Next} className="space-y-4 text-left">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold text-white tracking-tight">
                        Give your STREAK an identity.
                      </h2>
                      <p className="text-xs text-[#8c94a8]">
                        Display name for greetings and unique handle for accountability.
                      </p>
                    </div>

                    {/* Display Name */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#8c94a8] uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#555f75]" />
                        <span>Display Name</span>
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Vimlesh"
                        maxLength={40}
                        required
                        className="w-full py-3 px-4 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-[#555f75] text-xs outline-none focus:border-accent-primary/60 focus:bg-white/[0.06] transition-all"
                      />
                      <p className="text-[10px] text-[#555f75]">Shown on your dashboard & greetings</p>
                    </div>

                    {/* Unique Username */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#8c94a8] uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <AtSign className="w-3.5 h-3.5 text-[#555f75]" />
                          <span>Unique Username</span>
                        </span>
                        {usernameStatus.checking && (
                          <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Checking...
                          </span>
                        )}
                      </label>

                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400 font-mono text-xs font-bold">
                          @
                        </span>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          placeholder="username"
                          maxLength={20}
                          required
                          className={`w-full py-3 pl-8 pr-10 rounded-xl bg-white/[0.03] border text-white font-mono placeholder-[#555f75] text-xs outline-none transition-all ${
                            usernameStatus.available === true
                              ? 'border-emerald-500/60 focus:border-emerald-500'
                              : usernameStatus.available === false
                              ? 'border-rose-500/60 focus:border-rose-500'
                              : 'border-white/10 focus:border-accent-primary/60'
                          }`}
                        />
                        {usernameStatus.available === true && (
                          <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                        )}
                      </div>

                      {/* Live availability feedback */}
                      {usernameStatus.message && (
                        <p
                          className={`text-[10px] font-medium flex items-center gap-1 pt-0.5 ${
                            usernameStatus.available ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {usernameStatus.available ? '✓' : '✕'} {usernameStatus.message}
                        </p>
                      )}
                      <p className="text-[10px] text-[#555f75]">
                        Letters, numbers, and underscores (3-20 chars). Permanent social handle.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setSignupStep(1)}
                        className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs tracking-tight transition-all cursor-pointer border border-white/10 flex items-center gap-1.5"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>

                      <button
                        type="submit"
                        disabled={!usernameStatus.available}
                        className="flex-1 py-3 px-4 rounded-xl bg-accent-primary hover:bg-[#9eff38] active:scale-[0.98] text-black font-extrabold text-xs tracking-tight transition-all cursor-pointer shadow-lg shadow-accent-primary/25 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <span>Continue to Profile</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                )}

                {/* ── STEP 3: PROFILE (Photo Upload & Final Confirmation) ── */}
                {signupStep === 3 && (
                  <div className="space-y-5 text-left">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold text-white tracking-tight">Make it yours.</h2>
                      <p className="text-xs text-[#8c94a8]">
                        Add a photo or use an initials avatar based on your name.
                      </p>
                    </div>

                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />

                    {/* Interactive Photo Selection */}
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <div className="relative">
                        <UserAvatar
                          avatarUrl={avatarDataUrl || undefined}
                          name={displayName || 'User'}
                          size="lg"
                          className="ring-2 ring-accent-primary/30"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-accent-primary text-black shadow-md hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                          title="Upload photo"
                        >
                          <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{avatarDataUrl ? 'Change photo' : 'Upload photo'}</span>
                        </button>

                        {avatarDataUrl && (
                          <button
                            type="button"
                            onClick={() => setAvatarDataUrl('')}
                            className="block text-[11px] text-rose-400 hover:underline cursor-pointer"
                          >
                            Remove and use initials
                          </button>
                        )}
                        {!avatarDataUrl && (
                          <p className="text-[10px] text-[#555f75]">Or continue with clean initials badge</p>
                        )}
                      </div>
                    </div>

                    {/* Profile Summary Card Preview */}
                    <div className="p-4 rounded-2xl bg-[#0c0f17] border border-white/10 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7d8495] block">
                        Your STREAK Identity Preview
                      </span>
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          avatarUrl={avatarDataUrl || undefined}
                          name={displayName || 'User'}
                          size="md"
                        />
                        <div>
                          <p className="text-sm font-bold text-white tracking-tight">{displayName}</p>
                          <p className="text-xs font-mono text-cyan-400">@{username}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setSignupStep(2)}
                        disabled={loading}
                        className="py-3.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs tracking-tight transition-all cursor-pointer border border-white/10 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSignupFinalSubmit}
                        disabled={loading}
                        className="flex-1 py-3.5 px-4 rounded-xl bg-accent-primary hover:bg-[#9eff38] active:scale-[0.98] text-black font-extrabold text-xs tracking-tight transition-all cursor-pointer shadow-lg shadow-accent-primary/25 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Creating your account...</span>
                          </span>
                        ) : (
                          <>
                            <span>Start my STREAK</span>
                            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 4: GUEST CONVERSION PRESERVED CELEBRATION ── */}
                {signupStep === 4 && migratedStats && (
                  <div className="space-y-5 text-center py-2">
                    <div className="w-14 h-14 rounded-2xl bg-accent-primary/15 border border-accent-primary/30 flex items-center justify-center text-accent-primary mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>

                    <div className="space-y-1">
                      <h2 className="text-2xl font-black text-white tracking-tight">
                        Your progress is coming with you.
                      </h2>
                      <p className="text-xs text-[#8c94a8]">
                        All existing records have been permanently saved to your new account.
                      </p>
                    </div>

                    {/* Preserved Stats Checklist */}
                    <div className="p-4 rounded-2xl bg-[#0c0f17] border border-emerald-500/25 space-y-2.5 text-left">
                      <div className="flex items-center gap-2.5 text-xs text-white">
                        <Check className="w-4 h-4 text-accent-primary shrink-0" />
                        <span>
                          <strong className="text-accent-primary">{migratedStats.habits}</strong> habits permanently saved
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-white">
                        <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>
                          <strong className="text-cyan-400">+{migratedStats.xp} XP</strong> preserved in cloud sync
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-white">
                        <Check className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          <strong className="text-amber-400">{migratedStats.streak}-day streak</strong> unbroken & protected
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('tap');
                        const redirectUrl = searchParams.get('redirect') || '/';
                        navigate(redirectUrl);
                      }}
                      className="w-full py-3.5 px-4 rounded-xl bg-accent-primary hover:bg-[#9eff38] active:scale-[0.98] text-black font-extrabold text-xs tracking-tight transition-all cursor-pointer shadow-lg shadow-accent-primary/25 flex items-center justify-center gap-2"
                    >
                      <span>Enter STREAK</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ======================================================== */}
            {/* VIEW 3: FORGOT PASSWORD */}
            {/* ======================================================== */}
            {mode === 'forgot_password' && (
              <motion.div
                key="forgot-password-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="p-6 sm:p-7 rounded-[32px] bg-[#121622]/90 border border-white/10 shadow-2xl backdrop-blur-xl space-y-5"
              >
                {!forgotSuccess ? (
                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 text-left">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold text-white tracking-tight">
                        Reset your password
                      </h2>
                      <p className="text-xs text-[#8c94a8]">
                        Enter your email address and we'll send you a password reset link.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#8c94a8] uppercase tracking-wider flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-[#555f75]" />
                        <span>Registered Email</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        required
                        disabled={loading}
                        className="w-full py-3 px-4 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-[#555f75] text-xs outline-none focus:border-accent-primary/60 focus:bg-white/[0.06] transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-4 rounded-xl bg-accent-primary hover:bg-[#9eff38] active:scale-[0.98] text-black font-extrabold text-xs tracking-tight transition-all cursor-pointer shadow-lg shadow-accent-primary/25 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending reset link...</span>
                        </span>
                      ) : (
                        <span>Send Reset Link</span>
                      )}
                    </button>

                    <div className="pt-2 text-center text-xs text-[#8c94a8]">
                      Remembered your password?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setMode('login');
                        }}
                        className="font-bold text-white hover:text-accent-primary underline transition-colors cursor-pointer"
                      >
                        Return to Log In →
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4 text-center py-2">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                      <Mail className="w-7 h-7" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-white tracking-tight">
                        Check your inbox
                      </h3>
                      <p className="text-xs text-[#8c94a8] leading-relaxed max-w-xs mx-auto">
                        We've sent a password reset link to <strong className="text-white">{email}</strong>. Follow the link in the email to choose a new password.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setForgotSuccess(false);
                        setMode('login');
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs tracking-tight border border-white/10 transition-colors cursor-pointer"
                    >
                      Return to Log In
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
