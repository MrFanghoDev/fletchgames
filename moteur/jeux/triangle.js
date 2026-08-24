/* Triangle -- un triangle de ficelle qui rétrécit à chaque volée
 * réussie. Chaque joueur trace son propre grand triangle (piquets ou
 * repères tenant la ficelle), tire 3 flèches à l'intérieur, puis
 * redéfinit son triangle en reliant ses 3 nouveaux impacts -- et
 * recommence, jusqu'à ce qu'une flèche sorte du triangle courant.
 *
 * modesParticipant: ["individuel"] seulement -- "chaque joueur a son
 * triangle", pas de notion d'équipe qui partagerait un seul triangle
 * (contrairement à Pétanque). Voir moteur/jeux/index.js.
 *
 * Pas de configParticipant -- le nombre de flèches (3) est une
 * constante du jeu, pas un réglage par participant (contrairement à
 * Pétanque). Premier jeu à laisser ce champ à null : jouer.js masque
 * alors entièrement le champ "flèches" de l'assistant de mise en
 * place (voir son CLAUDE.md).
 *
 * modeSaisie: "score-chacun-son-tour" -- contrairement à Pétanque
 * ("vainqueur-plus-valeur", un seul participant saisit une valeur par
 * manche), ICI chaque participant saisit son propre score à tour de
 * rôle (le nombre de fois où il a redéfini son triangle avant de
 * sortir) -- l'appli ne simule aucune géométrie, c'est aux archers de
 * compter eux-mêmes. Pas de valeursPossibles() : le score n'a pas de
 * plage prédéfinie (voir jouer.js).
 *
 * objectifVictoires (pas objectifPoints comme Pétanque) : la partie se
 * termine dès qu'un participant remporte 3 manches -- remporter une
 * manche = avoir eu le meilleur score ce tour-là (retour utilisateur,
 * 2026-08-24 : "3 manches gagnantes"). Le classement final, lui, se
 * fait sur le score total cumulé sur toutes les manches jouées (pas
 * sur le nombre de victoires) -- voir classement() ci-dessous.
 */
export const triangle = {
  id: "triangle",
  nom: { fr: "Triangle", en: "Triangle" },
  presentation: {
    fr: "Un triangle de ficelle qui rétrécit à chaque volée réussie -- jusqu'à la flèche qui sort.",
    en: "A string triangle that shrinks with every successful end -- until an arrow steps out.",
  },
  regles: {
    fr: [
      "Chaque joueur trace un grand triangle au sol ou sur un support avec une ficelle, tenue par 3 piquets ou repères.",
      "Il tire 3 flèches à l'intérieur de son triangle.",
      "Si les 3 flèches sont dans le triangle, il redéfinit son triangle en reliant ses 3 impacts avec la ficelle -- un triangle plus petit.",
      "Il recommence : 3 nouvelles flèches dans ce nouveau triangle, et ainsi de suite.",
      "Dès qu'une flèche tombe en dehors du triangle courant, la manche s'arrête pour ce joueur.",
      "Son score pour la manche est le nombre de fois où le triangle a été redéfini.",
      "Le joueur au meilleur score remporte la manche.",
      "Première à 3 manches gagnées remporte la partie -- le classement final se fait au score total cumulé sur toutes les manches jouées.",
    ],
    en: [
      "Each player marks out a large triangle on the ground or target with a string, held by 3 stakes or markers.",
      "They shoot 3 arrows inside their triangle.",
      "If all 3 arrows land inside, they redraw their triangle by connecting the 3 new impact points with the string -- a smaller triangle.",
      "They start again: 3 new arrows inside this new triangle, and so on.",
      "As soon as an arrow lands outside the current triangle, the round ends for that player.",
      "Their score for the round is the number of times the triangle was redrawn.",
      "The player with the best score wins the round.",
      "First to 3 round wins takes the game -- the final ranking is based on total points accumulated across every round played.",
    ],
  },
  modesParticipant: ["individuel"],
  configParticipant: null,
  modeSaisie: "score-chacun-son-tour",
  objectifVictoires: 3,

  etatInitial() {
    return { points: 0, victoires: 0 };
  },

  // saisie = { points, gagnant } -- appelé pour TOUS les participants à
  // chaque manche (contrairement à Pétanque), voir jouer.js.
  appliquerManche(etat, saisie) {
    return {
      points: etat.points + (saisie?.points || 0),
      victoires: etat.victoires + (saisie?.gagnant ? 1 : 0),
    };
  },

  estTerminee(etatsParParticipant) {
    return Object.values(etatsParParticipant).some((etat) => etat.victoires >= triangle.objectifVictoires);
  },

  // Classement final par score total cumulé (pas par nombre de
  // victoires) -- voir le commentaire d'en-tête.
  classement(participants, etatsParParticipant) {
    return participants
      .map((p) => {
        const etat = etatsParParticipant[p.id] || { points: 0, victoires: 0 };
        return { id: p.id, nom: p.nom, points: etat.points, victoires: etat.victoires };
      })
      .sort((a, b) => b.points - a.points)
      .map((entree, index) => ({ ...entree, rang: index + 1 }));
  },
};
