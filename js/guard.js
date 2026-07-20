import { auth, onAuthStateChanged, signOut } from "./firebase-init.js";

const label = document.getElementById("currentUserLabel");
const logoutBtn = document.getElementById("logoutBtn");
const topbarUser = document.getElementById("topbarUser");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    const here = window.location.pathname.split("/").pop() || "index.html";
    window.location.href = "login.html?next=" + encodeURIComponent(here);
    return;
  }
  if (label) label.textContent = user.displayName || user.email;
  if (topbarUser) topbarUser.style.display = "flex";
  document.documentElement.classList.remove("gate-pending");
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => signOut(auth));
}
