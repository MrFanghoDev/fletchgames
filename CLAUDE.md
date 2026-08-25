# Instructions pour Claude sur FletchGames

Ce fichier condense les règles techniques et les décisions propres à
FletchGames. Pour notre façon de travailler ensemble (commune aux
projets frères -- fletchapps/fletchscore/fletchtime/fletchlog/
fletchgames), voir le `CLAUDE.md` global (`~/.claude/CLAUDE.md`),
toujours chargé automatiquement.

## Contexte en une phrase

FletchGames : mini-jeux d'entraînement au tir à l'arc (score classique,
Killer, Bingo, Streak, Pari, jeux IFAA/field comme le round Animal...),
utilisables localement sur un seul téléphone (pas de backend, pas de
compte), en solo ou à plusieurs joueurs qui se passent l'appareil.
Discuté dans fletchapps#3 avant tout code.

## Décisions actées avant tout code (2026-08-20, révisées le 2026-08-24)

- **Stack** : même socle que FletchLog -- PWA statique vanilla
  JS/HTML/CSS, IndexedDB, service worker, GitHub Pages, zéro build
  step. Cohérent avec l'environnement de dev habituel (pas de
  toolchain natif/Flutter disponible, mais un vrai navigateur + serveur
  HTTP local déjà éprouvés sur FletchLog).
- **Moteur générique + jeux interchangeables** : chaque "jeu" est un
  module `moteur/jeux/<jeu>.js` (ES module, `export`) qui décrit ses
  règles de scoring/fin de partie -- pas une appli par jeu. Contrat
  détaillé plus bas. `moteur/jeux/index.js` tient le registre
  (`JEUX`, `listerJeux()`, `obtenirJeu(id)`), consommé par
  `accueil.js`/`jouer.js` (tous deux `<script type="module">`).
- **Pas de cible, pas de saisie graphique par position** (retour
  utilisateur, 2026-08-24 -- **remplace la décision du 2026-08-23**
  ci-dessous, gardée un temps entre les deux versions de ce fichier par
  erreur) : l'appli est un tableau de score, pas un capteur. Les
  archers jugent eux-mêmes qui a gagné une manche dans la vraie vie ;
  FletchGames se contente d'additionner. Modèle retenu : équipes +
  joueurs, saisie après chaque manche via une touche "qui a gagné" puis
  (selon le jeu) une touche "combien de points". Voir "Moteur de jeu"
  ci-dessous pour le contrat exact. Ancienne décision (gardée ici pour
  mémoire, **obsolète**) : ~~saisie par tap sur l'image de la cible,
  volée = position (x,y) d'impact~~ -- abandonnée avant tout code de
  jeu, aucune trace dans le modèle de données actuel.
- **Cibles IFAA (noir/blanc, 3 zones), pas World Archery** -- recherche
  toujours valide (FFTL = représentant officiel IFAA en France, pas la
  FFTA/World Archery) mais **sans objet pour l'instant** : plus aucun
  visuel de cible n'est dessiné dans l'appli suite à la décision
  ci-dessus. À ressortir si un futur jeu a réellement besoin d'un
  visuel de cible (zones de couleur à éviter le cas échéant).
- **Publication gated sur release dès le départ** (`.github/workflows/pages.yml`,
  `on: push: tags: ["v*.*.*"]` + `workflow_dispatch`, jamais sur un
  simple push de branche) -- pas de dette à créer comme FletchLog, qui
  a dû migrer après coup (voir fletchlog#21). Posé avant tout code,
  déployé avec succès dès le premier essai (voir fletchlog#21 pour les
  deux pièges évités : politique de déploiement par tag sur
  l'environnement `github-pages`, et déploiement silencieusement
  ignoré sur un SHA déjà publié).

## Moteur de jeu (Pétanque/Triangle/Killer le 2026-08-24, Bingo/Streak/Suivez-moi le 2026-08-25)

Contrat d'un module `moteur/jeux/<jeu>.js` (voir `petanque.js` pour
l'exemple complet) :

```
{
  id, nom: {fr, en}, presentation: {fr, en}, regles: {fr: [...], en: [...]},
  variantes: {fr: [...], en: [...]} | undefined,  // optionnel, règles facultatives (voir plus bas)
  modesParticipant: ["individuel", "equipe"],   // au moins un des deux, ordre = ordre d'affichage
  configParticipant: { champ, label: {fr, en}, min, max, defaut } | null,
  configPartie: { champ, label: {fr, en}, min, max, defaut } | undefined,  // optionnel, réglage de PARTIE (voir plus bas)
  modeSaisie: "vainqueur-plus-valeur" | "score-chacun-son-tour" | "perdant-de-la-manche" | "vainqueur-seul" | "suivre-le-repere" | ...,
  objectifPoints,       // optionnel -- fin de partie par seuil de points (Pétanque)
  objectifVictoires,    // optionnel -- fin de partie par nombre de manches gagnées (Triangle)
  viesDepart,           // optionnel -- fin de partie quand il ne reste qu'un survivant (Killer)
  afficheVies,          // optionnel -- true : classement affiche les vies plutôt que les points (Killer)
  valeursPossibles(participant) -> number[],    // requis seulement pour "vainqueur-plus-valeur"
  etatInitial() -> etat,
  appliquerManche(etat, saisie) -> etat,
  finaliserManche(etat, saisie) -> etat,        // optionnel, voir "suivre-le-repere" (Suivez-moi)
  estTerminee(etatsParParticipant) -> bool,     // optionnel si jouer.js gère la fin autrement (voir Suivez-moi)
  classement(participants, etatsParParticipant) -> [{id, nom, points, rang}],
}
```

Deux `modeSaisie` câblés dans `jouer.js` pour l'instant :
- **"vainqueur-plus-valeur"** (Pétanque) : on désigne le vainqueur de
  la manche, puis sa valeur parmi `valeursPossibles(participant)` --
  requiert cette fonction. Les autres participants ne saisissent rien.
- **"score-chacun-son-tour"** (Triangle, ajouté le 2026-08-24) : CHAQUE
  participant saisit son propre score à tour de rôle (nombre libre
  saisi via `<input type="number">`, pas de plage prédéfinie --
  `valeursPossibles` n'est pas utilisé). Une fois tout le monde passé,
  jouer.js calcule le(s) meilleur(s) score(s) de la manche et appelle
  `appliquerManche(etat, {points, gagnant})` pour TOUS les
  participants (pas seulement le vainqueur comme dans l'autre mode) --
  `gagnant` vaut `true` pour chacun des scores maximaux (égalité =
  plusieurs vainqueurs de manche, tous crédités). C'est ce qui permet à
  Triangle de suivre à la fois un score cumulé (`points`, somme des
  manches) et un compteur de victoires (`victoires`, pour
  `objectifVictoires`) dans le même `etat`.

- **"perdant-de-la-manche"** (Killer, ajouté le 2026-08-25) : on
  désigne le(s) PERDANT(S) de la manche (sélection multiple par
  boutons à bascule, égalité possible) parmi les participants encore
  en vie -- pas de vainqueur ni de valeur numérique. Une fois
  "Valider" touché, `jouer.js` appelle `appliquerManche(etat,
  {perdant, numeroManche})` pour chaque participant encore en vie
  (`numeroManche` = compteur de manches tenu par jouer.js, incrémenté
  à chaque validation). Les participants déjà éliminés
  (`etat.vies <= 0`) ne sont ni affichés dans la liste de sélection ni
  retouchés -- leurs `points`/`vies` restent gelés à leur valeur au
  moment de l'élimination, ce qui donne gratuitement le bon ordre de
  classement final (voir Killer ci-dessous) sans champ dédié
  "ordre d'élimination".

- **"vainqueur-seul"** (Streak, ajouté le 2026-08-25) : version allégée
  de "vainqueur-plus-valeur" -- on désigne le vainqueur de la manche
  et c'est TOUT, aucun écran de saisie de valeur ensuite (le clic sur
  le bouton enregistre directement la manche). Comme
  "score-chacun-son-tour"/"perdant-de-la-manche", TOUS les participants
  reçoivent `appliquerManche(etat, {gagnant})` (pas seulement le
  vainqueur) -- nécessaire pour que le jeu puisse retoucher l'état des
  perdants (ex. Streak remet leur série à zéro). Partage l'écran
  `#jeu-saisie-vainqueur`/`.equipe-bouton` avec
  "vainqueur-plus-valeur" (même liste de participants à choisir), seul
  le clic diffère (`enregistrerVainqueurSeul()` vs `vainqueurManche`
  puis écran de valeur) -- pas de nouvelle section HTML nécessaire.

Bingo (voir plus bas) réutilise "score-chacun-son-tour" tel quel : même
mécanique de saisie ("chacun entre un nombre à tour de rôle"), mais
`saisie.gagnant` (calculé par jouer.js comme "le plus haut score du
tour") est simplement ignoré côté `bingo.js` -- sans objet pour ce jeu.
Aucun nouveau `modeSaisie` n'a donc été nécessaire pour Bingo.

- **"suivre-le-repere"** (Suivez-moi, ajouté le 2026-08-25) : le seul
  mode à DEUX niveaux -- une manche comporte plusieurs TOURS (un par
  participant), pas une seule décision comme tous les modes
  précédents. À chaque tour, un participant différent (`equipes[tourCourant]`,
  compteur tenu par jouer.js) est le "tireur de référence" (annoncé,
  ne participe pas à ce tour) ; les autres sont proposés en sélection
  multiple ("qui s'en est le plus rapproché ?", égalité possible).
  Après "Valider" : `appliquerManche(etat, {pointManche})` pour chaque
  participant SAUF la référence de ce tour. Une fois que tous les
  participants ont servi de référence (fin de manche), jouer.js calcule
  le(s) vainqueur(s) de la manche (plus haut `pointsManche`) et appelle
  `finaliserManche(etat, {mancheGagnee})` pour TOUS les participants
  (remet `pointsManche` à 0, crédite `manchesGagnees`). La fin de
  partie ("N manches jouées") est comparée directement dans jouer.js
  (`manchesJouees >= configPartieValeur`, deux compteurs
  d'orchestration qui vivent dans jouer.js) -- PAS via `jeu.estTerminee`,
  qui n'a pas de sens ici (rien à voir avec l'état d'UN participant en
  particulier) ; `suivezmoi.js` ne définit d'ailleurs pas cette
  fonction, elle est bien optionnelle au contrat.

D'autres valeurs de `modeSaisie` prévues au contrat (clavier fixe,
boutons fixes) seront ajoutées quand un jeu les utilisera réellement,
pas avant.

**`configPartie`** (Suivez-moi, premier jeu dans ce cas) : un réglage
choisi UNE SEULE FOIS pour toute la partie à la mise en place (ex.
nombre de manches), affiché juste avant "Commencer la partie" -- à ne
pas confondre avec `configParticipant` (un réglage PAR participant,
ex. le nombre de flèches de Pétanque). La valeur choisie est lue par
jouer.js dans `commencerPartie()` et stockée dans sa propre variable
(`configPartieValeur`), jamais passée aux fonctions du contrat --
c'est une donnée d'orchestration, pas un élément de l'état d'un
participant.

**`configParticipant: null`** (Triangle, premier jeu dans ce cas) :
quand un jeu n'a besoin d'aucun réglage par participant (pas de
"flèches" ou équivalent), l'assistant de mise en place masque
entièrement ce champ (voir `jouer.js`, `champ-fleches-*-conteneur`) --
les objets `joueur` créés n'ont alors pas de propriété `fleches` du
tout (`undefined`, jamais une valeur par défaut arbitraire).

**Variantes** (`jeu.variantes`, ajouté le 2026-08-24 pour Pétanque) :
règles optionnelles du jeu RÉEL (matériel, mise en place physique),
jamais interprétées par le moteur -- affichées à part de la liste
numérotée principale sur l'écran de règles (`#regles-variantes-section`,
puces plutôt que chiffres) pour ne pas laisser croire qu'elles sont
obligatoires. La saisie en jeu reste toujours la même quel que soit le
nombre de variantes actives : c'est aux archers d'en tenir compte dans
leur propre décompte avant de saisir.

**Individuel vs équipe** (retour utilisateur, 2026-08-24 : "il va
falloir faire un mode individuel et un mode par équipe", généralisé au
moteur plutôt que spécifique à Pétanque) : `modesParticipant` déclare
ce que CE jeu supporte. Si les deux sont déclarés, `jouer.js` affiche un
choix ("Comment voulez-vous jouer ?", écran `#mode-choix`) avant la
mise en place, verrouillé pour toute la partie (choix remis à zéro à
"Nouvelle partie") ; si un seul mode est déclaré, l'écran de choix est
sauté automatiquement. **Un participant a toujours la même forme côté
moteur** ({id, nom, joueurs:[...]}) quel que soit le mode -- en
individuel, `joueurs` contient un seul élément (le joueur lui-même),
créé directement sans étape de nommage d'équipe. Aucune fonction du
contrat (`valeursPossibles`, `classement`, etc.) n'a besoin de savoir
dans quel mode la partie a été jouée : c'est purement une différence
d'assistant de mise en place (voir `jouer.js`, `choisirMode()` /
`ajouterJoueurIndividuel()` vs le flux équipe existant).

**Pétanque** : déclare `modesParticipant: ["individuel", "equipe"]`
(les deux formats réels du jeu -- tête-à-tête vs doublette/triplette).
`configParticipant` capture le nombre de flèches par membre (1 à 3,
défaut 3) pendant la mise en place, dans les deux modes.
`valeursPossibles()` est **dynamique** : somme des flèches des membres
de CE participant (une équipe à 2 coéquipiers à 3 flèches peut marquer
jusqu'à 6 points d'un coup), pas une plage fixe. Objectif 13 points.

**Triangle** (2e jeu, 2026-08-24 -- retour utilisateur, jeu réel avec
ficelle : chaque joueur trace un triangle, tire 3 flèches à
l'intérieur, redéfinit son triangle avec ses impacts si toutes dedans,
recommence jusqu'à sortir) : déclare `modesParticipant: ["individuel"]`
seulement (pas d'équipe, "chaque joueur a son triangle") et
`configParticipant: null` (3 flèches est une constante du jeu, pas un
réglage). `modeSaisie: "score-chacun-son-tour"` -- chaque participant
saisit le nombre de fois où IL a redéfini son triangle avant de sortir
(l'appli ne simule aucune géométrie). `objectifVictoires: 3` : la
partie se termine dès qu'un participant a remporté 3 manches, mais le
classement final se fait au score total cumulé sur toutes les manches
jouées (pas au nombre de victoires) -- deux compteurs séparés dans le
même `etat` (`points` et `victoires`).

**Killer** (3e jeu, 2026-08-25 -- élimination progressive) : déclare
`modesParticipant: ["individuel"]` seulement (chacun ses vies, pas
d'équipe) et `configParticipant: null` (le nombre de vies de départ,
`viesDepart: 3`, est une constante du jeu, pas un réglage -- même
principe que `objectifPoints`/`objectifVictoires`). `modeSaisie:
"perdant-de-la-manche"` (voir plus haut). `estTerminee` : il ne reste
qu'un seul participant avec `vies > 0`. `points` (utilisé pour trier
le classement final) n'est PAS un score au sens propre : c'est le
numéro de la dernière manche à laquelle ce participant a activement
participé (encore en vie) -- suffit à ordonner correctement (éliminé
plus tard = mieux classé, survivant final = numéro de manche le plus
élevé) en réutilisant tel quel le tri par points déjà en place pour
Pétanque/Triangle. `afficheVies: true` fait afficher le nombre de vies
restantes dans le classement en cours de partie (au lieu des points,
peu parlants pour ce jeu) et estompe visuellement (`.elimine`) les
participants à 0 vie plutôt que de les retirer de la liste.

**Bingo** (4e jeu, 2026-08-25) : `modesParticipant: ["individuel"]`,
`configParticipant: null`, réutilise `modeSaisie: "score-chacun-son-tour"`
(voir plus haut). Grille 3x3 fixe (valeurs 1 à 9, même disposition pour
tout le monde -- seules les valeurs cochées comptent, pas leur
position). Chaque tour, un participant entre la valeur de sa flèche ;
si elle est dans la grille et pas déjà cochée, la case correspondante
se coche. Fin dès qu'un participant complète une ligne (horizontale,
verticale ou diagonale). **Piège rencontré** (repéré par test réel,
pas juste supposé) : `etat` ne portait au départ que `cellulesMarquees`/
`ligneComplete`, sans champ `points` -- le classement AFFICHÉ PENDANT
LA PARTIE (`classementCourant()` dans jouer.js, qui lit `etat.points`
directement pour tous les jeux, générique) restait bloqué à 0 tout du
long, alors que le classement FINAL (calculé séparément par
`classement()`) était correct. Corrigé en faisant porter
`points: cellulesMarquees.length` dans `etat` lui-même -- **retenir
pour tout futur jeu** : `etat` doit toujours exposer un champ `points`
cohérent avec ce qu'on veut voir progresser en direct, même quand ce
n'est pas la métrique de tri "naturelle" du jeu.

**Streak** (5e jeu, 2026-08-25) : `modesParticipant: ["individuel",
"equipe"]` (comme Pétanque), `configParticipant: null`, `modeSaisie:
"vainqueur-seul"` (voir plus haut). Un point de plus que la série de
victoires d'affilée en cours (1re victoire = 1 pt, 2e consécutive = 2
pts, etc.), remise à zéro sur une défaite. Objectif 15 points.
Démontre que le choix individuel/équipe et `configParticipant: null`
fonctionnent aussi en combinaison "équipe SANS réglage par
coéquipier" (jusqu'ici seule Pétanque avait testé le mode équipe, mais
toujours avec `configParticipant` renseigné) -- confirmé sans code
supplémentaire nécessaire.

**Suivez-moi** (6e jeu, 2026-08-25) : `modesParticipant: ["individuel"]`,
`configParticipant: null`, `modeSaisie: "suivre-le-repere"` (voir plus
haut), `configPartie` pour le nombre de manches (défaut 3, voir plus
haut). Le seul jeu où une manche a une structure interne (tours) --
voir le contrat pour le détail. Vérifié en Node (rotation de la
référence sur 3 participants, calcul du vainqueur de manche, remise à
zéro entre manches, classement final) puis en navigateur réel
(assistant de mise en place avec le champ "Nombre de manches", 2
manches complètes jouées avec vainqueurs différents à chaque fois,
écran "Manche X/N" mis à jour correctement, fin de partie exactement
au nombre de manches choisi).

**Stockage** (`storage.js`, IndexedDB) : deux stores seulement,
`joueurs` (mémorisés d'une partie à l'autre pour l'autocomplete) et
`parties` (historique complet, équipes recomposées à la volée dans
chaque partie -- pas de store `equipes` séparé, une composition
d'équipe n'a de sens que pour la partie du jour, voir le commentaire en
tête de `storage.js`).

**Page de jeu** (`jouer.html?jeu=<id>`, `jouer.js`) : 4 écrans dans
l'ordre (règles → mise en place → manches → résultat final), un seul
`<section class="ecran">` visible à la fois. La mise en place démarre
par le choix individuel/équipe (voir ci-dessus, sauté si un seul mode
est supporté par le jeu), puis :
- en équipe : nommer une équipe, lui ajouter des coéquipiers un par un
  (nom + flèches), "Équipe suivante" ou "Commencer la partie" (≥ 2
  équipes requises) ;
- en individuel : ajouter des joueurs un par un (nom + flèches), chacun
  devenant immédiatement un participant à part entière -- pas
  d'"Équipe suivante" (le bouton est masqué), juste "Commencer la
  partie" (≥ 2 joueurs requis).

Vérifié par test Selenium réel (voir "Vérification" plus bas) dans les
deux modes : écran de choix, assistant de mise en place adapté (titre
de section, panneau affiché, bouton "Équipe suivante" masqué en
individuel), plage de points dynamique correcte (`[1,2,3]` pour un
participant à 3 flèches), mise à jour du classement en direct.

**Page d'accueil** (`index.html`, `accueil.js`) : UN SEUL carrousel de
jeux (scroll-snap CSS natif, pas le patron piste/JS de la lightbox
photo de FletchLog -- inutilement complexe pour de simples cartes),
chaque carte combinant présentation ET statistiques (nom, présentation,
mini-résumé "N parties jouées", palmarès par nombre de victoires
groupées par NOM, record de points en une seule manche avec son
détenteur, "le plus assidu" -- ou "Aucune partie jouée" si le jeu n'a
jamais été joué) ; clic sur la carte = lance `jouer.html?jeu=...`.

**Historique du design (2026-08-25) -- deux carrousels séparés,
abandonnés** : la version initiale avait deux carrousels côte à côte
(jeux, puis historique/stats), avec l'idée de les synchroniser pour
que balayer l'un fasse bouger l'autre. Deux tentatives de
synchronisation ont échoué en usage réel malgré des tests automatisés
qui semblaient pourtant valider chacune (`scroll` event -> ne se
déclenche pas assez pendant un balayage tactile réel -- momentum
scroll souvent géré hors du thread JS ; sondage `requestAnimationFrame`
-> toujours pas satisfaisant en usage réel malgré une vérification par
glissement continu simulé qui semblait concluante). **Leçon retenue** :
un carrousel simulé par `element.scrollLeft = valeur` en JS (comme dans
les deux tests) ne reproduit PAS fidèlement la physique d'un vrai
balayage tactile (accélération, relâchement, snap différé pendant le
geste) -- un test automatisé qui "passe" sur ce point ne garantit pas
un rendu correct sur un vrai appareil, se méfier des tests de geste
tactile simulés en JS pour ce genre de comportement. Plutôt que de
continuer à corriger, fusionné en un seul carrousel (retour
utilisateur) -- élimine le problème à la racine.

**Piège rencontré (toujours valable)** : `theme.css` a une règle
générique `button { color: #fff; }` -- les cartes du carrousel sont de
vrais `<button>` (pour être cliquables/accessibles au clavier), donc le
titre `<h3>` hérite du blanc et devient invisible sur fond clair sans
override explicite. Corrigé en fixant `color: var(--text)` sur
`.carrousel-carte`. À garder en tête pour tout futur bouton générique
réutilisant une classe pensée à l'origine pour un `<div>`.

**Jeu au hasard** (`#bouton-jeu-hasard`, `tirerJeuAuHasard()`) : fait
défiler rapidement le carrousel (plusieurs tours complets puis
ralentit, effet roulette) et s'arrête sur un jeu tiré au sort. Reste
sur place une fois arrêté -- ne lance pas la partie automatiquement, un
tap sur la carte suffit ensuite comme d'habitude.

**Page Aide** (`aide.html`) : même patron sommaire/sections que
`fletchlog/aide.html`, contenu propre à FletchGames (installation PWA,
mise en place d'une partie, saisie des points, confidentialité locale).
Pas d'export/import de sauvegarde pour l'instant (contrairement à
FletchLog) -- pas demandé, pas construit.

**Réinitialisation des données** (retour utilisateur, 2026-08-25) :
`storage.js` expose `reinitialiserDonnees()` (vide les deux stores en
une seule transaction atomique). Bouton dans la section "Tes données"
d'`aide.html`, avec confirmation obligatoire (`.confirm-overlay`, JAMAIS
`window.confirm()` -- son titre imposé par le navigateur affiche
l'adresse plutôt que "FletchGames", piège déjà corrigé chez FletchLog).
En passant, repéré et corrigé un vrai bug latent : `.btn-annuler` était
utilisé dans `jouer.html` (Équipe suivante, Retour à l'accueil) sans
jamais avoir sa propre règle CSS -- retombait sur le style générique de
`button` dans `theme.css` (pas de fond défini, texte blanc, peu
lisible). Ajouté aussi dans `jouer.html` en corrigeant.

## Piège XML déjà rencontré deux fois ailleurs, reproduit une 3e fois ici

`--` (double-hyphen) est invalide dans un commentaire XML/SVG -- déjà
documenté dans `fletchlog/CLAUDE.md` (deux fois : l'anneau de la cible
du logo, puis un `icon-svg` cassé qui empêchait le favicon de se
charger). Reproduit une troisième fois en écrivant le commentaire du
fond de `fletchgames/icon.svg` ("coins arrondis -- même rapport...").
Casse le chargement du SVG comme document XML autonome (favicon,
`<img src="icon.svg">`) même si l'erreur ne se voit pas en l'inlinant
dans une page HTML (parseur HTML, tolérant) -- toujours vérifier un
`.svg` autonome par une vraie navigation directe dedans (Chromium),
pas seulement en le relisant. Corrigé ici (virgule à la place du `--`).

## Logo

`icon.svg` : même plume que fletchlog/fletchapps (`Fletch.svg`,
liseré noir/or), répétée 3 fois en étoile (flèches à 0°/120°/240°)
autour d'une cible miniature au centre -- motif "flèches qui partent
dans toutes les directions" cohérent avec l'idée de plusieurs
mini-jeux sur un même moteur. Fond `#0f1216` plein bord, coins
arrondis (`rx` = 112/512 du logo FletchLog, même rapport). PNG générés
par capture Chromium (`Page.captureScreenshot` + fond transparent
forcé via `Emulation.setDefaultBackgroundColorOverride`) -- jamais
`rsvg-convert`, qui ne supporte pas `transform-box: fill-box` (leçon
FletchLog, voir son CLAUDE.md).

## Vérification (2026-08-24)

Logique de jeu vérifiée directement en Node (import ES du module
`petanque.js`, appels réels de `valeursPossibles`/`appliquerManche`/
`estTerminee`/`classement` avec des données réalistes) -- fiable
indépendamment du rendu navigateur. Vérification statique : tous les
`getElementById(...)` de `jouer.js`/`accueil.js` résolvent vers un id
réel du HTML correspondant ; parité complète des clés fr/en dans
`i18n.js` et absence de clé utilisée mais non définie.

Vérification navigateur réelle (Selenium/Chromium headless, serveur
`python -m http.server` local) faite mais **laborieuse ce jour-là** :
environnement sous charge système soutenue (`uptime` ~15-22 sur 3
cœurs), plusieurs sessions Chromium ont timeout ou pris plusieurs
minutes pour un simple chargement de page. Screenshots + interactions
réelles obtenues malgré tout : accueil (hero, carrousels, historique),
mise en place d'une partie de Pétanque (2 équipes, plages de points
dynamiques confirmées `[1,2,3]` pour un coéquipier à 3 flèches),
classement mis à jour en direct. Si une session future rencontre le
même ralentissement, lancer les scripts Selenium en arrière-plan
détaché (`nohup ... & disown`, pas `run_in_background` du harness qui
peut se faire couper par un reset de session) et être patient plutôt
que de multiplier les tentatives -- les process Chromium tournaient
réellement, juste très lentement.

**Triangle (2e jeu)** : logique vérifiée en Node (`appliquerManche`/
`estTerminee`/`classement`, égalité de score = plusieurs vainqueurs de
manche crédités, fin de partie exactement à la 3e victoire, classement
final par score cumulé). Vérification navigateur réelle partielle --
l'environnement local a rencontré ce jour-là des resets répétés qui ont
vidé le répertoire de scratch en plein test Selenium (pas un problème
de charge cette fois, un vrai reset d'environnement). Confirmé malgré
tout en réel avant l'interruption : les deux jeux listés sur l'accueil,
écran de choix de mode correctement sauté (un seul `modesParticipant`),
champ "flèches" correctement masqué (`configParticipant: null`), 3
joueurs ajoutés sans réglage superflu, ligne d'objectif "3 manches
gagnées", saisie tour par tour fonctionnelle, classement mis à jour
après la 1ère manche (`Julie 5 · 1/3`). L'écran de fin lui-même
réutilise `terminerPartie()`/`rendreFin()`, du code déjà vérifié en
réel avec Pétanque -- pas re-testé isolément pour Triangle, risque jugé
faible vu qu'aucun changement n'y a été apporté pour ce jeu.

**Killer (3e jeu, 2026-08-25)** : logique vérifiée en Node avec un
scénario à 4 joueurs et une égalité (2 perdants la même manche) --
cascade d'élimination correcte, `points`/`vies` gelés dès l'élimination
(jamais retouchés aux manches suivantes), `estTerminee` correcte à
chaque étape (y compris le palier à 2 survivants, qui ne doit PAS
terminer la partie), classement final dans le bon ordre. Vérification
statique (ids, clés i18n) propre. Vérification navigateur réelle très
limitée ce jour-là : l'environnement local a enchaîné plusieurs resets
qui ont vidé le scratch en quelques secondes à chaque nouvelle
tentative de test interactif complet (setup → éliminations → fin) --
après plusieurs relances infructueuses, une vérification allégée
(chargement de `jouer.html?jeu=killer` seul, sans interaction) a quand
même confirmé un chargement propre : titre correct, 5 règles rendues,
aucune erreur console. Le reste du flux (sélection multiple des
perdants, `.selectionne`, disparition des éliminés de la liste, écran
de fin) réutilise très directement des mécanismes déjà vérifiés en
réel sur Pétanque/Triangle (boutons à bascule sur le même patron que
`.equipe-bouton`, `terminerPartie()`/`rendreFin()` inchangés) -- risque
résiduel jugé faible, mais **à re-vérifier en réel dès qu'une session
future a un environnement plus stable**, avant de considérer Killer
aussi solidement testé que les deux premiers jeux.

## Piège rencontré : CACHE_NAME de sw.js pas rebumpé après coup (2026-08-24)

Après le premier build (accueil + Pétanque, `CACHE_NAME =
"fletchgames-shell-v1"`), l'utilisateur a testé `index.html` en local
-- ce qui enregistre le service worker et précharge tous les fichiers
listés dans `FICHIERS_A_METTRE_EN_CACHE` (dont `jouer.js`,
`moteur/jeux/petanque.js`, `jouer.html`) dans le cache `v1`. Le tour
suivant (mode individuel/équipe) a modifié `jouer.js`/`jouer.html`/
`petanque.js` **sans toucher `sw.js`** -- oubli du réflexe déjà
documenté chez FletchLog ("CACHE_NAME bumped on every precached-file
change"). Résultat signalé par l'utilisateur : "pas de réponse après
avoir appuyé sur Commencer" -- cohérent avec un navigateur qui continue
de servir le bundle `v1` (cache-first, voir le `fetch` handler de
`sw.js`) tant que `sw.js` lui-même n'a pas changé d'un seul octet (le
navigateur ne redétecte une mise à jour qu'en comparant `sw.js` à
l'ancienne version enregistrée -- pas en comparant les fichiers qu'il
précharge). Corrigé en passant à `v2`. **Réflexe à prendre pour la
suite de FletchGames** : dès qu'un fichier de `FICHIERS_A_METTRE_EN_CACHE`
change, rebumper `CACHE_NAME` dans le même commit -- sinon toute
modification reste invisible pour qui a déjà ouvert l'appli une fois,
sans aucune erreur ni avertissement visible côté utilisateur.
