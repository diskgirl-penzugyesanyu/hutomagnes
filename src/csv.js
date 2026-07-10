// Recept-könyvtár CSV-exportja -- biztonsági mentésnek, ha törölni kellene az
// appot. Csak a receptek/hozzávalók/mennyiségek kerülnek bele, a naptár és a
// bevásárlólista nem (ahogy kérve volt).

import { formatIngredientLine } from "./recipes.js";

function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n;]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function buildRecipesCsv(recipes) {
  const header = ["Recept neve", "Adagszám", "Hozzávalók", "Elkészítés"];
  const rows = Object.values(recipes)
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "hu"))
    .map((r) => [
      r.name,
      r.baseServings,
      (r.ingredients || []).map(formatIngredientLine).join("; "),
      r.instructions,
    ]);
  const lines = [header, ...rows].map((row) => row.map(csvEscape).join(","));
  // BOM az elején, hogy Excel/Google Sheets helyesen UTF-8-ként nyissa meg
  // (különben az ékezetes karakterek elromlanak).
  return "﻿" + lines.join("\r\n");
}

export function downloadRecipesCsv(recipes) {
  const csv = buildRecipesCsv(recipes);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `hutomagnes-receptek-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
