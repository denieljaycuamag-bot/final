import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDQTXx1l5L12ufL-wMiwqEEBF7i0JNqMvY",
  authDomain: "chat-ai-a1b1c.firebaseapp.com",
  projectId: "chat-ai-a1b1c",
  storageBucket: "chat-ai-a1b1c.firebasestorage.app",
  messagingSenderId: "1007195209302",
  appId: "1:1007195209302:web:c317815e6d1303778d05f7",
  measurementId: "G-NXZLXDEEJF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export auth and firestore
export const auth = getAuth(app);
export const db = getFirestore(app);