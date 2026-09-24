import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { clearAllLocalData } from './settingsService';
import { saveAppearanceSettings, applyAppearanceSettings } from './themeService';
import { syncLocalToCloud } from './habitService';
import { syncLocalTasksToCloud } from './taskService';
import { syncLocalJournalToCloud } from './journalService';
import { syncLocalGoalsToCloud } from './goalService';
import { syncLocalRemindersToCloud } from './reminderService';
import { trackLogin, trackLogout, trackSignUp, identifyUser } from './analyticsService';
import {
  migrateGuestDataToFirestore,
  hasGuestDataToMigrate,
  MigrationResult,
} from './guestMigrationService';

export type AuthState = 'loading' | 'guest' | 'authenticated' | 'error';

export interface UserProfile {
  isGuest?: boolean;
  name?: string;
  userName?: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  mainGoal?: string;
  selectedGoals?: string[];
  hasCompletedOnboarding?: boolean;
  onboardingCompleted?: boolean;
  routinePreference?: string;
  appearancePreference?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface UserSession {
  authState: AuthState;
  isAuthenticated: boolean;
  isGuest: boolean;
  userId: string | null;
  email: string | null;
  displayName: string;
  username: string;
  avatarUrl: string;
  accountType: 'guest' | 'authenticated';
  createdAt: string;
  updatedAt: string;
  onboardingCompleted: boolean;
  selectedGoals: string[];
  mainGoal?: string;
  routinePreference?: string;
  appearancePreference?: string;
}

export const STREAK_GUEST_DATA_KEY = 'streak_guest_data';
export const LOCAL_STORAGE_PROFILE_KEY = 'streak_user_profile';
export const LOCAL_STORAGE_ONBOARDING_KEY = 'streak_onboarding_completed';
export const STREAK_PROFILE_UPDATED_EVENT = 'streak_profile_updated';

export interface GuestData {
  id: string;
  isGuest: true;
  displayName: string;
  name: string;
  userName: string;
  avatarUrl?: string;
  selectedGoals?: string[];
  mainGoal?: string;
  routinePreference?: string;
  appearancePreference?: string;
  onboardingCompleted?: boolean;
  hasCompletedOnboarding?: boolean;
  createdAt: string;
  updatedAt: string;
  dataVersion?: number;
  habits?: any[];
  habitLogs?: any[];
  tasks?: any[];
  goals?: any[];
  journal?: any[];
  reminders?: any[];
  settings?: Record<string, any>;
}

export interface AuthContextType {
  session: UserSession;
  userSession: UserSession;
  user: User | null;
  profile: UserProfile | null;
  userProfile: UserProfile | null;
  guestData: GuestData | null;
  isGuest: boolean;
  isAuthenticated: boolean;
  authState: AuthState;
  onboardingCompleted: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  removeProfilePhoto: () => Promise<void>;
  saveUserProfileToFirestore: (data: Partial<UserProfile>, targetUid?: string) => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  resetOnboarding: () => void;
  continueAsGuest: (customName?: string) => GuestData;
  resetGuestSession: () => GuestData;
  migrateGuestData: () => Promise<MigrationResult | null>;
}

const GUEST_ADJECTIVES = [
  'Mindful', 'Focused', 'Quiet', 'Curious', 'Daily', 
  'Swift', 'Steady', 'Calm', 'Brave', 'Rising', 'Serene', 'Atomic'
];

const GUEST_NOUNS = [
  'Spark', 'Nova', 'Runner', 'Mind', 'Flame', 'Voyager', 
  'Builder', 'Striver', 'Falcon', 'Phoenix', 'Seeker'
];

export const generateRandomGuestName = (): string => {
  const adj = GUEST_ADJECTIVES[Math.floor(Math.random() * GUEST_ADJECTIVES.length)];
  const noun = GUEST_NOUNS[Math.floor(Math.random() * GUEST_NOUNS.length)];
  return `Guest ${adj} ${noun}`;
};

export const getStoredGuestData = (): GuestData | null => {
  try {
    const raw = localStorage.getItem(STREAK_GUEST_DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...parsed,
          isGuest: true,
        };
      }
    }
  } catch (e) {
    console.error('Failed reading streak_guest_data:', e);
  }
  return null;
};

export const createDefaultGuestData = (customName?: string): GuestData => {
  const displayName = customName || generateRandomGuestName();
  const now = new Date().toISOString();
  return {
    id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    isGuest: true,
    displayName,
    name: displayName,
    userName: '', // Guests do not have permanent usernames
    avatarUrl: '',
    selectedGoals: ['fitness', 'discipline'],
    onboardingCompleted: true,
    hasCompletedOnboarding: true,
    createdAt: now,
    updatedAt: now,
    dataVersion: 1,
  };
};

export const saveGuestData = (data: Partial<GuestData>): GuestData => {
  try {
    const current = getStoredGuestData() || createDefaultGuestData();
    const resolvedName = data.displayName || data.userName || data.name || current.displayName;
    const isCompleted = data.onboardingCompleted ?? data.hasCompletedOnboarding ?? current.onboardingCompleted ?? current.hasCompletedOnboarding ?? true;
    const updated: GuestData = {
      ...current,
      ...data,
      isGuest: true,
      displayName: resolvedName,
      name: resolvedName,
      userName: resolvedName,
      onboardingCompleted: Boolean(isCompleted),
      hasCompletedOnboarding: Boolean(isCompleted),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STREAK_GUEST_DATA_KEY, JSON.stringify(updated));
    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(updated));
    if (updated.onboardingCompleted) {
      localStorage.setItem(LOCAL_STORAGE_ONBOARDING_KEY, 'true');
    }
    window.dispatchEvent(new CustomEvent(STREAK_PROFILE_UPDATED_EVENT, { detail: updated }));
    return updated;
  } catch (e) {
    console.error('Failed writing streak_guest_data:', e);
    return createDefaultGuestData();
  }
};

export const getOrInitGuestData = (): GuestData => {
  const existing = getStoredGuestData();
  if (existing) return existing;

  try {
    const legacyRaw = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      const isDone = Boolean(parsed.onboardingCompleted ?? parsed.hasCompletedOnboarding);
      const name = parsed.displayName || parsed.name || parsed.userName || generateRandomGuestName();
      const guest: GuestData = {
        id: `guest_${Date.now()}`,
        isGuest: true,
        displayName: name.startsWith('Guest') ? name : `Guest ${name}`,
        name: name.startsWith('Guest') ? name : `Guest ${name}`,
        userName: name.startsWith('Guest') ? name : `Guest ${name}`,
        avatarUrl: parsed.avatarUrl || '',
        selectedGoals: parsed.selectedGoals || ['fitness', 'discipline'],
        onboardingCompleted: isDone || true,
        hasCompletedOnboarding: isDone || true,
        createdAt: parsed.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveGuestData(guest);
      return guest;
    }
  } catch {}

  const newGuest = createDefaultGuestData();
  saveGuestData(newGuest);
  return newGuest;
};

export const getStoredLocalProfile = (): UserProfile | null => {
  const guest = getStoredGuestData();
  if (guest) return guest;

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
    const rawCompleted = localStorage.getItem(LOCAL_STORAGE_ONBOARDING_KEY) === 'true';
    if (raw) {
      const parsed = JSON.parse(raw);
      const isDone = Boolean(parsed.onboardingCompleted ?? parsed.hasCompletedOnboarding ?? rawCompleted);
      return {
        ...parsed,
        hasCompletedOnboarding: isDone,
        onboardingCompleted: isDone,
      };
    }
    if (rawCompleted) {
      return getOrInitGuestData();
    }
  } catch (e) {
    console.error('Failed reading local profile:', e);
  }
  return getOrInitGuestData();
};

const defaultSession: UserSession = {
  authState: 'loading',
  isAuthenticated: false,
  isGuest: true,
  userId: null,
  email: null,
  displayName: 'Guest',
  username: '',
  avatarUrl: '',
  accountType: 'guest',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  onboardingCompleted: false,
  selectedGoals: ['fitness', 'discipline'],
};

const AuthContext = createContext<AuthContextType>({
  session: defaultSession,
  userSession: defaultSession,
  user: null,
  profile: null,
  userProfile: null,
  guestData: null,
  isGuest: true,
  isAuthenticated: false,
  authState: 'loading',
  onboardingCompleted: false,
  loading: true,
  logout: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
  removeProfilePhoto: async () => {},
  saveUserProfileToFirestore: async () => {},
  setOnboardingCompleted: async () => {},
  resetOnboarding: () => {},
  continueAsGuest: () => createDefaultGuestData(),
  resetGuestSession: () => createDefaultGuestData(),
  migrateGuestData: async () => null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => getOrInitGuestData());
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const isAuthenticated = Boolean(user && !user.isAnonymous);
  const isGuest = !isAuthenticated;

  // Build centralized canonical UserSession model
  const session = useMemo<UserSession>(() => {
    if (loading) {
      return {
        ...defaultSession,
        authState: 'loading',
      };
    }

    if (authError) {
      return {
        ...defaultSession,
        authState: 'error',
      };
    }

    if (isAuthenticated && user) {
      const resolvedDisplayName = profile?.displayName || profile?.name || user.displayName || 'Vimlesh';
      const rawUser = profile?.userName || profile?.name || resolvedDisplayName;
      const resolvedUsername = rawUser.replace(/\s+/g, '_').toLowerCase();
      const isCompleted = Boolean(profile?.onboardingCompleted ?? profile?.hasCompletedOnboarding ?? true);

      return {
        authState: 'authenticated',
        isAuthenticated: true,
        isGuest: false,
        userId: user.uid,
        email: user.email || profile?.email || null,
        displayName: resolvedDisplayName,
        username: resolvedUsername,
        avatarUrl: profile?.avatarUrl || user.photoURL || '',
        accountType: 'authenticated',
        createdAt: profile?.createdAt || new Date().toISOString(),
        updatedAt: profile?.updatedAt || new Date().toISOString(),
        onboardingCompleted: isCompleted,
        selectedGoals: profile?.selectedGoals || ['fitness', 'discipline'],
        mainGoal: profile?.mainGoal,
        routinePreference: profile?.routinePreference,
        appearancePreference: profile?.appearancePreference,
      };
    }

    // Guest Mode
    const rawGuestName = profile?.displayName || profile?.name || 'Guest Mindful Spark';
    const isCompleted = Boolean(profile?.onboardingCompleted ?? profile?.hasCompletedOnboarding ?? true);

    return {
      authState: 'guest',
      isAuthenticated: false,
      isGuest: true,
      userId: null,
      email: null,
      displayName: rawGuestName,
      username: '',
      avatarUrl: profile?.avatarUrl || '',
      accountType: 'guest',
      createdAt: profile?.createdAt || new Date().toISOString(),
      updatedAt: profile?.updatedAt || new Date().toISOString(),
      onboardingCompleted: isCompleted,
      selectedGoals: profile?.selectedGoals || ['fitness', 'discipline'],
      mainGoal: profile?.mainGoal,
      routinePreference: profile?.routinePreference,
      appearancePreference: profile?.appearancePreference,
    };
  }, [loading, authError, isAuthenticated, user, profile]);

  // Helper to persist profile fields safely to Firestore matching firestore.rules
  const saveUserProfileToFirestore = useCallback(async (data: Partial<UserProfile>, targetUid?: string) => {
    const uid = targetUid || user?.uid || auth.currentUser?.uid;
    if (!uid) return;

    try {
      const userRef = doc(db, 'users', uid);
      const fsData: Record<string, any> = {
        updatedAt: serverTimestamp(),
      };
      if (data.name !== undefined) fsData.name = data.name;
      else if (data.userName !== undefined) fsData.name = data.userName;
      else if (data.displayName !== undefined) fsData.name = data.displayName;

      if (data.userName !== undefined) fsData.userName = data.userName;
      else if (data.name !== undefined) fsData.userName = data.name;
      
      if (data.email !== undefined) fsData.email = data.email;
      else if (!fsData.email && auth.currentUser?.email) fsData.email = auth.currentUser.email;
      else if (!fsData.email) fsData.email = profile?.email || '';
      
      if (data.avatarUrl !== undefined) fsData.avatarUrl = data.avatarUrl || '';
      if (data.mainGoal !== undefined) fsData.mainGoal = data.mainGoal;
      if (data.selectedGoals !== undefined && Array.isArray(data.selectedGoals)) {
        fsData.selectedGoals = data.selectedGoals;
      }
      if (data.routinePreference !== undefined) fsData.routinePreference = data.routinePreference;
      if (data.appearancePreference !== undefined) fsData.appearancePreference = data.appearancePreference;
      
      const isCompleted = data.onboardingCompleted ?? data.hasCompletedOnboarding;
      if (isCompleted !== undefined) {
        fsData.onboardingCompleted = Boolean(isCompleted);
        fsData.hasCompletedOnboarding = Boolean(isCompleted);
      }

      await setDoc(userRef, fsData, { merge: true });
    } catch (err) {
      console.error('Failed to sync profile to Firestore:', err);
    }
  }, [user, profile]);

  useEffect(() => {
    let isSigningIn = false;
    // Safety fallback timer to prevent infinite loading state on slow networks
    const fallbackTimer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(fallbackTimer);
      identifyUser(currentUser?.uid || null);

      if (!currentUser && !isSigningIn) {
        // Unauthenticated visitor (Guest)
        setUser(null);
        const localProfile = getStoredLocalProfile();
        setProfile(localProfile);
        setLoading(false);
        return;
      }

      isSigningIn = false;
      setUser(currentUser);
      const localProfile = getStoredLocalProfile();
      if (localProfile) {
        setProfile(localProfile);
      }

      // Unblock initial render immediately
      setLoading(false);

      if (currentUser && !currentUser.isAnonymous) {
        // Asynchronous profile fetch and background cloud sync
        (async () => {
          try {
            // Migrate guest data to Firestore if present
            if (hasGuestDataToMigrate()) {
              try {
                const migrationOutcome = await migrateGuestDataToFirestore(
                  currentUser.uid,
                  currentUser.email || undefined
                );
                if (migrationOutcome.success) {
                  console.log('Guest session data successfully migrated to Firestore:', migrationOutcome);
                }
              } catch (migErr) {
                console.warn('Migration notice:', migErr);
              }
            }

            const userRef = doc(db, 'users', currentUser.uid);
            const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
            const userSnap: any = await Promise.race([getDoc(userRef), timeoutPromise]);

            if (userSnap && userSnap.exists && userSnap.exists()) {
              const fsData = userSnap.data() as UserProfile;
              const isCompleted = Boolean(
                fsData.onboardingCompleted === true ||
                fsData.hasCompletedOnboarding === true ||
                localProfile?.onboardingCompleted === true ||
                localProfile?.hasCompletedOnboarding === true
              );

              const resolvedName = fsData.name || fsData.userName || (localProfile?.isGuest ? null : localProfile?.name) || currentUser.displayName || 'Vimlesh';
              if (fsData.appearancePreference) {
                try {
                  const parsedTheme = JSON.parse(fsData.appearancePreference);
                  saveAppearanceSettings(parsedTheme);
                  applyAppearanceSettings(parsedTheme);
                } catch (e) {}
              }

              const merged: UserProfile = {
                ...localProfile,
                ...fsData,
                isGuest: false,
                name: resolvedName,
                userName: fsData.userName || fsData.name || resolvedName,
                displayName: resolvedName,
                avatarUrl: fsData.avatarUrl !== undefined ? fsData.avatarUrl : (localProfile?.avatarUrl || ''),
                hasCompletedOnboarding: isCompleted,
                onboardingCompleted: isCompleted,
                selectedGoals: fsData.selectedGoals || localProfile?.selectedGoals || [],
                mainGoal: fsData.mainGoal || localProfile?.mainGoal,
                routinePreference: fsData.routinePreference || localProfile?.routinePreference,
                appearancePreference: fsData.appearancePreference || localProfile?.appearancePreference,
              };

              setProfile(merged);
              try {
                localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(merged));
                if (isCompleted) {
                  localStorage.setItem(LOCAL_STORAGE_ONBOARDING_KEY, 'true');
                } else {
                  localStorage.removeItem(LOCAL_STORAGE_ONBOARDING_KEY);
                }
                window.dispatchEvent(new CustomEvent(STREAK_PROFILE_UPDATED_EVENT, { detail: merged }));
              } catch {}

              if (isCompleted && (!fsData.onboardingCompleted || !fsData.hasCompletedOnboarding)) {
                await saveUserProfileToFirestore({
                  name: merged.name,
                  userName: merged.userName,
                  avatarUrl: merged.avatarUrl,
                  selectedGoals: merged.selectedGoals,
                  onboardingCompleted: true,
                  hasCompletedOnboarding: true,
                }, currentUser.uid);
              }
            } else if (userSnap && (!userSnap.exists || !userSnap.exists())) {
              // New user document creation
              const isCompleted = Boolean(
                localProfile?.onboardingCompleted === true ||
                localProfile?.hasCompletedOnboarding === true
              );
              const initialName = (localProfile?.isGuest ? currentUser.displayName : localProfile?.name) || currentUser.displayName || 'Vimlesh';
              const newProfile: any = {
                email: currentUser.email || '',
                name: initialName,
                userName: initialName.replace(/\s+/g, '_').toLowerCase(),
                avatarUrl: localProfile?.avatarUrl || '',
                hasCompletedOnboarding: isCompleted,
                onboardingCompleted: isCompleted,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              };
              if (localProfile?.selectedGoals && localProfile.selectedGoals.length > 0) {
                newProfile.selectedGoals = localProfile.selectedGoals;
              }
              if (localProfile?.mainGoal) {
                newProfile.mainGoal = localProfile.mainGoal;
              }
              await setDoc(userRef, newProfile);
              const fullProfile: UserProfile = {
                ...newProfile,
                displayName: initialName,
                isGuest: false,
                hasCompletedOnboarding: isCompleted,
                onboardingCompleted: isCompleted,
              };
              setProfile(fullProfile);
              try {
                localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(fullProfile));
                if (isCompleted) {
                  localStorage.setItem(LOCAL_STORAGE_ONBOARDING_KEY, 'true');
                }
                window.dispatchEvent(new CustomEvent(STREAK_PROFILE_UPDATED_EVENT, { detail: fullProfile }));
              } catch {}
              trackSignUp('user_created');
            }

            // Sync offline entities
            Promise.allSettled([
              syncLocalToCloud(currentUser.uid),
              syncLocalTasksToCloud(currentUser.uid),
              syncLocalJournalToCloud(currentUser.uid),
              syncLocalGoalsToCloud(currentUser.uid),
              syncLocalRemindersToCloud(currentUser.uid),
            ]).then(() => {
              trackLogin('auth_state');
            }).catch(() => {});
          } catch (error) {
            console.warn("Background auth profile sync notice:", error);
            if (localProfile) {
              setProfile(localProfile);
            }
          }
        })();
      } else {
        setProfile(localProfile);
      }
    });

    // Cross-tab and local profile updates listener
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_PROFILE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setProfile(parsed);
        } catch {}
      }
    };

    const handleCustomProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<UserProfile>;
      if (customEvent.detail) {
        setProfile((prev) => ({ ...prev, ...customEvent.detail }));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(STREAK_PROFILE_UPDATED_EVENT, handleCustomProfileUpdate);

    return () => {
      clearTimeout(fallbackTimer);
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(STREAK_PROFILE_UPDATED_EVENT, handleCustomProfileUpdate);
    };
  }, [saveUserProfileToFirestore]);

  const logout = useCallback(async () => {
    try {
      trackLogout();
      await fbSignOut(auth);
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      clearAllLocalData();
      setUser(null);
      const newGuest = createDefaultGuestData();
      saveGuestData(newGuest);
      setProfile(newGuest);
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    const isCompleted = data.onboardingCompleted ?? data.hasCompletedOnboarding ?? profile?.onboardingCompleted ?? profile?.hasCompletedOnboarding ?? true;
    const nameVal = data.userName || data.name || data.displayName || profile?.userName || profile?.name || profile?.displayName || '';

    // If in guest mode, lock identity
    if (isGuest || !user || user.isAnonymous) {
      const currentGuest = getStoredGuestData() || createDefaultGuestData();
      const updatedGuest = saveGuestData({
        ...currentGuest,
        selectedGoals: data.selectedGoals ?? currentGuest.selectedGoals ?? [],
        routinePreference: data.routinePreference ?? currentGuest.routinePreference,
        appearancePreference: data.appearancePreference ?? currentGuest.appearancePreference,
        onboardingCompleted: Boolean(isCompleted),
        hasCompletedOnboarding: Boolean(isCompleted),
      } as Partial<GuestData>);

      setProfile(updatedGuest);
      return;
    }
    
    const updated: UserProfile = {
      ...profile,
      ...data,
      isGuest: false,
      name: nameVal,
      userName: nameVal,
      displayName: nameVal,
      avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : (profile?.avatarUrl || ''),
      hasCompletedOnboarding: Boolean(isCompleted),
      onboardingCompleted: Boolean(isCompleted),
      selectedGoals: data.selectedGoals ?? profile?.selectedGoals ?? [],
    };

    // 1. Instantly persist to localStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(updated));
      if (isCompleted) {
        localStorage.setItem(LOCAL_STORAGE_ONBOARDING_KEY, 'true');
      }
      window.dispatchEvent(new CustomEvent(STREAK_PROFILE_UPDATED_EVENT, { detail: updated }));
    } catch (e) {
      console.error('Failed to write profile to localStorage:', e);
    }

    // 2. Update React state immediately
    setProfile(updated);

    // 3. Sync to Firestore
    await saveUserProfileToFirestore(updated);
  }, [isGuest, user, profile, saveUserProfileToFirestore]);

  const removeProfilePhoto = useCallback(async () => {
    await updateProfile({ avatarUrl: '' });
  }, [updateProfile]);

  const setOnboardingCompleted = useCallback(async (completed: boolean) => {
    await updateProfile({
      onboardingCompleted: completed,
      hasCompletedOnboarding: completed,
    });
  }, [updateProfile]);

  const continueAsGuest = useCallback((customName?: string): GuestData => {
    const newGuest = createDefaultGuestData(customName);
    saveGuestData(newGuest);
    setProfile(newGuest);
    setUser(null);
    return newGuest;
  }, []);

  const resetGuestSession = useCallback((): GuestData => {
    const newGuest = createDefaultGuestData();
    saveGuestData(newGuest);
    setProfile(newGuest);
    return newGuest;
  }, []);

  const migrateGuestData = useCallback(async (): Promise<MigrationResult | null> => {
    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid || (user && user.isAnonymous)) {
      return null;
    }
    if (!hasGuestDataToMigrate()) {
      return {
        success: true,
        migratedCounts: {
          profile: false,
          habits: 0,
          habitLogs: 0,
          tasks: 0,
          goals: 0,
          journal: 0,
          reminders: 0,
        },
        clearedLocalStorage: false,
      };
    }
    return await migrateGuestDataToFirestore(
      uid,
      user?.email || auth.currentUser?.email || undefined
    );
  }, [user]);

  const resetOnboarding = useCallback(() => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_ONBOARDING_KEY);
      localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
      localStorage.removeItem(STREAK_GUEST_DATA_KEY);
    } catch {}
    const freshGuest = createDefaultGuestData();
    saveGuestData(freshGuest);
    setProfile(freshGuest);
  }, []);

  const onboardingCompleted = Boolean(profile?.onboardingCompleted || profile?.hasCompletedOnboarding);

  return (
    <AuthContext.Provider value={{
      session,
      userSession: session,
      user,
      profile,
      userProfile: profile,
      guestData: isGuest ? (profile as GuestData) : null,
      isGuest,
      isAuthenticated,
      authState: session.authState,
      onboardingCompleted,
      loading,
      logout,
      signOut: logout,
      updateProfile,
      removeProfilePhoto,
      saveUserProfileToFirestore,
      setOnboardingCompleted,
      resetOnboarding,
      continueAsGuest,
      resetGuestSession,
      migrateGuestData,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
