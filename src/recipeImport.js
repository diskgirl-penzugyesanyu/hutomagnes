// AI-alapú recept-import: linkből, fotóból (kézzel írt recept) és beillesztett
// szövegből (pl. social media leírás) egyaránt ugyanazt a JSON-formát kéri az
// AI-tól, amit a felülvizsgáló űrlap (RecipeForm) be tud tölteni.

import { askAI, compressImage, fetchRecipeText } from "./aiProxy.js";
import { UNITS, newId } from "./recipes.js";

const UNIT_VALUES = UNITS.map((u) => u.value).join(", ");

const RECIPE_SYSTEM_PROMPT = `Egy magyar háztartás recept-adatait kell kinyerned szövegből (weboldal tartalma vagy beillesztett leírás). Válaszolj KIZÁRÓLAG a következő JSON formátumban, más szöveg nélkül:
{"name": "...", "baseServings": 4, "ingredients": [{"name": "...", "amount": 1, "unit": "db"}], "instructions": "..."}

Szabályok:
- "unit" mindig ez a zárt lista egyike legyen: ${UNIT_VALUES}. Ha a szövegben más mértékegység szerepel (pl. "evőkanál", "csipet"), és nincs jó megfelelő a listában, tedd a mennyiség leírását a "name" mezőbe (pl. name: "olívaolaj (2 evőkanál)", amount: 1, unit: "db"), NE válassz rossz egységet.
- Ha nincs megadva pontosan mennyiség egy hozzávalónál, amount legyen 1, unit legyen "db".
- Ha nincs megadva adagszám, becsülj egy jellemző magyar háztartási adagszámot (pl. 4).
- "instructions" legyen a teljes elkészítési leírás, magyarul, bekezdésekre tagolva ha lehet.
- Mindig adj vissza valamilyen becslést, még hiányos/bizonytalan bemenet esetén is -- ne utasítsd vissza a feladatot.`;

const RECIPE_PHOTO_SYSTEM_PROMPT = `Egy fényképen (esetleg kézzel írt receptkártyán) szereplő recept adatait kell kiolvasnod és kinyerned. Válaszolj KIZÁRÓLAG a következő JSON formátumban, más szöveg nélkül:
{"name": "...", "baseServings": 4, "ingredients": [{"name": "...", "amount": 1, "unit": "db"}], "instructions": "..."}

Szabályok:
- A kézírást legjobb tudásod szerint olvasd ki -- ha egy szó bizonytalan, inkább becsüld meg értelmesen, mint hogy kihagyd.
- "unit" mindig ez a zárt lista egyike legyen: ${UNIT_VALUES}. Ha nincs jó megfelelő, a mennyiséget írd a "name" mezőbe, unit legyen "db", amount legyen 1.
- Ha egy hozzávalónál nincs pontos mennyiség, amount legyen 1, unit legyen "db".
- Ha nincs megadva adagszám, becsülj egy jellemző magyar háztartási adagszámot (pl. 4).
- Mindig adj vissza valamilyen becslést, még ha a kép részben olvashatatlan is -- ne utasítsd vissza a feladatot.`;

function normalizeDraft(parsed, sourceType, sourceUrl) {
  const now = new Date().toISOString();
  const ingredients = Array.isArray(parsed.ingredients)
    ? parsed.ingredients.map((i) => ({
        name: String(i.name || "").trim(),
        amount: Number(i.amount) || 1,
        unit: UNITS.some((u) => u.value === i.unit) ? i.unit : "db",
      }))
    : [];
  return {
    id: newId(),
    name: String(parsed.name || "").trim(),
    baseServings: Number(parsed.baseServings) || 4,
    ingredients: ingredients.length ? ingredients : [{ name: "", amount: 1, unit: "db" }],
    instructions: String(parsed.instructions || "").trim(),
    sourceType,
    sourceUrl: sourceUrl || null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function extractRecipeFromText(text, sourceType = "text-import") {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Nincs mit feldolgozni -- illessz be szöveget.");

  const urlMatch = trimmed.match(/https?:\/\/[^\s]+/i);
  let pageText = "";
  if (urlMatch) {
    pageText = await fetchRecipeText(urlMatch[0]);
  }

  const parts = [];
  if (pageText) {
    parts.push(`A megadott link letöltött, olvasható tartalma:\n"""\n${pageText}\n"""`);
    if (trimmed !== urlMatch[0]) parts.push(`A felhasználó által beillesztett további szöveg:\n"""\n${trimmed}\n"""`);
  } else if (urlMatch) {
    parts.push(`(A megadott linket nem sikerült beolvasni -- csak a beillesztett szöveg alapján dolgozz:)\n"""\n${trimmed}\n"""`);
  } else {
    parts.push(`A beillesztett szöveg:\n"""\n${trimmed}\n"""`);
  }

  const messages = [{ role: "user", content: parts.join("\n\n") }];
  const parsed = await askAI(messages, RECIPE_SYSTEM_PROMPT);
  const draft = normalizeDraft(parsed, sourceType, urlMatch ? urlMatch[0] : null);
  if (urlMatch && !pageText) {
    draft._warning = "A linket nem sikerült beolvasni -- ellenőrizd a részleteket, mielőtt mented.";
  }
  return draft;
}

export async function extractRecipeFromLink(url) {
  return extractRecipeFromText(url, "link-import");
}

export async function extractRecipeFromPhoto(file) {
  const b64 = await compressImage(file);
  const messages = [
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } },
        { type: "text", text: "Olvasd ki és nyerd ki ennek a receptnek (esetleg kézzel írt receptkártyának) az adatait." },
      ],
    },
  ];
  const parsed = await askAI(messages, RECIPE_PHOTO_SYSTEM_PROMPT);
  return normalizeDraft(parsed, "photo-import", null);
}
