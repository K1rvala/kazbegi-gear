(function () {
  "use strict";

  const itemCards = Array.from(document.querySelectorAll(".item-card"));

  function describeOptions(card) {
    const parts = [];
    card.querySelectorAll(".option-select").forEach((select) => {
      const labelEl = card.querySelector(`label[for="${select.id}"]`);
      const label = labelEl ? labelEl.textContent : "";
      parts.push(`${label}: ${select.value}`);
    });
    const curved = card.querySelector('input[type="checkbox"]');
    if (curved) {
      parts.push(curved.checked ? "Curved shaft" : "Straight shaft");
    }
    return parts.join(" · ");
  }

  function updateBadges() {
    itemCards.forEach((card) => {
      const name = card.dataset.name;
      const total = window.CartStore.getCountForName(name);
      const badge = card.querySelector(".item-trigger-badge");
      if (badge) {
        badge.textContent = total;
        badge.hidden = total <= 0;
      }
    });
  }

  // Per-card staging controls: the qty stepper inside each popup only tracks
  // "how many of this exact configuration to add" until "Add to cart" is pressed.
  itemCards.forEach((card) => {
    const qtyInput = card.querySelector(".qty-input");
    const addBtn = card.querySelector(".item-config-done");

    function stockMax() {
      return card.dataset.stockMax !== undefined ? parseInt(card.dataset.stockMax, 10) || 0 : 10;
    }

    function syncAddBtn() {
      if (addBtn) addBtn.disabled = (parseInt(qtyInput.value, 10) || 0) <= 0;
    }

    card.querySelectorAll(".step-btn[data-step]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const delta = parseInt(btn.dataset.step, 10);
        const max = Math.min(10, stockMax());
        const next = Math.min(max, Math.max(0, (parseInt(qtyInput.value, 10) || 0) + delta));
        qtyInput.value = next;
        syncAddBtn();
      });
    });

    if (qtyInput) {
      qtyInput.addEventListener("change", syncAddBtn);
    }

    if (addBtn) {
      addBtn.addEventListener("click", () => {
        const qty = parseInt(qtyInput.value, 10) || 0;
        if (qty <= 0) return;

        const name = card.dataset.name;
        const price = parseFloat(card.dataset.price);
        const optionsText = describeOptions(card);
        const stockSelect = card.querySelector("[data-stock-select]");
        const stockRef = stockSelect
          ? { itemKey: stockSelect.dataset.stockSelect, type: stockSelect.value }
          : null;

        window.CartStore.addLine(name, price, optionsText, qty, stockRef);

        qtyInput.value = 0;
        syncAddBtn();
        updateBadges();
      });
    }
  });

  window.addEventListener("kazbegi-cart-updated", updateBadges);
  updateBadges();
})();
