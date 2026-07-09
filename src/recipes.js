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
];

export function unitLabel(value) {
  const u = UNITS.find((x) => x.value === value);
  return u ? u.label : value;
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
    baseServings: 4,
    ingredients: [emptyIngredient()],
    instructions: "",
    sourceType: "manual",
    sourceUrl: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function validateRecipe(recipe) {
  if (!recipe.name || !recipe.name.trim()) return "Adj nevet a receptnek.";
  if (!recipe.baseServings || Number(recipe.baseServings) <= 0) return "Az adagszámnak nagyobbnak kell lennie nullánál.";
  const validIngredients = recipe.ingredients.filter((i) => i.name && i.name.trim());
  if (validIngredients.length === 0) return "Adj hozzá legalább egy hozzávalót.";
  return null;
}
