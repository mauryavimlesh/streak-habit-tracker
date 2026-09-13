import fs from 'fs';
let code = fs.readFileSync('src/lib/AuthContext.tsx', 'utf8');

code = code.replace(
  "import { User, onAuthStateChanged, signOut } from 'firebase/auth';",
  "import { User, onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';"
);

const searchStr = `    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {`;
const replaceStr = `    let isSigningIn = false;\n    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {\n      if (!currentUser && !isSigningIn) {\n        isSigningIn = true;\n        try {\n          await signInAnonymously(auth);\n        } catch (e) {\n          console.error("Anonymous sign in failed:", e);\n          setLoading(false);\n        }\n        return;\n      }\n      isSigningIn = false;`;

code = code.replace(searchStr, replaceStr);

fs.writeFileSync('src/lib/AuthContext.tsx', code);
