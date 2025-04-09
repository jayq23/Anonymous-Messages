const addBtn = document.getElementById("addBtn");
const titleTxt = document.getElementById("titleTxt");
const addTxt = document.getElementById("addTxt");
const notesContainer = document.getElementById("notes");

// Firebase DB reference
const auth = firebase.auth();
const database = firebase.database();

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

// Save note on click
addBtn.addEventListener("click", () => {
  const title = titleTxt.value.trim();
  const note = addTxt.value.trim();

  if (title || note) {
    const newNoteRef = database.ref("notes").push();
    newNoteRef.set({ title, note });

    titleTxt.value = "";
    addTxt.value = "";
  }
});

// Load notes from DB
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
