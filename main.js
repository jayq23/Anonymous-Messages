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
    card.className = "card col-md-4 m-2 p-2";
    card.innerHTML = `
      <div class="card-body">
        <h5 class="card-title">${title || "No Title"}</h5>
        <p class="card-text">${note}</p>
      </div>`;
    notesContainer.appendChild(card);
  });
});
