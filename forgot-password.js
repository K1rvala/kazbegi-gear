import { auth } from "./firebase-init.js";
import { watchAuth, renderHeaderAuth } from "./site-auth.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const headerAuth = document.getElementById("header-auth");
watchAuth((state) => renderHeaderAuth(headerAuth, state));

const form = document.getElementById("forgot-form");
const errorEl = document.getElementById("forgot-error");
const successEl = document.getElementById("forgot-success");
const submitBtn = document.getElementById("forgot-submit");

function showSentState() {
  form.hidden = true;
  successEl.hidden = false;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.hidden = true;

  const email = document.getElementById("forgot-email").value.trim();
  submitBtn.disabled = true;

  const resetUrl = new URL("reset-password.html", window.location.href).href;

  try {
    await sendPasswordResetEmail(auth, email, { url: resetUrl });
    showSentState();
  } catch (err) {
    const code = err && err.code;
    if (code === "auth/user-not-found") {
      // Don't reveal whether an account exists for this email.
      showSentState();
      return;
    }
    if (code === "auth/invalid-email") {
      errorEl.textContent = "That doesn't look like a valid email address.";
    } else if (code === "auth/too-many-requests") {
      errorEl.textContent = "Too many attempts — please wait a moment and try again.";
    } else {
      errorEl.textContent = "Something went wrong. Please try again.";
    }
    errorEl.hidden = false;
    submitBtn.disabled = false;
  }
});
