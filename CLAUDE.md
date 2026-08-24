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

## Moteur de jeu (implémenté le 2026-08-24, Pétanque en premier jeu)

Contrat d'un module `moteur/jeux/<jeu>.js` (voir `petanque.js` pour
l'exemple complet) :

```
{
  id, nom: {fr, en}, presentation: {fr, en}, regles: {fr: [...], en: [...]},
  uniteParticipant: "equipe" | "joueur",
  configParticipant: { champ, label: {fr, en}, min, max, defaut } | null,
  modeSaisie: "vainqueur-plus-valeur" | ...,  // seul mode câblé dans jouer.js pour l'instant
  objectifPoints,                              // optionnel
  valeursPossibles(participant) -> number[],    // boutons de points proposés pour CE participant
  etatInitial() -> etat,
  appliquerManche(etat, saisie) -> etat,
  estTerminee(etatsParParticipant) -> bool,
  classement(participants, etatsParParticipant) -> [{id, nom, points, rang}],
}
```

`jouer.js` ne câble que `modeSaisie: "vainqueur-plus-valeur"` (le seul
que Pétanque utilise) -- les autres valeurs prévues au contrat
(`clavier`, `boutons` fixes) seront ajoutées quand un jeu les utilisera
réellement, pas avant.

**Pétanque** : `uniteParticipant: "equipe"` (même un joueur seul =
équipe d'un seul membre, pas de cas spécial "solo"). `configParticipant`
capture le nombre de flèches par coéquipier (1 à 3, défaut 3) pendant
la mise en place. `valeursPossibles()` est **dynamique** : somme des
flèches des coéquipiers de CE participant (une équipe à 2 coéquipiers
à 3 flèches peut marquer jusqu'à 6 points d'un coup), pas une plage
fixe. Objectif 13 points.

**Stockage** (`storage.js`, IndexedDB) : deux stores seulement,
`joueurs` (mémorisés d'une partie à l'autre pour l'autocomplete) et
`parties` (historique complet, équipes recomposées à la volée dans
chaque partie -- pas de store `equipes` séparé, une composition
d'équipe n'a de sens que pour la partie du jour, voir le commentaire en
tête de `storage.js`).

**Page de jeu** (`jouer.html?jeu=<id>`, `jouer.js`) : 4 écrans dans
l'ordre (règles → mise en place équipes/coéquipiers → manches →
résultat final), un seul `<section class="ecran">` visible à la fois.
La mise en place est séquentielle : nommer une équipe, lui ajouter des
coéquipiers un par un (nom + flèches), "Équipe suivante" ou "Commencer
la partie" (≥ 2 équipes requises). Vérifié par test Selenium réel
(voir "Vérification" plus bas) : assistant de mise en place, plage de
points dynamique correcte (`[1,2,3]` pour un coéquipier à 3 flèches),
mise à jour du classement en direct.

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
