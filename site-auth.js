import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export function watchAuth(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback({ user: null, profile: null });
      return;
    }
    let profile = null;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) profile = snap.data();
    } catch (err) {
      console.error("Failed to load profile", err);
    }
    callback({ user, profile });
  });
}

export function doSignOut() {
  return signOut(auth);
}

export function renderHeaderAuth(container, { user, profile }, { onSignOut } = {}) {
  if (!user) {
    container.innerHTML = `<a href="signin.html" class="btn-header-auth">Sign In</a>`;
    return;
  }
  const name = profile ? profile.firstName : user.email;
  const adminLink = profile && profile.role === "admin"
    ? `<a href="admin.html" class="btn-header-auth">Admin</a>`
    : "";
  container.innerHTML = `
    <span class="header-hello">Hi, ${escapeHtml(name)}</span>
    ${adminLink}
    <button type="button" class="btn-header-auth" id="site-sign-out-btn">Sign out</button>
  `;
  const btn = container.querySelector("#site-sign-out-btn");
  if (btn) {
    btn.addEventListener("click", async () => {
      await doSignOut();
      if (onSignOut) onSignOut();
    });
  }
}

export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}
