/* Suivez-moi -- à chaque tour, un joueur différent tire une flèche de
 * référence dans sa cible ; les autres essaient de s'en rapprocher le
 * plus possible. Le plus proche marque un point. Une manche comporte
 * un tour par joueur (chacun tire la référence une fois) ; celui qui a
 * le plus de points à la fin de la manche la remporte. Le nombre de
 * manches à jouer est choisi au début de la partie ; celui qui a
 * remporté le plus de manches à la fin gagne.
 *
 * modesParticipant: ["individuel"] seulement -- "plusieurs joueurs
 * s'affrontent individuellement", pas de notion d'équipe.
 *
 * configPartie (nouveau champ de contrat, pas configParticipant) : un
 * réglage choisi UNE FOIS pour toute la partie à la mise en place
 * (nombre de manches), pas par participant -- voir jouer.js, écran de
 * mise en place. Différent d'objectifPoints/objectifVictoires/
 * viesDepart (toujours des constantes fixes du jeu jusqu'ici) : ici
 * c'est un choix de l'utilisateur.
 *
 * finaliserManche (nouvelle fonction de contrat, optionnelle) :
 * appelée par jouer.js une fois par participant à la fin de CHAQUE
 * manche (pas à chaque tour) pour remettre pointsManche à zéro et
 * créditer manchesGagnees au(x) participant(s) qui a/ont gagné cette
 * manche -- nécessaire parce que ce jeu a deux niveaux (manche >
 * tours), contrairement à tous les jeux précédents où une "manche" au
 * sens du moteur est la plus petite unité de jeu.
 *
 * Pas d'estTerminee ici : la fin de partie ("N manches jouées") dépend
 * du nombre de manches choisi à la mise en place, une donnée
 * d'orchestration tenue par jouer.js (pas dérivable de l'état d'UN
 * participant) -- jouer.js compare directement son propre compteur de
 * manches jouées à configPartieValeur, sans passer par cette fonction
 * pour ce jeu précis.
 */
export const suivezmoi = {
  id: "suivezmoi",
  nom: { fr: "Suivez-moi", en: "Follow Me" },
  presentation: {
    fr: "Un tireur de référence par tour -- les autres essaient de s'en rapprocher le plus possible.",
    en: "One reference shooter per turn -- everyone else tries to land closest to them.",
  },
  regles: {
    fr: [
      "Choisis le nombre de manches à jouer au début de la partie.",
      "Chaque manche comporte un tour par joueur : à son tour, un joueur tire une flèche de référence dans sa cible.",
      "Les autres joueurs tirent alors chacun une flèche, en essayant de se rapprocher le plus possible de cette flèche de référence.",
      "Celui qui s'en est le plus rapproché remporte le tour et marque un point pour cette manche.",
      "Celui qui a le plus de points à la fin de la manche remporte la manche.",
      "Celui qui a remporté le plus de manches à la fin de la partie gagne.",
    ],
    en: [
      "Choose the number of rounds to play at the start of the game.",
      "Each round has one turn per player: on their turn, a player shoots a reference arrow into their target.",
      "The other players then each shoot an arrow, trying to land as close as possible to that reference arrow.",
      "Whoever got closest wins the turn and scores a point for that round.",
      "Whoever has the most points at the end of the round wins the round.",
      "Whoever has won the most rounds by the end of the game wins.",
    ],
  },
  modesParticipant: ["individuel"],
  configParticipant: null,
  configPartie: {
    champ: "manches",
    label: { fr: "Nombre de manches", en: "Number of rounds" },
    min: 1,
    max: 10,
    defaut: 3,
  },
  modeSaisie: "suivre-le-repere",

  etatInitial() {
    // points : miroir de manchesGagnees, pour que le classement affiché
    // EN COURS de partie (classementCourant() dans jouer.js, générique,
    // lit etat.points) progresse correctement -- même réflexe que pour
    // Bingo (voir CLAUDE.md).
    return { pointsManche: 0, manchesGagnees: 0, points: 0 };
  },

  // saisie = { pointManche } -- appelé uniquement pour le(s)
  // participant(s) désigné(s) "le plus proche" à CE tour (le tireur de
  // référence du tour, lui, n'est pas concerné -- voir jouer.js).
  appliquerManche(etat, saisie) {
    if (!saisie?.pointManche) return etat;
    return { ...etat, pointsManche: etat.pointsManche + 1 };
  },

  // saisie = { mancheGagnee } -- appelé pour TOUS les participants une
  // fois par manche (pas par tour), une fois que tous les tours de
  // cette manche ont eu lieu.
  finaliserManche(etat, saisie) {
    const manchesGagnees = etat.manchesGagnees + (saisie?.mancheGagnee ? 1 : 0);
    return { pointsManche: 0, manchesGagnees, points: manchesGagnees };
  },

  classement(participants, etatsParParticipant) {
    return participants
      .map((p) => {
        const etat = etatsParParticipant[p.id] || { manchesGagnees: 0 };
        return { id: p.id, nom: p.nom, points: etat.manchesGagnees };
      })
      .sort((a, b) => b.points - a.points)
      .map((entree, index) => ({ ...entree, rang: index + 1 }));
  },
};
