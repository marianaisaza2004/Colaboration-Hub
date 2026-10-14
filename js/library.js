import {
  auth,
  db,
  storage,
  onAuthStateChanged,
  collection,
  addDoc,
  doc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "./firebase-init.js";

const CATEGORIES = [
  "Document",
  "Article",
  "Presentation",
  "Data & Spreadsheet",
  "Video",
  "Link",
  "Other",
];

// Direct file uploads need Firebase Storage (Blaze plan) to be enabled for the project.
// Until then the library is links-only. To turn uploads on: enable Storage, publish
// storage.rules, and set this to true.
const FILE_UPLOADS_ENABLED = false;

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [
  "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx",
  "csv", "txt", "md", "png", "jpg", "jpeg", "zip",
];

const form = document.getElementById("shareForm");
const titleInput = document.getElementById("itemTitle");
const fileInput = document.getElementById("itemFile");
const urlInput = document.getElementById("itemUrl");
const categorySelect = document.getElementById("itemCategory");
const descriptionInput = document.getElementById("itemDescription");
const fileField = document.getElementById("fileField");
const linkField = document.getElementById("linkField");
const shareBtn = document.getElementById("shareBtn");
const progressEl = document.getElementById("uploadProgress");
const messageEl = document.getElementById("shareMsg");
const listEl = document.getElementById("libraryList");
const countEl = document.getElementById("libraryCount");
const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterCategory");

let currentUser = null;
let allItems = [];
let unsubscribeItems = null;
let categoryTouched = false;

// ---- helpers -------------------------------------------------------------

function isSafeUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function extensionOf(name) {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function suggestCategory(fileName) {
  const ext = extensionOf(fileName);
  if (["ppt", "pptx"].includes(ext)) return "Presentation";
  if (["xls", "xlsx", "csv"].includes(ext)) return "Data & Spreadsheet";
  if (["pdf", "doc", "docx", "txt", "md"].includes(ext)) return "Document";
  return "Other";
}

function setMessage(text, kind) {
  messageEl.textContent = text || "";
  messageEl.style.color = kind === "ok" ? "#0a7c66" : "";
}

function selectedKind() {
  if (!FILE_UPLOADS_ENABLED) return "link";
  return form.querySelector('input[name="kind"]:checked').value;
}

function applyKindVisibility() {
  const isFile = selectedKind() === "file";
  document.getElementById("kindToggle").hidden = !FILE_UPLOADS_ENABLED;
  fileField.hidden = !isFile;
  linkField.hidden = isFile;
}

// ---- form setup ----------------------------------------------------------

function fillSelect(select, options, withAll) {
  select.innerHTML = "";
  if (withAll) {
    const all = document.createElement("option");
    all.value = "";
    all.textContent = "All categories";
    select.appendChild(all);
  }
  options.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

fillSelect(categorySelect, CATEGORIES, false);
fillSelect(filterSelect, CATEGORIES, true);

categorySelect.addEventListener("change", () => {
  categoryTouched = true;
});

form.querySelectorAll('input[name="kind"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    applyKindVisibility();
    if (!categoryTouched) categorySelect.value = selectedKind() === "file" ? "Document" : "Link";
  });
});

applyKindVisibility();

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file && !categoryTouched) categorySelect.value = suggestCategory(file.name);
});

// ---- upload --------------------------------------------------------------

function uploadFile(file, path, onProgress) {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref(storage, path), file);
    task.on(
      "state_changed",
      (snap) => onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => {
        try {
          resolve(await getDownloadURL(task.snapshot.ref));
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMessage("");

  if (!currentUser) {
    setMessage("You need to be signed in to share.");
    return;
  }

  const title = titleInput.value.trim();
  const kind = selectedKind();
  if (!title) {
    setMessage("Give it a title so other Fellows can find it.");
    titleInput.focus();
    return;
  }

  let file = null;
  let linkUrl = "";
  if (kind === "file") {
    file = fileInput.files[0];
    if (!file) {
      setMessage("Choose a file to upload.");
      return;
    }
    if (!ALLOWED_EXTENSIONS.includes(extensionOf(file.name))) {
      setMessage("That file type isn't supported. Try PDF, Word, PowerPoint, Excel, CSV, text, an image, or a zip.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setMessage("That file is over 25 MB. Share it as a link instead (for example a Google Drive link).");
      return;
    }
  } else {
    linkUrl = urlInput.value.trim();
    if (!isSafeUrl(linkUrl)) {
      setMessage("Enter a full link starting with https://");
      urlInput.focus();
      return;
    }
  }

  shareBtn.disabled = true;
  const item = {
    title,
    description: descriptionInput.value.trim(),
    category: categorySelect.value,
    kind,
    uploadedByUid: currentUser.uid,
    uploadedByName: currentUser.displayName || currentUser.email || "Fellow",
    createdAt: serverTimestamp(),
  };

  try {
    if (kind === "file") {
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const storagePath = `library/${currentUser.uid}/${Date.now()}-${safeName}`;
      progressEl.hidden = false;
      progressEl.value = 0;
      item.url = await uploadFile(file, storagePath, (pct) => {
        progressEl.value = pct;
      });
      item.fileName = file.name;
      item.fileSize = file.size;
      item.storagePath = storagePath;
    } else {
      item.url = linkUrl;
    }

    await addDoc(collection(db, "libraryItems"), item);

    form.reset();
    categoryTouched = false;
    categorySelect.value = "Document";
    applyKindVisibility();
    setMessage("Shared! Other Fellows can see it now.", "ok");
  } catch (err) {
    console.error(err);
    if (kind === "file") {
      setMessage(
        "The file couldn't be uploaded" +
          (err && err.code ? ` (${err.code})` : "") +
          ". If this keeps happening, share it as a link instead (for example a Google Drive link)."
      );
    } else {
      setMessage("Couldn't share that link" + (err && err.code ? ` (${err.code})` : "") + ". Please try again.");
    }
  } finally {
    shareBtn.disabled = false;
    progressEl.hidden = true;
  }
});

// ---- list ----------------------------------------------------------------

function matchesFilters(item) {
  const category = filterSelect.value;
  if (category && item.category !== category) return false;

  const term = searchInput.value.trim().toLowerCase();
  if (!term) return true;
  const haystack = [item.title, item.description, item.uploadedByName, item.fileName, item.category]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(term);
}

function buildItem(item) {
  const row = document.createElement("article");
  row.className = "library-item";

  const main = document.createElement("div");
  main.className = "library-item-main";

  const title = document.createElement("h3");
  title.className = "library-item-title";
  if (isSafeUrl(item.url)) {
    const a = document.createElement("a");
    a.href = item.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = item.title;
    title.appendChild(a);
  } else {
    title.textContent = item.title;
  }
  main.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "library-item-meta";

  const tag = document.createElement("span");
  tag.className = "library-tag";
  tag.textContent = item.category || "Other";
  meta.appendChild(tag);

  const detail = document.createElement("span");
  if (item.kind === "file") {
    detail.textContent = [item.fileName, formatSize(item.fileSize)].filter(Boolean).join(" · ");
  } else {
    detail.textContent = hostOf(item.url);
  }
  meta.appendChild(detail);

  const who = document.createElement("span");
  const when = item.createdAt && item.createdAt.toDate ? item.createdAt.toDate().toLocaleDateString() : "";
  who.textContent = ["Shared by " + (item.uploadedByName || "a Fellow"), when].filter(Boolean).join(" · ");
  meta.appendChild(who);
  main.appendChild(meta);

  if (item.description) {
    const desc = document.createElement("p");
    desc.className = "library-item-desc";
    desc.textContent = item.description;
    main.appendChild(desc);
  }

  const actions = document.createElement("div");
  actions.className = "actions library-item-actions";

  if (isSafeUrl(item.url)) {
    const open = document.createElement("a");
    open.href = item.url;
    open.target = "_blank";
    open.rel = "noopener";
    open.textContent = item.kind === "file" ? "View / Download" : "Open link";
    actions.appendChild(open);
  }

  if (currentUser && item.uploadedByUid === currentUser.uid) {
    const remove = document.createElement("a");
    remove.href = "#";
    remove.textContent = "Delete";
    remove.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!window.confirm(`Delete "${item.title}" from the library? Other Fellows will no longer see it.`)) return;
      try {
        await deleteDoc(doc(db, "libraryItems", item.id));
        if (item.storagePath) {
          await deleteObject(ref(storage, item.storagePath)).catch(() => {});
        }
      } catch (err) {
        console.error(err);
        window.alert("Couldn't delete that item. Please try again.");
      }
    });
    actions.appendChild(remove);
  }

  row.appendChild(main);
  row.appendChild(actions);
  return row;
}

function renderList() {
  const visible = allItems.filter(matchesFilters);
  listEl.innerHTML = "";

  countEl.textContent = allItems.length
    ? visible.length === allItems.length
      ? `(${allItems.length})`
      : `(${visible.length} of ${allItems.length})`
    : "";

  if (!allItems.length) {
    const empty = document.createElement("p");
    empty.className = "note";
    empty.textContent = "Nothing has been shared yet. Be the first to add something above.";
    listEl.appendChild(empty);
    return;
  }

  if (!visible.length) {
    const none = document.createElement("p");
    none.className = "note";
    none.textContent = "No materials match your search.";
    listEl.appendChild(none);
    return;
  }

  visible.forEach((item) => listEl.appendChild(buildItem(item)));
}

searchInput.addEventListener("input", renderList);
filterSelect.addEventListener("change", renderList);

function subscribe() {
  if (unsubscribeItems) unsubscribeItems();
  const q = query(collection(db, "libraryItems"), orderBy("createdAt", "desc"));
  unsubscribeItems = onSnapshot(
    q,
    (snap) => {
      allItems = snap.docs.map((d) => ({
        id: d.id,
        ...d.data({ serverTimestamps: "estimate" }),
      }));
      renderList();
    },
    (err) => {
      console.error(err);
      listEl.innerHTML = "";
      const p = document.createElement("p");
      p.className = "error-msg";
      p.textContent = "Couldn't load the library right now. Please refresh the page.";
      listEl.appendChild(p);
    }
  );
}

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    subscribe();
  } else if (unsubscribeItems) {
    unsubscribeItems();
    unsubscribeItems = null;
  }
});
