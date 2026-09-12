/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider, useAuth } from './lib/AuthContext';

// Layouts
import MainLayout from './components/layout/MainLayout';

// Pages
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

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { profile, onboardingCompleted, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0e12]">
        <div className="w-8 h-8 border-t-2 border-[#8cee28] rounded-full animate-spin"></div>
      </div>
    );
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

  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, onboardingCompleted, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0e12]">
        <div className="w-8 h-8 border-t-2 border-[#8cee28] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
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

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route
            path="/habits/new"
            element={
              <OnboardingGate>
                <CreateHabit />
              </OnboardingGate>
            }
          />
          <Route
            path="/habits"
            element={
              <OnboardingGate>
                <MyHabits />
              </OnboardingGate>
            }
          />
          <Route
            path="/goals"
            element={
              <OnboardingGate>
                <Goals />
              </OnboardingGate>
            }
          />
          <Route
            path="/analytics"
            element={
              <OnboardingGate>
                <Analytics />
              </OnboardingGate>
            }
          />
          <Route
            path="/journal"
            element={
              <OnboardingGate>
                <Journal />
              </OnboardingGate>
            }
          />
          <Route
            path="/reminders"
            element={
              <OnboardingGate>
                <Reminders />
              </OnboardingGate>
            }
          />
          <Route
            path="/themes"
            element={
              <OnboardingGate>
                <ThemesAppearance />
              </OnboardingGate>
            }
          />
          <Route
            path="/sync"
            element={
              <OnboardingGate>
                <BackupSync />
              </OnboardingGate>
            }
          />
          <Route
            path="/settings"
            element={
              <OnboardingGate>
                <Settings />
              </OnboardingGate>
            }
          />
          <Route
            path="/support"
            element={
              <OnboardingGate>
                <HelpSupport />
              </OnboardingGate>
            }
          />
          <Route
            path="/feedback"
            element={
              <OnboardingGate>
                <Feedback />
              </OnboardingGate>
            }
          />
          
          <Route
            path="/"
            element={
              <OnboardingGate>
                <MainLayout />
              </OnboardingGate>
            }
          >
            <Route index element={<Home />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="more" element={<More />} />
          </Route>
          
          <Route
            path="/ai-coach"
            element={
              <OnboardingGate>
                <AICoach />
              </OnboardingGate>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

