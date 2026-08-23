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

## Décisions actées avant tout code (2026-08-20, précisées le 2026-08-23)

- **Stack** : même socle que FletchLog -- PWA statique vanilla
  JS/HTML/CSS, IndexedDB, service worker, GitHub Pages, zéro build
  step. Cohérent avec l'environnement de dev habituel (pas de
  toolchain natif/Flutter disponible, mais un vrai navigateur + serveur
  HTTP local déjà éprouvés sur FletchLog).
- **Moteur générique + jeux interchangeables** : chaque "jeu" est une
  règle de scoring/fin de partie appliquée aux mêmes données brutes
  (des flèches tirées par volée), pas une appli par jeu. Modules ES
  natifs (`<script type="module">`) envisagés pour `moteur/`
  spécifiquement, pour un vrai `import`/`export` par jeu plutôt que des
  globals partagés.
- **Cibles IFAA (noir/blanc, 3 zones), pas World Archery (10 zones
  colorées)** -- FFTL est le représentant officiel de l'IFAA en France
  (pas la FFTA/World Archery), vérifié avant de supposer. Le visuel des
  cibles à dessiner (voir plus bas) doit refléter ça, pas des anneaux
  colorés.
- **Saisie graphique par position, pas par valeur numérique tapée**
  (retour utilisateur, 2026-08-23) : taper directement sur l'image de
  la cible plutôt que remplir un champ numérique. Décision structurante
  pour le modèle de données -- une "volée" doit capturer la **position
  d'impact** (x, y relatifs à la cible), pas juste une valeur 0-10/X.
  La valeur numérique classique se déduit trivialement de la position
  (quel anneau touché) ; l'inverse est impossible. Nécessaire pour les
  jeux "au plus proche du centre" (très courants dans les vrais jeux de
  club, voir fletchapps#3) que le modèle "valeur seule" ne permettait
  pas de représenter.
- **Publication gated sur release dès le départ** (`.github/workflows/pages.yml`,
  `on: push: tags: ["v*.*.*"]` + `workflow_dispatch`, jamais sur un
  simple push de branche) -- pas de dette à créer comme FletchLog, qui
  a dû migrer après coup (voir fletchlog#21). À poser dès qu'il y a un
  vrai contenu à publier au-delà de la page d'accueil.

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

## Page d'accueil (2026-08-23)

`index.html` seul pour l'instant -- pas encore de `app.html`/`aide.html`
(le moteur de jeu n'existe pas encore). Même patron que
`fletchlog/index.html` : hero (logo + wordmark bicolore "Fletch"+"Games",
`--gold` sur la 2e moitié) + sélecteurs thème/langue + footer. Pas de
service worker pour l'instant (rien à mettre hors-ligne tant qu'il n'y
a qu'une page statique) -- à ajouter avec le premier vrai contenu
d'appli.
