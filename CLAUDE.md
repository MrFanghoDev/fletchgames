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

## Moteur de jeu (implémenté le 2026-08-24, Pétanque puis Triangle)

Contrat d'un module `moteur/jeux/<jeu>.js` (voir `petanque.js` pour
l'exemple complet) :

```
{
  id, nom: {fr, en}, presentation: {fr, en}, regles: {fr: [...], en: [...]},
  variantes: {fr: [...], en: [...]} | undefined,  // optionnel, règles facultatives (voir plus bas)
  modesParticipant: ["individuel", "equipe"],   // au moins un des deux, ordre = ordre d'affichage
  configParticipant: { champ, label: {fr, en}, min, max, defaut } | null,
  modeSaisie: "vainqueur-plus-valeur" | "score-chacun-son-tour" | ...,
  objectifPoints,       // optionnel -- fin de partie par seuil de points (Pétanque)
  objectifVictoires,    // optionnel -- fin de partie par nombre de manches gagnées (Triangle)
  valeursPossibles(participant) -> number[],    // requis seulement pour "vainqueur-plus-valeur"
  etatInitial() -> etat,
  appliquerManche(etat, saisie) -> etat,
  estTerminee(etatsParParticipant) -> bool,
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

D'autres valeurs de `modeSaisie` prévues au contrat (clavier fixe,
boutons fixes) seront ajoutées quand un jeu les utilisera réellement,
pas avant.

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

**Page d'accueil** (`index.html`, `accueil.js`) : deux carrousels
(scroll-snap CSS natif, pas le patron piste/JS de la lightbox photo de
FletchLog -- inutilement complexe pour de simples cartes) -- jeux
(nom, présentation, mini-résumé "N parties jouées", clic = lance
`jouer.html?jeu=...`) puis historique/stats (un volet par jeu :
palmarès par nombre de victoires groupées par NOM, record de points en
une seule manche avec son détenteur, "le plus assidu" = le plus grand
nombre de parties jouées). Piège rencontré : `theme.css` a une règle
générique `button { color: #fff; }` -- comme les cartes du carrousel
jeux sont de vrais `<button>` (pour être cliquables/accessibles au
clavier) mais celles de l'historique sont des `<div>`, le titre `<h3>`
héritait du blanc dans le premier cas et devenait invisible sur fond
clair. Corrigé en fixant `color: var(--text)` explicitement sur
`.carrousel-carte`. À garder en tête pour tout futur bouton générique
réutilisant une classe pensée à l'origine pour un `<div>`.

**Page Aide** (`aide.html`) : même patron sommaire/sections que
`fletchlog/aide.html`, contenu propre à FletchGames (installation PWA,
mise en place d'une partie, saisie des points, confidentialité locale).
Pas d'export/import de sauvegarde pour l'instant (contrairement à
FletchLog) -- pas demandé, pas construit.

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
