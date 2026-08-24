/* Enregistrement du service worker -- copié du même fichier de
 * FletchLog (voir son CLAUDE.md pour le détail des choix), adapté à la
 * clé localStorage de langue de ce dépôt. Chaque page doit
 * l'enregistrer elle-même pour rester installable.
 */

if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("sw.js")
    .then((registration) => {
      const premiereInstallation = !navigator.serviceWorker.controller;

      registration.addEventListener("updatefound", () => {
        if (premiereInstallation) return;
        const nouveauWorker = registration.installing;
        if (!nouveauWorker) return;
        nouveauWorker.addEventListener("statechange", () => {
          if (nouveauWorker.state === "installed" && navigator.serviceWorker.controller) {
            afficherBanniereMiseAJour();
          }
        });
      });
    })
    .catch((erreur) => {
      console.warn("Enregistrement du service worker impossible :", erreur);
    });
}

function afficherBanniereMiseAJour() {
  if (document.getElementById("maj-banniere")) return;

  const lang = localStorage.getItem("fletchgames_lang") || "fr";
  const style = document.createElement("style");
  style.textContent = `
    #maj-banniere {
      position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;
      display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap;
      padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
      background: var(--gold); color: #1a1206; font-family: var(--font-ui, inherit);
      font-size: 13px; font-weight: 600;
    }
    #maj-banniere button {
      font: inherit; padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(0,0,0,0.3);
      background: rgba(255,255,255,0.3); color: inherit; cursor: pointer;
    }
  `;
  document.head.appendChild(style);

  const banniere = document.createElement("div");
  banniere.id = "maj-banniere";
  const span = document.createElement("span");
  span.textContent = t(lang, "majDisponible");
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.textContent = t(lang, "majRecharger");
  bouton.addEventListener("click", () => location.reload());
  banniere.append(span, bouton);
  document.body.appendChild(banniere);
}
