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

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function stepQty(input, delta, min, max) {
    const next = clamp(parseInt(input.value, 10) + delta, min, max);
    input.value = next;
    render();
  }

  itemCards.forEach((card) => {
    const qtyInput = card.querySelector(".qty-input");
    card.querySelectorAll(".step-btn[data-step]").forEach((btn) => {
      btn.addEventListener("click", () => {
        stepQty(qtyInput, parseInt(btn.dataset.step, 10), 0, 10);
      });
    });
    card.querySelectorAll(".option-select, .switch input").forEach((el) => {
      el.addEventListener("change", render);
    });
  });

  document.querySelectorAll(".stepper-days .step-btn[data-days-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      stepQty(daysInput, parseInt(btn.dataset.daysStep, 10), 1, 30);
    });
  });

  ticketLines.addEventListener("click", (e) => {
    const btn = e.target.closest(".step-btn[data-ticket-target]");
    if (!btn) return;
    const target = document.getElementById(btn.dataset.ticketTarget);
    if (!target) return;
    stepQty(target, parseInt(btn.dataset.ticketStep, 10), 0, 10);
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

  function render() {
    const days = clamp(parseInt(daysInput.value, 10) || 1, 1, 30);
    let grandTotal = 0;
    let anyQty = false;
    const lineEls = [];

    itemCards.forEach((card) => {
      const qty = parseInt(card.querySelector(".qty-input").value, 10) || 0;

      const badge = card.querySelector(".item-trigger-badge");
      if (badge) {
        badge.textContent = qty;
        badge.hidden = qty <= 0;
      }

      if (qty <= 0) return;
      anyQty = true;

      const name = card.dataset.name;
      const price = parseFloat(card.dataset.price);
      const lineTotal = price * qty * days;
      grandTotal += lineTotal;

      const optionsText = describeOptions(card);
      const qtyInputId = card.querySelector(".qty-input").id;

      const line = document.createElement("div");
      line.className = "ticket-line";
      line.innerHTML = `
        <div class="ticket-line-top">
          <span class="ticket-line-name">${name}</span>
          <span class="ticket-line-amount">${lineTotal} GEL</span>
        </div>
        <div class="ticket-line-bottom">
          <span class="ticket-line-meta">${optionsText || `${price} GEL/day`}</span>
          <div class="stepper stepper-sm">
            <button type="button" class="step-btn" data-ticket-target="${qtyInputId}" data-ticket-step="-1">–</button>
            <span class="ticket-line-qty">${qty}</span>
            <button type="button" class="step-btn" data-ticket-target="${qtyInputId}" data-ticket-step="1">+</button>
          </div>
        </div>
      `;
      lineEls.push(line);
    });

    ticketLines.innerHTML = "";
    if (!anyQty) {
      const empty = document.createElement("p");
      empty.className = "ticket-empty";
      empty.textContent = "No gear selected yet. Add items from the list.";
      ticketLines.appendChild(empty);
    } else {
      lineEls.forEach((el) => ticketLines.appendChild(el));
    }

    ticketTotalAmount.textContent = `${grandTotal} GEL`;
    reserveBtn.disabled = !anyQty;
  }

  reserveBtn.addEventListener("click", async () => {
    if (!window.__currentUserProfile) {
      location.href = "signin.html";
      return;
    }
    if (reserveBtn.disabled) return;

    const days = clamp(parseInt(daysInput.value, 10) || 1, 1, 30);
    const orderItems = [];
    const summaryParts = [];

    itemCards.forEach((card) => {
      const qty = parseInt(card.querySelector(".qty-input").value, 10) || 0;
      if (qty <= 0) return;
      const name = card.dataset.name;
      const price = parseFloat(card.dataset.price);
      orderItems.push({
        name,
        qty,
        price,
        options: describeOptions(card),
        lineTotal: price * qty * days,
      });
      summaryParts.push(`${qty} × ${name}`);
    });

    const paymentInput = document.querySelector('input[name="payment-method"]:checked');
    const paymentMethod = paymentInput ? paymentInput.value : "cashier";
    const paymentLabel = paymentMethod === "online" ? "Card online" : "Cash or card at cashier";
    const total = parseFloat(ticketTotalAmount.textContent) || 0;
    const totalLabel = ticketTotalAmount.textContent;
    const profile = window.__currentUserProfile;
    const greeting = profile ? `${profile.firstName} ${profile.lastName} — ` : "";

    reserveBtn.disabled = true;
    try {
      if (typeof window.saveOrder !== "function") throw new Error("Order system not ready");
      await window.saveOrder({ items: orderItems, days, paymentMethod, total });

      itemCards.forEach((card) => {
        card.querySelector(".qty-input").value = 0;
      });
      daysInput.value = 1;
      render();

      confirmSummary.textContent = `${greeting}${summaryParts.join(", ")} for ${days} day${days > 1 ? "s" : ""} — ${totalLabel}. Payment: ${paymentLabel}.`;
      confirmOverlay.classList.add("is-open");
    } catch (err) {
      console.error(err);
      render();
      alert("Something went wrong placing your reservation. Please try again.");
    }
  });

  confirmClose.addEventListener("click", () => {
    confirmOverlay.classList.remove("is-open");
  });
  confirmOverlay.addEventListener("click", (e) => {
    if (e.target === confirmOverlay) confirmOverlay.classList.remove("is-open");
  });

  render();
})();
