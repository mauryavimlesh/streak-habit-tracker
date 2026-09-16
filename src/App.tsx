/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { SEO } from './components/seo/SEO';

// Layouts
import MainLayout from './components/layout/MainLayout';

// App Pages
import Home from './pages/Home';
import Calendar from './pages/Calendar';
import More from './pages/More';
import Login from './pages/auth/Login';
import Onboarding from './pages/onboarding/Onboarding';
import AICoach from './pages/AICoach';
import CreateHabit from './pages/habits/CreateHabit';
import MyHabits from './pages/habits/MyHabits';
import Goals from './pages/goals/Goals';
import Analytics from './pages/analytics/Analytics';
import Journal from './pages/journal/Journal';
import Reminders from './pages/reminders/Reminders';
import ThemesAppearance from './pages/appearance/ThemesAppearance';
import BackupSync from './pages/sync/BackupSync';
import Settings from './pages/settings/Settings';
import HelpSupport from './pages/support/HelpSupport';
import Feedback from './pages/support/Feedback';
import Activity from './pages/activity/Activity';
import ActivityHistory from './pages/activity/ActivityHistory';

// Public SEO Pages & Guides
import LandingPage from './pages/public/LandingPage';
import HabitsGuide from './pages/public/HabitsGuide';
import GoalsGuide from './pages/public/GoalsGuide';
import TasksGuide from './pages/public/TasksGuide';
import FocusTimerGuide from './pages/public/FocusTimerGuide';
import JournalGuide from './pages/public/JournalGuide';
import AnalyticsGuide from './pages/public/AnalyticsGuide';
import AICoachGuide from './pages/public/AICoachGuide';
import AboutPage from './pages/public/AboutPage';
import PrivacyPolicy from './pages/public/PrivacyPolicy';
import TermsOfService from './pages/public/TermsOfService';

import { TimerProvider } from './lib/timer/TimerContext';
import { HabitNotificationEngine } from './components/HabitNotificationEngine';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, onboardingCompleted, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0e12]">
        <div className="w-8 h-8 border-t-2 border-accent-primary rounded-full animate-spin"></div>
      </div>
    );
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0e12]">
        <div className="w-8 h-8 border-t-2 border-accent-primary rounded-full animate-spin"></div>
      </div>
    );
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0e12]">
        <div className="w-8 h-8 border-t-2 border-accent-primary rounded-full animate-spin"></div>
      </div>
    );
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

export default function App() {
  return (
    <AuthProvider>
      <TimerProvider>
        <HabitNotificationEngine />
        <BrowserRouter>
        <Routes>
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
        <VercelAnalytics />
      </BrowserRouter>
      </TimerProvider>
    </AuthProvider>
  );
}
