/* Killer -- élimination progressive. Chaque joueur commence avec un
 * nombre fixe de vies ; à chaque manche, le(s) joueur(s) qui a/ont le
 * moins bien tiré perd(ent) une vie (l'appli ne juge rien elle-même,
 * comme les autres jeux -- les archers désignent eux-mêmes). Dernier
 * survivant gagne la partie.
 *
 * modesParticipant: ["individuel"] seulement -- "chacun ses vies", pas
 * de notion d'équipe qui partagerait un pool de vies.
 *
 * Pas de configParticipant : viesDepart est une constante du jeu (pas
 * un réglage par participant), même principe que objectifPoints
 * (Pétanque) ou objectifVictoires (Triangle) -- fixe, pas configurable
 * pour l'instant.
 *
 * modeSaisie: "perdant-de-la-manche" -- contrairement aux deux autres
 * modes (un seul vainqueur désigné, ou chacun saisit un score), ICI on
 * désigne le(s) PERDANT(S) de la manche parmi les participants encore
 * en vie (sélection multiple -- égalité possible), voir jouer.js.
 * Aucune valeur numérique à saisir.
 *
 * "points" ci-dessous ne représente pas un score au sens propre : c'est
 * le numéro de la dernière manche à laquelle ce participant a
 * effectivement participé (encore en vie). Ça suffit à trier le
 * classement final dans le bon ordre (éliminé plus tard = mieux classé,
 * le survivant final ayant le numéro de manche le plus élevé) sans
 * avoir besoin d'un champ dédié "ordre d'élimination" -- même
 * mécanisme de tri par points que Pétanque/Triangle, réutilisé tel
 * quel côté jouer.js (classementCourant(), rendreFin()).
 */
export const killer = {
  id: "killer",
  nom: { fr: "Killer", en: "Killer" },
  presentation: {
    fr: "Chacun part avec des vies -- le moins bon de chaque manche en perd une. Dernier survivant gagne.",
    en: "Everyone starts with lives -- the worst shooter each round loses one. Last one standing wins.",
  },
  regles: {
    fr: [
      "Chaque joueur commence la partie avec 3 vies.",
      "À chaque manche, tous les joueurs encore en vie tirent.",
      "Le(s) joueur(s) qui a/ont le moins bien tiré perd(ent) une vie -- en cas d'égalité, plusieurs joueurs peuvent perdre une vie la même manche.",
      "Un joueur à 0 vie est éliminé et ne tire plus.",
      "Le jeu continue jusqu'à ce qu'il ne reste qu'un seul joueur -- il remporte la partie.",
    ],
    en: [
      "Each player starts the game with 3 lives.",
      "Each round, every player still alive shoots.",
      "The player(s) who shot worst lose a life -- on a tie, several players can lose a life the same round.",
      "A player at 0 lives is eliminated and stops shooting.",
      "The game continues until only one player remains -- they win the game.",
    ],
  },
  modesParticipant: ["individuel"],
  configParticipant: null,
  modeSaisie: "perdant-de-la-manche",
  viesDepart: 3,
  afficheVies: true,

  etatInitial() {
    return { vies: killer.viesDepart, points: 0 };
  },

  // saisie = { perdant, numeroManche } -- appelé uniquement pour les
  // participants encore en vie à cette manche (voir jouer.js, les
  // participants déjà éliminés ne sont ni affichés ni retouchés).
  appliquerManche(etat, saisie) {
    return {
      vies: saisie.perdant ? etat.vies - 1 : etat.vies,
      points: saisie.numeroManche,
    };
  },

  estTerminee(etatsParParticipant) {
    return Object.values(etatsParParticipant).filter((etat) => etat.vies > 0).length <= 1;
  },

  classement(participants, etatsParParticipant) {
    return participants
      .map((p) => {
        const etat = etatsParParticipant[p.id] || { points: 0, vies: 0 };
        return { id: p.id, nom: p.nom, points: etat.points, vies: etat.vies };
      })
      .sort((a, b) => b.points - a.points)
      .map((entree, index) => ({ ...entree, rang: index + 1 }));
  },
};
