/* Streak -- bonus de points pour les manches gagnées d'affilée. À
 * chaque manche, on désigne seulement le vainqueur (pas de valeur à
 * saisir) : il marque un point de plus que sa série de victoires en
 * cours (1re victoire = 1 point, 2e d'affilée = 2, 3e = 3, etc.). Une
 * défaite remet la série à zéro. Première à 15 points gagne.
 *
 * modeSaisie: "vainqueur-seul" (nouveau, voir jouer.js) -- contrairement
 * à "vainqueur-plus-valeur" (Pétanque), il n'y a pas d'écran de
 * saisie de valeur : le clic sur le vainqueur enregistre directement
 * la manche, l'appli calcule elle-même le bonus. Contrairement à
 * "score-chacun-son-tour" (Triangle/Bingo), un seul participant est
 * "actif" par manche (le vainqueur) mais TOUS reçoivent
 * appliquerManche (pour remettre la série des perdants à zéro).
 */
export const streak = {
  id: "streak",
  nom: { fr: "Streak", en: "Streak" },
  presentation: {
    fr: "Enchaîner les manches gagnées rapporte de plus en plus de points -- une défaite remet tout à zéro.",
    en: "Winning rounds back to back scores more and more -- a single loss resets everything.",
  },
  regles: {
    fr: [
      "À chaque manche, désigne l'équipe (ou le joueur) qui l'a remportée -- pas besoin de saisir de valeur.",
      "Elle marque un point de plus que sa série de victoires d'affilée en cours -- 1re victoire = 1 point, 2e victoire consécutive = 2 points, 3e = 3 points, et ainsi de suite.",
      "Une défaite (une autre équipe gagne la manche) remet sa série à zéro.",
      "Première à 15 points gagne la partie.",
    ],
    en: [
      "Each round, pick the team (or player) that won it -- no value to enter.",
      "It scores one point more than its current winning streak -- 1st win = 1 point, 2nd win in a row = 2 points, 3rd = 3 points, and so on.",
      "A loss (another team wins the round) resets its streak to zero.",
      "First to 15 points wins the game.",
    ],
  },
  modesParticipant: ["individuel", "equipe"],
  configParticipant: null,
  modeSaisie: "vainqueur-seul",
  objectifPoints: 15,

  etatInitial() {
    return { points: 0, serie: 0 };
  },

  // saisie = { gagnant } -- appelé pour TOUS les participants à chaque
  // manche (comme "score-chacun-son-tour"), pas seulement le
  // vainqueur : c'est ce qui permet de remettre à zéro la série des
  // autres.
  appliquerManche(etat, saisie) {
    if (!saisie?.gagnant) return { ...etat, serie: 0 };
    const serie = etat.serie + 1;
    return { points: etat.points + serie, serie };
  },

  estTerminee(etatsParParticipant) {
    return Object.values(etatsParParticipant).some((etat) => etat.points >= streak.objectifPoints);
  },

  classement(participants, etatsParParticipant) {
    return participants
      .map((p) => ({ id: p.id, nom: p.nom, points: (etatsParParticipant[p.id] || { points: 0 }).points }))
      .sort((a, b) => b.points - a.points)
      .map((entree, index) => ({ ...entree, rang: index + 1 }));
  },
};
