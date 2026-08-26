import { watchAuth, renderHeaderAuth } from "./site-auth.js";

const headerAuth = document.getElementById("header-auth");
const authGate = document.getElementById("ticket-auth-gate");
const checkoutArea = document.getElementById("ticket-checkout");

watchAuth((state) => {
  renderHeaderAuth(headerAuth, state, {
    onSignOut: () => location.reload(),
  });

  const { user, profile } = state;
  window.__currentUserProfile = profile;

  if (!user) {
    authGate.hidden = false;
    checkoutArea.hidden = true;
  } else {
    authGate.hidden = true;
    checkoutArea.hidden = false;
  }
});
