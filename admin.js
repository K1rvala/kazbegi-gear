import { db } from "./firebase-init.js";
import { watchAuth, renderHeaderAuth, escapeHtml } from "./site-auth.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  increment,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const headerAuth = document.getElementById("header-auth");
const statusEl = document.getElementById("admin-status");
const contentEl = document.getElementById("admin-content");
const countEl = document.getElementById("admin-count");
const tbody = document.getElementById("admin-table-body");
const ordersCountEl = document.getElementById("orders-count");
const ordersBody = document.getElementById("orders-table-body");

// New gear items go here — the admin form and the on-site stock display
// (see stock.js) both key off itemKey/type, so anything added here just
// needs a matching data-stock-select="<itemKey>" select on the item card.
const STOCK_ITEMS = {
  skis: {
    label: "Skis",
    types: ["Good for beginners", "Intermediate", "Expert", "All-Mountain", "Off-Piste"],
  },
};

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function stockDocId(itemKey, type) {
  return `${itemKey}__${slugify(type)}`;
}

const stockForm = document.getElementById("stock-form");
const stockItemSelect = document.getElementById("stock-item-select");
const stockTypeSelect = document.getElementById("stock-type-select");
const stockTypeLabel = document.getElementById("stock-type-label");
const stockQtyInput = document.getElementById("stock-qty-input");
const stockErrorEl = document.getElementById("stock-error");
const stockBody = document.getElementById("stock-table-body");

let stockRows = [];
let stockAdminInitialized = false;

function populateStockItemSelect() {
  stockItemSelect.innerHTML = Object.entries(STOCK_ITEMS)
    .map(([key, item]) => `<option value="${escapeHtml(key)}">${escapeHtml(item.label)}</option>`)
    .join("");
  populateStockTypeSelect();
}

function populateStockTypeSelect() {
  const item = STOCK_ITEMS[stockItemSelect.value];
  if (!item) return;
  stockTypeLabel.textContent = `${item.label.replace(/s$/, "")} type`;
  stockTypeSelect.innerHTML = item.types
    .map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`)
    .join("");
}

function renderStockTable() {
  stockRows.sort((a, b) => a.itemLabel.localeCompare(b.itemLabel) || a.type.localeCompare(b.type));
  stockBody.innerHTML = stockRows
    .map(
      (r) => `
    <tr>
      <td>${escapeHtml(r.itemLabel)}</td>
      <td>${escapeHtml(r.type)}</td>
      <td>${r.quantity}</td>
      <td class="stock-row-actions">
        <button type="button" class="stepper-sm-btn" data-stock-adjust="-1" data-stock-id="${r.id}">−</button>
        <button type="button" class="stepper-sm-btn" data-stock-adjust="1" data-stock-id="${r.id}">+</button>
        <button type="button" class="stock-remove-btn" data-stock-remove="${r.id}">Remove</button>
      </td>
    </tr>
  `
    )
    .join("");
}

async function loadStock() {
  const snap = await getDocs(collection(db, "stock"));
  stockRows = [];
  snap.forEach((docSnap) => stockRows.push({ id: docSnap.id, ...docSnap.data() }));
  renderStockTable();
}

async function adjustStock(id, delta) {
  const row = stockRows.find((r) => r.id === id);
  if (!row) return;
  const nextQty = Math.max(0, row.quantity + delta);
  await setDoc(
    doc(db, "stock", id),
    { quantity: nextQty, updatedAt: serverTimestamp() },
    { merge: true }
  );
  row.quantity = nextQty;
  renderStockTable();
}

async function removeStock(id) {
  await deleteDoc(doc(db, "stock", id));
  stockRows = stockRows.filter((r) => r.id !== id);
  renderStockTable();
}

function initStockAdmin() {
  if (stockAdminInitialized) {
    loadStock().catch((err) => console.error(err));
    return;
  }
  stockAdminInitialized = true;

  populateStockItemSelect();
  stockItemSelect.addEventListener("change", populateStockTypeSelect);

  stockForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    stockErrorEl.hidden = true;

    const itemKey = stockItemSelect.value;
    const item = STOCK_ITEMS[itemKey];
    const type = stockTypeSelect.value;
    const qty = parseInt(stockQtyInput.value, 10);
    if (!item || !type || !qty || qty <= 0) return;

    const id = stockDocId(itemKey, type);
    try {
      await setDoc(
        doc(db, "stock", id),
        {
          itemKey,
          itemLabel: item.label,
          type,
          quantity: increment(qty),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      stockQtyInput.value = 1;
      await loadStock();
    } catch (err) {
      console.error(err);
      stockErrorEl.hidden = false;
      stockErrorEl.textContent = "Couldn't update stock. Please try again.";
    }
  });

  stockBody.addEventListener("click", (e) => {
    const adjustBtn = e.target.closest("[data-stock-adjust]");
    if (adjustBtn) {
      adjustStock(adjustBtn.dataset.stockId, parseInt(adjustBtn.dataset.stockAdjust, 10));
      return;
    }
    const removeBtn = e.target.closest("[data-stock-remove]");
    if (removeBtn) {
      removeStock(removeBtn.dataset.stockRemove);
    }
  });

  loadStock().catch((err) => {
    console.error(err);
    stockErrorEl.hidden = false;
    stockErrorEl.textContent = "Couldn't load stock. Please try again later.";
  });
}

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

  initStockAdmin();

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
