// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDf6U2disYEIBiql0fzDO6rLB5gRUULLtQ",
  authDomain: "notetaker-757c3.firebaseapp.com",
  projectId: "notetaker-757c3",
  storageBucket: "notetaker-757c3.firebasestorage.app",
  messagingSenderId: "685375574175",
  appId: "1:685375574175:web:fca7c5a63835237f3292aa"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider, signInWithPopup, signOut, onAuthStateChanged };
