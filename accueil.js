/* Page d'accueil -- un seul carrousel de jeux (cliquer une carte lance
 * la partie), chaque carte combinant sa présentation ET ses
 * statistiques (palmarès, record, participant le plus assidu). Deux
 * carrousels séparés existaient avant (retour utilisateur, 2026-08-25)
 * mais la synchronisation entre les deux ne suivait jamais fidèlement
 * un vrai balayage tactile malgré deux tentatives de correction -- un
 * seul carrousel élimine le problème à la racine plutôt que de
 * continuer à le corriger.
 *
 * Tout est recalculé depuis storage.js à chaque chargement -- pas de
 * cache, le volume de données reste minuscule (usage club, pas de gros
 * historique).
 */
import { listerJeux } from "./moteur/jeux/index.js";

let currentLanguage = localStorage.getItem("fletchgames_lang") || "fr";

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(currentLanguage, el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    el.setAttribute("aria-label", t(currentLanguage, el.getAttribute("data-i18n-aria-label")));
  });
  document.getElementById("lang-fr-btn").classList.toggle("active", currentLanguage === "fr");
  document.getElementById("lang-en-btn").classList.toggle("active", currentLanguage === "en");
  document.documentElement.lang = currentLanguage;
}

function nomJeu(jeu) {
  return jeu.nom[currentLanguage] || jeu.nom.fr;
}

function presentationJeu(jeu) {
  return jeu.presentation[currentLanguage] || jeu.presentation.fr;
}

// Agrège victoires/participations/record depuis l'historique brut d'un
// jeu -- regroupé par NOM (pas par id d'équipe, recomposée à chaque
// partie, voir storage.js) : deux parties où "Julie" a joué compte
// pour la même personne côté palmarès, même si l'id d'équipe diffère.
function calculerStats(parties) {
  const victoires = new Map();
  const participations = new Map();
  let record = null;

  for (const partie of parties) {
    for (const entree of partie.classement || []) {
      participations.set(entree.nom, (participations.get(entree.nom) || 0) + 1);
      if (entree.rang === 1) {
        victoires.set(entree.nom, (victoires.get(entree.nom) || 0) + 1);
      }
    }
    for (const manche of partie.manches || []) {
      if (!record || manche.points > record.points) {
        const participant = (partie.classement || []).find((p) => p.id === manche.participantId);
        record = { points: manche.points, nom: participant ? participant.nom : "?" };
      }
    }
  }

  const podium = [...victoires.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const assidu = [...participations.entries()].sort((a, b) => b[1] - a[1])[0] || null;

  return { podium, record, assidu, total: parties.length };
}

function pluralisePartie(n) {
  return `${n} ${t(currentLanguage, n === 1 ? "accueilPartieSing" : "accueilPartiePlur")}`;
}

function ajouterStats(carte, stats) {
  if (stats.total === 0) {
    const vide = document.createElement("p");
    vide.className = "stat-ligne";
    vide.textContent = t(currentLanguage, "accueilAucunePartie");
    carte.appendChild(vide);
    return;
  }

  if (stats.podium.length > 0) {
    const podiumTitre = document.createElement("p");
    podiumTitre.className = "stat-ligne";
    podiumTitre.innerHTML = `<strong>${t(currentLanguage, "accueilPodiumTitre")}</strong>`;
    carte.appendChild(podiumTitre);

    const podiumDiv = document.createElement("div");
    podiumDiv.className = "podium";
    const medailles = ["🥇", "🥈", "🥉"];
    stats.podium.forEach(([nom, victoires], index) => {
      const ligne = document.createElement("div");
      ligne.className = "podium-ligne";
      const rang = document.createElement("span");
      rang.className = "podium-rang";
      rang.textContent = medailles[index];
      const nomSpan = document.createElement("span");
      nomSpan.className = "podium-nom";
      nomSpan.textContent = nom;
      const victoiresSpan = document.createElement("span");
      victoiresSpan.className = "podium-victoires";
      victoiresSpan.textContent = String(victoires);
      ligne.append(rang, nomSpan, victoiresSpan);
      podiumDiv.appendChild(ligne);
    });
    carte.appendChild(podiumDiv);
  }

  if (stats.record) {
    const record = document.createElement("p");
    record.className = "stat-ligne";
    record.textContent = `${t(currentLanguage, "accueilRecordTitre")} : `;
    const strong = document.createElement("strong");
    strong.textContent = `${stats.record.points} ${t(currentLanguage, "accueilRecordPoints")}`;
    record.appendChild(strong);
    record.append(` ${t(currentLanguage, "accueilRecordPar")} ${stats.record.nom}`);
    carte.appendChild(record);
  }

  if (stats.assidu) {
    const [nomAssidu, nbParties] = stats.assidu;
    const assidu = document.createElement("p");
    assidu.className = "stat-ligne";
    assidu.textContent = `${t(currentLanguage, "accueilStatAssidu")} `;
    const strong = document.createElement("strong");
    strong.textContent = nomAssidu;
    assidu.appendChild(strong);
    assidu.append(` (${nbParties} ${t(currentLanguage, "accueilStatAssiduSuffixe")})`);
    carte.appendChild(assidu);
  }
}

async function construireCarrouselJeux() {
  const conteneur = document.getElementById("carrousel-jeux");
  conteneur.innerHTML = "";
  for (const jeu of listerJeux()) {
    const parties = await listerParties(jeu.id);
    const stats = calculerStats(parties);

    const carte = document.createElement("button");
    carte.type = "button";
    carte.className = "carrousel-carte jeu-carte historique-carte";

    const titre = document.createElement("h3");
    titre.textContent = nomJeu(jeu);
    const presentation = document.createElement("p");
    presentation.className = "jeu-presentation";
    presentation.textContent = presentationJeu(jeu);
    const historique = document.createElement("p");
    historique.className = "jeu-historique-mini";
    historique.textContent = pluralisePartie(parties.length);
    carte.append(titre, presentation, historique);

    ajouterStats(carte, stats);

    carte.addEventListener("click", () => {
      location.href = `jouer.html?jeu=${encodeURIComponent(jeu.id)}`;
    });
    conteneur.appendChild(carte);
  }
}

// ---- Jeu au hasard -------------------------------------------------------
// Retour utilisateur -- un bouton qui fait défiler rapidement le
// carrousel puis ralentit et s'arrête sur un jeu tiré au sort, comme
// une roulette. Reste sur place une fois arrêté -- ne lance pas la
// partie automatiquement, un tap sur la carte suffit ensuite (même
// geste que d'habitude).
function positionCarte(conteneur, carte) {
  return carte.getBoundingClientRect().left - conteneur.getBoundingClientRect().left + conteneur.scrollLeft;
}

function attendre(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tirerJeuAuHasard() {
  const conteneur = document.getElementById("carrousel-jeux");
  const cartes = Array.from(conteneur.children);
  if (cartes.length < 2) return;

  const bouton = document.getElementById("bouton-jeu-hasard");
  bouton.disabled = true;

  const indexDepart = cartes.findIndex((carte) => Math.abs(positionCarte(conteneur, carte) - conteneur.scrollLeft) < 4);
  const indexCible = Math.floor(Math.random() * cartes.length);
  const tours = 3; // nombre de tours complets avant de s'arrêter, pour l'effet roulette
  const totalEtapes = tours * cartes.length + ((indexCible - Math.max(indexDepart, 0) + cartes.length) % cartes.length);

  for (let etape = 1; etape <= totalEtapes; etape++) {
    const index = (Math.max(indexDepart, 0) + etape) % cartes.length;
    conteneur.scrollTo({ left: positionCarte(conteneur, cartes[index]), behavior: "auto" });
    const progression = etape / totalEtapes;
    await attendre(50 + progression * progression * 260);
  }

  bouton.disabled = false;
}

window.setLanguage = function setLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem("fletchgames_lang", lang);
  applyTranslations();
  construireCarrouselJeux();
};

applyTranslations();
construireCarrouselJeux();
document.getElementById("bouton-jeu-hasard").addEventListener("click", tirerJeuAuHasard);
