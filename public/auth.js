// handles all firebase auth stuff here

import { auth, provider, signInWithPopup, signOut, onAuthStateChanged } from './firebase.js';
import { loadNotes } from './notes.js';
import { renderNotes, renderTagFilters } from './ui.js';

const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const userPhoto = document.getElementById('userPhoto');

// login with google
loginBtn.addEventListener('click', () => {
  signInWithPopup(auth, provider)
    .then(result => {
      const user = result.user;
      console.log("logged in as:", user.displayName);
    })
    .catch(error => {
      console.error("login failed:", error);
    });
});

// logout and clear notes
logoutBtn.addEventListener('click', () => {
  signOut(auth);
});

onAuthStateChanged(auth, async user => {
  if (user) {
    // user is logged in, so grab their notes
    window.notes = await loadNotes();
    window.allTags = new Set();
    notes.forEach(note => (note.tags || []).forEach(tag => allTags.add(tag)));

    renderNotes();
    renderTagFilters();

    loginBtn.style.display = 'none';
    userInfo.style.display = 'flex';
    userPhoto.src = user.photoURL;
  } else {
    // user is logged out, reset everything
    window.notes = [];
    window.allTags = new Set();
    renderNotes();
    renderTagFilters();

    loginBtn.style.display = 'inline-block';
    userInfo.style.display = 'none';
    userPhoto.src = '';
  }
});
