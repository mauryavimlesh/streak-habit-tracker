import fs from 'fs';
let code = fs.readFileSync('src/pages/auth/Login.tsx', 'utf8');

code = code.replace(
  "import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';",
  "import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, linkWithPopup, linkWithCredential, EmailAuthProvider } from 'firebase/auth';"
);

code = code.replace(
  "if (user) {\n    return <Navigate to=\"/\" replace />;\n  }",
  "if (user && !user.isAnonymous) {\n    return <Navigate to=\"/\" replace />;\n  }"
);

const oldEmailSubmit = `    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {`;
const newEmailSubmit = `    try {
      if (user && user.isAnonymous) {
        if (isLogin) {
          await signInWithEmailAndPassword(auth, email, password);
        } else {
          const credential = EmailAuthProvider.credential(email, password);
          try {
            await linkWithCredential(user, credential);
          } catch (linkErr: any) {
             if (linkErr.code === 'auth/credential-already-in-use') {
                 await signInWithEmailAndPassword(auth, email, password);
             } else {
                 throw linkErr;
             }
          }
        }
      } else {
        if (isLogin) {
          await signInWithEmailAndPassword(auth, email, password);
        } else {
          await createUserWithEmailAndPassword(auth, email, password);
        }
      }
    } catch (err: any) {`;
code = code.replace(oldEmailSubmit, newEmailSubmit);

const oldGoogleSubmit = `      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (err: any) {`;
const newGoogleSubmit = `      try {
        const provider = new GoogleAuthProvider();
        if (user && user.isAnonymous) {
           try {
             await linkWithPopup(user, provider);
           } catch (linkErr: any) {
             if (linkErr.code === 'auth/credential-already-in-use') {
                await signInWithPopup(auth, provider);
             } else {
                throw linkErr;
             }
           }
        } else {
           await signInWithPopup(auth, provider);
        }
      } catch (err: any) {`;
code = code.replace(oldGoogleSubmit, newGoogleSubmit);

fs.writeFileSync('src/pages/auth/Login.tsx', code);
