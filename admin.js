import { db } from "./firebase-init.js";
import { watchAuth, renderHeaderAuth, escapeHtml } from "./site-auth.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const headerAuth = document.getElementById("header-auth");
const statusEl = document.getElementById("admin-status");
const contentEl = document.getElementById("admin-content");
const countEl = document.getElementById("admin-count");
const tbody = document.getElementById("admin-table-body");

function formatDate(ts) {
  if (!ts || typeof ts.toDate !== "function") return "—";
  return ts.toDate().toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

watchAuth(async (state) => {
  renderHeaderAuth(headerAuth, state, {
    onSignOut: () => (location.href = "index.html"),
  });

  const { user, profile } = state;

  if (!user) {
    location.href = "auth.html";
    return;
  }

  if (!profile || profile.role !== "admin") {
    statusEl.textContent = "You don't have access to this page.";
    return;
  }

  statusEl.hidden = true;
  contentEl.hidden = false;

  try {
    const snap = await getDocs(collection(db, "users"));
    const rows = [];
    snap.forEach((docSnap) => rows.push(docSnap.data()));
    rows.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    countEl.textContent = `${rows.length} registered ${rows.length === 1 ? "user" : "users"}`;

    tbody.innerHTML = rows
      .map(
        (r) => `
      <tr>
        <td>${escapeHtml(r.firstName)} ${escapeHtml(r.lastName)}</td>
        <td>${escapeHtml(r.phone)}</td>
        <td>${escapeHtml(r.email)}</td>
        <td><span class="role-badge role-${r.role === "admin" ? "admin" : "user"}">${escapeHtml(r.role)}</span></td>
        <td>${formatDate(r.createdAt)}</td>
        <td>${r.consentAccepted ? "Yes · " + formatDate(r.consentAt) : "No"}</td>
      </tr>
    `
      )
      .join("");
  } catch (err) {
    console.error(err);
    contentEl.hidden = true;
    statusEl.hidden = false;
    statusEl.textContent = "Couldn't load registered users. Please try again later.";
  }
});
