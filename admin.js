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
const ordersCountEl = document.getElementById("orders-count");
const ordersBody = document.getElementById("orders-table-body");

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
    location.href = "signin.html";
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
    return;
  }

  try {
    const ordersSnap = await getDocs(collection(db, "orders"));
    const orders = [];
    ordersSnap.forEach((docSnap) => orders.push(docSnap.data()));
    orders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    ordersCountEl.textContent = `${orders.length} ${orders.length === 1 ? "order" : "orders"}`;

    ordersBody.innerHTML = orders
      .map((o) => {
        const itemsText = (o.items || [])
          .map((i) => `${i.qty} × ${escapeHtml(i.name)}${i.options ? ` (${escapeHtml(i.options)})` : ""}`)
          .join(", ");
        const paymentLabel = o.paymentMethod === "online" ? "Card online" : "Cash / card at cashier";
        const discountNote = o.discount
          ? `<br><span class="order-discount-note">−${o.discount.amount} GEL (${o.discount.fullSets} full ${o.discount.fullSets === 1 ? "set" : "sets"})</span>`
          : "";
        return `
      <tr>
        <td><span class="order-code">${escapeHtml(o.orderCode || "—")}</span></td>
        <td>${escapeHtml(o.customerName)}</td>
        <td>${escapeHtml(o.customerPhone)}</td>
        <td class="admin-cell-wrap">${itemsText}</td>
        <td>${o.days}</td>
        <td>${paymentLabel}</td>
        <td>${o.total} GEL${discountNote}</td>
        <td>${formatDate(o.createdAt)}</td>
      </tr>
    `;
      })
      .join("");
  } catch (err) {
    console.error(err);
    ordersCountEl.textContent = "Couldn't load orders.";
  }
});
