import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { clearAllLocalData } from './settingsService';
import { saveAppearanceSettings, applyAppearanceSettings } from './themeService';

export interface UserProfile {
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

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  userProfile: UserProfile | null;
  onboardingCompleted: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  removeProfilePhoto: () => Promise<void>;
  saveUserProfileToFirestore: (data: Partial<UserProfile>) => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  resetOnboarding: () => void;
}

const LOCAL_STORAGE_PROFILE_KEY = 'streak_user_profile';
const LOCAL_STORAGE_ONBOARDING_KEY = 'streak_onboarding_completed';

export const getStoredLocalProfile = (): UserProfile | null => {
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
      return {
        name: 'Vimlesh',
        userName: 'Vimlesh',
        hasCompletedOnboarding: true,
        onboardingCompleted: true,
      };
    }
  } catch (e) {
    console.error('Failed reading local profile:', e);
  }
  return null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  userProfile: null,
  onboardingCompleted: false,
  loading: true,
  logout: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
  removeProfilePhoto: async () => {},
  saveUserProfileToFirestore: async () => {},
  setOnboardingCompleted: async () => {},
  resetOnboarding: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => getStoredLocalProfile());
  const [loading, setLoading] = useState(true);

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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      const localProfile = getStoredLocalProfile();

      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const fsData = userSnap.data() as UserProfile;
            // A user has completed onboarding if Firestore OR local session has marked it complete
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
            } catch {
              // Ignore local storage error
            }

            // If local session had onboarding completed or new goals not yet saved in Firestore, backfill Firestore
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
          } else {
            // New user document creation in Firestore
            const isCompleted = Boolean(
              localProfile?.onboardingCompleted === true ||
              localProfile?.hasCompletedOnboarding === true
            );
            const initialName = localProfile?.name || currentUser.displayName || 'Vimlesh';
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
            } catch {
              // Ignore
            }
          }
        } catch (error) {
          console.error("Failed to fetch or create user profile:", error);
          if (localProfile) {
            setProfile(localProfile);
          }
        }
      } else {
        // Offline / Unauthenticated: retain local profile
        setProfile(localProfile);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      clearAllLocalData();
      setUser(null);
      setProfile(null);
      setOnboardingCompleted(false);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    const isCompleted = data.onboardingCompleted ?? data.hasCompletedOnboarding ?? profile?.onboardingCompleted ?? profile?.hasCompletedOnboarding ?? true;
    const nameVal = data.userName || data.name || data.displayName || profile?.userName || profile?.name || profile?.displayName || '';
    
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

  const resetOnboarding = () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_ONBOARDING_KEY);
      localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
    } catch {
      // Ignore
    }
    setProfile(null);
  };

  const onboardingCompleted = Boolean(profile?.onboardingCompleted || profile?.hasCompletedOnboarding);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      userProfile: profile,
      onboardingCompleted,
      loading,
      logout,
      signOut: logout,
      updateProfile,
      removeProfilePhoto,
      saveUserProfileToFirestore,
      setOnboardingCompleted,
      resetOnboarding
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
