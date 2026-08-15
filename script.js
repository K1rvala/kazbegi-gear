(function () {
  "use strict";

  const itemCards = Array.from(document.querySelectorAll(".item-card"));
  const daysInput = document.getElementById("rental-days");
  const ticketLines = document.getElementById("ticket-lines");
  const ticketTotalAmount = document.getElementById("ticket-total-amount");
  const reserveBtn = document.getElementById("reserve-btn");
  const confirmOverlay = document.getElementById("confirm-overlay");
  const confirmSummary = document.getElementById("confirm-summary");
  const confirmClose = document.getElementById("confirm-close");

  let cart = [];
  let nextLineId = 1;

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function stepQty(input, delta, min, max) {
    const next = clamp(parseInt(input.value, 10) + delta, min, max);
    input.value = next;
    return next;
  }

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
      const total = cart.filter((line) => line.name === name).reduce((sum, line) => sum + line.qty, 0);
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

    function syncAddBtn() {
      if (addBtn) addBtn.disabled = (parseInt(qtyInput.value, 10) || 0) <= 0;
    }

    card.querySelectorAll(".step-btn[data-step]").forEach((btn) => {
      btn.addEventListener("click", () => {
        stepQty(qtyInput, parseInt(btn.dataset.step, 10), 0, 10);
        syncAddBtn();
      });
    });

    if (addBtn) {
      addBtn.addEventListener("click", () => {
        const qty = parseInt(qtyInput.value, 10) || 0;
        if (qty <= 0) return;

        const name = card.dataset.name;
        const price = parseFloat(card.dataset.price);
        const optionsText = describeOptions(card);

        const existing = cart.find((line) => line.name === name && line.optionsText === optionsText);
        if (existing) {
          existing.qty += qty;
        } else {
          cart.push({ id: nextLineId++, name, price, optionsText, qty });
        }

        qtyInput.value = 0;
        syncAddBtn();
        updateBadges();
        renderCart();
      });
    }
  });

  document.querySelectorAll(".stepper-days .step-btn[data-days-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      stepQty(daysInput, parseInt(btn.dataset.daysStep, 10), 1, 30);
      renderCart();
    });
  });

  ticketLines.addEventListener("click", (e) => {
    const btn = e.target.closest(".step-btn[data-ticket-line]");
    if (!btn) return;
    const lineId = parseInt(btn.dataset.ticketLine, 10);
    const step = parseInt(btn.dataset.ticketStep, 10);
    const line = cart.find((l) => l.id === lineId);
    if (!line) return;

    line.qty = clamp(line.qty + step, 0, 10);
    if (line.qty <= 0) {
      cart = cart.filter((l) => l.id !== lineId);
    }
    updateBadges();
    renderCart();
  });

  function renderCart() {
    const days = clamp(parseInt(daysInput.value, 10) || 1, 1, 30);
    let grandTotal = 0;
    const lineEls = [];

    cart.forEach((line) => {
      const lineTotal = line.price * line.qty * days;
      grandTotal += lineTotal;

      const el = document.createElement("div");
      el.className = "ticket-line";
      el.innerHTML = `
        <div class="ticket-line-top">
          <span class="ticket-line-name">${line.name}</span>
          <span class="ticket-line-amount">${lineTotal} GEL</span>
        </div>
        <div class="ticket-line-bottom">
          <span class="ticket-line-meta">${line.optionsText || `${line.price} GEL/day`}</span>
          <div class="stepper stepper-sm">
            <button type="button" class="step-btn" data-ticket-line="${line.id}" data-ticket-step="-1">–</button>
            <span class="ticket-line-qty">${line.qty}</span>
            <button type="button" class="step-btn" data-ticket-line="${line.id}" data-ticket-step="1">+</button>
          </div>
        </div>
      `;
      lineEls.push(el);
    });

    ticketLines.innerHTML = "";
    if (cart.length === 0) {
      const empty = document.createElement("p");
      empty.className = "ticket-empty";
      empty.textContent = "No gear selected yet. Add items from the list.";
      ticketLines.appendChild(empty);
    } else {
      lineEls.forEach((el) => ticketLines.appendChild(el));
    }

    ticketTotalAmount.textContent = `${grandTotal} GEL`;
    reserveBtn.disabled = cart.length === 0;
  }

  reserveBtn.addEventListener("click", async () => {
    if (!window.__currentUserProfile) {
      location.href = "signin.html";
      return;
    }
    if (reserveBtn.disabled) return;

    const days = clamp(parseInt(daysInput.value, 10) || 1, 1, 30);
    const orderItems = cart.map((line) => ({
      name: line.name,
      qty: line.qty,
      price: line.price,
      options: line.optionsText,
      lineTotal: line.price * line.qty * days,
    }));
    const summaryParts = cart.map(
      (line) => `${line.qty} × ${line.name}${line.optionsText ? ` (${line.optionsText})` : ""}`
    );

    const paymentInput = document.querySelector('input[name="payment-method"]:checked');
    const paymentMethod = paymentInput ? paymentInput.value : "cashier";
    const paymentLabel = paymentMethod === "online" ? "Card online" : "Cash or card at cashier";
    const totalLabel = ticketTotalAmount.textContent;
    const profile = window.__currentUserProfile;
    const greeting = profile ? `${profile.firstName} ${profile.lastName} — ` : "";

    reserveBtn.disabled = true;
    try {
      if (typeof window.saveOrder !== "function") throw new Error("Order system not ready");
      await window.saveOrder({ items: orderItems, days, paymentMethod, total: parseFloat(totalLabel) || 0 });

      cart = [];
      daysInput.value = 1;
      updateBadges();
      renderCart();

      confirmSummary.textContent = `${greeting}${summaryParts.join(", ")} for ${days} day${days > 1 ? "s" : ""} — ${totalLabel}. Payment: ${paymentLabel}.`;
      confirmOverlay.classList.add("is-open");
    } catch (err) {
      console.error(err);
      renderCart();
      alert("Something went wrong placing your reservation. Please try again.");
    }
  });

  confirmClose.addEventListener("click", () => {
    confirmOverlay.classList.remove("is-open");
  });
  confirmOverlay.addEventListener("click", (e) => {
    if (e.target === confirmOverlay) confirmOverlay.classList.remove("is-open");
  });

  updateBadges();
  renderCart();
})();
