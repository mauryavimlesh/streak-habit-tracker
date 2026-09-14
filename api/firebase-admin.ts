import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
      : null;

    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount),
        projectId: 'gen-lang-client-0220339798'
      });
    } else {
      initializeApp({
        projectId: 'gen-lang-client-0220339798'
      });
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
