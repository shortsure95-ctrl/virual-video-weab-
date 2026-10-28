// Firebase Web SDK Configuration & Initialization
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

// Web app's Firebase configuration (virual-link)
export const firebaseConfig = {
  apiKey: "AIzaSyC1jfxT8AiE_PrJ5Gdv7pZQsiRYG3HENFg",
  authDomain: "virual-link.firebaseapp.com",
  projectId: "virual-link",
  storageBucket: "virual-link.firebasestorage.app",
  messagingSenderId: "506496110995",
  appId: "1:506496110995:web:9eb70331c35c08d13dd866",
  measurementId: "G-CLJWC9K177"
};

// Initialize Firebase App (prevents duplicate initialization in Vite HMR)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore Database instance
export const db = getFirestore(app);

// Initialize Firebase Auth & Google Auth Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

// Export Auth helpers
export { signInWithPopup, signOut, onAuthStateChanged };

// Initialize Analytics (safely runs only in supported browser environments)
let analyticsInstance = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported && firebaseConfig.measurementId) {
      analyticsInstance = getAnalytics(app);
      console.log("Firebase Analytics initialized for", firebaseConfig.projectId);
    }
  }).catch((err) => console.warn("Analytics initialization note:", err));
}

export const analytics = analyticsInstance;
export default app;
