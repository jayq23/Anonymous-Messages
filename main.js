const addBtn = document.getElementById("addBtn");
const titleTxt = document.getElementById("titleTxt");
const addTxt = document.getElementById("addTxt");
const notesContainer = document.getElementById("notes");

// Firebase DB reference
const auth = firebase.auth();
const database = firebase.database();

// Sign In with Google
function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then((result) => {
      document.getElementById("login-section").style.display = "none";
      document.getElementById("main-content").style.display = "block";
      loadNotes(); // Only load notes after login
    })
    .catch((error) => {
      alert("Login failed: " + error.message);
    });
}

// Auth State Changed - Loading User-Specific Notes
auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById("login-section").style.display = "none";
    document.getElementById("main-content").style.display = "block";
    loadNotes(); // Load notes if already signed in
  } else {
    document.getElementById("login-section").style.display = "block";
    document.getElementById("main-content").style.display = "none";
  }
});

function hashNote(note) {
  return new Promise((resolve, reject) => {
    const salt = "random_salt"; 
    const key = "your_base64_signer_key"; 
    const crypto = window.crypto || window.msCrypto; 
    const encoder = new TextEncoder();
    const data = encoder.encode(note + salt); 

    crypto.subtle.importKey("raw", encoder.encode(key), { name: "PBKDF2" }, false, ["deriveKey"])
      .then(secretKey => {
        return crypto.subtle.deriveKey(
          { name: "PBKDF2", salt: data, iterations: 100000, hash: "SHA-256" },
          secretKey,
          { name: "HMAC", hash: "SHA-256", length: 256 },
          false,
          ["sign"]
        );
      })
      .then(key => {
        return crypto.subtle.exportKey("raw", key);
      })
      .then(exportedKey => {
        resolve(new TextDecoder().decode(exportedKey));
      })
      .catch(reject);
  });
}

// Save note on click
addBtn.addEventListener("click", () => {
  const title = titleTxt.value.trim();
  const note = addTxt.value.trim();

  if (title || note) {
    const user = firebase.auth().currentUser;
    if (user) {
      const userId = user.uid;

      // Save plain text instead of hashed note for now
      const newNoteRef = database.ref("users/" + userId + "/notes").push();
      newNoteRef.set({ title, note });

      titleTxt.value = "";
      addTxt.value = "";
    }
  }
});

// Load notes from DB
function loadNotes() {
  const user = firebase.auth().currentUser;
  
  if (user) {
    const userId = user.uid;

    // Try to load notes from the user's notes path
    database.ref("users/" + userId + "/notes").on("value", snapshot => {
      notesContainer.innerHTML = "";
      
      if (snapshot.exists()) {
        snapshot.forEach(childSnap => {
          const { title, note } = childSnap.val();
          const card = document.createElement("div");
          card.className = "card col-md-3 m-8 p-2";
          card.innerHTML = `
            <div class="card-body">
              <h5 class="card-title">${title || "No Title"}</h5>
              <p class="card-text">${note}</p>
            </div>`;
          notesContainer.appendChild(card);
        });
      } else {
        // If no notes exist under the user, load from the old 'notes' path
        loadOldNotes();
      }
    });
  } else {
    // If no user is signed in, load notes from the old 'notes' path
    loadOldNotes();
  }
}

// Load old notes from the 'notes' path
function loadOldNotes() {
  database.ref("notes").on("value", snapshot => {
    notesContainer.innerHTML = "";
    snapshot.forEach(childSnap => {
      const { title, note } = childSnap.val();
      const card = document.createElement("div");
      card.className = "card col-md-3 m-8 p-2";
      card.innerHTML = `
        <div class="card-body">
          <h5 class="card-title">${title || "No Title"}</h5>
          <p class="card-text">${note}</p>
        </div>`;
      notesContainer.appendChild(card);
    });
  });
}
