// Híd a testvérapphoz (Kalórianapló) -- egyirányú deep link. Ha a receptnek
// nincs makró-adata, csak egy leírást ad át, hogy a Kalórianapló saját AI-becslése
// kiszámolja a makrókat. Ha VAN makró-adat a recepten, azt (az aznapi adagszámra
// skálázva) is átadja, így a Kalórianapló nem hívja meg az AI-t, egyenesen a
// megadott értékekkel nyílik meg szerkesztésre/mentésre.

import { scaleMacros } from "./recipes.js";

export function buildLogFoodUrl(recipe, servings) {
  const description = `${recipe.name} (${servings} adag)`;
  const params = new URLSearchParams({ description });

  if (recipe.macros) {
    const scaled = scaleMacros(recipe.macros, recipe.baseServings, servings);
    params.set("calories", scaled.calories);
    params.set("protein_g", scaled.protein_g);
    params.set("fat_g", scaled.fat_g);
    params.set("fiber_g", scaled.fiber_g);
  }

  return "kalorianaplo://logfood?" + params.toString();
}

export function openInKalorianaplo(recipe, servings) {
  window.location.href = buildLogFoodUrl(recipe, servings);
}
