// Recept-adatok tiszta segédfüggvényei — nem nyúl a storage.js-hez,
// az App.jsx orkesztrálja a perzisztenciát (barcode.js/csv.js mintájára).

export const UNITS = [
  { value: "g", label: "g" },
  { value: "dkg", label: "dkg" },
  { value: "kg", label: "kg" },
  { value: "ml", label: "ml" },
  { value: "dl", label: "dl" },
  { value: "l", label: "l" },
  { value: "db", label: "db" },
  { value: "uveg", label: "üveg" },
  { value: "palack", label: "palack" },
  { value: "konzerv", label: "konzerv" },
  { value: "doboz", label: "doboz" },
  { value: "zacsko", label: "zacskó" },
  { value: "bogre", label: "bögre" },
  { value: "evokanal", label: "evőkanál" },
  { value: "teaskanal", label: "teáskanál" },
  { value: "csipet", label: "csipet" },
];

export function unitLabel(value) {
  const u = UNITS.find((x) => x.value === value);
  return u ? u.label : value;
}

// Súly- és térfogat-mértékegység "családok" -- ezen belül a mennyiségek
// automatikusan átválthatók/összeadhatók (a bevásárlólistán). Minden más
// egység (db, üveg, csipet, evőkanál, stb.) nem alakítható át másikba.
export const WEIGHT_GRAMS = { g: 1, dkg: 10, kg: 1000 };
export const VOLUME_ML = { ml: 1, dl: 100, l: 1000 };

export function unitFamily(unit) {
  if (WEIGHT_GRAMS[unit] != null) return "weight";
  if (VOLUME_ML[unit] != null) return "volume";
  return null;
}

export function trimAmount(n) {
  const r = Math.round((Number(n) || 0) * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r).replace(/0+$/, "").replace(/\.$/, "");
}

export function formatIngredientLine(ing) {
  const amt = trimAmount(ing.amount);
  if (!ing.unit || ing.unit === "db") return `${amt} ${ing.name}`;
  return `${amt} ${unitLabel(ing.unit)} ${ing.name}`;
}

export function scaleIngredients(ingredients, fromServings, toServings) {
  const ratio = (Number(toServings) || 1) / (Number(fromServings) || 1);
  return ingredients.map((i) => ({ ...i, amount: Math.round(Number(i.amount) * ratio * 100) / 100 }));
}

export function newId() {
  return Date.now() + "-" + Math.random().toString(36).slice(2, 7);
}

export function emptyIngredient() {
  return { name: "", amount: 1, unit: "db" };
}

export function emptyRecipe() {
  const now = new Date().toISOString();
  return {
    id: newId(),
    name: "",
    category: "", // szabad szöveg, a felhasználó adja meg (AI javasolhat importnál)
    baseServings: 4,
    ingredients: [emptyIngredient()],
    instructions: "",
    macros: null, // { calories, protein_g, fat_g, fiber_g } az alap adagszámra, vagy null ha nincs megadva
    sourceType: "manual",
    sourceUrl: null,
    createdAt: now,
    updatedAt: now,
  };
}

// Az összes eddig használt, egyedi kategórianév -- javaslatokhoz és szűrőkhöz.
export function getAllCategories(recipes) {
  const set = new Set();
  for (const r of Object.values(recipes)) {
    const c = (r.category || "").trim();
    if (c) set.add(c);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "hu"));
}

// A makrókat az adott naphoz megadott adagszámra skálázza (ua. arányban, mint a hozzávalókat).
export function scaleMacros(macros, fromServings, toServings) {
  if (!macros) return null;
  const ratio = (Number(toServings) || 1) / (Number(fromServings) || 1);
  const round1 = (n) => Math.round((Number(n) || 0) * ratio * 10) / 10;
  return {
    calories: round1(macros.calories),
    protein_g: round1(macros.protein_g),
    fat_g: round1(macros.fat_g),
    fiber_g: round1(macros.fiber_g),
  };
}

export function validateRecipe(recipe) {
  if (!recipe.name || !recipe.name.trim()) return "Adj nevet a receptnek.";
  if (!recipe.baseServings || Number(recipe.baseServings) <= 0) return "Az adagszámnak nagyobbnak kell lennie nullánál.";
  const validIngredients = recipe.ingredients.filter((i) => i.name && i.name.trim());
  if (validIngredients.length === 0) return "Adj hozzá legalább egy hozzávalót.";
  return null;
}
