import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage as getStorageSDK } from 'firebase/storage';

let db, auth, storage, app;

/**
 * 서버에서 Firebase 설정을 동적으로 가져와서 초기화
 */
export const initializeFirebase = async () => {
  try {
    // Firebase Config (환경변수에서만 로드 - hardcoding 없음)
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };

    // env 변수 검증
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      throw new Error('Firebase environment variables가 설정되지 않았습니다.');
    }

    // Firebase 초기화
    app = initializeApp(firebaseConfig);

    // Firestore 초기화 (오프라인 지원)
    db = getFirestore(app);
    try {
      await enableIndexedDbPersistence(db);
    } catch (err) {
      if (err.code === 'failed-precondition') {
        console.warn('여러 탭에서 Firestore를 사용 중입니다.');
      } else if (err.code === 'unimplemented') {
        console.warn('현재 브라우저는 Firestore 오프라인 지원을 지원하지 않습니다.');
      }
    }

    // Authentication 초기화
    auth = getAuth(app);
    
    // Localhost 환경에서만 Emulator에 연결
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      try {
        connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
        connectFirestoreEmulator(db, 'localhost', 8080);
        console.log('✅ Firebase Emulator 연결됨 (로컬 개발용)');
      } catch (error) {
        // 이미 연결되어 있으면 무시
        if (!error.code?.includes('emulator-already-enabled')) {
          console.warn('Emulator 연결 실패:', error.message);
        }
      }
    }

    // Storage 초기화 (나중에 사용 가능)
    storage = getStorageSDK(app);

    console.log('✅ Firebase 초기화 완료');
    return { app, db, auth, storage };
  } catch (error) {
    console.error('❌ Firebase 초기화 실패:', error);
    throw error;
  }
};

// 내보내기 (초기화 후에 사용 가능)
export const getFirebaseServices = () => {
  if (!db || !auth) {
    throw new Error('Firebase가 아직 초기화되지 않았습니다. initializeFirebase()를 먼저 호출하세요.');
  }
  return { app, db, auth, storage };
};

// 편의용 getters (선택사항)
export const getDB = () => {
  if (!db) throw new Error('Firestore가 아직 초기화되지 않았습니다.');
  return db;
};

export const getAuthService = () => {
  if (!auth) throw new Error('Auth가 아직 초기화되지 않았습니다.');
  return auth;
};

export const getStorageService = () => {
  if (!storage) throw new Error('Storage가 아직 초기화되지 않았습니다.');
  return storage;
};

export default app;
