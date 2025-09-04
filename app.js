let notes = [];
let editingNoteId = null;
let tagList = null;
let currentTags = [];
let allTags = new Set(); // Store all unique tags
let currentFilter = 'All';import { auth, provider, signInWithPopup, signOut, onAuthStateChanged } from './firebase.js';
const BACKEND_URL =
  window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://notely-p3dy.onrender.com';


async function loadNotes() {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const idToken = await user.getIdToken();

    const res = await fetch(`${BACKEND_URL}/notes`, {
      headers: {
        Authorization: `Bearer ${idToken}`
      }
    });

    if (!res.ok) throw new Error('Failed to fetch');

    const data = await res.json();

    // normalize _id to id
    return (data.notes || []).map(note => ({
      ...note,
      id: note._id  // unify the ID field
    }));
  } catch (err) {
    console.error("Failed to load notes from backend", err);
    return [];
  }
}


function saveNote(event){
    event.preventDefault();

    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    const tags = [...currentTags];


    if(editingNoteId){
        // Update exisitng Note
        const noteIndex = notes.findIndex(note => note.id === editingNoteId);
        notes[noteIndex] = {
            ...notes[noteIndex],
            title: title,
            content: content,
            tags: tags
        }
    }   
    else {
        // Add New Note
        notes.unshift ({
            id: generateId(),
            title: title,
            content: content,
            tags: tags
        })
    }
    tags.forEach(tag => allTags.add(tag));

    // Rebuild allTags from current notes
    allTags = new Set();
    notes.forEach(note => (note.tags || []).forEach(tag => allTags.add(tag)));

    closeNoteDialog();
    saveNotes();
    renderNotes();
    renderTagFilters();
}

function reorderNotes(sourceId, targetId) {
    const sourceIndex = notes.findIndex(note => note.id === sourceId);
    const targetIndex = notes.findIndex(note => note.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const [movedNote] = notes.splice(sourceIndex, 1); // Remove dragged note
    notes.splice(targetIndex, 0, movedNote); // Insert at new position

    saveNotes();
    renderNotes();
    renderTagFilters();
}

function generateId() {
    return Date.now().toString();
}

function deleteNote(noteId) {
    notes = notes.filter(note => note.id != noteId);

    // Rebuild allTags from current notes
    allTags = new Set();
    notes.forEach(note => (note.tags || []).forEach(tag => allTags.add(tag)));
    saveNotes();
    renderNotes();
    renderTagFilters();
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-theme')
  localStorage.setItem('theme', isDark ? 'dark' : 'light')
  document.getElementById('themeToggleBtn').textContent = isDark ? '☀️' : '🌙'
}

function applyStoredTheme() {
  if(localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-theme')
    document.getElementById('themeToggleBtn').textContent = '☀️'
  }
}

async function saveNotes() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const idToken = await user.getIdToken();
        await fetch(`${BACKEND_URL}/notes`, {
            method: 'POST',
            headers: {
                'Content-Type' : 'application/json',
                Authorization: `Bearer ${idToken}`
            },
            body: JSON.stringify({notes})
        });
    } catch (err) {
        console.error("Failed to save notes to backend", err);
    }
}

function filterByTag(tag) {
    currentFilter = tag;
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.classList.toggle('active', pill.dataset.tag === tag);
    });

    renderNotes(tag);
    renderTagFilters();
}


function renderNotes() {
    const notesContainer = document.getElementById('notesContainer');
    renderTagFilters(); // Show tag pills at top

    let filteredNotes = notes;
    if (currentFilter && currentFilter !== 'All') {
        filteredNotes = notes.filter(note => note.tags && note.tags.includes(currentFilter));
    }

    if (filteredNotes.length === 0) {
        notesContainer.innerHTML = `
        <div class="empty-state">
            <h2>No notes found</h2>
            <p>Try creating a new note or changing the tag filter.</p>
            <button class="add-note-btn" onclick="openNoteDialog()">+ Add Note</button>
        </div>`;
        return;
    }

    notesContainer.innerHTML = filteredNotes.map(note => `
        <div class="note-card" data-id="${note.id}">
            <div class="note-actions">
                <button class="edit-btn" onclick="openNoteDialog('${note.id}')" title="Edit Note">
                    <span class="material-icons">edit</span>
                </button>
                <div class="drag-bar drag-handle"></div>
                <button class="delete-btn" onclick="deleteNote('${note.id}')" title="Delete Note">
                    <span class="material-icons">close</span>
                </button>
            </div>

            <div class="note-card-text">
                <h3 class="note-title">${note.title}</h3>
                <div class="note-scroll">
                    <p class="note-content">${note.content}</p>
                </div>
            </div>
        </div>
    `).join('');
}


function openNoteDialog(noteId = null) {
    const dialog = document.getElementById('noteDialog');
    const titleInput = document.getElementById('noteTitle');
    const contentInput = document.getElementById('noteContent');
    const tagInput = document.getElementById('noteTagsInput');

    if (noteId) {
        const noteToEdit = notes.find(note => note.id === noteId || note._id === noteId);
        
        if (!noteToEdit) {
            console.warn(`Note with ID "${noteId}" not found.`);
            return;
        }

        editingNoteId = noteToEdit.id || noteToEdit._id;
        document.getElementById('dialogTitle').textContent = 'Edit Note';
        titleInput.value = noteToEdit.title || '';
        contentInput.value = noteToEdit.content || '';
        currentTags = [...(noteToEdit.tags || [])];
    } else {
        editingNoteId = null;
        document.getElementById('dialogTitle').textContent = 'Add New Note';
        titleInput.value = '';
        contentInput.value = '';
        currentTags = [];
    }

    tagInput.value = '';
    renderTags();

    dialog.showModal();
    titleInput.focus();
}


function closeNoteDialog() {
    document.getElementById('noteDialog').close();
}

function renderTags() {
    console.log(currentTags);
    tagList.innerHTML = currentTags.map(tag => `
        <div class="tag-pill">
            ${tag}
            <button class="remove-tag" onclick="removeTag('${tag}')">&times;</button>
        </div>
        `).join('');
}

function renderTagFilters() {
    const tagFilterContainer = document.getElementById('tagFilters');
    
    const uniqueTags = Array.from(allTags).sort((a, b) => a.localeCompare(b)); // 🔹 sort alphabetically
    const tagsHTML = ['All', ...uniqueTags].map(tag => `
        <div 
            class="tag-pill filter-pill ${currentFilter === tag ? 'active' : ''}" 
            data-tag="${tag}" 
            onclick="filterByTag('${tag}')"
        >
            ${tag}
        </div>
    `).join('');

    tagFilterContainer.innerHTML = tagsHTML;
}


function removeTag(tagToRemove) {
    currentTags = currentTags.filter(tag => tag !== tagToRemove);
    renderTags();
}

function selectTag(tag) {
    if (!currentTags.includes(tag)) {
        currentTags.push(tag);
        renderTags();
    }
    document.getElementById('noteTagsInput').value = '';
    document.getElementById('tagSuggestions').innerHTML = '';
}

function extractTag(tagInput) {
    const newTag = tagInput.value.trim();

    if (!currentTags.includes(newTag)) {
        currentTags.push(newTag);
        renderTags();
    }
    tagInput.value = '';
    console.log("tag extract");
}


document.addEventListener('DOMContentLoaded', async function () {
  applyStoredTheme();

  // --- cache DOM once
  const noteDialog = document.getElementById('noteDialog');
  const tagInput   = document.getElementById('noteTagsInput');
  const tagSuggestions = document.getElementById('tagSuggestions');
  const notesContainer = document.getElementById('notesContainer');
  const addNoteBtn = document.getElementById('addNoteBtn');
  const cancelBtn  = document.getElementById('cancelBtn');
  const dialogCloseBtn = document.getElementById('dialogCloseBtn');
  const tagFiltersEl = document.getElementById('tagFilters');
  const themeToggleBtn = document.getElementById('themeToggleBtn');

  const loginBtn  = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const userInfo  = document.getElementById('userInfo');
  const userPhoto = document.getElementById('userPhoto');

  // --- hamburger elements (may not exist on desktop)
  const menuBtn        = document.querySelector('.menu-toggle');
  const panel          = document.getElementById('headerMenu');
  const menuThemeBtn   = document.getElementById('menuTheme');
  const menuLogoutBtn  = document.getElementById('menuLogout');

  // --- load notes if already logged in
  const user = auth.currentUser;
  if (user) {
    notes = await loadNotes();
    allTags = new Set();
    notes.forEach(n => (n.tags || []).forEach(t => allTags.add(t)));
  }

  renderNotes();
  renderTagFilters();
  tagList = document.getElementById('tagList');

  // ------------------ Buttons / Form ------------------
  if (addNoteBtn) addNoteBtn.addEventListener('click', () => openNoteDialog());
  if (cancelBtn) cancelBtn.addEventListener('click', closeNoteDialog);
  if (dialogCloseBtn) dialogCloseBtn.addEventListener('click', closeNoteDialog);

  if (tagFiltersEl) {
    tagFiltersEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-pill')) {
        filterByTag(e.target.dataset.tag);
      }
    });
  }

  // close dialog when clicking backdrop (only if click started outside content)
  let clickStartInsideDialog = false;
  if (noteDialog) {
    noteDialog.addEventListener('mousedown', (e) => {
      clickStartInsideDialog = e.target.closest('.dialog-content') !== null;
    });
    noteDialog.addEventListener('click', (e) => {
      if (!clickStartInsideDialog && e.target === noteDialog) closeNoteDialog();
    });
  }

  const noteForm = document.getElementById('noteForm');
  if (noteForm) noteForm.addEventListener('submit', saveNote);

  if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);

  if (tagInput) {
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && tagInput.value.trim() !== '') extractTag(tagInput);
    });

    tagInput.addEventListener('input', () => {
      const input = tagInput.value.trim().toLowerCase();
      if (!input) { tagSuggestions.innerHTML = ''; return; }
      const matches = [...allTags].filter(tag => tag.toLowerCase().includes(input) && !currentTags.includes(tag));
      tagSuggestions.innerHTML = matches.length
        ? matches.map(tag => `<li onclick="selectTag('${tag}')">${tag}</li>`).join('')
        : '';
    });

    tagInput.addEventListener('blur', () => {
      setTimeout(() => tagSuggestions.innerHTML = '', 150);
    });
  }

  // ------------------ Sortable ------------------
  new Sortable(notesContainer, {
    animation: 150,
    handle: ".note-actions",
    ghostClass: "sortable-ghost",
    onEnd: function (evt) {
      const { oldIndex, newIndex } = evt;
      if (oldIndex === newIndex) return;
      const [movedNote] = notes.splice(oldIndex, 1);
      notes.splice(newIndex, 0, movedNote);
      saveNotes();
    }
  });

  // ------------------ Auth buttons ------------------
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      signInWithPopup(auth, provider)
        .then(result => console.log("Logged in as:", result.user.displayName))
        .catch(err => console.error("Login failed:", err));
    });
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => { signOut(auth); });
  }

  // ------------------ Hamburger menu ------------------
  const syncThemeLabel = () => {
    if (!menuThemeBtn) return;
    const dark = document.body.classList.contains('dark-theme') || localStorage.getItem('theme') === 'dark';
    menuThemeBtn.textContent = dark ? '☀️ Light mode' : '🌙 Dark mode';
    menuThemeBtn.setAttribute('aria-checked', dark ? 'true' : 'false');
  };
  syncThemeLabel(); // keep label consistent with stored theme

  if (menuBtn && panel) {
    const openMenu  = () => { panel.classList.add('open'); menuBtn.setAttribute('aria-expanded','true'); };
    const closeMenu = () => { panel.classList.remove('open'); menuBtn.setAttribute('aria-expanded','false'); };

    // Optional: position panel under the icon on resize
    const positionPanel = () => {
      const r = menuBtn.getBoundingClientRect();
      panel.style.right = `${Math.max(16, window.innerWidth - r.right)}px`;
      panel.style.top = `${r.bottom + 8}px`;
    };

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !panel.classList.contains('open');
      willOpen ? openMenu() : closeMenu();
      if (willOpen) positionPanel();
    });
    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && !menuBtn.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', () => { if (panel.classList.contains('open')) positionPanel(); });

    if (menuThemeBtn) {
      menuThemeBtn.addEventListener('click', () => {
        toggleTheme();
        syncThemeLabel();
        closeMenu();
      });
    }
    if (menuLogoutBtn) {
      // hidden by default; toggled in onAuthStateChanged
      menuLogoutBtn.style.display = 'none';
      menuLogoutBtn.addEventListener('click', () => { signOut(auth); closeMenu(); });
    }
  }

  // ------------------ Auth state UI sync ------------------
  onAuthStateChanged(auth, async user => {
    if (user) {
      notes = await loadNotes();
      allTags = new Set();
      notes.forEach(n => (n.tags || []).forEach(t => allTags.add(t)));
      renderNotes();
      renderTagFilters();

      if (loginBtn)  loginBtn.style.display = 'none';
      if (userInfo)  userInfo.style.display = 'flex';
      if (userPhoto) userPhoto.src = user.photoURL;

      if (menuLogoutBtn) menuLogoutBtn.style.display = 'block';   // show logout in menu
    } else {
      notes = [];
      allTags = new Set();
      renderNotes();
      renderTagFilters();

      if (loginBtn)  loginBtn.style.display = 'inline-block';
      if (userInfo)  userInfo.style.display = 'none';
      if (userPhoto) userPhoto.src = '';

      if (menuLogoutBtn) menuLogoutBtn.style.display = 'none';    // hide logout in menu
    }
  });
});

// expose functions
window.openNoteDialog = openNoteDialog;
window.closeNoteDialog = closeNoteDialog;
window.filterByTag = filterByTag;
window.deleteNote = deleteNote;
window.saveNote = saveNote;
window.selectTag = selectTag;
window.removeTag = removeTag;
