import { watchAuth, renderHeaderAuth } from "./site-auth.js";

const headerAuth = document.getElementById("header-auth");

watchAuth((state) => {
  renderHeaderAuth(headerAuth, state, {
    onSignOut: () => location.reload(),
  });
});
