// Firebase Configuration File
// Replace the config values with your Firebase project credentials

// TODO: Replace with your Firebase project configuration
// Get these values from Firebase Console > Project Settings > Your Apps
const firebaseConfig = {
  apiKey: "AIzaSyD4ucpsA4UXRsDeaTlPudgSF8FWPBnuVHk",
  authDomain: "skillbarter-27ccd.firebaseapp.com",
  projectId: "skillbarter-27ccd",
  storageBucket: "skillbarter-27ccd.firebasestorage.app",
  messagingSenderId: "424676046225",
  appId: "1:424676046225:web:e05fc5320db0e2b2249630"
};


// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export Firebase services
const auth = firebase.auth();
const db = firebase.firestore();