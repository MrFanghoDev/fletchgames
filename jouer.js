/* Page de jeu -- écran règles, mise en place (participants), déroulé de
 * la partie, puis résultat final. Un seul module pour les 4 écrans :
 * pas de routage, juste des <section> qu'on montre/masque (voir
 * jouer.html, .ecran[hidden]).
 *
 * Deux modeSaisie câblés ici :
 * - "vainqueur-plus-valeur" (Pétanque) : on désigne le vainqueur de la
 *   manche, puis sa valeur parmi jeu.valeursPossibles(participant).
 *   Les autres participants ne saisissent rien pour cette manche.
 * - "score-chacun-son-tour" (Triangle) : CHAQUE participant saisit son
 *   propre score à tour de rôle (nombre libre, pas de plage prédéfinie
 *   -- jeu.valeursPossibles n'est pas utilisé dans ce mode). Une fois
 *   tous les scores connus, le(s) participant(s) au score le plus haut
 *   remportent la manche (appliquerManche reçoit saisie.gagnant).
 * - "perdant-de-la-manche" (Killer) : on désigne le(s) PERDANT(S) de la
 *   manche parmi les participants encore en vie (sélection multiple,
 *   boutons à bascule -- égalité possible), pas un vainqueur. Chaque
 *   participant encore en vie reçoit appliquerManche(etat,
 *   {perdant, numeroManche}), qu'il soit désigné ou non.
 * D'autres modes prévus au contrat du moteur (clavier fixe, boutons
 * fixes) seront ajoutés quand un jeu les utilisera réellement, pas
 * avant (voir CLAUDE.md, principe "pas de code pour un besoin
 * hypothétique").
 *
 * Individuel vs équipe (jeu.modesParticipant) -- un participant a
 * TOUJOURS la même forme côté moteur ({id, nom, joueurs:[...]}), que le
 * joueur ait choisi de jouer seul ou en équipe : en individuel,
 * `equipes` (le tableau ci-dessous, gardé sous ce nom même s'il
 * contient des joueurs seuls -- même structure, pas la peine de
 * dupliquer l'état) reçoit directement des participants à un seul
 * membre, sans étape de nommage d'équipe. Voir choisirMode() et
 * ajouterJoueurIndividuel().
 */
import { obtenirJeu } from "./moteur/jeux/index.js";

let currentLanguage = localStorage.getItem("fletchgames_lang") || "fr";

const params = new URLSearchParams(location.search);
const jeu = obtenirJeu(params.get("jeu"));

let etape = "regles"; // "regles" | "setup" | "jeu" | "fin"
let modeParticipant = null; // "individuel" | "equipe" -- choisi une fois par partie
let equipes = [];
let equipeEnCours = null;
let joueursConnus = [];
let etatsParParticipant = {};
let manches = [];
let vainqueurManche = null;
let classementFinal = null;

// "score-chacun-son-tour" (voir plus haut) -- état de la manche en
// cours de saisie : chaque participant répond l'un après l'autre.
let indexScoreCourant = 0;
let scoresMancheEnCours = {};

// "perdant-de-la-manche" (voir plus haut) -- numéro de la manche en
// cours (utilisé par killer.js pour dater le score d'un participant),
// et sélection en cours (ids des participants désignés perdants).
let numeroManche = 1;
let perdantsSelectionnes = new Set();

function nomJeu() {
  return jeu.nom[currentLanguage] || jeu.nom.fr;
}

function afficherEcran(id) {
  document.querySelectorAll(".ecran").forEach((el) => (el.hidden = el.id !== id));
}

// ---- Écran règles ------------------------------------------------------

function rendreRegles() {
  const liste = document.getElementById("regles-liste");
  liste.innerHTML = "";
  const regles = jeu.regles[currentLanguage] || jeu.regles.fr;
  for (const ligne of regles) {
    const li = document.createElement("li");
    li.textContent = ligne;
    liste.appendChild(li);
  }

  const section = document.getElementById("regles-variantes-section");
  const variantes = jeu.variantes ? jeu.variantes[currentLanguage] || jeu.variantes.fr : null;
  section.hidden = !variantes || variantes.length === 0;
  if (variantes) {
    const listeVariantes = document.getElementById("regles-variantes-liste");
    listeVariantes.innerHTML = "";
    for (const ligne of variantes) {
      const li = document.createElement("li");
      li.textContent = ligne;
      listeVariantes.appendChild(li);
    }
  }
}

// ---- Écran mise en place ------------------------------------------------

function choisirMode(mode) {
  modeParticipant = mode;
  equipes = [];
  equipeEnCours = null;
  rendreSetup();
}

function rendreSetup() {
  const choixDispo = jeu.modesParticipant.length > 1;

  if (choixDispo && !modeParticipant) {
    document.getElementById("mode-choix").hidden = false;
    document.getElementById("setup-corps").hidden = true;
    return;
  }
  document.getElementById("mode-choix").hidden = true;
  document.getElementById("setup-corps").hidden = false;

  const enEquipe = modeParticipant === "equipe";
  document.getElementById("setup-participants-titre").textContent = t(
    currentLanguage,
    enEquipe ? "setupEquipesEnregistrees" : "setupJoueursEnregistres"
  );
  document.getElementById("panel-nouvelle-equipe").hidden = !enEquipe;
  document.getElementById("panel-nouveau-joueur").hidden = enEquipe;
  document.getElementById("equipe-suivante").hidden = !enEquipe;

  // Le champ "flèches" (configParticipant) n'a de sens que pour les jeux
  // qui le déclarent (Pétanque) -- masqué entièrement pour les autres
  // (Triangle : configParticipant est null, chaque joueur n'a besoin
  // que de son nom). Voir moteur/jeux/<jeu>.js.
  const aConfigParticipant = !!jeu.configParticipant;
  document.getElementById("champ-fleches-coequipier-conteneur").hidden = !aConfigParticipant;
  document.getElementById("champ-fleches-joueur-conteneur").hidden = !aConfigParticipant;

  const liste = document.getElementById("equipes-liste");
  liste.innerHTML = "";
  for (const equipe of equipes) {
    const carte = document.createElement("div");
    carte.className = "equipe-carte";
    const titre = document.createElement("h3");
    titre.textContent = equipe.nom;
    carte.appendChild(titre);
    if (enEquipe) {
      for (const joueur of equipe.joueurs) {
        const ligne = document.createElement("div");
        ligne.className = "coequipier-ligne";
        const span = document.createElement("span");
        span.textContent = aConfigParticipant ? `${joueur.nom} (${joueur.fleches})` : joueur.nom;
        ligne.appendChild(span);
        carte.appendChild(ligne);
      }
    } else if (aConfigParticipant) {
      const sousTitre = document.createElement("div");
      sousTitre.className = "coequipier-ligne";
      const span = document.createElement("span");
      span.textContent = `${t(currentLanguage, "setupCoequipierFlechesLabel")} : ${equipe.joueurs[0].fleches}`;
      sousTitre.appendChild(span);
      carte.appendChild(sousTitre);
    }
    const supprimer = document.createElement("button");
    supprimer.type = "button";
    supprimer.textContent = t(currentLanguage, enEquipe ? "setupSupprimerEquipe" : "setupSupprimerJoueur");
    supprimer.addEventListener("click", () => {
      equipes = equipes.filter((e) => e.id !== equipe.id);
      rendreSetup();
    });
    carte.appendChild(supprimer);
    liste.appendChild(carte);
  }

  document.getElementById("champ-nom-equipe-conteneur").hidden = !!equipeEnCours;
  document.getElementById("creer-equipe").hidden = !!equipeEnCours;
  document.getElementById("equipe-en-cours-corps").hidden = !equipeEnCours;

  if (equipeEnCours) {
    document.getElementById("equipe-en-cours-nom").textContent = equipeEnCours.nom;
    const coequipiersListe = document.getElementById("coequipiers-liste");
    coequipiersListe.innerHTML = "";
    equipeEnCours.joueurs.forEach((joueur, index) => {
      const ligne = document.createElement("div");
      ligne.className = "coequipier-ligne";
      const span = document.createElement("span");
      span.textContent = jeu.configParticipant ? `${joueur.nom} (${joueur.fleches})` : joueur.nom;
      ligne.appendChild(span);
      const retirer = document.createElement("button");
      retirer.type = "button";
      retirer.textContent = t(currentLanguage, "setupSupprimerCoequipier");
      retirer.addEventListener("click", () => {
        equipeEnCours.joueurs.splice(index, 1);
        rendreSetup();
      });
      ligne.appendChild(retirer);
      coequipiersListe.appendChild(ligne);
    });
  }

  document.getElementById("setup-erreur").textContent = "";
}

function remplirJoueursConnus() {
  const datalist = document.getElementById("joueurs-connus");
  datalist.innerHTML = "";
  for (const joueur of joueursConnus) {
    const option = document.createElement("option");
    option.value = joueur.nom;
    datalist.appendChild(option);
  }
}

async function resoudreJoueur(nom) {
  const nomPropre = nom.trim();
  const existant = joueursConnus.find((j) => j.nom.toLowerCase() === nomPropre.toLowerCase());
  if (existant) return existant;
  const nouveau = await ajouterJoueur(nomPropre);
  joueursConnus.push(nouveau);
  remplirJoueursConnus();
  return nouveau;
}

function creerEquipe() {
  const champ = document.getElementById("champ-nom-equipe");
  const nom = champ.value.trim();
  if (!nom) return;
  equipeEnCours = { id: crypto.randomUUID(), nom, joueurs: [] };
  champ.value = "";
  rendreSetup();
}

function lireFleches(champFleches) {
  const cfg = jeu.configParticipant;
  if (!cfg) return undefined;
  let fleches = parseInt(champFleches.value, 10);
  if (Number.isNaN(fleches)) fleches = cfg.defaut;
  return Math.min(cfg.max, Math.max(cfg.min, fleches));
}

async function ajouterCoequipier() {
  const champNom = document.getElementById("champ-nom-coequipier");
  const champFleches = document.getElementById("champ-fleches-coequipier");
  const nom = champNom.value.trim();
  if (!nom || !equipeEnCours) return;
  const fleches = lireFleches(champFleches);

  const joueur = await resoudreJoueur(nom);
  const membre = { id: joueur.id, nom: joueur.nom };
  if (fleches !== undefined) membre.fleches = fleches;
  equipeEnCours.joueurs.push(membre);
  champNom.value = "";
  if (jeu.configParticipant) champFleches.value = String(jeu.configParticipant.defaut);
  rendreSetup();
}

async function ajouterJoueurIndividuel() {
  const champNom = document.getElementById("champ-nom-joueur");
  const champFleches = document.getElementById("champ-fleches-joueur");
  const nom = champNom.value.trim();
  if (!nom) return;
  const fleches = lireFleches(champFleches);

  const joueur = await resoudreJoueur(nom);
  const membre = { id: joueur.id, nom: joueur.nom };
  if (fleches !== undefined) membre.fleches = fleches;
  equipes.push({ id: crypto.randomUUID(), nom: joueur.nom, joueurs: [membre] });
  champNom.value = "";
  if (jeu.configParticipant) champFleches.value = String(jeu.configParticipant.defaut);
  rendreSetup();
}

function finaliserEquipeEnCours() {
  if (!equipeEnCours) return true;
  if (equipeEnCours.joueurs.length === 0) {
    document.getElementById("setup-erreur").textContent = t(currentLanguage, "setupAuMoinsUnJoueur");
    return false;
  }
  equipes.push(equipeEnCours);
  equipeEnCours = null;
  return true;
}

function passerEquipeSuivante() {
  if (!finaliserEquipeEnCours()) return;
  rendreSetup();
}

function commencerPartie() {
  if (!finaliserEquipeEnCours()) return;
  if (equipes.length < 2) {
    const cle = modeParticipant === "equipe" ? "setupAuMoinsDeuxEquipes" : "setupAuMoinsDeuxJoueurs";
    document.getElementById("setup-erreur").textContent = t(currentLanguage, cle);
    return;
  }
  etatsParParticipant = {};
  for (const equipe of equipes) {
    etatsParParticipant[equipe.id] = jeu.etatInitial();
  }
  manches = [];
  indexScoreCourant = 0;
  scoresMancheEnCours = {};
  numeroManche = 1;
  perdantsSelectionnes = new Set();
  etape = "jeu";
  afficherEcran("ecran-jeu");
  rendreJeu();
}

// ---- Écran de jeu --------------------------------------------------------

function classementCourant() {
  return equipes
    .map((e) => {
      const etat = etatsParParticipant[e.id] || {};
      return { id: e.id, nom: e.nom, points: etat.points || 0, victoires: etat.victoires, vies: etat.vies };
    })
    .sort((a, b) => b.points - a.points);
}

function rendreObjectif() {
  const objectif = document.getElementById("jeu-objectif");
  if (jeu.objectifPoints !== undefined) {
    objectif.textContent = `${t(currentLanguage, "jeuObjectif")} ${jeu.objectifPoints} ${t(currentLanguage, "jeuPoints")}`;
  } else if (jeu.objectifVictoires !== undefined) {
    objectif.textContent = `${t(currentLanguage, "jeuObjectif")} ${jeu.objectifVictoires} ${t(currentLanguage, "jeuManchesGagnees")}`;
  } else if (jeu.viesDepart !== undefined) {
    objectif.textContent = `${t(currentLanguage, "jeuViesDepart")} ${jeu.viesDepart}`;
  } else {
    objectif.textContent = "";
  }
}

function rendreClassementJeu() {
  const classementDiv = document.getElementById("classement-jeu");
  classementDiv.innerHTML = "";
  for (const entree of classementCourant()) {
    const ligne = document.createElement("div");
    ligne.className = "classement-ligne";
    if (jeu.afficheVies && entree.vies <= 0) ligne.classList.add("elimine");
    const nom = document.createElement("span");
    nom.className = "nom";
    nom.textContent = entree.nom;
    ligne.appendChild(nom);
    if (jeu.afficheVies && entree.vies !== undefined) {
      const vies = document.createElement("span");
      vies.className = "vies";
      vies.textContent = `${entree.vies} ${t(currentLanguage, "jeuVies")}`;
      ligne.appendChild(vies);
    } else {
      const points = document.createElement("span");
      points.className = "points";
      points.textContent = String(entree.points);
      ligne.appendChild(points);
    }
    if (jeu.objectifVictoires !== undefined && entree.victoires !== undefined) {
      const victoires = document.createElement("span");
      victoires.className = "victoires";
      victoires.textContent = `${entree.victoires}/${jeu.objectifVictoires}`;
      ligne.appendChild(victoires);
    }
    classementDiv.appendChild(ligne);
  }
}

function rendreJeu() {
  rendreObjectif();
  rendreClassementJeu();

  const enVainqueurPlusValeur = jeu.modeSaisie === "vainqueur-plus-valeur";
  document.getElementById("jeu-saisie-vainqueur").hidden = !enVainqueurPlusValeur || !!vainqueurManche;
  document.getElementById("jeu-saisie-valeur").hidden = !enVainqueurPlusValeur || !vainqueurManche;
  document.getElementById("jeu-saisie-score-chacun").hidden = jeu.modeSaisie !== "score-chacun-son-tour";
  document.getElementById("jeu-saisie-perdant").hidden = jeu.modeSaisie !== "perdant-de-la-manche";

  if (enVainqueurPlusValeur) {
    if (!vainqueurManche) {
      const boutons = document.getElementById("equipe-boutons");
      boutons.innerHTML = "";
      for (const equipe of equipes) {
        const bouton = document.createElement("button");
        bouton.type = "button";
        bouton.className = "equipe-bouton";
        bouton.textContent = equipe.nom;
        bouton.addEventListener("click", () => {
          vainqueurManche = equipe;
          rendreJeu();
        });
        boutons.appendChild(bouton);
      }
    } else {
      document.getElementById("valeur-titre").textContent = `${vainqueurManche.nom} — ${t(currentLanguage, "jeuCombienPoints")}`;
      const grille = document.getElementById("valeurs-grille");
      grille.innerHTML = "";
      const valeurs = jeu.valeursPossibles(vainqueurManche);
      for (const valeur of valeurs) {
        const bouton = document.createElement("button");
        bouton.type = "button";
        bouton.className = "valeur-bouton";
        bouton.textContent = String(valeur);
        bouton.addEventListener("click", () => enregistrerManche(valeur));
        grille.appendChild(bouton);
      }
    }
  } else if (jeu.modeSaisie === "score-chacun-son-tour") {
    rendreScoreChacun();
  } else if (jeu.modeSaisie === "perdant-de-la-manche") {
    rendrePerdant();
  }
}

function participantsEnVie() {
  return equipes.filter((e) => (etatsParParticipant[e.id] || {}).vies > 0);
}

function enregistrerManche(points) {
  const participantId = vainqueurManche.id;
  manches.push({ participantId, points });
  etatsParParticipant[participantId] = jeu.appliquerManche(etatsParParticipant[participantId], { points });
  vainqueurManche = null;

  if (jeu.estTerminee(etatsParParticipant)) {
    terminerPartie();
  } else {
    rendreJeu();
  }
}

// ---- modeSaisie "score-chacun-son-tour" ---------------------------------
// Chaque participant, à tour de rôle, saisit un score libre (pas de
// plage prédéfinie -- valeursPossibles n'existe pas pour ce mode).
// Une fois tout le monde passé, le(s) meilleur(s) score(s) de la
// manche remportent une victoire (saisie.gagnant, voir le contrat du
// jeu -- ex. moteur/jeux/triangle.js).

function rendreScoreChacun() {
  const participant = equipes[indexScoreCourant];
  document.getElementById("score-chacun-titre").textContent = `${participant.nom} — ${t(currentLanguage, "jeuQuelScore")}`;
  document.getElementById("champ-score-chacun").value = "0";
}

function enregistrerScoreChacun() {
  const participant = equipes[indexScoreCourant];
  const champ = document.getElementById("champ-score-chacun");
  let valeur = parseInt(champ.value, 10);
  if (Number.isNaN(valeur) || valeur < 0) valeur = 0;
  scoresMancheEnCours[participant.id] = valeur;

  indexScoreCourant += 1;
  if (indexScoreCourant < equipes.length) {
    rendreScoreChacun();
    return;
  }

  const meilleur = Math.max(...Object.values(scoresMancheEnCours));
  for (const equipe of equipes) {
    const points = scoresMancheEnCours[equipe.id];
    const gagnant = points === meilleur;
    manches.push({ participantId: equipe.id, points, gagnant });
    etatsParParticipant[equipe.id] = jeu.appliquerManche(etatsParParticipant[equipe.id], { points, gagnant });
  }

  indexScoreCourant = 0;
  scoresMancheEnCours = {};

  if (jeu.estTerminee(etatsParParticipant)) {
    terminerPartie();
  } else {
    rendreJeu();
  }
}

// ---- modeSaisie "perdant-de-la-manche" ----------------------------------
// On désigne le(s) perdant(s) de la manche parmi les participants
// encore en vie (sélection multiple, boutons à bascule) -- voir
// moteur/jeux/killer.js. Contrairement à "vainqueur-plus-valeur", rien
// n'est enregistré tant que "Valider" n'a pas été touché.

function rendrePerdant() {
  const boutons = document.getElementById("perdant-boutons");
  boutons.innerHTML = "";
  for (const participant of participantsEnVie()) {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.className = "equipe-bouton";
    bouton.classList.toggle("selectionne", perdantsSelectionnes.has(participant.id));
    bouton.textContent = participant.nom;
    bouton.addEventListener("click", () => {
      if (perdantsSelectionnes.has(participant.id)) perdantsSelectionnes.delete(participant.id);
      else perdantsSelectionnes.add(participant.id);
      rendrePerdant();
    });
    boutons.appendChild(bouton);
  }
}

function validerPerdants() {
  if (perdantsSelectionnes.size === 0) return;

  for (const participant of participantsEnVie()) {
    const perdant = perdantsSelectionnes.has(participant.id);
    manches.push({ participantId: participant.id, perdant });
    etatsParParticipant[participant.id] = jeu.appliquerManche(etatsParParticipant[participant.id], {
      perdant,
      numeroManche,
    });
  }

  numeroManche += 1;
  perdantsSelectionnes = new Set();

  if (jeu.estTerminee(etatsParParticipant)) {
    terminerPartie();
  } else {
    rendreJeu();
  }
}

async function terminerPartie() {
  const participants = equipes.map((e) => ({
    id: e.id,
    type: modeParticipant === "equipe" ? "equipe" : "joueur",
    nom: e.nom,
    joueurs: e.joueurs.map((j) => (j.fleches !== undefined ? { id: j.id, nom: j.nom, fleches: j.fleches } : { id: j.id, nom: j.nom })),
  }));
  classementFinal = jeu.classement(participants, etatsParParticipant);
  await enregistrerPartie({ jeuId: jeu.id, participants, manches, classement: classementFinal });

  etape = "fin";
  afficherEcran("ecran-fin");
  rendreFin();
}

function rendreFin() {
  const vainqueur = classementFinal.find((e) => e.rang === 1);
  document.getElementById("fin-annonce").innerHTML = "";
  const annonce = document.getElementById("fin-annonce");
  annonce.textContent = "";
  const strong = document.createElement("strong");
  strong.textContent = vainqueur ? vainqueur.nom : "";
  annonce.appendChild(strong);
  annonce.append(` ${t(currentLanguage, "finVainqueur")}`);

  const liste = document.getElementById("fin-classement");
  liste.innerHTML = "";
  for (const entree of classementFinal) {
    const ligne = document.createElement("div");
    ligne.className = `fin-ligne rang-${entree.rang}`;
    const rang = document.createElement("span");
    rang.className = "rang";
    rang.textContent = `#${entree.rang}`;
    const nom = document.createElement("span");
    nom.className = "nom";
    nom.textContent = entree.nom;
    const points = document.createElement("span");
    points.className = "points";
    points.textContent = `${entree.points} ${t(currentLanguage, "jeuPoints")}`;
    ligne.append(rang, nom, points);
    liste.appendChild(ligne);
  }
}

function reinitialiserPourNouvellePartie() {
  modeParticipant = null;
  equipes = [];
  equipeEnCours = null;
  etatsParParticipant = {};
  manches = [];
  vainqueurManche = null;
  classementFinal = null;
  indexScoreCourant = 0;
  scoresMancheEnCours = {};
  numeroManche = 1;
  perdantsSelectionnes = new Set();
  etape = "setup";
  document.getElementById("champ-nom-equipe").value = "";
  afficherEcran("ecran-setup");
  rendreSetup();
}

// ---- Traductions / thème (mêmes conventions que les autres pages) ------

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(currentLanguage, el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    el.setAttribute("aria-label", t(currentLanguage, el.getAttribute("data-i18n-aria-label")));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(currentLanguage, el.getAttribute("data-i18n-placeholder")));
  });
  document.getElementById("lang-fr-btn").classList.toggle("active", currentLanguage === "fr");
  document.getElementById("lang-en-btn").classList.toggle("active", currentLanguage === "en");
  document.documentElement.lang = currentLanguage;
}

function rendreEcranCourant() {
  if (etape === "regles") rendreRegles();
  else if (etape === "setup") rendreSetup();
  else if (etape === "jeu") rendreJeu();
  else if (etape === "fin") rendreFin();
}

window.setLanguage = function setLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem("fletchgames_lang", lang);
  applyTranslations();
  if (jeu) {
    document.getElementById("jeu-titre").textContent = nomJeu();
    rendreEcranCourant();
  }
};

async function init() {
  applyTranslations();

  if (!jeu) {
    document.getElementById("jeu-introuvable").hidden = false;
    return;
  }

  document.getElementById("jeu-titre").textContent = nomJeu();
  if (jeu.configParticipant) {
    const { defaut, min, max } = jeu.configParticipant;
    for (const id of ["champ-fleches-coequipier", "champ-fleches-joueur"]) {
      const champ = document.getElementById(id);
      champ.value = String(defaut);
      champ.min = String(min);
      champ.max = String(max);
    }
  }
  if (jeu.modesParticipant.length === 1) {
    modeParticipant = jeu.modesParticipant[0];
  }

  joueursConnus = await listerJoueurs();
  remplirJoueursConnus();

  afficherEcran("ecran-regles");
  rendreRegles();

  document.getElementById("regles-commencer").addEventListener("click", () => {
    etape = "setup";
    afficherEcran("ecran-setup");
    rendreSetup();
  });
  document.getElementById("mode-individuel").addEventListener("click", () => choisirMode("individuel"));
  document.getElementById("mode-equipe").addEventListener("click", () => choisirMode("equipe"));
  document.getElementById("creer-equipe").addEventListener("click", creerEquipe);
  document.getElementById("ajouter-coequipier").addEventListener("click", ajouterCoequipier);
  document.getElementById("ajouter-joueur").addEventListener("click", ajouterJoueurIndividuel);
  document.getElementById("equipe-suivante").addEventListener("click", passerEquipeSuivante);
  document.getElementById("commencer-partie").addEventListener("click", commencerPartie);
  document.getElementById("saisie-annuler").addEventListener("click", () => {
    vainqueurManche = null;
    rendreJeu();
  });
  document.getElementById("score-chacun-valider").addEventListener("click", enregistrerScoreChacun);
  document.getElementById("perdant-valider").addEventListener("click", validerPerdants);
  document.getElementById("fin-accueil").addEventListener("click", () => {
    location.href = "index.html";
  });
  document.getElementById("fin-nouvelle-partie").addEventListener("click", reinitialiserPourNouvellePartie);
}

init();
