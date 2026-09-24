/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { SEO } from './components/seo/SEO';
import { RouteSkeleton } from './components/RouteSkeleton';

// Layouts & Primary Route
import MainLayout from './components/layout/MainLayout';
import Home from './pages/Home';

// App Pages (Lazy Loaded for responsive Suspense chunking)
const Calendar = lazy(() => import('./pages/Calendar'));
const More = lazy(() => import('./pages/More'));
const Login = lazy(() => import('./pages/auth/Login'));
const Onboarding = lazy(() => import('./pages/onboarding/Onboarding'));
const AICoach = lazy(() => import('./pages/AICoach'));
const CreateHabit = lazy(() => import('./pages/habits/CreateHabit'));
const MyHabits = lazy(() => import('./pages/habits/MyHabits'));
const Goals = lazy(() => import('./pages/goals/Goals'));
const GoalDetail = lazy(() => import('./pages/goals/GoalDetail'));
const Analytics = lazy(() => import('./pages/analytics/Analytics'));
const Journal = lazy(() => import('./pages/journal/Journal'));
const Reminders = lazy(() => import('./pages/reminders/Reminders'));
const ThemesAppearance = lazy(() => import('./pages/appearance/ThemesAppearance'));
const BackupSync = lazy(() => import('./pages/sync/BackupSync'));
const Settings = lazy(() => import('./pages/settings/Settings'));
const HelpSupport = lazy(() => import('./pages/support/HelpSupport'));
const Feedback = lazy(() => import('./pages/support/Feedback'));
const Activity = lazy(() => import('./pages/activity/Activity'));
const ActivityHistory = lazy(() => import('./pages/activity/ActivityHistory'));

// Public SEO Pages & Guides
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const HabitsGuide = lazy(() => import('./pages/public/HabitsGuide'));
const GoalsGuide = lazy(() => import('./pages/public/GoalsGuide'));
const TasksGuide = lazy(() => import('./pages/public/TasksGuide'));
const FocusTimerGuide = lazy(() => import('./pages/public/FocusTimerGuide'));
const JournalGuide = lazy(() => import('./pages/public/JournalGuide'));
const AnalyticsGuide = lazy(() => import('./pages/public/AnalyticsGuide'));
const AICoachGuide = lazy(() => import('./pages/public/AICoachGuide'));
const AboutPage = lazy(() => import('./pages/public/AboutPage'));
const PrivacyPolicy = lazy(() => import('./pages/public/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/public/TermsOfService'));

import { TimerProvider } from './lib/timer/TimerContext';
import { HabitNotificationEngine } from './components/HabitNotificationEngine';
import { PWAInstallBanner } from './components/pwa/PWAInstallBanner';
import { PWAUpdateToast } from './components/pwa/PWAUpdateToast';
import { OfflineStatusBanner } from './components/pwa/OfflineStatusBanner';
import { SplashScreen } from './components/ui/SplashScreen';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, onboardingCompleted, loading } = useAuth();
  if (loading) {
    return <RouteSkeleton />;
  }

  if (!user && !profile?.isGuest) {
    return <Navigate to="/login" replace />;
  }

  const isCompleted = Boolean(
    onboardingCompleted ||
    profile?.onboardingCompleted ||
    profile?.hasCompletedOnboarding ||
    (typeof window !== 'undefined' && localStorage.getItem('streak_onboarding_completed') === 'true')
  );
  if (!isCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <>
      <SEO noindex={true} />
      {children}
    </>
  );
}

function PublicOrProtected({
  publicComponent: PublicComp,
  protectedComponent: ProtectedComp,
}: {
  publicComponent: React.ComponentType;
  protectedComponent: React.ComponentType;
}) {
  const { user, profile, loading } = useAuth();
  if (loading) {
    return <RouteSkeleton />;
  }

  const isAuthenticated = Boolean(user || profile?.isGuest);
  if (isAuthenticated) {
    return (
      <ProtectedRoute>
        <ProtectedComp />
      </ProtectedRoute>
    );
  }

  return <PublicComp />;
}

function HomeRoute() {
  const { user, profile, loading } = useAuth();
  if (loading) {
    return <RouteSkeleton />;
  }

  const isAuthenticated = Boolean(user || profile?.isGuest);
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <ProtectedRoute>
      <MainLayout />
    </ProtectedRoute>
  );
}

function AnimatedAppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {/* GPU-promoted layer with non-blocking slide-fade transition */}
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
        style={{
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
        className="w-full min-h-screen"
      >
        <Suspense fallback={<RouteSkeleton />}>
          <Routes location={location}>
            {/* Public Authentication & Onboarding */}
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />

            {/* Root: Landing Page for guests/crawlers, Dashboard for authenticated users */}
            <Route path="/" element={<HomeRoute />}>
              <Route index element={<Home />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="more" element={<More />} />
            </Route>

            {/* Public Guides vs Protected App Views */}
            <Route
              path="/habits"
              element={<PublicOrProtected publicComponent={HabitsGuide} protectedComponent={MyHabits} />}
            />
            <Route
              path="/habits/new"
              element={
                <ProtectedRoute>
                  <CreateHabit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/goals"
              element={<PublicOrProtected publicComponent={GoalsGuide} protectedComponent={Goals} />}
            />
            <Route
              path="/goals/:goalId"
              element={
                <ProtectedRoute>
                  <GoalDetail />
                </ProtectedRoute>
              }
            />
            <Route path="/tasks" element={<TasksGuide />} />
            <Route path="/focus-timer" element={<FocusTimerGuide />} />
            <Route
              path="/journal"
              element={<PublicOrProtected publicComponent={JournalGuide} protectedComponent={Journal} />}
            />
            <Route
              path="/analytics"
              element={<PublicOrProtected publicComponent={AnalyticsGuide} protectedComponent={Analytics} />}
            />
            <Route
              path="/ai-coach"
              element={<PublicOrProtected publicComponent={AICoachGuide} protectedComponent={AICoach} />}
            />

            {/* Informational & Support Pages */}
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/support" element={<HelpSupport />} />
            <Route path="/feedback" element={<Feedback />} />

            {/* User App Settings & Activity */}
            <Route
              path="/reminders"
              element={
                <ProtectedRoute>
                  <Reminders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/themes"
              element={
                <ProtectedRoute>
                  <ThemesAppearance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sync"
              element={
                <ProtectedRoute>
                  <BackupSync />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activity"
              element={
                <ProtectedRoute>
                  <Activity />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activity/history"
              element={
                <ProtectedRoute>
                  <ActivityHistory />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TimerProvider>
        <SplashScreen />
        <HabitNotificationEngine />
        <OfflineStatusBanner />
        <PWAUpdateToast />
        <PWAInstallBanner />
        <BrowserRouter>
          <AnimatedAppRoutes />
          <VercelAnalytics />
        </BrowserRouter>
      </TimerProvider>
    </AuthProvider>
  );
}
