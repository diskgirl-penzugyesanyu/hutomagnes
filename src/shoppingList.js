// Bevásárlólista tiszta segédfüggvényei — nem nyúl a storage.js-hez.

import { scaleIngredients } from "./recipes.js";
import { getEntriesInRange } from "./mealPlanCalendar.js";

export function mergeKey(name, unit) {
  return (name || "").trim().toLowerCase().replace(/\s+/g, " ") + "|" + (unit || "").trim().toLowerCase();
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function newLineId() {
  return Date.now() + "-" + Math.random().toString(36).slice(2, 7);
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
// ha név+egység pontosan egyezik; "sent" sorral sosem vonódik össze.
export function mergeIntoShoppingList(shoppingList, confirmedLines) {
  const next = { ...shoppingList };
  for (const line of confirmedLines) {
    if (!line.name || !line.name.trim() || !line.amount) continue;
    const key = mergeKey(line.name, line.unit);
    const existing = Object.values(next).find((l) => l.status === "pending" && mergeKey(l.name, l.unit) === key);
    if (existing) {
      next[existing.id] = {
        ...existing,
        amount: round2(existing.amount + Number(line.amount)),
        sourceEntryIds: Array.from(new Set([...(existing.sourceEntryIds || []), ...(line.sourceEntryIds || [])])),
      };
    } else {
      const id = newLineId();
      next[id] = {
        id,
        name: line.name.trim(),
        unit: line.unit,
        amount: round2(line.amount),
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
      status: "pending",
      sourceEntryIds: [],
      createdAt: new Date().toISOString(),
    },
  };
}

export function setLineStatus(shoppingList, lineIds, status) {
  const next = { ...shoppingList };
  for (const id of lineIds) {
    if (next[id]) next[id] = { ...next[id], status };
  }
  return next;
}
