const addBtn = document.getElementById("addBtn");
const titleTxt = document.getElementById("titleTxt");
const addTxt = document.getElementById("addTxt");
const notesContainer = document.getElementById("notes");
// Firebase DB reference
const database = firebase.database();

// Save note on click
addBtn.addEventListener("click", () => {
  const title = titleTxt.value.trim();
  const note = addTxt.value.trim();
  if (title || note) {
    const newNoteRef = database.ref("notes").push();
    newNoteRef.set({
      title,
      note,
      timestamp: Date.now(),
      replies: {}
    });
    titleTxt.value = "";
    addTxt.value = "";
  }
});

// Function to add a reply to a note
function addReply(noteId, replyText) {
  if (replyText.trim()) {
    const replyRef = database.ref(`notes/${noteId}/replies`).push();
    replyRef.set({
      text: replyText,
      timestamp: Date.now()
    });
  }
}

// Load notes from DB
database.ref("notes").on("value", snapshot => {
  notesContainer.innerHTML = "";
  snapshot.forEach(childSnap => {
    const noteId = childSnap.key;
    const noteData = childSnap.val();
    const { title, note, replies } = noteData;
    
    // Create card for each note
    const card = document.createElement("div");
    card.className = "card col-md-3 m-8 p-2";
    
    // Create card content
    let replyHTML = '';
    if (replies) {
      replyHTML = '<hr><h6 class="replies-title">Replies:</h6><div class="replies-container">';
      
      // Convert replies object to array and sort by timestamp
      const repliesArray = Object.entries(replies).map(([id, data]) => ({
        id,
        ...data
      }));
      
      repliesArray.sort((a, b) => a.timestamp - b.timestamp);
      
      // Generate HTML for each reply
      repliesArray.forEach(reply => {
        replyHTML += `
          <div class="reply p-2 mb-2" style="background-color: #f8f9fa; border-radius: 8px;">
            <p class="mb-1">${reply.text}</p>
            <small class="text-muted">${new Date(reply.timestamp).toLocaleString()}</small>
          </div>
        `;
      });
      
      replyHTML += '</div>';
    }
    
    // Add reply form
    const replyFormHTML = `
      <div class="reply-form mt-3">
        <div class="input-group">
          <input type="text" class="form-control reply-input" placeholder="Write a reply...">
          <button class="btn btn-sm btn-primary reply-btn" data-note-id="${noteId}">Reply</button>
        </div>
      </div>
    `;
    
    // Combine all HTML
    card.innerHTML = `
      <div class="card-body">
        <h5 class="card-title">${title || "No Title"}</h5>
        <p class="card-text">${note}</p>
        ${replyHTML}
        ${replyFormHTML}
      </div>
    `;
    
    // Append the card to the container
    notesContainer.appendChild(card);
    
    // Add event listener to the reply button
    const replyBtn = card.querySelector('.reply-btn');
    const replyInput = card.querySelector('.reply-input');
    
    replyBtn.addEventListener('click', () => {
      const replyText = replyInput.value;
      addReply(noteId, replyText);
      replyInput.value = '';
    });
    
    // Add enter key support for replies
    replyInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const replyText = replyInput.value;
        addReply(noteId, replyText);
        replyInput.value = '';
      }
    });
  });
});

// Search functionality
const searchTxt = document.getElementById("searchTxt");
searchTxt.addEventListener("input", () => {
  const searchTerm = searchTxt.value.toLowerCase();
  const cards = document.querySelectorAll(".card");
  
  cards.forEach(card => {
    const title = card.querySelector(".card-title").textContent.toLowerCase();
    const content = card.querySelector(".card-text").textContent.toLowerCase();
    
    // Also search in replies if they exist
    const replies = Array.from(card.querySelectorAll(".reply p")).map(el => el.textContent.toLowerCase());
    const replyContent = replies.join(" ");
    
    if (title.includes(searchTerm) || content.includes(searchTerm) || replyContent.includes(searchTerm)) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
});
