import {
  auth,
  db,
  onAuthStateChanged,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "./firebase-init.js";

const messagesEl = document.getElementById("messages");
const chatTitleEl = document.getElementById("chatTitle");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const usersListEl = document.getElementById("usersList");
const groupChannelBtn = document.getElementById("groupChannelBtn");

let currentUser = null;
let unsubscribeMessages = null;
let activeChannel = { type: "group" };

function renderMessages(docs) {
  messagesEl.innerHTML = "";
  docs.forEach((d) => {
    const m = d.data();
    const mine = currentUser && m.senderUid === currentUser.uid;
    const div = document.createElement("div");
    div.className = "msg" + (mine ? " mine" : "");
    const time = m.createdAt && m.createdAt.toDate ? m.createdAt.toDate().toLocaleString() : "";
    div.innerHTML = `<div class="meta">${escapeHtml(m.senderName || "User")} · ${time}</div>${escapeHtml(m.text || "")}`;
    messagesEl.appendChild(div);
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function privateChatId(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

function subscribeToGroup() {
  if (unsubscribeMessages) unsubscribeMessages();
  chatTitleEl.textContent = "Group chat";
  const q = query(collection(db, "groupMessages"), orderBy("createdAt", "asc"));
  unsubscribeMessages = onSnapshot(q, (snap) => renderMessages(snap.docs));
}

function subscribeToPrivate(otherUid, otherName) {
  if (unsubscribeMessages) unsubscribeMessages();
  chatTitleEl.textContent = "Private: " + otherName;
  const chatId = privateChatId(currentUser.uid, otherUid);
  const q = query(collection(db, "privateChats", chatId, "messages"), orderBy("createdAt", "asc"));
  unsubscribeMessages = onSnapshot(q, (snap) => renderMessages(snap.docs));
}

groupChannelBtn.addEventListener("click", () => {
  activeChannel = { type: "group" };
  setActiveSidebarItem(groupChannelBtn);
  subscribeToGroup();
});

function setActiveSidebarItem(el) {
  document.querySelectorAll(".chat-channel-item, .chat-user-item").forEach((n) => n.classList.remove("active"));
  el.classList.add("active");
}

async function loadUsers() {
  usersListEl.innerHTML = "";
  const snap = await getDocs(collection(db, "users"));
  snap.forEach((d) => {
    if (d.id === currentUser.uid) return;
    const u = d.data();
    const item = document.createElement("div");
    item.className = "chat-user-item";
    item.textContent = u.name || u.email;
    item.addEventListener("click", () => {
      activeChannel = { type: "private", uid: d.id, name: u.name || u.email };
      setActiveSidebarItem(item);
      subscribeToPrivate(d.id, u.name || u.email);
    });
    usersListEl.appendChild(item);
  });
}

messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !currentUser) return;
  messageInput.value = "";

  const senderName = currentUser.displayName || currentUser.email;

  if (activeChannel.type === "group") {
    await addDoc(collection(db, "groupMessages"), {
      text,
      senderUid: currentUser.uid,
      senderName,
      createdAt: serverTimestamp(),
    });
  } else {
    const chatId = privateChatId(currentUser.uid, activeChannel.uid);
    await setDoc(
      doc(db, "privateChats", chatId),
      { participants: [currentUser.uid, activeChannel.uid] },
      { merge: true }
    );
    await addDoc(collection(db, "privateChats", chatId, "messages"), {
      text,
      senderUid: currentUser.uid,
      senderName,
      createdAt: serverTimestamp(),
    });
  }
});

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    activeChannel = { type: "group" };
    subscribeToGroup();
    loadUsers();
  } else if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }
});
