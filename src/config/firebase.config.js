import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// Check if Firebase is configured with at least apiKey and projectId
export const isFirebaseConfigured = () => {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
};

let app;
let auth;
let googleProvider;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  // Always prompt user to select account when clicking Google Login
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
} catch (err) {
  console.warn('[FIREBASE] Client initialization warning:', err.message);
}

/**
 * Trigger Google Sign-In Popup and retrieve Firebase ID token
 * @returns {Promise<{ user: any, idToken: string }>}
 */
export const signInWithGooglePopup = async () => {
  if (!isFirebaseConfigured() || !auth) {
    throw new Error('Firebase Authentication is not configured in this environment. Please set VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID in .env.');
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    return {
      user: result.user,
      idToken
    };
  } catch (error) {
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Google Sign-In popup was closed before completing authentication.');
    }
    if (error.code === 'auth/cancelled-popup-request') {
      throw new Error('Authentication was cancelled.');
    }
    if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error during Google Sign-In. Please check your internet connection.');
    }
    throw error;
  }
};

export { auth, googleProvider };
export default app;
