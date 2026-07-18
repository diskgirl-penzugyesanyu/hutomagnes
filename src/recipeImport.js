// AI-alapú recept-import: linkből, fotóból (kézzel írt recept) és beillesztett
// szövegből (pl. social media leírás) egyaránt ugyanazt a JSON-formát kéri az
// AI-tól, amit a felülvizsgáló űrlap (RecipeForm) be tud tölteni.

import { askAI, compressImage, compressDataUrl, fetchRecipeText } from "./aiProxy.js";
import { UNITS, newId } from "./recipes.js";

const UNIT_VALUES = UNITS.map((u) => u.value).join(", ");

const RECIPE_SYSTEM_PROMPT = `Egy magyar háztartás recept-adatait kell kinyerned szövegből (weboldal tartalma vagy beillesztett leírás). Válaszolj KIZÁRÓLAG a következő JSON formátumban, más szöveg nélkül:
{"name": "...", "category": "...", "baseServings": 4, "ingredients": [{"name": "...", "amount": 1, "unit": "db"}], "instructions": "...", "macros": null}

Szabályok:
- "category" legyen egy rövid, magyar kategórianév a recept típusára (pl. "Főétel", "Leves", "Desszert", "Reggeli", "Saláta", "Köret"). Ez csak JAVASLAT, a felhasználó bármikor felülírhatja.
- "unit" mindig ez a zárt lista egyike legyen: ${UNIT_VALUES}. Ha a szövegben más mértékegység szerepel (pl. "evőkanál", "csipet"), és nincs jó megfelelő a listában, tedd a mennyiség leírását a "name" mezőbe (pl. name: "olívaolaj (2 evőkanál)", amount: 1, unit: "db"), NE válassz rossz egységet.
- "Fej" mértékegység (pl. "1 fej vöröshagyma", "1 fej lilahagyma", "1 fej fokhagyma", "1 fej hagyma") mindig unit: "db"-nek felel meg, a megadott számmal -- a hagyma/fokhagyma "feje" egy darabot jelent.
- Ha nincs megadva pontosan mennyiség egy hozzávalónál, amount legyen 1, unit legyen "db".
- Ha nincs megadva adagszám, becsülj egy jellemző magyar háztartási adagszámot (pl. 4).
- "instructions" legyen a teljes elkészítési leírás, magyarul, bekezdésekre tagolva ha lehet.
- "macros": HA a forrás szöveg explicit megad tápérték-adatot a teljes receptre vagy egy adagra (pl. "tápérték/adag: 450 kcal, 32g fehérje, 18g zsír, 4g rost", vagy egy táblázat), akkor töltsd ki: {"calories": szám, "protein_g": szám, "fat_g": szám, "fiber_g": szám} -- ha az adat egy adagra vonatkozik, szorozd fel a "baseServings" értékkel, hogy a TELJES receptre vonatkozzon. Ha nincs ilyen adat a szövegben, "macros" legyen null. SOHA ne becsülj/találgass makrót, ha nincs explicit megadva -- ez esetben mindig null.
- Mindig adj vissza valamilyen becslést a hozzávalókra/leírásra, még hiányos/bizonytalan bemenet esetén is -- ne utasítsd vissza a feladatot.`;

const RECIPE_PHOTO_SYSTEM_PROMPT = `Egy fényképen (esetleg kézzel írt receptkártyán) szereplő recept adatait kell kiolvasnod és kinyerned. Válaszolj KIZÁRÓLAG a következő JSON formátumban, más szöveg nélkül:
{"name": "...", "category": "...", "baseServings": 4, "ingredients": [{"name": "...", "amount": 1, "unit": "db"}], "instructions": "...", "macros": null}

Szabályok:
- "category" legyen egy rövid, magyar kategórianév a recept típusára (pl. "Főétel", "Leves", "Desszert", "Reggeli", "Saláta", "Köret"). Ez csak JAVASLAT, a felhasználó bármikor felülírhatja.
- A kézírást legjobb tudásod szerint olvasd ki -- ha egy szó bizonytalan, inkább becsüld meg értelmesen, mint hogy kihagyd.
- "unit" mindig ez a zárt lista egyike legyen: ${UNIT_VALUES}. Ha nincs jó megfelelő, a mennyiséget írd a "name" mezőbe, unit legyen "db", amount legyen 1.
- "Fej" mértékegység (pl. "1 fej vöröshagyma", "1 fej lilahagyma", "1 fej fokhagyma", "1 fej hagyma") mindig unit: "db"-nek felel meg, a megadott számmal -- a hagyma/fokhagyma "feje" egy darabot jelent.
- Ha egy hozzávalónál nincs pontos mennyiség, amount legyen 1, unit legyen "db".
- Ha nincs megadva adagszám, becsülj egy jellemző magyar háztartási adagszámot (pl. 4).
- "macros": HA a képen explicit szerepel tápérték-adat a receptre vagy egy adagra (pl. nyomtatott táblázat), töltsd ki: {"calories": szám, "protein_g": szám, "fat_g": szám, "fiber_g": szám}, egy adagra vonatkozó adatnál szorozd fel a "baseServings" értékkel. Ha nincs ilyen adat a képen, "macros" legyen null. SOHA ne becsülj/találgass makrót a hozzávalókból -- csak akkor töltsd ki, ha ténylegesen le van írva/nyomtatva.
- Mindig adj vissza valamilyen becslést a hozzávalókra/leírásra, még ha a kép részben olvashatatlan is -- ne utasítsd vissza a feladatot.`;

function normalizeMacros(m) {
  if (!m || typeof m !== "object") return null;
  const nums = ["calories", "protein_g", "fat_g", "fiber_g"].map((k) => Number(m[k]));
  if (nums.some((n) => !Number.isFinite(n))) return null;
  const [calories, protein_g, fat_g, fiber_g] = nums;
  return { calories, protein_g, fat_g, fiber_g };
}

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
    category: String(parsed.category || "").trim(),
    baseServings: Number(parsed.baseServings) || 4,
    ingredients: ingredients.length ? ingredients : [{ name: "", amount: 1, unit: "db" }],
    instructions: String(parsed.instructions || "").trim(),
    macros: normalizeMacros(parsed.macros),
    sourceType,
    sourceUrl: sourceUrl || null,
    createdAt: now,
    updatedAt: now,
  };
}

function categoryHint(categorySuggestions) {
  if (!categorySuggestions || categorySuggestions.length === 0) return "";
  return `\n\nA felhasználó eddig ezeket a kategórianeveket használta: ${categorySuggestions.join(", ")}. Ha a recept beleillik valamelyikbe, azt javasold "category"-ként (pontosan ugyanazzal az írásmóddal); csak akkor javasolj újat, ha egyik sem illik rá.`;
}

export async function extractRecipeFromText(text, sourceType = "text-import", categorySuggestions) {
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
  const parsed = await askAI(messages, RECIPE_SYSTEM_PROMPT + categoryHint(categorySuggestions));
  const draft = normalizeDraft(parsed, sourceType, urlMatch ? urlMatch[0] : null);
  if (urlMatch && !pageText) {
    draft._warning = "A linket nem sikerült beolvasni -- ellenőrizd a részleteket, mielőtt mented.";
  }
  return draft;
}

export async function extractRecipeFromLink(url, categorySuggestions) {
  return extractRecipeFromText(url, "link-import", categorySuggestions);
}

async function extractRecipeFromCompressedB64(b64, categorySuggestions) {
  const messages = [
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } },
        { type: "text", text: "Olvasd ki és nyerd ki ennek a receptnek (esetleg kézzel írt receptkártyának) az adatait." },
      ],
    },
  ];
  const parsed = await askAI(messages, RECIPE_PHOTO_SYSTEM_PROMPT + categoryHint(categorySuggestions));
  return normalizeDraft(parsed, "photo-import", null);
}

export async function extractRecipeFromPhoto(file, categorySuggestions) {
  const b64 = await compressImage(file);
  return extractRecipeFromCompressedB64(b64, categorySuggestions);
}

// Natív "Megosztás" útján (Galériából) érkező, már base64-kódolt kép feldolgozása.
export async function extractRecipeFromSharedImage(base64, mimeType = "image/jpeg", categorySuggestions) {
  const b64 = await compressDataUrl(`data:${mimeType};base64,${base64}`);
  return extractRecipeFromCompressedB64(b64, categorySuggestions);
}
