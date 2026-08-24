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
 * modesParticipant: ["individuel", "equipe"] -- les deux formats réels
 * de la pétanque (tête-à-tête vs doublette/triplette). Peu importe le
 * mode choisi, un participant a TOUJOURS la même forme côté moteur
 * ({id, nom, joueurs:[...]}) -- en individuel, joueurs contient un seul
 * élément (le joueur lui-même). Pas de cas spécial "solo" dans les
 * fonctions ci-dessous : valeursPossibles()/classement() etc. ignorent
 * totalement le mode, seul jouer.js sait construire le bon assistant de
 * mise en place pour chacun (voir son CLAUDE.md).
 *
 * configParticipant : chaque participant doit préciser, par membre,
 * combien de flèches il tire (1 à 3, défaut 3) -- valeursPossibles()
 * en dépend directement pour calculer le maximum de points atteignable
 * par CE participant s'il gagne la manche (somme des flèches de ses
 * membres, pas une valeur fixe -- une équipe à 2 coéquipiers à 3
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
      "Chaque équipe (ou chaque joueur en individuel) tire ensuite ses flèches, chacune le nombre convenu à la mise en place (1 à 3).",
      "L'équipe (ou le joueur) dont les flèches sont les plus proches du cochonnet gagne la manche.",
      "Elle marque autant de points que de flèches plus proches que la MEILLEURE flèche adverse -- avec 2 coéquipiers, on peut donc marquer jusqu'à 6 points d'un coup si toutes les flèches sont plus proches.",
      "Premier à 13 points gagne la partie.",
    ],
    en: [
      "A referee shoots a reference arrow (the jack), anywhere on the target.",
      "Each team (or each player, in individual mode) then shoots its arrows, the agreed number per player (1 to 3).",
      "The team (or player) whose arrows are closest to the jack wins the round.",
      "It scores one point per arrow closer than the opponent's BEST arrow -- with 2 teammates, up to 6 points can be scored at once if all arrows are closer.",
      "First to 13 points wins the game.",
    ],
  },
  // Variantes -- optionnelles, purement des règles physiques du jeu réel
  // (retour utilisateur, 2026-08-24) : n'affectent JAMAIS le moteur, la
  // saisie reste toujours "qui gagne la manche + combien de points" --
  // c'est aux archers d'en tenir compte dans leur propre décompte avant
  // de saisir. Affichées à part des règles de base (voir jouer.html/
  // jouer.js, section #regles-variantes-section) pour ne pas laisser
  // croire qu'elles font partie de la liste numérotée obligatoire.
  variantes: {
    fr: [
      "Le cochonnet peut être n'importe quel petit objet facile à repérer -- une balle de ping-pong fait très bien l'affaire.",
      "La distance de tir peut être choisie à chaque manche par l'équipe qui vient de gagner : elle lance un cerceau (ou un autre repère) pour marquer le nouvel emplacement de tir -- simule le choix de terrain du pointeur à la pétanque.",
      "Une petite cible peut être ajoutée près du cochonnet pour simuler carreaux et dégagements : centre touché = cette flèche remplace la meilleure flèche adverse (carreau) ; sinon anneau touché = la meilleure flèche adverse est retirée du décompte (dégagement) ; sinon la flèche ne compte pas.",
    ],
    en: [
      "The jack can be any small, easy-to-spot object -- a ping-pong ball works well.",
      "The shooting distance can be chosen each round by the team that just won: they throw a hoop (or any other marker) to set the new shooting spot -- simulates the pointer's choice of ground in real pétanque.",
      "A small target can be added near the jack to simulate carreaux (direct hits) and dégagements (knock-outs): center hit = this arrow replaces the opponent's best arrow (carreau); otherwise ring hit = the opponent's best arrow is removed from the count (dégagement); otherwise the arrow doesn't count.",
    ],
  },
  modesParticipant: ["individuel", "equipe"],
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
