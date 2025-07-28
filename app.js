let notes = []

function openNoteDialog() {
    console.log("openNoteDialog() called");
    const dialog = document.getElementById('noteDialog');
    const titleInput = document.getElementById('noteTitle');
    const contentInput = document.getElementById('noteContent');
    
    dialog.showModal();
    titleInput.focus();
}