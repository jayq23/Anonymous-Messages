const addBtn = document.getElementById("addBtn");
const titleTxt = document.getElementById("titleTxt");
const addTxt = document.getElementById("addTxt");
const notesContainer = document.getElementById("notes");
const notificationBell = document.getElementById("notificationBell");
const notificationDropdown = document.getElementById("notificationDropdown");
// Firebase DB reference
const database = firebase.database();

// User profile data (will be replaced with proper user auth later)
let currentUser = {
  id: generateUserId(),
  name: localStorage.getItem("userName") || "Anonymous",
  profilePic: localStorage.getItem("userProfilePic") || "default-avatar.png"
};

// Generate a random user ID and store it
function generateUserId() {
  if (!localStorage.getItem("userId")) {
    const randomId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem("userId", randomId);
  }
  return localStorage.getItem("userId");
}

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
      replies: {},
      reactions: {},
      userId: currentUser.id,
      userName: currentUser.name,
      userProfilePic: currentUser.profilePic
    });
    titleTxt.value = "";
    addTxt.value = "";
  }
});

// Function to add a reply to a note
function addReply(noteId, replyText, authorId, authorName) {
  if (replyText.trim()) {
    const replyRef = database.ref(`notes/${noteId}/replies`).push();
    replyRef.set({
      text: replyText,
      timestamp: Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      userProfilePic: currentUser.profilePic
    });
    
    // Add notification for the note author if it's not the current user
    database.ref(`notes/${noteId}`).once("value", snapshot => {
      const noteData = snapshot.val();
      if (noteData && noteData.userId && noteData.userId !== currentUser.id) {
        addNotification(noteData.userId, "reply", {
          noteId: noteId,
          noteTitle: noteData.title || "Untitled note",
          fromUser: currentUser.name,
          replyText: replyText.substring(0, 50) + (replyText.length > 50 ? "..." : "")
        });
      }
    });
  }
}

// Add reaction to a message
function addReaction(noteId, reactionType) {
  const reactionRef = database.ref(`notes/${noteId}/reactions/${reactionType}/${currentUser.id}`);
  
  // Check if user already reacted with this reaction
  reactionRef.once("value", snapshot => {
    if (snapshot.exists()) {
      // Remove reaction if it already exists (toggle)
      reactionRef.remove();
    } else {
      // Add the reaction
      reactionRef.set(true);
      
      // Add notification for the note author if it's not the current user
      database.ref(`notes/${noteId}`).once("value", snapshot => {
        const noteData = snapshot.val();
        if (noteData && noteData.userId && noteData.userId !== currentUser.id) {
          addNotification(noteData.userId, "reaction", {
            noteId: noteId,
            noteTitle: noteData.title || "Untitled note",
            fromUser: currentUser.name,
            reactionType: reactionType
          });
        }
      });
    }
  });
}

// Add a notification
function addNotification(userId, type, data) {
  const notificationRef = database.ref(`notifications/${userId}`).push();
  notificationRef.set({
    type,
    data,
    timestamp: Date.now(),
    read: false
  });
}

// Mark notification as read
function markNotificationAsRead(notificationId) {
  database.ref(`notifications/${currentUser.id}/${notificationId}`).update({
    read: true
  });
  updateNotificationBadge();
}

// Listen for new notifications
database.ref(`notifications/${currentUser.id}`).on("value", snapshot => {
  updateNotificationBadge();
  updateNotificationDropdown(snapshot.val());
});

// Update notification badge
function updateNotificationBadge() {
  database.ref(`notifications/${currentUser.id}`).once("value", snapshot => {
    let unreadCount = 0;
    if (snapshot.exists()) {
      snapshot.forEach(childSnap => {
        if (!childSnap.val().read) {
          unreadCount++;
        }
      });
    }
    
    const badge = document.getElementById("notificationBadge");
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }
  });
}

// Update notification dropdown content
function updateNotificationDropdown(notifications) {
  const dropdown = document.getElementById("notificationList");
  dropdown.innerHTML = "";
  
  if (!notifications) {
    dropdown.innerHTML = '<div class="notification-item">No notifications</div>';
    return;
  }
  
  // Convert to array and sort by timestamp (newest first)
  const notificationsArray = Object.entries(notifications)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.timestamp - a.timestamp);
  
  if (notificationsArray.length === 0) {
    dropdown.innerHTML = '<div class="notification-item">No notifications</div>';
    return;
  }
  
  // Display notifications
  notificationsArray.slice(0, 5).forEach(notification => {
    const notifItem = document.createElement("div");
    notifItem.className = `notification-item ${notification.read ? '' : 'unread'}`;
    
    let message = '';
    if (notification.type === 'reply') {
      message = `<strong>${notification.data.fromUser}</strong> replied to your note "${notification.data.noteTitle}": "${notification.data.replyText}"`;
    } else if (notification.type === 'reaction') {
      const emojiMap = {
        like: '👍',
        love: '❤️',
        laugh: '😂',
        wow: '😮',
        sad: '😢'
      };
      const emoji = emojiMap[notification.data.reactionType] || '👍';
      message = `<strong>${notification.data.fromUser}</strong> reacted with ${emoji} to your note "${notification.data.noteTitle}"`;
    }
    
    notifItem.innerHTML = `
      <div class="notification-content">
        ${message}
        <div class="notification-time">${formatTime(notification.timestamp)}</div>
      </div>
      <button class="btn-close notification-close" data-notif-id="${notification.id}"></button>
    `;
    
    dropdown.appendChild(notifItem);
    
    // Add event listener for marking as read
    notifItem.querySelector('.notification-close').addEventListener('click', (e) => {
      e.stopPropagation();
      markNotificationAsRead(notification.id);
    });
    
    // Make the notification clickable to go to the note
    notifItem.addEventListener('click', () => {
      if (notification.data.noteId) {
        // Scroll to the note
        const noteElement = document.querySelector(`[data-note-id="${notification.data.noteId}"]`);
        if (noteElement) {
          noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          noteElement.classList.add('highlight-note');
          setTimeout(() => {
            noteElement.classList.remove('highlight-note');
          }, 2000);
        }
        
        // Mark as read
        markNotificationAsRead(notification.id);
        
        // Close dropdown
        document.getElementById('notificationDropdown').classList.remove('show');
      }
    });
  });
  
  // Add "View All" link if there are more notifications
  if (notificationsArray.length > 5) {
    const viewAll = document.createElement("div");
    viewAll.className = "notification-view-all";
    viewAll.textContent = "View all notifications";
    dropdown.appendChild(viewAll);
  }
}

// Format timestamp to relative time
function formatTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
  
  const date = new Date(timestamp);
  return date.toLocaleDateString();
}

// Toggle profile editor
document.getElementById("profileButton").addEventListener("click", () => {
  const modal = document.getElementById("profileModal");
  modal.style.display = "block";
  document.getElementById("profileNameInput").value = currentUser.name;
  document.getElementById("currentProfilePic").src = currentUser.profilePic;
});

// Save profile changes
document.getElementById("saveProfileBtn").addEventListener("click", () => {
  const newName = document.getElementById("profileNameInput").value.trim();
  const selectedAvatar = document.querySelector('input[name="profilePic"]:checked').value;
  
  if (newName) {
    currentUser.name = newName;
    currentUser.profilePic = selectedAvatar;
    
    localStorage.setItem("userName", newName);
    localStorage.setItem("userProfilePic", selectedAvatar);
    
    document.getElementById("profileModal").style.display = "none";
    document.getElementById("currentUserName").textContent = newName;
    document.getElementById("userAvatar").src = selectedAvatar;
  }
});

// Close profile modal
document.querySelector(".close-modal").addEventListener("click", () => {
  document.getElementById("profileModal").style.display = "none";
});

// Toggle notification dropdown
notificationBell.addEventListener("click", () => {
  notificationDropdown.classList.toggle("show");
});

// Close notification dropdown when clicking outside
window.addEventListener("click", (event) => {
  if (!event.target.matches('#notificationBell') && !event.target.matches('#notificationBadge')) {
    if (notificationDropdown.classList.contains("show")) {
      notificationDropdown.classList.remove("show");
    }
  }
});

// Load notes from DB
database.ref("notes").on("value", snapshot => {
  notesContainer.innerHTML = "";
  snapshot.forEach(childSnap => {
    const noteId = childSnap.key;
    const noteData = childSnap.val();
    const { title, note, replies, reactions, userName, userProfilePic } = noteData;
    
    // Create card for each note
    const card = document.createElement("div");
    card.className = "card col-md-3 m-8 p-2";
    card.setAttribute("data-note-id", noteId);
    
    // Process reactions
    let reactionCounts = {
      like: 0, love: 0, laugh: 0, wow: 0, sad: 0
    };
    
    let userReactions = {
      like: false, love: false, laugh: false, wow: false, sad: false
    };
    
    if (reactions) {
      Object.keys(reactionCounts).forEach(reaction => {
        if (reactions[reaction]) {
          reactionCounts[reaction] = Object.keys(reactions[reaction]).length;
          userReactions[reaction] = reactions[reaction][currentUser.id] || false;
        }
      });
    }
    
    // Create reactions HTML
    const emojiMap = {
      like: '👍', love: '❤️', laugh: '😂', wow: '😮', sad: '😢'
    };
    
    let reactionsHTML = '<div class="reactions-bar mt-3 d-flex">';
    Object.keys(emojiMap).forEach(reaction => {
      const isActive = userReactions[reaction] ? 'active' : '';
      const count = reactionCounts[reaction] > 0 ? `<span class="reaction-count">${reactionCounts[reaction]}</span>` : '';
      reactionsHTML += `
        <button class="btn-reaction ${isActive}" data-reaction="${reaction}" data-note-id="${noteId}">
          ${emojiMap[reaction]} ${count}
        </button>
      `;
    });
    reactionsHTML += '</div>';
    
    // Create card content with replies
    let repliesHTML = '';
    if (replies) {
      repliesHTML = '<hr><h6 class="replies-title">Replies:</h6><div class="replies-container">';
      
      // Convert replies object to array and sort by timestamp
      const repliesArray = Object.entries(replies).map(([id, data]) => ({
        id,
        ...data
      }));
      
      repliesArray.sort((a, b) => a.timestamp - b.timestamp);
      
      // Generate HTML for each reply
      repliesArray.forEach(reply => {
        const replyProfilePic = reply.userProfilePic || 'default-avatar.png';
        const replyUserName = reply.userName || 'Anonymous';
        
        repliesHTML += `
          <div class="reply p-2 mb-2">
            <div class="d-flex align-items-start">
              <img src="${replyProfilePic}" alt="Profile" class="profile-pic-sm me-2">
              <div class="flex-grow-1">
                <div class="d-flex justify-content-between">
                  <strong>${replyUserName}</strong>
                  <small class="text-muted">${formatTime(reply.timestamp)}</small>
                </div>
                <p class="mb-1">${reply.text}</p>
              </div>
            </div>
          </div>
        `;
      });
      
      repliesHTML += '</div>';
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
    
    // Combine all HTML for the card
    card.innerHTML = `
      <div class="card-body">
        <div class="d-flex align-items-center mb-3">
          <img src="${userProfilePic || 'default-avatar.png'}" alt="Profile" class="profile-pic me-2">
          <div>
            <h6 class="mb-0">${userName || 'Anonymous'}</h6>
            <small class="text-muted">${formatTime(noteData.timestamp || Date.now())}</small>
          </div>
        </div>
        <h5 class="card-title">${title || "No Title"}</h5>
        <p class="card-text">${note}</p>
        ${reactionsHTML}
        ${repliesHTML}
        ${replyFormHTML}
      </div>
    `;
    
    // Append the card to the container
    notesContainer.appendChild(card);
    
    // Add event listeners to reaction buttons
    card.querySelectorAll('.btn-reaction').forEach(btn => {
      btn.addEventListener('click', () => {
        const reaction = btn.getAttribute('data-reaction');
        const noteId = btn.getAttribute('data-note-id');
        addReaction(noteId, reaction);
      });
    });
    
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

// Initialize user profile display
document.getElementById("currentUserName").textContent = currentUser.name;
document.getElementById("userAvatar").src = currentUser.profilePic;
