import fs from 'fs';
let code = fs.readFileSync('src/lib/AuthContext.tsx', 'utf8');

code = code.replace(
  "export interface UserProfile {",
  "export interface UserProfile {\n  isGuest?: boolean;"
);

// We need to add continueAsGuest to the context interface
code = code.replace(
  "resetOnboarding: () => void;",
  "resetOnboarding: () => void;\n  continueAsGuest: () => void;"
);

const continueAsGuestCode = `  const continueAsGuest = () => {
    const guestNames = [
      'Focused Fox', 'Silent Wolf', 'Rising Monk', 'Calm Runner', 'Daily Warrior',
      'Steady Mind', 'Quiet Builder', 'Atomic Habit', 'Focus Mode', 'Consistent Soul'
    ];
    const randomName = guestNames[Math.floor(Math.random() * guestNames.length)];
    const guestProfile = {
      name: randomName,
      userName: randomName,
      displayName: randomName,
      isGuest: true,
      hasCompletedOnboarding: false,
      onboardingCompleted: false
    };
    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(guestProfile));
    setProfile(guestProfile);
  };
`;

code = code.replace(
  "const resetOnboarding = () => {",
  continueAsGuestCode + "\n  const resetOnboarding = () => {"
);

code = code.replace(
  "setOnboardingCompleted,\n      resetOnboarding\n    }}>",
  "setOnboardingCompleted,\n      resetOnboarding,\n      continueAsGuest\n    }}>"
);

fs.writeFileSync('src/lib/AuthContext.tsx', code);
