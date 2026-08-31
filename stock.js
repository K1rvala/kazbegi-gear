import { db } from "./firebase-init.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

(async function () {
  const selects = Array.from(document.querySelectorAll("select[data-stock-select]"));
  if (selects.length === 0) return;

  const stockMap = {};
  try {
    const snap = await getDocs(collection(db, "stock"));
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      stockMap[`${data.itemKey}::${data.type}`] = data.quantity || 0;
    });
  } catch (err) {
    console.error("Failed to load stock", err);
  }

  selects.forEach((select) => {
    const itemKey = select.dataset.stockSelect;
    const card = select.closest(".item-card");
    const note = select.closest(".option-row").querySelector("[data-stock-note]");
    if (!card) return;
    const qtyInput = card.querySelector(".qty-input");

    function refresh() {
      const qty = stockMap[`${itemKey}::${select.value}`] || 0;
      card.dataset.stockMax = qty;

      if (note) {
        note.textContent = qty > 0 ? `${qty} in stock` : "Out of stock";
        note.classList.toggle("stock-note-empty", qty <= 0);
      }

      if (qtyInput) {
        qtyInput.value = Math.min(parseInt(qtyInput.value, 10) || 0, qty);
      }

      const addBtn = card.querySelector(".item-config-done");
      if (addBtn && qtyInput) {
        addBtn.disabled = (parseInt(qtyInput.value, 10) || 0) <= 0;
      }
    }

    select.addEventListener("change", refresh);
    refresh();
  });
})();
