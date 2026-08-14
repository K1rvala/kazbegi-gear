import { auth } from "./firebase-init.js";
import { ADMIN_EMAIL } from "./firebase-config.js";
import { watchAuth, renderHeaderAuth } from "./site-auth.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const headerAuth = document.getElementById("header-auth");
watchAuth((state) => renderHeaderAuth(headerAuth, state));

function friendlyError(err) {
  const code = err && err.code ? err.code : "";
  const map = {
    "auth/invalid-email": "That doesn't look like a valid email address.",
    "auth/wrong-password": "Incorrect email or password.",
    "auth/user-not-found": "Incorrect email or password.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/too-many-requests": "Too many attempts — please wait a moment and try again.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

const signinForm = document.getElementById("signin-form");
signinForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("signin-error");
  errorEl.hidden = true;
  const email = document.getElementById("signin-email").value.trim();
  const password = document.getElementById("signin-password").value;
  const submitBtn = document.getElementById("signin-submit");
  submitBtn.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    location.href = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? "admin.html" : "index.html";
  } catch (err) {
    errorEl.textContent = friendlyError(err);
    errorEl.hidden = false;
    submitBtn.disabled = false;
  }
});
