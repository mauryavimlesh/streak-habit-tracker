import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const apiKey = (import.meta as any).env?.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey || 'mock-key-to-prevent-crash';

const config = {
  ...firebaseConfig,
  apiKey
};

export const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
