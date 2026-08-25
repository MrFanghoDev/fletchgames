/* Bingo -- chacun a sa propre grille 3x3 (valeurs 1 à 9). Après chaque
 * flèche, on signale sa valeur -- la case correspondante se coche (si
 * elle ne l'était pas déjà). Premier à compléter une ligne entière
 * (horizontale, verticale ou diagonale) gagne.
 *
 * Réutilise le modeSaisie "score-chacun-son-tour" tel quel (voir
 * jouer.js/triangle.js) -- l'orchestration ("chacun entre un nombre à
 * tour de rôle") est identique, seule l'INTERPRÉTATION du nombre
 * diffère : ici, une valeur de case à cocher plutôt qu'un score à
 * cumuler. `saisie.gagnant` (calculé par jouer.js comme "le plus haut
 * score du tour") est simplement ignoré -- sans objet pour ce jeu, le
 * classement se fait sur le nombre de cases cochées et la ligne
 * complète, pas sur qui a inscrit la plus grosse valeur ce tour-là.
 *
 * Une seule grille (même disposition pour tout le monde) -- inutile de
 * mélanger les cases : le jeu ne dépend que de QUELLES valeurs sont
 * cochées, pas de leur position visuelle, et chaque participant
 * progresse sur sa grille indépendamment des autres de toute façon.
 */
const GRILLE = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

function aUneLigneComplete(cellulesMarquees) {
  const marque = (valeur) => cellulesMarquees.includes(valeur);
  for (const ligne of GRILLE) {
    if (ligne.every(marque)) return true;
  }
  for (let colonne = 0; colonne < 3; colonne++) {
    if (GRILLE.every((ligne) => marque(ligne[colonne]))) return true;
  }
  if ([GRILLE[0][0], GRILLE[1][1], GRILLE[2][2]].every(marque)) return true;
  if ([GRILLE[0][2], GRILLE[1][1], GRILLE[2][0]].every(marque)) return true;
  return false;
}

export const bingo = {
  id: "bingo",
  nom: { fr: "Bingo", en: "Bingo" },
  presentation: {
    fr: "Une grille à cocher flèche après flèche -- premier à compléter une ligne gagne.",
    en: "A grid to check off arrow by arrow -- first to complete a line wins.",
  },
  regles: {
    fr: [
      "Chacun a sa propre grille de bingo, avec les valeurs de 1 à 9.",
      "Après chaque flèche, indique sa valeur -- la case correspondante se coche sur ta grille (si elle ne l'était pas déjà).",
      "Premier à compléter une ligne entière (horizontale, verticale ou diagonale) de sa grille gagne la partie.",
    ],
    en: [
      "Everyone has their own bingo card, with values 1 to 9.",
      "After each arrow, enter its value -- the matching cell gets checked on your card (if not already checked).",
      "First to complete a full line (row, column, or diagonal) on their card wins the game.",
    ],
  },
  modesParticipant: ["individuel"],
  configParticipant: null,
  modeSaisie: "score-chacun-son-tour",

  etatInitial() {
    return { cellulesMarquees: [], ligneComplete: false, points: 0 };
  },

  // saisie = { points } -- points est ici la valeur de case (1-9), pas
  // un score à cumuler. Valeur hors grille ou déjà cochée : sans effet
  // (pas d'erreur -- l'archer peut se tromper de case sans bloquer la
  // partie, il lui suffit de resaisir correctement au tour suivant).
  //
  // etat.points reflète simplement cellulesMarquees.length -- redondant
  // en apparence (classement() ci-dessous le recalcule de toute façon),
  // mais nécessaire pour que le classement AFFICHÉ PENDANT LA PARTIE
  // (classementCourant() dans jouer.js, qui lit etat.points directement
  // pour tous les jeux) montre une vraie progression plutôt que 0 en
  // permanence -- repéré par test réel, pas juste supposé.
  appliquerManche(etat, saisie) {
    const valeur = saisie?.points;
    if (!Number.isInteger(valeur) || valeur < 1 || valeur > 9 || etat.cellulesMarquees.includes(valeur)) {
      return etat;
    }
    const cellulesMarquees = [...etat.cellulesMarquees, valeur];
    return { cellulesMarquees, ligneComplete: aUneLigneComplete(cellulesMarquees), points: cellulesMarquees.length };
  },

  estTerminee(etatsParParticipant) {
    return Object.values(etatsParParticipant).some((etat) => etat.ligneComplete);
  },

  classement(participants, etatsParParticipant) {
    return participants
      .map((p) => {
        const etat = etatsParParticipant[p.id] || { points: 0, ligneComplete: false };
        return { id: p.id, nom: p.nom, points: etat.points, ligneComplete: etat.ligneComplete };
      })
      .sort((a, b) => {
        if (a.ligneComplete !== b.ligneComplete) return (b.ligneComplete ? 1 : 0) - (a.ligneComplete ? 1 : 0);
        return b.points - a.points;
      })
      .map((entree, index) => ({ ...entree, rang: index + 1 }));
  },
};
