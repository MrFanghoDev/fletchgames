/* Registre des jeux -- {id -> définition}. Ajouter un jeu = écrire un
 * nouveau module ici (même contrat que petanque.js) et l'importer/
 * l'ajouter à JEUX ci-dessous -- rien d'autre à changer côté
 * index.html/jouer.js, qui lisent tous les deux ce registre.
 */
import { petanque } from "./petanque.js";
import { triangle } from "./triangle.js";
import { killer } from "./killer.js";
import { bingo } from "./bingo.js";
import { streak } from "./streak.js";

export const JEUX = { petanque, triangle, killer, bingo, streak };

export function listerJeux() {
  return Object.values(JEUX);
}

export function obtenirJeu(id) {
  return JEUX[id] || null;
}
