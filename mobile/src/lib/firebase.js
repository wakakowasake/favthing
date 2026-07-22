import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence, getAuth, connectAuthEmulator } from 'firebase/auth';

let firebaseApp;
let firebaseDb;
let firebaseAuth;

const useFirebaseEmulator = String(process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR || '').toLowerCase() === 'true';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const ensureConfig = () => {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new Error('Firebase 환경변수(EXPO_PUBLIC_FIREBASE_*)가 누락되었습니다.');
  }
};

export const initializeFirebase = () => {
  if (firebaseApp && firebaseDb && firebaseAuth) {
    return { app: firebaseApp, db: firebaseDb, auth: firebaseAuth };
  }

  ensureConfig();
  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  firebaseDb = getFirestore(firebaseApp);

  try {
    firebaseAuth = initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    firebaseAuth = getAuth(firebaseApp);
  }

  if (useFirebaseEmulator) {
    const authHost = process.env.EXPO_PUBLIC_AUTH_EMULATOR_HOST || '127.0.0.1';
    const authPort = Number(process.env.EXPO_PUBLIC_AUTH_EMULATOR_PORT || 9099);
    const firestoreHost = process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST || '127.0.0.1';
    const firestorePort = Number(process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT || 8080);

    try {
      connectAuthEmulator(firebaseAuth, `http://${authHost}:${authPort}`, { disableWarnings: true });
    } catch (error) {
      // already connected
    }
    try {
      connectFirestoreEmulator(firebaseDb, firestoreHost, firestorePort);
    } catch (error) {
      // already connected
    }
  }

  return { app: firebaseApp, db: firebaseDb, auth: firebaseAuth };
};

export const getDB = () => {
  if (!firebaseDb) initializeFirebase();
  return firebaseDb;
};

export const getAuthService = () => {
  if (!firebaseAuth) initializeFirebase();
  return firebaseAuth;
};