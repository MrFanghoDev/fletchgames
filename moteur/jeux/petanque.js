/* Pétanque -- jeu d'entraînement archer : un arbitre tire une flèche
 * de référence (le "cochonnet"), chaque équipe tire ensuite, l'équipe
 * dont les flèches sont les plus proches marque -- comme à la pétanque,
 * autant de points que de flèches plus proches que la meilleure de
 * l'adversaire. Première équipe à 13 points gagne.
 *
 * L'appli ne mesure aucune distance -- c'est un tableau de score, pas
 * un capteur : les archers jugent eux-mêmes qui a gagné la manche
 * (retour utilisateur, 2026-08-24), l'appli additionne juste.
 *
 * uniteParticipant: "equipe" -- même un "joueur seul" doit être créé
 * comme une équipe d'un seul membre (pas de cas spécial "solo" dans le
 * moteur, voir moteur/jeux/index.js et jouer.js).
 *
 * configParticipant : chaque équipe doit préciser, par coéquipier,
 * combien de flèches il tire (1 à 3, défaut 3) -- valeursPossibles()
 * en dépend directement pour calculer le maximum de points atteignable
 * par CETTE équipe si elle gagne la manche (somme des flèches de ses
 * coéquipiers, pas une valeur fixe -- une équipe à 2 coéquipiers à 3
 * flèches peut marquer jusqu'à 6 points d'un coup).
 */
export const petanque = {
  id: "petanque",
  nom: { fr: "Pétanque", en: "Bowls" },
  presentation: {
    fr: "Le plus près du cochonnet marque -- comme à la pétanque, mais à l'arc.",
    en: "Closest to the jack scores -- like bowls, but with a bow.",
  },
  regles: {
    fr: [
      "Un arbitre tire une flèche de référence (le cochonnet), n'importe où sur la cible.",
      "Chaque équipe tire ensuite ses flèches, chacune le nombre convenu à la mise en place (1 à 3).",
      "L'équipe dont les flèches sont les plus proches du cochonnet gagne la manche.",
      "Elle marque autant de points que de flèches plus proches que la MEILLEURE flèche de l'équipe adverse -- une équipe à 2 coéquipiers peut donc marquer jusqu'à 6 points d'un coup si toutes ses flèches sont plus proches.",
      "Première équipe à 13 points gagne la partie.",
    ],
    en: [
      "A referee shoots a reference arrow (the jack), anywhere on the target.",
      "Each team then shoots its arrows, the agreed number per player (1 to 3).",
      "The team whose arrows are closest to the jack wins the round.",
      "It scores one point per arrow closer than the opposing team's BEST arrow -- a two-player team can score up to 6 points at once if all its arrows are closer.",
      "First team to 13 points wins the game.",
    ],
  },
  uniteParticipant: "equipe",
  configParticipant: {
    champ: "fleches",
    label: { fr: "Flèches", en: "Arrows" },
    min: 1,
    max: 3,
    defaut: 3,
  },
  modeSaisie: "vainqueur-plus-valeur",
  objectifPoints: 13,

  // Maximum de points que CE participant peut marquer s'il gagne la
  // manche -- somme des flèches de ses coéquipiers (voir configParticipant
  // ci-dessus). Toujours au moins 1 (une équipe mal configurée ne
  // bloque pas la saisie).
  valeursPossibles(participant) {
    const total = (participant.joueurs || []).reduce((somme, j) => somme + (j.fleches || 0), 0);
    const max = Math.max(total, 1);
    return Array.from({ length: max }, (_, i) => i + 1);
  },

  etatInitial() {
    return { points: 0 };
  },

  // saisie = { points } -- uniquement appelé pour le participant
  // désigné vainqueur de la manche, voir jouer.js (les autres
  // participants gardent leur état tel quel, aucune manche à 0 point
  // enregistrée pour eux).
  appliquerManche(etat, saisie) {
    return { points: etat.points + (saisie?.points || 0) };
  },

  estTerminee(etatsParParticipant) {
    return Object.values(etatsParParticipant).some((etat) => etat.points >= petanque.objectifPoints);
  },

  classement(participants, etatsParParticipant) {
    return participants
      .map((p) => ({ id: p.id, nom: p.nom, points: (etatsParParticipant[p.id] || { points: 0 }).points }))
      .sort((a, b) => b.points - a.points)
      .map((entree, index) => ({ ...entree, rang: index + 1 }));
  },
};
