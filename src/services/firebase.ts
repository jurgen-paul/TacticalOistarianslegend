import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';

import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Core Authentication Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Operations types for Error Diagnostics
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// Global Exception Interceptor for Firebase
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Security / Operation Error: ', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

// Test connectivity on boot as per blocking instructions
export async function validateFirebaseConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase test connection indicates that the client is offline.");
    }
  }
}

// User-Facing Google Authentication Action
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      await syncUserProfile(result.user);
    }
    return result.user;
  } catch (error) {
    console.error("Google authenticated login failed:", error);
    throw error;
  }
}

// Logout Utility
export async function logOutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Signed out attempt failed:", error);
    throw error;
  }
}

// Profile Sync on Authentication Succeed
export async function syncUserProfile(user: User) {
  const userRef = doc(db, 'users', user.uid);
  try {
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) {
      // New Profile entry matches strict schema keys and email check
      await setDoc(userRef, {
        displayName: user.displayName || 'Anonymous Operator',
        email: user.email || '',
        photoURL: user.photoURL || null,
        highScore: 0,
        createdAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

// Update User high score when a tactical run finishes
export async function updateHighScoreInFirebase(userId: string, currentRunScore: number) {
  const userRef = doc(db, 'users', userId);
  try {
    const snapshot = await getDoc(userRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      const existingHighScore = data.highScore || 0;
      if (currentRunScore > existingHighScore) {
        await updateDoc(userRef, {
          highScore: currentRunScore,
          updatedAt: serverTimestamp()
        });
        return currentRunScore;
      }
      return existingHighScore;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
  return currentRunScore;
}

// Fetch Global Scoreboards
export async function fetchLeaderboard(maxEntries: number = 10) {
  const leaderboardRef = collection(db, 'leaderboard');
  const q = query(leaderboardRef, orderBy('score', 'desc'), limit(maxEntries));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as Array<{ id: string; name: string; score: number; legend: string; userId: string; createdAt: any }>;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'leaderboard');
    return [];
  }
}

// Submit score entry to public board (completely immutable entries)
export async function submitLeaderboardEntry(name: string, score: number, legendName: string, userId: string) {
  const entryId = `entry_${userId}_${Date.now()}`;
  const docRef = doc(db, 'leaderboard', entryId);
  try {
    await setDoc(docRef, {
      name,
      score,
      legend: legendName,
      userId,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `leaderboard/${entryId}`);
  }
}

// Validate connection asynchronously on initialize
validateFirebaseConnection();
