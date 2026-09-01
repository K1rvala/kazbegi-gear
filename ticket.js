(function () {
  "use strict";

  const daysInput = document.getElementById("rental-days");
  const ticketLines = document.getElementById("ticket-lines");
  const ticketTotalAmount = document.getElementById("ticket-total-amount");
  const reserveBtn = document.getElementById("reserve-btn");
  const confirmOverlay = document.getElementById("confirm-overlay");
  const confirmOrderCode = document.getElementById("confirm-order-code");
  const confirmSummary = document.getElementById("confirm-summary");
  const confirmClose = document.getElementById("confirm-close");

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  // Cart lines added before stock tracking existed (or before a given item
  // wired up its stock select) won't carry a stockRef. Recover it from the
  // option text so an already-populated cart still decrements correctly.
  function deriveStockRef(line) {
    if (line.stockRef) return line.stockRef;
    if (line.name === "Skis" && line.optionsText) {
      const match = line.optionsText.match(/Ski type:\s*([^·]+?)(?:\s*·|$)/);
      if (match) return { itemKey: "skis", type: match[1].trim() };
    }
    return null;
  }

  function render() {
    const state = window.CartStore.load();
    const cart = state.cart;
    const days = state.days;
    daysInput.value = days;

    let grandTotal = 0;
    const lineEls = [];

    cart.forEach((line) => {
      const lineTotal = line.price * line.qty * days;
      grandTotal += lineTotal;

      const imgSrc = (window.ITEM_IMAGES || {})[line.name];
      const thumb = imgSrc
        ? `<img class="ticket-line-thumb" src="${imgSrc}" alt="" loading="lazy">`
        : `<div class="ticket-line-thumb ticket-line-thumb-empty"></div>`;

      const el = document.createElement("div");
      el.className = "ticket-line";
      el.innerHTML = `
        ${thumb}
        <div class="ticket-line-content">
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
        </div>
      `;
      lineEls.push(el);
    });

    const { setCount, totalDiscount } = window.CartStore.computeFullSetDiscount(cart, days);
    grandTotal -= totalDiscount;

    ticketLines.innerHTML = "";
    if (cart.length === 0) {
      const empty = document.createElement("p");
      empty.className = "ticket-empty";
      empty.textContent = "No gear selected yet. Add items from the catalog.";
      ticketLines.appendChild(empty);
    } else {
      lineEls.forEach((el) => ticketLines.appendChild(el));
      if (setCount > 0) {
        const discountEl = document.createElement("div");
        discountEl.className = "ticket-line ticket-line-discount";
        discountEl.innerHTML = `
          <div class="ticket-line-content">
            <div class="ticket-line-top">
              <span class="ticket-line-name">Full set discount</span>
              <span class="ticket-line-amount">−${totalDiscount} GEL</span>
            </div>
            <div class="ticket-line-bottom">
              <span class="ticket-line-meta">${setCount} full ${setCount === 1 ? "set" : "sets"} at ${window.CartStore.FULL_SET_PRICE} GEL/day each</span>
            </div>
          </div>
        `;
        ticketLines.appendChild(discountEl);
      }
    }

    ticketTotalAmount.textContent = `${grandTotal} GEL`;
    reserveBtn.disabled = cart.length === 0;
  }

  document.querySelectorAll(".stepper-days .step-btn[data-days-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const state = window.CartStore.load();
      const next = clamp(state.days + parseInt(btn.dataset.daysStep, 10), 1, 30);
      window.CartStore.setDays(next);
    });
  });

  ticketLines.addEventListener("click", (e) => {
    const btn = e.target.closest(".step-btn[data-ticket-line]");
    if (!btn) return;
    const lineId = parseInt(btn.dataset.ticketLine, 10);
    const step = parseInt(btn.dataset.ticketStep, 10);
    window.CartStore.updateLineQty(lineId, step);
  });

  reserveBtn.addEventListener("click", async () => {
    if (!window.__currentUserProfile) {
      location.href = "signin.html";
      return;
    }
    if (reserveBtn.disabled) return;

    const state = window.CartStore.load();
    const cart = state.cart;
    const days = state.days;

    const orderItems = cart.map((line) => ({
      name: line.name,
      qty: line.qty,
      price: line.price,
      options: line.optionsText,
      lineTotal: line.price * line.qty * days,
      stockRef: deriveStockRef(line),
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
    const { setCount, totalDiscount } = window.CartStore.computeFullSetDiscount(cart, days);

    reserveBtn.disabled = true;
    try {
      if (typeof window.saveOrder !== "function") throw new Error("Order system not ready");
      const { orderCode } = await window.saveOrder({
        items: orderItems,
        days,
        paymentMethod,
        total: parseFloat(totalLabel) || 0,
        discount: setCount > 0 ? { fullSets: setCount, amount: totalDiscount } : null,
      });

      window.CartStore.clear();
      render();

      const discountNote =
        setCount > 0
          ? ` Full set discount applied (${setCount} ${setCount === 1 ? "set" : "sets"}, −${totalDiscount} GEL).`
          : "";

      confirmOrderCode.textContent = orderCode ? `Order ${orderCode}` : "";
      confirmSummary.textContent = `${greeting}${summaryParts.join(", ")} for ${days} day${days > 1 ? "s" : ""} — ${totalLabel}.${discountNote} Payment: ${paymentLabel}.`;
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

  window.addEventListener("kazbegi-cart-updated", render);
  render();
})();
