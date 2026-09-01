(function () {
  "use strict";

  const itemCards = Array.from(document.querySelectorAll(".item-card"));

  // Reuse the product photo already on the card face as the header image
  // inside that card's "choose options" popup, instead of leaving it blank.
  // Most of these source photos have their subject in the upper portion of
  // the frame, so the CSS default crops toward the top — these two are
  // framed the other way (subject lower in the shot) and need overriding
  // or the crop shows mostly blank snow.
  const PHOTO_CROP_OVERRIDES = {
    "Snowboard": "center 68%",
    "Ski Sticks": "center 65%",
  };
  itemCards.forEach((card) => {
    const config = card.querySelector(".item-config");
    const sourceImg = card.querySelector(".item-media img");
    if (!config || !sourceImg) return;
    const photo = document.createElement("img");
    photo.className = "item-config-photo";
    photo.src = sourceImg.getAttribute("src");
    photo.alt = sourceImg.getAttribute("alt") || "";
    photo.loading = "lazy";
    const crop = PHOTO_CROP_OVERRIDES[card.dataset.name];
    if (crop) photo.style.objectPosition = crop;
    config.insertBefore(photo, config.firstChild);
  });

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
