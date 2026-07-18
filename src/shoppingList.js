// Bevásárlólista tiszta segédfüggvényei — nem nyúl a storage.js-hez.

import { scaleIngredients, unitFamily, unitLabel, WEIGHT_GRAMS, VOLUME_ML, trimAmount, formatIngredientLine } from "./recipes.js";
import { getEntriesInRange } from "./mealPlanCalendar.js";

export function mergeKey(name, unit) {
  return (name || "").trim().toLowerCase().replace(/\s+/g, " ") + "|" + (unit || "").trim().toLowerCase();
}

export function normalizeName(name) {
  return (name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function newLineId() {
  return Date.now() + "-" + Math.random().toString(36).slice(2, 7);
}

// Egyazon hozzávaló (biztosan azonos néven) több forrásból jött mennyiségeinek
// összevonása. Ha minden mennyiség egy mértékegység-családba tartozik (súly:
// g/dkg/kg, vagy térfogat: ml/dl/l), a végösszeg kg-ban ill. literben jön ki --
// ha viszont van köztük össze NEM vethető (pl. csipet, evőkanál, db, üveg),
// azok külön "parts" listaként maradnak, szövegesen egymás mellett felsorolva,
// SOHA nem számolva össze egy hamis végösszeggé.
export function combineContribution(existing, addAmount, addUnit) {
  const contributions = existing.parts && existing.parts.length
    ? existing.parts.slice()
    : [{ amount: existing.amount, unit: existing.unit }];
  contributions.push({ amount: addAmount, unit: addUnit || "db" });
  return resolveContributions(contributions);
}

function resolveContributions(contributions) {
  const byUnit = {};
  for (const c of contributions) {
    const u = c.unit || "db";
    byUnit[u] = (byUnit[u] || 0) + (Number(c.amount) || 0);
  }
  const units = Object.keys(byUnit);
  if (units.length === 1) {
    return { amount: round2(byUnit[units[0]]), unit: units[0], parts: null };
  }

  const weightUnits = units.filter((u) => unitFamily(u) === "weight");
  const volumeUnits = units.filter((u) => unitFamily(u) === "volume");
  const otherUnits = units.filter((u) => !unitFamily(u));

  const resultParts = [];
  if (weightUnits.length > 1) {
    const totalG = weightUnits.reduce((s, u) => s + byUnit[u] * WEIGHT_GRAMS[u], 0);
    resultParts.push({ amount: round2(totalG / 1000), unit: "kg" });
  } else if (weightUnits.length === 1) {
    resultParts.push({ amount: round2(byUnit[weightUnits[0]]), unit: weightUnits[0] });
  }
  if (volumeUnits.length > 1) {
    const totalMl = volumeUnits.reduce((s, u) => s + byUnit[u] * VOLUME_ML[u], 0);
    resultParts.push({ amount: round2(totalMl / 1000), unit: "l" });
  } else if (volumeUnits.length === 1) {
    resultParts.push({ amount: round2(byUnit[volumeUnits[0]]), unit: volumeUnits[0] });
  }
  for (const u of otherUnits) {
    resultParts.push({ amount: round2(byUnit[u]), unit: u });
  }

  if (resultParts.length === 1) {
    return { amount: resultParts[0].amount, unit: resultParts[0].unit, parts: null };
  }
  return { amount: null, unit: null, parts: resultParts };
}

// A naptárban kijelölt tartomány (vagy egyetlen nap, ha rangeStart === rangeEnd)
// betervezett receptjeinek skálázott + egymás közt összevont hozzávalói.
export function buildTransferPreview(mealPlan, recipes, rangeStart, rangeEnd) {
  const entries = getEntriesInRange(mealPlan, rangeStart, rangeEnd);
  const merged = {};
  for (const entry of entries) {
    const recipe = recipes[entry.recipeId];
    if (!recipe) continue;
    const scaled = scaleIngredients(recipe.ingredients, recipe.baseServings, entry.servings);
    for (const ing of scaled) {
      const key = mergeKey(ing.name, ing.unit);
      if (!merged[key]) {
        merged[key] = { key, name: ing.name.trim(), unit: ing.unit, amount: 0, sourceEntryIds: [] };
      }
      merged[key].amount += Number(ing.amount) || 0;
      if (!merged[key].sourceEntryIds.includes(entry.id)) merged[key].sourceEntryIds.push(entry.id);
    }
  }
  return Object.values(merged)
    .map((l) => ({ ...l, amount: round2(l.amount), checked: true }))
    .sort((a, b) => a.name.localeCompare(b.name, "hu"));
}

// A megerősített (bepipált, esetleg szerkesztett mennyiségű) sorokat beilleszti
// a ténylegesen tárolt bevásárlólistába — meglévő "pending" sorral összevonva,
// ha a NÉV pontosan egyezik (az egység eltérhet -- ld. combineContribution);
// "sent" sorral sosem vonódik össze.
export function mergeIntoShoppingList(shoppingList, confirmedLines) {
  const next = { ...shoppingList };
  for (const line of confirmedLines) {
    if (!line.name || !line.name.trim() || !line.amount) continue;
    const nameKey = normalizeName(line.name);
    const existing = Object.values(next).find((l) => l.status === "pending" && normalizeName(l.name) === nameKey);
    if (existing) {
      const combined = combineContribution(existing, line.amount, line.unit);
      next[existing.id] = {
        ...existing,
        ...combined,
        sourceEntryIds: Array.from(new Set([...(existing.sourceEntryIds || []), ...(line.sourceEntryIds || [])])),
      };
    } else {
      const id = newLineId();
      next[id] = {
        id,
        name: line.name.trim(),
        unit: line.unit,
        amount: round2(line.amount),
        parts: null,
        status: "pending",
        sourceEntryIds: line.sourceEntryIds || [],
        createdAt: new Date().toISOString(),
      };
    }
  }
  return next;
}

export function addAdhocItem(shoppingList, { name, amount, unit }) {
  const id = newLineId();
  return {
    ...shoppingList,
    [id]: {
      id,
      name: (name || "").trim(),
      amount: round2(amount) || 1,
      unit: unit || "db",
      parts: null,
      status: "pending",
      sourceEntryIds: [],
      createdAt: new Date().toISOString(),
    },
  };
}

// Egy AI-javasolt "esetleg ugyanaz" csoport véglegesítése: a megadott sorazonosítókat
// egyetlen sorrá vonja össze (a megadott kanonikus néven), a mennyiségeket pedig
// combineContribution-nel egyesíti (súly/térfogat család esetén kg/liter, egyébként
// "parts"-ként, szövegesen egymás mellett). A bemeneti sorok törlődnek, csak az új
// egyesített sor marad -- forrás-recept infó (sourceEntryIds) egyesítve megmarad.
export function mergeDuplicateLines(shoppingList, lineIds, canonicalName) {
  const lines = lineIds.map((id) => shoppingList[id]).filter(Boolean);
  if (lines.length < 2) return shoppingList;
  let combined = { amount: lines[0].amount, unit: lines[0].unit, parts: lines[0].parts || null };
  let sourceEntryIds = [...(lines[0].sourceEntryIds || [])];
  for (const line of lines.slice(1)) {
    const contributions = line.parts && line.parts.length ? line.parts : [{ amount: line.amount, unit: line.unit }];
    for (const c of contributions) {
      combined = combineContribution(combined, c.amount, c.unit);
    }
    sourceEntryIds = Array.from(new Set([...sourceEntryIds, ...(line.sourceEntryIds || [])]));
  }
  const next = { ...shoppingList };
  for (const id of lineIds) delete next[id];
  const id = newLineId();
  next[id] = {
    id,
    name: (canonicalName || lines[0].name).trim(),
    ...combined,
    status: "pending",
    sourceEntryIds,
    createdAt: new Date().toISOString(),
  };
  return next;
}

// Egy bevásárlólista-sorhoz tartozó naptári bejegyzések receptneveinek egyedi,
// ABC-sorrendbe rendezett listája -- ebből épül a "melyik kajához kell" felirat.
export function getSourceRecipeNames(sourceEntryIds, mealPlan, recipes) {
  const set = new Set();
  for (const entryId of sourceEntryIds || []) {
    const entry = mealPlan[entryId];
    const recipe = entry && recipes[entry.recipeId];
    if (recipe && recipe.name) set.add(recipe.name);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "hu"));
}

// Egy sor mennyiségének megjelenítendő szövege -- "parts" esetén a nem összeadható
// rész-mennyiségeket "+"-szal felsorolva mutatja (pl. "2 csipet + 0,5 kg"), egyébként
// a szokásos "mennyiség egység" formátumot adja.
export function formatLineAmount(line) {
  if (line.parts && line.parts.length) {
    return line.parts
      .map((p) => `${trimAmount(p.amount)} ${p.unit === "db" ? "db" : unitLabel(p.unit)}`)
      .join(" + ");
  }
  return `${trimAmount(line.amount)} ${line.unit === "db" || !line.unit ? "db" : unitLabel(line.unit)}`;
}

// Egy "esetleg ugyanaz" csoport neveiből a legspecifikusabbat (leghosszabbat)
// választja alapértelmezett egyesített névnek -- pl. "vöröshagyma" a "hagyma" helyett.
export function pickCanonicalName(names) {
  return names.slice().sort((a, b) => b.length - a.length || a.localeCompare(b, "hu"))[0] || "";
}

// Egy sor OurGroceries-be küldendő szöveges tétel(ei) -- "parts" esetén minden
// rész-mennyiség KÜLÖN tételként megy ki (pl. "2 csipet só" és "0,5 kg só"),
// hogy bevásárláskor egyik mennyiség se vesszen el egy hamis összegbe gyúrva.
export function formatLineForExport(line) {
  if (line.parts && line.parts.length) {
    return line.parts.map((p) => formatIngredientLine({ name: line.name, amount: p.amount, unit: p.unit }));
  }
  return [formatIngredientLine(line)];
}

export function setLineStatus(shoppingList, lineIds, status) {
  const next = { ...shoppingList };
  for (const id of lineIds) {
    if (next[id]) next[id] = { ...next[id], status };
  }
  return next;
}
