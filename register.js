import { auth, db } from "./firebase-init.js";
import { ADMIN_EMAIL } from "./firebase-config.js";
import { watchAuth, renderHeaderAuth } from "./site-auth.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const headerAuth = document.getElementById("header-auth");
watchAuth((state) => renderHeaderAuth(headerAuth, state));

function friendlyError(err) {
  const code = err && err.code ? err.code : "";
  const map = {
    "auth/email-already-in-use": "That email is already registered — try signing in instead.",
    "auth/invalid-email": "That doesn't look like a valid email address.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts — please wait a moment and try again.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

const consentCheckbox = document.getElementById("signup-consent");
const signupSubmit = document.getElementById("signup-submit");
consentCheckbox.addEventListener("change", () => {
  signupSubmit.disabled = !consentCheckbox.checked;
});

const signupForm = document.getElementById("signup-form");
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("signup-error");
  errorEl.hidden = true;

  const firstName = document.getElementById("signup-firstname").value.trim();
  const lastName = document.getElementById("signup-lastname").value.trim();
  const phone = document.getElementById("signup-phone").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const password2 = document.getElementById("signup-password2").value;

  if (!consentCheckbox.checked) {
    errorEl.textContent = "Please confirm you understand how your data is used before continuing.";
    errorEl.hidden = false;
    return;
  }
  if (password !== password2) {
    errorEl.textContent = "Passwords don't match.";
    errorEl.hidden = false;
    return;
  }

  const submitBtn = document.getElementById("signup-submit");
  submitBtn.disabled = true;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const role = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? "admin" : "user";
    await setDoc(doc(db, "users", cred.user.uid), {
      firstName,
      lastName,
      phone,
      email,
      role,
      consentAccepted: true,
      consentAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
    location.href = role === "admin" ? "admin.html" : "index.html";
  } catch (err) {
    errorEl.textContent = friendlyError(err);
    errorEl.hidden = false;
    submitBtn.disabled = !consentCheckbox.checked;
  }
});
