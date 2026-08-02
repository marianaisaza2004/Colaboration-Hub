import {
  auth,
  db,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "./firebase-init.js";

let currentUser = null;
onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

function renderView(container, id) {
  getDoc(doc(db, "resourceLinks", id))
    .catch(() => null)
    .then((snap) => {
    container.innerHTML = "";
    const data = snap && snap.exists() ? snap.data() : null;

    if (data && data.url) {
      const open = document.createElement("a");
      open.href = data.url;
      open.target = "_blank";
      open.rel = "noopener";
      open.textContent = "Open";
      container.appendChild(open);

      const edit = document.createElement("a");
      edit.href = "#";
      edit.style.marginLeft = "0.75rem";
      edit.textContent = "Edit link";
      edit.addEventListener("click", (e) => {
        e.preventDefault();
        renderForm(container, id, data.url);
      });
      container.appendChild(edit);
    } else {
      const add = document.createElement("a");
      add.href = "#";
      add.className = "pending";
      add.style.pointerEvents = "auto";
      add.style.cursor = "pointer";
      add.textContent = "+ Add link";
      add.addEventListener("click", (e) => {
        e.preventDefault();
        renderForm(container, id, "");
      });
      container.appendChild(add);
    }
  });
}

function renderForm(container, id, currentUrl) {
  container.innerHTML = "";

  const input = document.createElement("input");
  input.type = "url";
  input.placeholder = "https://...";
  input.value = currentUrl || "";
  input.className = "link-input";

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "btn-mini";
  saveBtn.textContent = "Save";
  saveBtn.addEventListener("click", async () => {
    const url = input.value.trim();
    if (!url) return;
    await setDoc(doc(db, "resourceLinks", id), {
      url,
      updatedByName: (currentUser && (currentUser.displayName || currentUser.email)) || "Unknown",
      updatedAt: serverTimestamp(),
    });
    renderView(container, id);
  });

  const cancelBtn = document.createElement("a");
  cancelBtn.href = "#";
  cancelBtn.style.marginLeft = "0.5rem";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", (e) => {
    e.preventDefault();
    renderView(container, id);
  });

  container.appendChild(input);
  container.appendChild(saveBtn);
  container.appendChild(cancelBtn);
  input.focus();
}

export function initLinkSlot(container, id) {
  renderView(container, id);
}

export function initLinkMirror(anchorEl, id) {
  getDoc(doc(db, "resourceLinks", id)).catch(() => null).then((snap) => {
    if (snap && snap.exists() && snap.data().url) {
      anchorEl.href = snap.data().url;
      anchorEl.target = "_blank";
      anchorEl.rel = "noopener";
      anchorEl.classList.remove("pending");
    }
  });
}
