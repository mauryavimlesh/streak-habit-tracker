import fs from 'fs';
let code = fs.readFileSync('src/lib/AuthContext.tsx', 'utf8');

// Remove anonymous sign in completely
const searchAnon = `      if (!currentUser && !isSigningIn) {
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

const replaceAnon = `      if (!currentUser && !isSigningIn) {
        // Unauthenticated visitor (could be Guest or new user)
        setUser(null);
        const localProfile = getStoredLocalProfile();
        setProfile(localProfile);
        setLoading(false);
        return;
      }`;
code = code.replace(searchAnon, replaceAnon);

fs.writeFileSync('src/lib/AuthContext.tsx', code);
