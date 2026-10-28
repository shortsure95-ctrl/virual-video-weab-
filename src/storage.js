import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc,
  setDoc, 
  doc, 
  deleteDoc,
  query,
  orderBy,
  onSnapshot
} from "firebase/firestore";
import { initialVideos, defaultSettings } from "./data/sampleVideos.js";
import { firebaseConfig as DEFAULT_FIREBASE_CONFIG } from "./firebase.js";

export { DEFAULT_FIREBASE_CONFIG };

const LOCAL_VIDEOS_KEY = "adstraw_videos_v1";
const LOCAL_SETTINGS_KEY = "adstraw_settings_v1";
const LOCAL_FIREBASE_KEY = "adstraw_firebase_config_v1";

let firestoreDb = null;
let firebaseApp = null;
let currentFirebaseStatus = {
  configured: true,
  connected: false,
  projectId: DEFAULT_FIREBASE_CONFIG.projectId,
  message: "Connecting to Firebase project (virual-link)..."
};

/**
 * Initialize Firebase dynamically with default or stored config
 */
export async function initializeFirebaseFromStorage() {
  let config = DEFAULT_FIREBASE_CONFIG;
  const savedConfigStr = localStorage.getItem(LOCAL_FIREBASE_KEY);
  if (savedConfigStr) {
    try {
      config = JSON.parse(savedConfigStr);
    } catch (err) {
      console.warn("Could not parse custom saved config, falling back to default:", err);
    }
  }

  return await setupFirebase(config);
}

/**
 * Connect to Firebase with given credentials
 */
export async function setupFirebase(config) {
  if (!config || !config.apiKey || !config.projectId) {
    throw new Error("Missing required Firebase fields (apiKey, projectId).");
  }

  try {
    let app;
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = getApp();
    } else {
      app = initializeApp(config);
    }
    firebaseApp = app;

    // Initialize Google Analytics if supported in this browser
    if (typeof window !== "undefined") {
      isSupported().then(supported => {
        if (supported && config.measurementId) {
          getAnalytics(app);
          console.log("Firebase Analytics initialized for virual-link");
        }
      }).catch(e => console.warn("Analytics check skipped:", e));
    }

    const db = getFirestore(app);
    firestoreDb = db;
    localStorage.setItem(LOCAL_FIREBASE_KEY, JSON.stringify(config));

    // Non-blocking connection check to verify Firestore read permission
    try {
      const testQuery = query(collection(db, "videos"));
      await getDocs(testQuery);
      currentFirebaseStatus = {
        configured: true,
        connected: true,
        projectId: config.projectId,
        message: `Successfully connected to Firebase Firestore (${config.projectId})`
      };
    } catch (dbErr) {
      console.warn("Firestore rules / connectivity note:", dbErr);
      currentFirebaseStatus = {
        configured: true,
        connected: true,
        projectId: config.projectId,
        message: `Connected to Firebase (${config.projectId}). Firestore ready with LocalStorage fallback.`
      };
    }

    return currentFirebaseStatus;
  } catch (err) {
    console.warn("Firebase initialization warning, running with LocalStorage sync:", err);
    firestoreDb = null;
    currentFirebaseStatus = {
      configured: true,
      connected: false,
      projectId: config.projectId || "virual-link",
      message: "Connection note: " + err.message
    };
    return currentFirebaseStatus;
  }
}

export function getFirebaseStatus() {
  return currentFirebaseStatus;
}

export function getSavedFirebaseConfig() {
  try {
    const val = localStorage.getItem(LOCAL_FIREBASE_KEY);
    return val ? JSON.parse(val) : DEFAULT_FIREBASE_CONFIG;
  } catch (e) {
    return DEFAULT_FIREBASE_CONFIG;
  }
}

export function removeFirebaseConfig() {
  localStorage.removeItem(LOCAL_FIREBASE_KEY);
  return setupFirebase(DEFAULT_FIREBASE_CONFIG);
}

// -------------------------------------------------------------
// VIDEOS CRUD
// -------------------------------------------------------------

export async function fetchVideos() {
  // If Firestore is connected, fetch from cloud
  if (firestoreDb && currentFirebaseStatus.connected) {
    try {
      const q = query(collection(firestoreDb, "videos"));
      const snapshot = await getDocs(q);
      const videos = [];
      snapshot.forEach(docSnap => {
        videos.push({ id: docSnap.id, ...docSnap.data() });
      });

      if (videos.length > 0) {
        // Cache to local
        localStorage.setItem(LOCAL_VIDEOS_KEY, JSON.stringify(videos));
        return videos.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      }
    } catch (e) {
      console.warn("Firestore fetch failed, using local storage cache:", e);
    }
  }

  // Fallback: Local Storage
  const localStr = localStorage.getItem(LOCAL_VIDEOS_KEY);
  if (localStr) {
    try {
      const parsed = JSON.parse(localStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      }
    } catch (e) {
      console.error("Local storage videos corrupted, resetting to defaults:", e);
    }
  }

  // Initialize with sample blockbusters
  localStorage.setItem(LOCAL_VIDEOS_KEY, JSON.stringify(initialVideos));
  return initialVideos;
}

export async function saveVideo(videoData) {
  const id = videoData.id || "vid-" + Date.now();
  const videoRecord = {
    ...videoData,
    id,
    createdAt: videoData.createdAt || Date.now(),
    clicksRequired: Number(videoData.clicksRequired) || 3
  };

  // 1. Save to Local Storage
  const current = await fetchVideos();
  const existingIndex = current.findIndex(v => v.id === id);
  let updatedList;
  if (existingIndex >= 0) {
    updatedList = [...current];
    updatedList[existingIndex] = videoRecord;
  } else {
    updatedList = [videoRecord, ...current];
  }
  localStorage.setItem(LOCAL_VIDEOS_KEY, JSON.stringify(updatedList));

  // 2. Save to Firestore if connected
  if (firestoreDb && currentFirebaseStatus.connected) {
    try {
      await setDoc(doc(firestoreDb, "videos", id), videoRecord, { merge: true });
    } catch (e) {
      console.error("Failed to sync video to Firestore:", e);
    }
  }

  return videoRecord;
}

export async function deleteVideo(videoId) {
  // 1. Remove from Local Storage
  const current = await fetchVideos();
  const filtered = current.filter(v => v.id !== videoId);
  localStorage.setItem(LOCAL_VIDEOS_KEY, JSON.stringify(filtered));

  // 2. Remove from Firestore if connected
  if (firestoreDb && currentFirebaseStatus.connected) {
    try {
      await deleteDoc(doc(firestoreDb, "videos", videoId));
    } catch (e) {
      console.error("Failed to delete video from Firestore:", e);
    }
  }

  return true;
}

// -------------------------------------------------------------
// SETTINGS CRUD
// -------------------------------------------------------------

export async function fetchSettings() {
  if (firestoreDb && currentFirebaseStatus.connected) {
    try {
      const q = query(collection(firestoreDb, "settings"));
      const snapshot = await getDocs(q);
      let cloudSettings = null;
      snapshot.forEach(docSnap => {
        if (docSnap.id === "global") {
          cloudSettings = docSnap.data();
        }
      });
      if (cloudSettings) {
        localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(cloudSettings));
        return { ...defaultSettings, ...cloudSettings };
      }
    } catch (e) {
      console.warn("Could not read settings from Firestore:", e);
    }
  }

  const local = localStorage.getItem(LOCAL_SETTINGS_KEY);
  if (local) {
    try {
      return { ...defaultSettings, ...JSON.parse(local) };
    } catch (e) {
      console.error("Failed to parse local settings:", e);
    }
  }

  return defaultSettings;
}

export async function saveSettings(newSettings) {
  const merged = { ...defaultSettings, ...newSettings };
  localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(merged));

  if (firestoreDb && currentFirebaseStatus.connected) {
    try {
      await setDoc(doc(firestoreDb, "settings", "global"), merged, { merge: true });
    } catch (e) {
      console.error("Failed to sync settings to Firestore:", e);
    }
  }

  return merged;
}

/**
 * Upload all local videos into Firebase Firestore in bulk
 */
export async function syncLocalVideosToFirebase() {
  if (!firestoreDb || !currentFirebaseStatus.connected) {
    throw new Error("Firebase is not connected. Please verify your Firebase credentials first.");
  }

  const localVideos = await fetchVideos();
  let count = 0;
  for (const vid of localVideos) {
    await setDoc(doc(firestoreDb, "videos", vid.id), vid, { merge: true });
    count++;
  }

  const settings = await fetchSettings();
  await setDoc(doc(firestoreDb, "settings", "global"), settings, { merge: true });

  return count;
}

// -------------------------------------------------------------
// REAL-TIME FIRESTORE SYNCHRONIZATION
// -------------------------------------------------------------

/**
 * Real-time listener for videos and settings changes from Firebase Firestore
 */
export function subscribeToRealtimeData({ onVideosChange, onSettingsChange }) {
  if (!firestoreDb) return () => {};

  let unsubVideos = null;
  let unsubSettings = null;

  try {
    // Listen for live updates to videos collection
    unsubVideos = onSnapshot(collection(firestoreDb, "videos"), (snapshot) => {
      const videos = [];
      snapshot.forEach((docSnap) => {
        videos.push({ id: docSnap.id, ...docSnap.data() });
      });
      if (videos.length > 0) {
        videos.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        localStorage.setItem(LOCAL_VIDEOS_KEY, JSON.stringify(videos));
        if (onVideosChange) onVideosChange(videos);
      }
    }, (err) => {
      console.warn("Real-time videos listener warning:", err);
    });

    // Listen for live updates to global settings document
    unsubSettings = onSnapshot(doc(firestoreDb, "settings", "global"), (docSnap) => {
      if (docSnap.exists()) {
        const cloudSettings = docSnap.data();
        localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(cloudSettings));
        if (onSettingsChange) onSettingsChange({ ...defaultSettings, ...cloudSettings });
      }
    }, (err) => {
      console.warn("Real-time settings listener warning:", err);
    });
  } catch (err) {
    console.warn("Could not establish real-time listeners:", err);
  }

  return () => {
    if (unsubVideos) unsubVideos();
    if (unsubSettings) unsubSettings();
  };
}

// -------------------------------------------------------------
// DYNAMIC CATEGORIES MANAGEMENT
// -------------------------------------------------------------

/**
 * Fetch all categories: combines settings.categories and all unique video categories
 */
export async function fetchCategories() {
  const settings = await fetchSettings();
  const videos = await fetchVideos();

  const baseCategories = ["Trending", "Movies", "Viral Reels", "Action", "Horror"];
  const set = new Set([...baseCategories, ...(settings.categories || [])]);

  videos.forEach(v => {
    if (v.category && typeof v.category === "string" && v.category.trim()) {
      set.add(v.category.trim());
    }
  });

  return Array.from(set);
}

/**
 * Create/Add a new category
 */
export async function addCategory(categoryName) {
  if (!categoryName || typeof categoryName !== "string") return;
  const name = categoryName.trim();
  if (!name) return;

  const settings = await fetchSettings();
  const currentCategories = settings.categories || ["Trending", "Movies", "Viral Reels", "Action", "Horror"];

  if (!currentCategories.some(c => c.toLowerCase() === name.toLowerCase())) {
    currentCategories.push(name);
    await saveSettings({ categories: currentCategories });
  }

  return await fetchCategories();
}

// -------------------------------------------------------------
// -------------------------------------------------------------
// ADMIN ACCESS CONTROL (axelboyus@gmail.com)
// -------------------------------------------------------------

export const SUPER_ADMIN_EMAIL = "axelboyus@gmail.com";
const LOCAL_ADMIN_AUTH_KEY = "adstraw_admin_auth";
const LOCAL_ADMIN_EMAIL_KEY = "adstraw_admin_email";

/**
 * Get authorized admin emails
 */
export async function getAuthorizedAdminEmails() {
  return [SUPER_ADMIN_EMAIL];
}

/**
 * Check if a given email is authorized to access the Admin Panel (axelboyus@gmail.com only)
 */
export async function isEmailAuthorizedAdmin(email) {
  if (!email || typeof email !== "string") return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Legacy stubs for backwards compatibility
 */
export async function addAuthorizedAdmin(newEmail) {
  return [SUPER_ADMIN_EMAIL];
}

export async function removeAuthorizedAdmin(emailToRemove) {
  return [SUPER_ADMIN_EMAIL];
}

/**
 * Set active authenticated admin session in browser
 */
export function setAdminSession(email) {
  sessionStorage.setItem(LOCAL_ADMIN_AUTH_KEY, "true");
  sessionStorage.setItem(LOCAL_ADMIN_EMAIL_KEY, email.trim().toLowerCase());
  localStorage.setItem(LOCAL_ADMIN_AUTH_KEY, "true");
  localStorage.setItem(LOCAL_ADMIN_EMAIL_KEY, email.trim().toLowerCase());
}

/**
 * Clear admin session (Lock / Logout)
 */
export function clearAdminSession() {
  sessionStorage.removeItem(LOCAL_ADMIN_AUTH_KEY);
  sessionStorage.removeItem(LOCAL_ADMIN_EMAIL_KEY);
  localStorage.removeItem(LOCAL_ADMIN_AUTH_KEY);
  localStorage.removeItem(LOCAL_ADMIN_EMAIL_KEY);
}

/**
 * Get currently logged-in admin email (if any)
 */
export function getCurrentAdminEmail() {
  return sessionStorage.getItem(LOCAL_ADMIN_EMAIL_KEY) || localStorage.getItem(LOCAL_ADMIN_EMAIL_KEY) || "";
}

/**
 * Synchronous check if admin session is active for axelboyus@gmail.com
 */
export function isCurrentlyAdminAuthenticated() {
  const isAuth = sessionStorage.getItem(LOCAL_ADMIN_AUTH_KEY) === "true" || localStorage.getItem(LOCAL_ADMIN_AUTH_KEY) === "true";
  const email = getCurrentAdminEmail();
  return isAuth && email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

// -------------------------------------------------------------
// USER "ME" CONTACT & REFERRAL HELPERS
// -------------------------------------------------------------

/**
 * Submit user contact message to Firestore & localStorage
 */
export async function submitContactMessage({ name, email, message }) {
  const msgRecord = {
    id: "msg-" + Date.now(),
    name: name || "Anonymous User",
    email: email || "Not provided",
    message: message || "",
    timestamp: Date.now(),
    read: false
  };

  // 1. Save to local
  try {
    const existing = JSON.parse(localStorage.getItem("adstraw_contact_messages") || "[]");
    existing.unshift(msgRecord);
    localStorage.setItem("adstraw_contact_messages", JSON.stringify(existing));
  } catch (e) {}

  // 2. Save to Firestore
  if (firestoreDb && currentFirebaseStatus.connected) {
    try {
      await setDoc(doc(firestoreDb, "messages", msgRecord.id), msgRecord);
    } catch (e) {
      console.warn("Could not save message to Firestore:", e);
    }
  }

  return msgRecord;
}

// -------------------------------------------------------------
// USER "ME" REFERRAL & TELEGRAM PERSISTENCE
// -------------------------------------------------------------

export function getUserReferralCode() {
  let refCode = localStorage.getItem("adstraw_my_ref");
  if (!refCode) {
    refCode = "ref" + Math.floor(100000 + Math.random() * 900000);
    localStorage.setItem("adstraw_my_ref", refCode);
  }
  return refCode;
}

export function getUserTelegramUsername() {
  return localStorage.getItem("adstraw_my_tg_username") || "";
}

export async function setUserTelegramUsername(username) {
  let cleanUser = (username || "").trim();
  if (cleanUser && !cleanUser.startsWith("@")) {
    cleanUser = "@" + cleanUser;
  }
  localStorage.setItem("adstraw_my_tg_username", cleanUser);

  const refCode = getUserReferralCode();
  if (firestoreDb && currentFirebaseStatus.connected) {
    try {
      await setDoc(doc(firestoreDb, "users", refCode), {
        referralCode: refCode,
        telegramUsername: cleanUser,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (e) {
      console.warn("Could not sync Telegram username to Firestore:", e);
    }
  }
  return cleanUser;
}

export async function getReferralCount(refCode) {
  const code = refCode || getUserReferralCode();
  let count = parseInt(localStorage.getItem(`adstraw_ref_count_${code}`) || "0", 10);

  if (firestoreDb && currentFirebaseStatus.connected) {
    try {
      const snap = await getDoc(doc(firestoreDb, "referrals", code));
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.count === "number") {
          count = data.count;
          localStorage.setItem(`adstraw_ref_count_${code}`, count.toString());
        }
      }
    } catch (e) {
      console.warn("Could not fetch referral count from Firestore:", e);
    }
  }

  return count;
}

export async function recordReferralVisit(refCode) {
  if (!refCode) return;
  const myCode = getUserReferralCode();
  if (refCode === myCode) {
    // Skip self-referral
    return;
  }

  const alreadyReferred = localStorage.getItem("adstraw_referred_by");
  if (alreadyReferred) {
    return;
  }

  localStorage.setItem("adstraw_referred_by", refCode);

  // Increment local count cache
  const currentLocal = parseInt(localStorage.getItem(`adstraw_ref_count_${refCode}`) || "0", 10);
  const newCount = currentLocal + 1;
  localStorage.setItem(`adstraw_ref_count_${refCode}`, newCount.toString());

  // Increment in Firestore
  if (firestoreDb && currentFirebaseStatus.connected) {
    try {
      const refDoc = doc(firestoreDb, "referrals", refCode);
      const snap = await getDoc(refDoc);
      let countVal = 1;
      if (snap.exists()) {
        countVal = (snap.data().count || 0) + 1;
      }
      await setDoc(refDoc, {
        referralCode: refCode,
        count: countVal,
        lastReferredAt: Date.now()
      }, { merge: true });
    } catch (e) {
      console.warn("Could not record referral in Firestore:", e);
    }
  }
}

