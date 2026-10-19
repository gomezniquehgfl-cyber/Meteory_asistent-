import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  updateDoc,
  arrayUnion,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with the provisioned firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Simple client-side obfuscation for API key security (anti-plaintext)
export function obfuscateKey(apiKey: string): string {
  try {
    return btoa(encodeURIComponent(apiKey));
  } catch {
    return apiKey;
  }
}

export function deobfuscateKey(encoded: string): string {
  try {
    return decodeURIComponent(atob(encoded));
  } catch {
    return encoded;
  }
}

// Error handling conforming to Firebase skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// User Profile interface with API key and learned memories
export interface UserProfileData {
  userId: string;
  email: string;
  displayName?: string;
  customUserName?: string;
  photoURL?: string;
  geminiApiKey?: string;
  userMemories?: string[];
  preferredEngine?: 'cloud' | 'local';
  lastLoginAt?: string;
  createdAt?: string;
}

// Save or update user profile in Firestore with obfuscated API key
export async function syncUserProfile(
  user: FirebaseUser,
  customUserName?: string,
  geminiApiKey?: string
): Promise<UserProfileData> {
  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const existingSnap = await getDoc(userRef);
    const now = new Date().toISOString();

    const encodedKey = geminiApiKey ? obfuscateKey(geminiApiKey) : undefined;

    let profile: UserProfileData;
    if (existingSnap.exists()) {
      const data = existingSnap.data() as UserProfileData;
      profile = {
        ...data,
        displayName: user.displayName || data.displayName || 'Comandante',
        photoURL: user.photoURL || data.photoURL || '',
        customUserName: customUserName || data.customUserName || (user.displayName ? user.displayName.split(' ')[0] : 'Níquel'),
        geminiApiKey: encodedKey !== undefined ? encodedKey : (data.geminiApiKey || ''),
        lastLoginAt: now,
      };
      await setDoc(userRef, profile, { merge: true });
    } else {
      profile = {
        userId: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Comandante',
        customUserName: customUserName || (user.displayName ? user.displayName.split(' ')[0] : 'Níquel'),
        photoURL: user.photoURL || '',
        geminiApiKey: encodedKey || '',
        userMemories: [],
        preferredEngine: 'cloud',
        createdAt: now,
        lastLoginAt: now,
      };
      await setDoc(userRef, profile);
    }
    return profile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// Fetch user profile including stored API key and memories
export async function getUserProfile(userId: string): Promise<UserProfileData | null> {
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfileData;
      if (data.geminiApiKey) {
        data.geminiApiKey = deobfuscateKey(data.geminiApiKey);
      }
      return data;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// Persistent Chat Message interface
export interface ChatMessageRecord {
  id?: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

// Save chat message to persistent Firestore subcollection /users/{userId}/messages
export async function saveChatMessage(userId: string, sender: 'user' | 'assistant', text: string): Promise<void> {
  const path = `users/${userId}/messages`;
  try {
    const messagesRef = collection(db, 'users', userId, 'messages');
    await addDoc(messagesRef, {
      sender,
      text,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Could not persist chat message:', error);
  }
}

// Load persistent chat history from Firestore
export async function getChatHistory(userId: string): Promise<ChatMessageRecord[]> {
  const path = `users/${userId}/messages`;
  try {
    const messagesRef = collection(db, 'users', userId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(50));
    const querySnap = await getDocs(q);
    const records: ChatMessageRecord[] = [];
    querySnap.forEach((docSnap) => {
      const d = docSnap.data();
      const timeFormatted = d.timestamp ? new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      records.push({
        id: docSnap.id,
        sender: d.sender,
        text: d.text,
        timestamp: timeFormatted,
      });
    });
    return records;
  } catch (error) {
    console.warn('Could not load persistent chat history:', error);
    return [];
  }
}

// Save learned user memory or preference in Firestore
export async function addUserMemory(userId: string, memorySnippet: string): Promise<void> {
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      userMemories: arrayUnion(memorySnippet),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Create account with email & password
export async function registerWithEmail(email: string, pass: string, displayName: string, geminiApiKey?: string): Promise<FirebaseUser> {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }
  await syncUserProfile(cred.user, displayName, geminiApiKey);
  return cred.user;
}

// Test initial connection to Firestore with offline check
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Verifique la conectividad de Firebase Firestore.');
    }
  }
}

export {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
};
export type { FirebaseUser };
