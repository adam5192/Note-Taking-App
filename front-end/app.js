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
        return data?.notes || JSON.parse(localStorage.getItem(`notes_${user.uid}`)) || [];
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

    // Drag handlers
    let draggedNoteId = null;

    document.querySelectorAll('.note-card').forEach(card => {
        card.addEventListener('dragstart', e => {
            draggedNoteId = card.dataset.id;
            e.dataTransfer.effectAllowed = 'move';
            card.style.opacity = '0.5';
        });

        card.addEventListener('dragend', () => {
            draggedNoteId = null;
            card.style.opacity = '1';
        });

        card.addEventListener('dragover', e => {
            e.preventDefault();
        });

        card.addEventListener('drop', e => {
            e.preventDefault();
            const targetId = card.dataset.id;
            if (draggedNoteId && draggedNoteId !== targetId) {
                reorderNotes(draggedNoteId, targetId);
            }
        });
    });
}


function openNoteDialog(noteId = null) {
    const dialog = document.getElementById('noteDialog');
    const titleInput = document.getElementById('noteTitle');
    const contentInput = document.getElementById('noteContent');
    const tagInput = document.getElementById('noteTagsInput');
    
    if(noteId) {
        // Edit Mode
        const noteToEdit = notes.find(note => note.id === noteId);
        editingNoteId = noteId;
        document.getElementById('dialogTitle').textContent = 'Edit Note';
        titleInput.value = noteToEdit.title;
        contentInput.value = noteToEdit.content;

        currentTags = [...(noteToEdit.tags || [])];
    }
    else {
        // Add Mode
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
    
    const uniqueTags = Array.from(allTags);

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


document.addEventListener('DOMContentLoaded', async function() {
    applyStoredTheme()
    
    const user = auth.currentUser;
  if (user) {
    notes = await loadNotes();
    allTags = new Set();
    notes.forEach(note => (note.tags || []).forEach(tag => allTags.add(tag)));
  }
    renderNotes()
    renderTagFilters();
    const noteDialog = document.getElementById('noteDialog');
    const tagInput = document.getElementById('noteTagsInput');
    tagList = document.getElementById('tagList');

    // Button event listeners
    document.getElementById('addNoteBtn').addEventListener('click', () => openNoteDialog());
    document.getElementById('cancelBtn').addEventListener('click', () => closeNoteDialog());
    document.getElementById('dialogCloseBtn').addEventListener('click', () => closeNoteDialog());

    document.getElementById('tagFilters').addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-pill')) {
        const tag = e.target.dataset.tag;
        filterByTag(tag);
        }
    });

    // Ensure that dialog closes when clicked outside of box, but only if the click started and ended there
    let clickStartInsideDialog = false;

    document.getElementById('noteForm').addEventListener('submit', saveNote);

    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
    
    noteDialog.addEventListener('mousedown', (e) => {
        // If click started inside dialog
        clickStartInsideDialog = e.target.closest('.dialog-content') !== null;
    });

    noteDialog.addEventListener('click', e => {
        // Only close if click did not start inside
        if (!clickStartInsideDialog && e.target === noteDialog) {
            closeNoteDialog();
        }
    });

    tagInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && tagInput.value.trim() !== '') {
            e.preventDefault();
            const newTag = tagInput.value.trim();

            if (!currentTags.includes(newTag)) {
            currentTags.push(newTag);
            renderTags();
            }

            tagInput.value = '';
        }
    });

    const tagSuggestions = document.getElementById('tagSuggestions');

    // Show suggestions while typing
    tagInput.addEventListener('input', () => {
        const input = tagInput.value.trim().toLowerCase();

        if (!input) {
            tagSuggestions.innerHTML = '';
            return;
        }

        const matches = [...allTags].filter(tag =>
            tag.toLowerCase().includes(input) && !currentTags.includes(tag)
        );

        if (matches.length === 0) {
            tagSuggestions.innerHTML = '';
            return;
        }

        tagSuggestions.innerHTML = matches.map(tag =>
            `<li onclick="selectTag('${tag}')">${tag}</li>`
        ).join('');
    });

    // Hide suggestions on blur (with slight delay to allow click)
    tagInput.addEventListener('blur', () => {
        setTimeout(() => tagSuggestions.innerHTML = '', 150);
    });



        new Sortable(document.getElementById('notesContainer'), {
            animation: 150,
            handle: ".note-actions", 
            ghostClass: "sortable-ghost", 
            onEnd: function (evt) {
                const oldIndex = evt.oldIndex;
                const newIndex = evt.newIndex;

                if (oldIndex === newIndex) return;

                const [movedNote] = notes.splice(oldIndex, 1);
                notes.splice(newIndex, 0, movedNote);

                saveNotes();
            }
        })
    })

const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const userPhoto = document.getElementById('userPhoto');

loginBtn.addEventListener('click', () => {
  signInWithPopup(auth, provider)
    .then(result => {
      const user = result.user;
      console.log("Logged in as:", user.displayName);
    })
    .catch(error => {
      console.error("Login failed:", error);
    });
});

logoutBtn.addEventListener('click', () => {
  signOut(auth);
});

onAuthStateChanged(auth, async user => {
  if (user) {
    // User is logged in
    notes = await loadNotes();

    allTags = new Set();
    notes.forEach(note => {
      (note.tags || []).forEach(tag => allTags.add(tag));
    });

    renderNotes();
    renderTagFilters();

    loginBtn.style.display = 'none';
    userInfo.style.display = 'flex';
    userPhoto.src = user.photoURL;
  } else {
    // Not logged in
    notes = [];
    allTags = new Set();
    renderNotes();
    renderTagFilters();

    loginBtn.style.display = 'inline-block';
    userInfo.style.display = 'none';
    userPhoto.src = '';
  }
});

window.openNoteDialog = openNoteDialog;
window.closeNoteDialog = closeNoteDialog;
window.filterByTag = filterByTag;
window.deleteNote = deleteNote;
window.saveNote = saveNote;
