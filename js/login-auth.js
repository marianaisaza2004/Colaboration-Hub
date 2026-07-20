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

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.textContent = "";
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;

  if (!name || !email || !password) {
    errorMsg.textContent = "Completa nombre, correo y clave.";
    return;
  }
  if (password.length < 6) {
    errorMsg.textContent = "La clave debe tener al menos 6 caracteres.";
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

// Si ya hay una sesión activa (ej. abriste login.html directamente estando
// logueado), no te deja ver el formulario, te manda al sitio.
onAuthStateChanged(auth, (user) => {
  if (user) goHome();
});

function translateError(code) {
  const map = {
    "auth/email-already-in-use": "Ese correo ya tiene una cuenta.",
    "auth/invalid-email": "Correo inválido.",
    "auth/weak-password": "La clave es muy débil (mínimo 6 caracteres).",
    "auth/user-not-found": "No existe una cuenta con ese correo.",
    "auth/wrong-password": "Clave incorrecta.",
    "auth/invalid-credential": "Correo o clave incorrectos.",
  };
  return map[code] || "Ocurrió un error. Intenta de nuevo.";
}
