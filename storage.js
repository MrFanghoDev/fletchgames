/* Stockage local -- même wrapper minimal au-dessus d'IndexedDB que
 * fletchlog/storage.js (API brute suffit, pas de lib ajoutée pour ça,
 * voir CLAUDE.md global "Dépendances -- principe partagé").
 *
 * Deux stores :
 *
 * "joueurs" -- { id, nom }
 *   Mémorisés d'une partie à l'autre pour ne pas retaper les noms --
 *   seule chose vraiment persistante d'une partie à l'autre. Les
 *   équipes, elles, sont recomposées à chaque partie (voir jouer.js) à
 *   partir de ce vivier de joueurs, pas sauvegardées comme entités à
 *   part -- une composition d'équipe n'a de sens que pour la partie du
 *   jour, pas de "gérer mes équipes" séparé pour l'instant (à revoir
 *   si l'usage réel montre que c'est pénible).
 *
 * "parties" -- une partie terminée (historique) :
 *   {
 *     id, jeuId,                    ex. "petanque"
 *     date            string        jour de la partie, AAAA-MM-JJ
 *     termineeLe       string        horodatage ISO de fin
 *     participants: [{
 *       id, type: "equipe"|"joueur", nom               -- nom au moment
 *         de la partie (snapshot -- une partie passée reste lisible même
 *         si l'équipe/le joueur est ensuite renommé ou supprimé)
 *       joueurs?: [{ id, nom, fleches }]   -- si l'unité du jeu est
 *         l'équipe (voir configParticipant dans le moteur), composition
 *         au moment de la partie
 *     }],
 *     manches: [{ participantId, points }]   -- historique manche par
 *       manche, dans l'ordre joué
 *     classement: [{ participantId, nom, points, rang }]  -- résultat
 *       final, déjà trié (rang 1 = vainqueur)
 *   }
 *
 * Pas de photoId/blob ici contrairement à FletchLog -- rien à stocker
 * de ce type pour l'instant.
 */

const DB_NOM = "fletchgames";
const DB_VERSION = 1;

function _ouvrirDB() {
  return new Promise((resolve, reject) => {
    const requete = indexedDB.open(DB_NOM, DB_VERSION);
    requete.onupgradeneeded = () => {
      const db = requete.result;
      if (!db.objectStoreNames.contains("joueurs")) {
        db.createObjectStore("joueurs", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("parties")) {
        const parties = db.createObjectStore("parties", { keyPath: "id" });
        parties.createIndex("jeuId", "jeuId");
      }
    };
    requete.onsuccess = () => resolve(requete.result);
    requete.onerror = () => reject(requete.error);
  });
}

// ---- Joueurs ---------------------------------------------------------

function ajouterJoueur(nom) {
  const nomPropre = (nom || "").trim();
  if (!nomPropre) return Promise.reject(new Error("Un joueur doit avoir un nom."));
  const joueur = { id: crypto.randomUUID(), nom: nomPropre };
  return _ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction("joueurs", "readwrite");
        transaction.objectStore("joueurs").add(joueur);
        transaction.oncomplete = () => resolve(joueur);
        transaction.onerror = () => reject(transaction.error);
      })
  );
}

function listerJoueurs() {
  return _ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const requete = db.transaction("joueurs", "readonly").objectStore("joueurs").getAll();
        requete.onsuccess = () => resolve(requete.result.sort((a, b) => a.nom.localeCompare(b.nom)));
        requete.onerror = () => reject(requete.error);
      })
  );
}

function supprimerJoueur(id) {
  return _ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction("joueurs", "readwrite");
        transaction.objectStore("joueurs").delete(id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      })
  );
}

// ---- Parties (historique) ---------------------------------------------

function enregistrerPartie(partie) {
  const complete = {
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0, 10),
    termineeLe: new Date().toISOString(),
    ...partie,
  };
  return _ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction("parties", "readwrite");
        transaction.objectStore("parties").add(complete);
        transaction.oncomplete = () => resolve(complete);
        transaction.onerror = () => reject(transaction.error);
      })
  );
}

// Vide entièrement les deux stores -- retour utilisateur (aide.html,
// section "Tes données"), un seul geste pour repartir de zéro plutôt
// que de supprimer les joueurs un par un (supprimerJoueur ci-dessus)
// ou d'attendre un export/import complet (pas construit pour
// l'instant, voir CLAUDE.md). Une seule transaction sur les deux
// stores -- soit les deux se vident, soit aucun (atomique).
function reinitialiserDonnees() {
  return _ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(["joueurs", "parties"], "readwrite");
        transaction.objectStore("joueurs").clear();
        transaction.objectStore("parties").clear();
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      })
  );
}

function listerParties(jeuId) {
  return _ouvrirDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const store = db.transaction("parties", "readonly").objectStore("parties");
        const requete = jeuId ? store.index("jeuId").getAll(jeuId) : store.getAll();
        requete.onsuccess = () => resolve(requete.result.sort((a, b) => (a.termineeLe < b.termineeLe ? 1 : -1)));
        requete.onerror = () => reject(requete.error);
      })
  );
}
