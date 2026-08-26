(function () {
  "use strict";

  const order = ["accessories", "skis", "snowboards", "footwear", "clothing"];
  const labels = {
    accessories: "Accessories",
    skis: "Skis",
    snowboards: "Snowboards",
    footwear: "Footwear",
    clothing: "Clothing",
  };

  const tabsBar = document.getElementById("category-tabs");
  const sections = Array.from(document.querySelectorAll(".category[data-tab]"));
  const prevBtn = document.getElementById("category-prev");
  const nextBtn = document.getElementById("category-next");
  const prevLabel = document.getElementById("category-prev-label");
  const nextLabel = document.getElementById("category-next-label");
  const catalogMain = document.getElementById("catalog");

  if (!tabsBar || sections.length === 0) return;

  function activate(tabId, opts) {
    opts = opts || {};
    const index = order.indexOf(tabId);
    if (index === -1) return;

    sections.forEach((sec) => {
      sec.hidden = sec.dataset.tab !== tabId;
    });

    tabsBar.querySelectorAll(".category-tab").forEach((btn) => {
      const isActive = btn.dataset.tabTarget === tabId;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    const prevId = order[index - 1];
    const nextId = order[index + 1];

    prevBtn.hidden = !prevId;
    nextBtn.hidden = !nextId;
    if (prevId) prevLabel.textContent = labels[prevId];
    if (nextId) nextLabel.textContent = labels[nextId];

    if (!opts.skipHash) {
      history.replaceState(null, "", `#${tabId}`);
    }
    if (opts.scrollToTabs && catalogMain) {
      catalogMain.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function currentTab() {
    const active = sections.find((sec) => !sec.hidden);
    return active ? active.dataset.tab : order[0];
  }

  tabsBar.querySelectorAll(".category-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      activate(btn.dataset.tabTarget, { scrollToTabs: true });
    });
  });

  prevBtn.addEventListener("click", () => {
    const idx = order.indexOf(currentTab());
    if (idx > 0) activate(order[idx - 1], { scrollToTabs: true });
  });

  nextBtn.addEventListener("click", () => {
    const idx = order.indexOf(currentTab());
    if (idx < order.length - 1) activate(order[idx + 1], { scrollToTabs: true });
  });

  const initialTab = order.includes(location.hash.slice(1)) ? location.hash.slice(1) : order[0];
  activate(initialTab, { skipHash: true });
})();
