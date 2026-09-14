import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // In a real Vercel deployment, you'd parse FIREBASE_SERVICE_ACCOUNT from env
    // For this environment, we'll try to initialize with just projectId for token verification
    // Note: Firestore access might require full credentials depending on rules
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
      : null;

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'gen-lang-client-0220339798'
      });
    } else {
      admin.initializeApp({
        projectId: 'gen-lang-client-0220339798'
      });
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
