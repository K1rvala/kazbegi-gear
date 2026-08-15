import { auth } from "./firebase-init.js";
import { watchAuth, renderHeaderAuth } from "./site-auth.js";
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const headerAuth = document.getElementById("header-auth");
watchAuth((state) => renderHeaderAuth(headerAuth, state));

const params = new URLSearchParams(window.location.search);
const oobCode = params.get("oobCode");
const mode = params.get("mode");

const checkingEl = document.getElementById("reset-checking");
const invalidEl = document.getElementById("reset-invalid");
const formWrapEl = document.getElementById("reset-form-wrap");
const successEl = document.getElementById("reset-success");
const emailLabelEl = document.getElementById("reset-email-label");
const form = document.getElementById("reset-form");
const errorEl = document.getElementById("reset-error");

const SUCCESS_KEY = "kazbegi-reset-success-code";

function showInvalid() {
  checkingEl.hidden = true;
  invalidEl.hidden = false;
}

function showSuccess() {
  checkingEl.hidden = true;
  formWrapEl.hidden = true;
  successEl.hidden = false;
}

async function init() {
  // If this exact link already succeeded once in this browser (e.g. the page
  // was reloaded, or the same email link was opened a second time), the
  // reset code is now used up - show success again instead of "expired".
  if (oobCode && sessionStorage.getItem(SUCCESS_KEY) === oobCode) {
    showSuccess();
    return;
  }

  if (mode !== "resetPassword" || !oobCode) {
    showInvalid();
    return;
  }
  try {
    const email = await verifyPasswordResetCode(auth, oobCode);
    emailLabelEl.textContent = email;
    checkingEl.hidden = true;
    formWrapEl.hidden = false;
  } catch (err) {
    showInvalid();
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.hidden = true;

  const password = document.getElementById("reset-password").value;
  const password2 = document.getElementById("reset-password2").value;

  if (password !== password2) {
    errorEl.textContent = "Passwords don't match.";
    errorEl.hidden = false;
    return;
  }

  const submitBtn = document.getElementById("reset-submit");
  submitBtn.disabled = true;

  try {
    await confirmPasswordReset(auth, oobCode, password);
    sessionStorage.setItem(SUCCESS_KEY, oobCode);
    showSuccess();
  } catch (err) {
    const code = err && err.code;
    const map = {
      "auth/expired-action-code": "This reset link has expired. Please request a new one.",
      "auth/invalid-action-code": "This reset link is invalid or has already been used.",
      "auth/weak-password": "Password should be at least 6 characters.",
    };
    errorEl.textContent = map[code] || "Something went wrong. Please try again.";
    errorEl.hidden = false;
    submitBtn.disabled = false;
  }
});

init();
