// src/firebase.js
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";

import {
  getAuth,
  GoogleAuthProvider
} from "firebase/auth";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAjDdvL4d0dG-8PFY2J3zTNRSWCdgzmNLc",
  authDomain: "hearme-d7bd1.firebaseapp.com",
  projectId: "hearme-d7bd1",
  storageBucket: "hearme-d7bd1.firebasestorage.app",
  messagingSenderId: "1016455576819",
  appId: "1:1016455576819:web:3d02081050d3e032834b86"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);

// Export helpers (optional)
export {
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  ref,
  uploadBytes,
  getDownloadURL
};
export default app;