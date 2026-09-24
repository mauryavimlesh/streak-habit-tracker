import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
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

export const STREAK_GUEST_DATA_KEY = 'streak_guest_data';

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
  user: User | null;
  profile: UserProfile | null;
  userProfile: UserProfile | null;
  guestData: GuestData | null;
  isGuest: boolean;
  onboardingCompleted: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  removeProfilePhoto: () => Promise<void>;
  saveUserProfileToFirestore: (data: Partial<UserProfile>) => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  resetOnboarding: () => void;
  continueAsGuest: (customName?: string) => GuestData;
  resetGuestSession: () => GuestData;
  migrateGuestData: () => Promise<MigrationResult | null>;
}

const LOCAL_STORAGE_PROFILE_KEY = 'streak_user_profile';
const LOCAL_STORAGE_ONBOARDING_KEY = 'streak_onboarding_completed';

const GUEST_ADJECTIVES = [
  'Focus', 'Swift', 'Calm', 'Mindful', 'Rising', 'Brave', 
  'Steady', 'Atomic', 'Zen', 'Bright', 'Nimble', 'Noble',
  'Radiant', 'True', 'Serene', 'Vibrant'
];

const GUEST_ARCHETYPES = [
  'Explorer', 'Pathfinder', 'Voyager', 'Builder', 'Striver', 
  'Runner', 'Falcon', 'Phoenix', 'Warrior', 'Monk', 
  'Nomad', 'Seeker', 'Spark', 'Champion', 'Pioneer', 'Ranger'
];

export const generateRandomGuestName = (): string => {
  const adj = GUEST_ADJECTIVES[Math.floor(Math.random() * GUEST_ADJECTIVES.length)];
  const arch = GUEST_ARCHETYPES[Math.floor(Math.random() * GUEST_ARCHETYPES.length)];
  const num = Math.floor(10 + Math.random() * 89);
  return `Guest ${adj} ${arch} ${num}`;
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
    userName: displayName,
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
    return updated;
  } catch (e) {
    console.error('Failed writing streak_guest_data:', e);
    return createDefaultGuestData();
  }
};

export const getOrInitGuestData = (): GuestData => {
  const existing = getStoredGuestData();
  if (existing) return existing;

  // Fallback to legacy profile if present
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

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  userProfile: null,
  guestData: null,
  isGuest: true,
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

  const isGuest = Boolean(!user || user.isAnonymous || profile?.isGuest);

  // Helper to persist profile fields safely to Firestore matching firestore.rules
  const saveUserProfileToFirestore = async (data: Partial<UserProfile>, targetUid?: string) => {
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
  };

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
        // Unauthenticated visitor (could be Guest or new user)
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

      // Immediately unblock initial render if we have user or local profile
      setLoading(false);

      if (currentUser) {
        // Asynchronous profile fetch and background cloud sync
        (async () => {
          try {
            // If local browser storage contains unmigrated guest data ('streak_guest_data'),
            // migrate to Firestore without blocking primary interaction
            if (!currentUser.isAnonymous && hasGuestDataToMigrate()) {
              try {
                const migrationOutcome = await migrateGuestDataToFirestore(
                  currentUser.uid,
                  currentUser.email || undefined
                );
                if (migrationOutcome.success) {
                  console.log('Guest session data successfully migrated to Firestore:', migrationOutcome);
                }
              } catch (migErr) {
                console.error('Migration notice:', migErr);
              }
            }

            const userRef = doc(db, 'users', currentUser.uid);
            // Resilient fetch with a 2-second timeout to avoid network hanging
            const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
            const userSnap: any = await Promise.race([getDoc(userRef), timeoutPromise]);

            if (userSnap && userSnap.exists && userSnap.exists()) {
              const fsData = userSnap.data() as UserProfile;
              const isCompleted = Boolean(
                fsData.onboardingCompleted === true ||
                fsData.hasCompletedOnboarding === true ||
                localProfile?.onboardingCompleted === true ||
                localProfile?.hasCompletedOnboarding === true
              );

              const resolvedName = fsData.name || fsData.userName || localProfile?.name || localProfile?.userName || currentUser.displayName || '';
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
                userName: resolvedName,
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
              } catch {}

              // If local session had onboarding completed not yet in Firestore, update doc
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
                userName: initialName,
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
                hasCompletedOnboarding: isCompleted,
                onboardingCompleted: isCompleted,
              };
              setProfile(fullProfile);
              try {
                localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(fullProfile));
                if (isCompleted) {
                  localStorage.setItem(LOCAL_STORAGE_ONBOARDING_KEY, 'true');
                }
              } catch {}
              trackSignUp('user_created');
            }

            // Perform non-blocking cloud data sync in parallel
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
        // Offline / Unauthenticated: retain local profile
        setProfile(localProfile);
      }
    });

    return () => {
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      trackLogout();
      await signOut(auth);
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      clearAllLocalData();
      setUser(null);
      const newGuest = createDefaultGuestData();
      saveGuestData(newGuest);
      setProfile(newGuest);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    const isCompleted = data.onboardingCompleted ?? data.hasCompletedOnboarding ?? profile?.onboardingCompleted ?? profile?.hasCompletedOnboarding ?? true;
    const nameVal = data.userName || data.name || data.displayName || profile?.userName || profile?.name || profile?.displayName || '';

    // If in guest mode, persist strictly within the streak_guest_data namespace
    if (isGuest || !user || user.isAnonymous) {
      const updatedGuest = saveGuestData({
        ...data,
        displayName: nameVal || profile?.displayName || generateRandomGuestName(),
        name: nameVal || profile?.name || generateRandomGuestName(),
        userName: nameVal || profile?.userName || generateRandomGuestName(),
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : (profile?.avatarUrl || ''),
        hasCompletedOnboarding: Boolean(isCompleted),
        onboardingCompleted: Boolean(isCompleted),
        selectedGoals: data.selectedGoals ?? profile?.selectedGoals ?? [],
      } as Partial<GuestData>);

      setProfile(updatedGuest);
      return;
    }
    
    const updated: UserProfile = {
      ...profile,
      ...data,
      name: nameVal,
      userName: nameVal,
      displayName: nameVal,
      avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : (profile?.avatarUrl || ''),
      hasCompletedOnboarding: Boolean(isCompleted),
      onboardingCompleted: Boolean(isCompleted),
      selectedGoals: data.selectedGoals ?? profile?.selectedGoals ?? [],
    };

    // 1. Immediately persist to localStorage for zero-delay offline readiness & page refresh
    try {
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(updated));
      if (isCompleted) {
        localStorage.setItem(LOCAL_STORAGE_ONBOARDING_KEY, 'true');
      }
    } catch (e) {
      console.error('Failed to write profile to localStorage:', e);
    }

    // 2. Update React State
    setProfile(updated);

    // 3. Sync to Firestore if authenticated
    await saveUserProfileToFirestore(updated);
  };

  const removeProfilePhoto = async () => {
    await updateProfile({ avatarUrl: '' });
  };

  const setOnboardingCompleted = async (completed: boolean) => {
    await updateProfile({
      onboardingCompleted: completed,
      hasCompletedOnboarding: completed,
    });
  };

  const continueAsGuest = (customName?: string): GuestData => {
    const newGuest = createDefaultGuestData(customName);
    saveGuestData(newGuest);
    setProfile(newGuest);
    setUser(null);
    return newGuest;
  };

  const resetGuestSession = (): GuestData => {
    const newGuest = createDefaultGuestData();
    saveGuestData(newGuest);
    setProfile(newGuest);
    return newGuest;
  };

  const migrateGuestData = async (): Promise<MigrationResult | null> => {
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
  };

  const resetOnboarding = () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_ONBOARDING_KEY);
      localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
      localStorage.removeItem(STREAK_GUEST_DATA_KEY);
    } catch {
      // Ignore
    }
    const freshGuest = createDefaultGuestData();
    saveGuestData(freshGuest);
    setProfile(freshGuest);
  };

  const onboardingCompleted = Boolean(profile?.onboardingCompleted || profile?.hasCompletedOnboarding);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      userProfile: profile,
      guestData: isGuest ? (profile as GuestData) : null,
      isGuest,
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
