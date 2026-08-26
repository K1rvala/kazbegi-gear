(function () {
  "use strict";

  const KEY = "kazbegiCart";
  const FULL_SET_PRICE = 50;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { cart: [], days: 1, nextLineId: 1 };
      const parsed = JSON.parse(raw);
      return {
        cart: Array.isArray(parsed.cart) ? parsed.cart : [],
        days: parsed.days || 1,
        nextLineId: parsed.nextLineId || 1,
      };
    } catch (e) {
      return { cart: [], days: 1, nextLineId: 1 };
    }
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("kazbegi-cart-updated"));
  }

  function addLine(name, price, optionsText, qty) {
    const state = load();
    const existing = state.cart.find((l) => l.name === name && l.optionsText === optionsText);
    if (existing) {
      existing.qty += qty;
    } else {
      state.cart.push({ id: state.nextLineId++, name, price, optionsText, qty });
    }
    save(state);
    return state;
  }

  function updateLineQty(id, delta) {
    const state = load();
    const line = state.cart.find((l) => l.id === id);
    if (!line) return state;
    line.qty = Math.min(10, Math.max(0, line.qty + delta));
    if (line.qty <= 0) {
      state.cart = state.cart.filter((l) => l.id !== id);
    }
    save(state);
    return state;
  }

  function setDays(days) {
    const state = load();
    state.days = Math.min(30, Math.max(1, days));
    save(state);
    return state;
  }

  function clear() {
    const state = load();
    state.cart = [];
    state.days = 1;
    save(state);
    return state;
  }

  function getCount() {
    return load().cart.reduce((sum, l) => sum + l.qty, 0);
  }

  function getCountForName(name) {
    return load()
      .cart.filter((l) => l.name === name)
      .reduce((sum, l) => sum + l.qty, 0);
  }

  // A "full set" is skis+ski boots+glasses+helmet (or the snowboard
  // equivalent), discounted to a flat FULL_SET_PRICE per day. Quantities are
  // matched up so multiple complete sets each get the discount, while any
  // unmatched leftover items still price normally.
  function computeFullSetDiscount(cart, days) {
    function qtyOf(name) {
      return cart.filter((line) => line.name === name).reduce((sum, line) => sum + line.qty, 0);
    }
    function priceOf(name) {
      const line = cart.find((l) => l.name === name);
      return line ? line.price : 0;
    }

    const candidates = [
      {
        type: "Ski",
        pairs: Math.min(qtyOf("Skis"), qtyOf("Ski Boots")),
        setPrice: priceOf("Skis") + priceOf("Ski Boots") + priceOf("Ski Glasses") + priceOf("Helmet"),
      },
      {
        type: "Snowboard",
        pairs: Math.min(qtyOf("Snowboard"), qtyOf("Snowboard Boots")),
        setPrice: priceOf("Snowboard") + priceOf("Snowboard Boots") + priceOf("Ski Glasses") + priceOf("Helmet"),
      },
    ].filter((c) => c.pairs > 0);

    let sharedPool = Math.min(qtyOf("Ski Glasses"), qtyOf("Helmet"));
    candidates.sort((a, b) => (b.setPrice - FULL_SET_PRICE) - (a.setPrice - FULL_SET_PRICE));

    let setCount = 0;
    let perDaySavings = 0;

    candidates.forEach((c) => {
      if (sharedPool <= 0) return;
      const formed = Math.min(c.pairs, sharedPool);
      if (formed <= 0) return;
      const saving = Math.max(0, c.setPrice - FULL_SET_PRICE);
      setCount += formed;
      perDaySavings += formed * saving;
      sharedPool -= formed;
    });

    return { setCount, totalDiscount: perDaySavings * days };
  }

  function refreshHeaderBadge() {
    const badge = document.getElementById("header-cart-badge");
    if (!badge) return;
    const count = getCount();
    badge.textContent = count;
    badge.hidden = count <= 0;
  }

  window.addEventListener("kazbegi-cart-updated", refreshHeaderBadge);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refreshHeaderBadge);
  } else {
    refreshHeaderBadge();
  }

  window.CartStore = {
    FULL_SET_PRICE,
    load,
    save,
    addLine,
    updateLineQty,
    setDays,
    clear,
    getCount,
    getCountForName,
    computeFullSetDiscount,
  };
})();
