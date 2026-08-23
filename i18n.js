/* Traductions -- même mécanisme que fletchlog/i18n.js (dictionnaire +
 * fonction t(), chaque page applique elle-même les traductions à ses
 * éléments [data-i18n]/[data-i18n-aria-label]).
 */
const TRANSLATIONS = {
  fr: {
    themeSystemLabel: "Thème système",
    themeLightLabel: "Thème clair",
    themeDarkLabel: "Thème sombre",

    siteFooterCredit: "Développé pour les Archers Libres de Fontaine-le-Port ·",
    siteFooterLicense: "Licence GPLv3",
    homeFooterDevLink: "Dépôt GitHub",

    homeTagline: "Mini-jeux d'entraînement au tir à l'arc, sur un moteur de score commun.",
    homeBlurb: "Score classique, Killer, Bingo, Streak, Pari... plusieurs jeux, une seule façon de saisir tes volées. En solo ou à plusieurs sur un seul téléphone, sans compte, sans serveur. Encore en construction.",
  },
  en: {
    themeSystemLabel: "System theme",
    themeLightLabel: "Light theme",
    themeDarkLabel: "Dark theme",

    siteFooterCredit: "Built for the Les Archers Libres de Fontaine-le-Port club ·",
    siteFooterLicense: "GPLv3 License",
    homeFooterDevLink: "GitHub Repository",

    homeTagline: "Archery training mini-games, built on a shared scoring engine.",
    homeBlurb: "Classic score, Killer, Bingo, Streak, Wager... several games, one shared way to enter your ends. Solo or with friends passing a single phone around, no account, no server. Still under construction.",
  },
};

function t(lang, key) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.fr;
  return dict[key] !== undefined ? dict[key] : (TRANSLATIONS.fr[key] || key);
}
