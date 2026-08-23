import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
  doc,
  setDoc,
  serverTimestamp,
} from "./firebase-init.js";

const errorMsg = document.getElementById("authError");
const tabLogin = document.getElementById("tabLogin");
const tabSignup = document.getElementById("tabSignup");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

function showLogin() {
  tabLogin.classList.add("active");
  tabSignup.classList.remove("active");
  loginForm.style.display = "block";
  signupForm.style.display = "none";
  errorMsg.textContent = "";
}

function showSignup() {
  tabSignup.classList.add("active");
  tabLogin.classList.remove("active");
  signupForm.style.display = "block";
  loginForm.style.display = "none";
  errorMsg.textContent = "";
}

tabLogin.addEventListener("click", showLogin);
tabSignup.addEventListener("click", showSignup);
showLogin();

const ACCESS_CODE = "PorterAcademy2026";

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.textContent = "";
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const accessCode = document.getElementById("signupAccessCode").value.trim();

  if (!name || !email || !password || !accessCode) {
    errorMsg.textContent = "Please fill in name, email, password, and access code.";
    return;
  }
  if (password.length < 6) {
    errorMsg.textContent = "Password must be at least 6 characters.";
    return;
  }
  if (accessCode !== ACCESS_CODE) {
    errorMsg.textContent = "Incorrect access code.";
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, "users", cred.user.uid), {
      name,
      email,
      createdAt: serverTimestamp(),
    });
    goHome();
  } catch (err) {
    errorMsg.textContent = translateError(err.code);
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.textContent = "";
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    goHome();
  } catch (err) {
    errorMsg.textContent = translateError(err.code);
  }
});

function goHome() {
  const params = new URLSearchParams(window.location.search);
  window.location.href = params.get("next") || "index.html";
}

// If a session is already active (e.g. login.html was opened directly while
// logged in), skip the form and go straight into the site.
onAuthStateChanged(auth, (user) => {
  if (user) goHome();
});

function translateError(code) {
  const map = {
    "auth/email-already-in-use": "That email already has an account.",
    "auth/invalid-email": "Invalid email.",
    "auth/weak-password": "Password is too weak (minimum 6 characters).",
    "auth/user-not-found": "No account exists with that email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Incorrect email or password.",
  };
  return map[code] || "Something went wrong. Please try again.";
}
