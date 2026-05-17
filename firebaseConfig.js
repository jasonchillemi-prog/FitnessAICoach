import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyCo8WoBIb8I9e-CNJw3JmrRQBdpKOJ9EZk",
  authDomain: "fitness-ai-coach-11106.firebaseapp.com",
  projectId: "fitness-ai-coach-11106",
  storageBucket: "fitness-ai-coach-11106.firebasestorage.app",
  messagingSenderId: "1055121134609",
  appId: "1:1055121134609:web:c7f5f912a6012b9f56cdb0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export { httpsCallable };
