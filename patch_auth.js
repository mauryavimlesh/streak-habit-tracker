import fs from 'fs';
let code = fs.readFileSync('src/lib/AuthContext.tsx', 'utf8');

const search = `      if (!currentUser && !isSigningIn) {
        isSigningIn = true;
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("Anonymous sign in failed:", e);
          setLoading(false);
        }
        return;
      }`;

const replace = `      if (!currentUser && !isSigningIn) {
        isSigningIn = true;
        try {
          await signInAnonymously(auth);
          return;
        } catch (e) {
          console.error("Anonymous sign in failed:", e);
          // Fall back to local mode immediately
          setUser(null);
          const localProfile = getStoredLocalProfile();
          setProfile(localProfile);
          setLoading(false);
          isSigningIn = false;
          return;
        }
      }`;

code = code.replace(search, replace);
fs.writeFileSync('src/lib/AuthContext.tsx', code);
