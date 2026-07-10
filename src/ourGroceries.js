// OurGroceries szinkron kliens -- a Render-en futó FastAPI proxy hívása
// (ourgroceries-service/), ami a valódi OurGroceries fiókba írja a tételeket.
// Az URL és az API-kulcs .env-ből jön build időben (lásd .env.example),
// nem szerepel a git history-ban.

const OURGROCERIES_URL = import.meta.env.VITE_OURGROCERIES_URL;
const API_TOKEN = import.meta.env.VITE_OURGROCERIES_TOKEN;

export async function syncToOurGroceries(items) {
  if (!items || items.length === 0) return { success: true, added: 0 };
  if (!OURGROCERIES_URL || !API_TOKEN) {
    throw new Error("Az OurGroceries kapcsolat nincs beállítva (hiányzó .env).");
  }

  let res;
  try {
    res = await fetch(`${OURGROCERIES_URL}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": API_TOKEN },
      body: JSON.stringify({ items }),
    });
  } catch {
    throw new Error("Nem sikerült elérni az OurGroceries szolgáltatást -- ellenőrizd az internetkapcsolatot.");
  }

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || !data || !data.success) {
    const detail = data && data.detail ? data.detail : `HTTP ${res.status}`;
    throw new Error(`Nem sikerült elküldeni az OurGroceries-be: ${detail}`);
  }

  return data;
}
