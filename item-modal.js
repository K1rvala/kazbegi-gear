(function () {
  "use strict";

  const backdrop = document.getElementById("item-modal-backdrop");
  if (!backdrop) return;

  let openConfig = null;

  function closeConfig() {
    if (!openConfig) return;
    openConfig.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    openConfig = null;
  }

  function openConfigFor(card) {
    const config = card.querySelector(".item-config");
    if (!config) return;
    if (openConfig && openConfig !== config) {
      openConfig.classList.remove("is-open");
    }

    const qtyInput = config.querySelector(".qty-input");
    const addBtn = config.querySelector(".item-config-done");
    if (qtyInput) {
      const max = card.dataset.stockMax !== undefined ? parseInt(card.dataset.stockMax, 10) || 0 : 1;
      const initialQty = Math.min(1, max);
      qtyInput.value = initialQty;
      if (addBtn) addBtn.disabled = initialQty <= 0;
    }

    config.classList.add("is-open");
    backdrop.classList.add("is-open");
    openConfig = config;
  }

  document.querySelectorAll(".item-trigger-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".item-card");
      if (card) openConfigFor(card);
    });
  });

  document.querySelectorAll(".item-config-close, .item-config-done").forEach((btn) => {
    btn.addEventListener("click", closeConfig);
  });

  backdrop.addEventListener("click", closeConfig);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeConfig();
  });
})();
