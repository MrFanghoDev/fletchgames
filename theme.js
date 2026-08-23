/* Bascule clair/sombre -- même mécanisme que fletchlog/theme.js (lui
 * même repris de fletchtime/web/theme.js), clé localStorage adaptée.
 * Suit prefers-color-scheme par défaut, sauf choix explicite mémorisé.
 */

function initTheme() {
  const stocke = localStorage.getItem("fletchgames_theme");
  if (stocke === "light" || stocke === "dark") {
    document.documentElement.setAttribute("data-theme", stocke);
  }
  mettreAJourBoutonsTheme();
}

function setTheme(mode) {
  if (mode === "system") {
    document.documentElement.removeAttribute("data-theme");
    localStorage.removeItem("fletchgames_theme");
  } else {
    document.documentElement.setAttribute("data-theme", mode);
    localStorage.setItem("fletchgames_theme", mode);
  }
  mettreAJourBoutonsTheme();
}

function mettreAJourBoutonsTheme() {
  const actuel = localStorage.getItem("fletchgames_theme") || "system";
  document.querySelectorAll(".theme-btn").forEach((bouton) => {
    bouton.classList.toggle("active", bouton.dataset.theme === actuel);
  });
}

initTheme();
