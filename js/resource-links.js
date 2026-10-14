import {
  auth,
  db,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "./firebase-init.js";

let currentUser = null;
onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

// Only plain web links are allowed: these links are shown to every member,
// so a "javascript:" or "data:" URL must never become a clickable href.
function isSafeUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function renderView(container, id, options) {
  const { addLabel, openLabel, removable } = options;

  getDoc(doc(db, "resourceLinks", id))
    .catch(() => null)
    .then((snap) => {
    container.innerHTML = "";
    const data = snap && snap.exists() ? snap.data() : null;

    if (data && data.url && isSafeUrl(data.url)) {
      const open = document.createElement("a");
      open.href = data.url;
      open.target = "_blank";
      open.rel = "noopener";
      open.textContent = openLabel;
      container.appendChild(open);

      const edit = document.createElement("a");
      edit.href = "#";
      edit.style.marginLeft = "0.75rem";
      edit.textContent = "Edit link";
      edit.addEventListener("click", (e) => {
        e.preventDefault();
        renderForm(container, id, data.url, options);
      });
      container.appendChild(edit);

      if (removable) {
        const remove = document.createElement("a");
        remove.href = "#";
        remove.style.marginLeft = "0.75rem";
        remove.textContent = "Remove";
        remove.addEventListener("click", async (e) => {
          e.preventDefault();
          if (!window.confirm("Remove this link? Everyone will stop seeing it.")) return;
          await deleteDoc(doc(db, "resourceLinks", id));
          renderView(container, id, options);
        });
        container.appendChild(remove);
      }
    } else {
      const add = document.createElement("a");
      add.href = "#";
      add.className = "pending";
      add.style.pointerEvents = "auto";
      add.style.cursor = "pointer";
      add.textContent = addLabel;
      add.addEventListener("click", (e) => {
        e.preventDefault();
        renderForm(container, id, "", options);
      });
      container.appendChild(add);
    }
  });
}

function renderForm(container, id, currentUrl, options) {
  container.innerHTML = "";

  const input = document.createElement("input");
  input.type = "url";
  input.placeholder = "https://...";
  input.value = currentUrl || "";
  input.className = "link-input";

  const errorEl = document.createElement("span");
  errorEl.className = "error-msg";
  errorEl.style.margin = "0";

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "btn-mini";
  saveBtn.textContent = "Save";
  saveBtn.addEventListener("click", async () => {
    const url = input.value.trim();
    if (!url) return;
    if (!isSafeUrl(url)) {
      errorEl.textContent = "Enter a full link starting with https://";
      return;
    }
    await setDoc(doc(db, "resourceLinks", id), {
      url,
      updatedByName: (currentUser && (currentUser.displayName || currentUser.email)) || "Unknown",
      updatedAt: serverTimestamp(),
    });
    renderView(container, id, options);
  });

  const cancelBtn = document.createElement("a");
  cancelBtn.href = "#";
  cancelBtn.style.marginLeft = "0.5rem";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", (e) => {
    e.preventDefault();
    renderView(container, id, options);
  });

  container.appendChild(input);
  container.appendChild(saveBtn);
  container.appendChild(cancelBtn);
  container.appendChild(errorEl);
  input.focus();
}

// options: { addLabel, openLabel, removable } — all optional.
export function initLinkSlot(container, id, options = {}) {
  renderView(container, id, {
    addLabel: options.addLabel || "+ Add link",
    openLabel: options.openLabel || "Open",
    removable: Boolean(options.removable),
  });
}

export function initLinkMirror(anchorEl, id) {
  getDoc(doc(db, "resourceLinks", id)).catch(() => null).then((snap) => {
    if (snap && snap.exists() && isSafeUrl(snap.data().url)) {
      anchorEl.href = snap.data().url;
      anchorEl.target = "_blank";
      anchorEl.rel = "noopener";
      anchorEl.classList.remove("pending");
    }
  });
}
