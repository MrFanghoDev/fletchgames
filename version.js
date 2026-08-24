/* Numéro de version affiché dans le footer -- même patron que
 * fletchlog/version.js : .github/workflows/pages.yml réécrit cette
 * constante avec le nom du tag au moment du déploiement (sed sur
 * l'artefact publié, jamais commité en retour dans le dépôt) -- la
 * valeur ci-dessous n'est donc JAMAIS ce qui s'affiche réellement en
 * production, seulement ce qu'un checkout local sans passer par le
 * workflow montrerait.
 */
const FLETCHGAMES_VERSION = "dev";
