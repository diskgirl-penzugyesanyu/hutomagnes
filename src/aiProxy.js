// Közös AI-proxy hívás -- UGYANAZT a Cloudflare Workert használja, mint a
// Kalórianapló (worker.js már generikus: {system, messages} be, OpenAI
// chat-completion JSON ki), nincs szükség a Worker módosítására.

export const PROXY_URL = "https://kalorianaplo-proxy.szomolanyi-henriett.workers.dev";

export async function askAI(messages, system) {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages }),
  });
  if (!res.ok) throw new Error("Hiba a feldolgozás közben (" + res.status + ").");
  const data = await res.json();
  const raw = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!raw) throw new Error("Nem jött értelmezhető válasz.");
  const cleaned = raw.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("A válasz nem volt feldolgozható.");
  }
}

// Kép tömörítése base64 JPEG-gé küldés előtt (ua. minta, mint a Kalórianaplóban).
// A mag (compressDataUrl) bármilyen data URL-t elfogad, hogy a natív megosztásból
// érkező (már base64-ként meglévő) kép is ugyanezen menjen át, ne csak a fájl-inputos.
export function compressDataUrl(dataUrl, maxDim = 1280, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Nem sikerült beolvasni a képet."));
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      const outUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(outUrl.split(",")[1]);
    };
    img.src = dataUrl;
  });
}

export function compressImage(file, maxDim = 1280, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Nem sikerült beolvasni a képet."));
    reader.onload = () => {
      compressDataUrl(reader.result, maxDim, quality).then(resolve, reject);
    };
    reader.readAsDataURL(file);
  });
}

// Recept-weboldal olvasható szövegének letöltése (ua. r.jina.ai reader proxy,
// mint a Kalórianapló recept-link kezelése).
export async function fetchRecipeText(url) {
  try {
    const res = await fetch("https://r.jina.ai/" + url);
    if (!res.ok) return "";
    const text = await res.text();
    // A receptes oldalak sokszor 20-25 ezer karakteres olvasható szöveget adnak
    // (navigáció, reklámok, kapcsolódó receptek is benne vannak) -- a hozzávalók
    // listája gyakran csak ezen túl kezdődik, 8000 karakternél korábban levágva
    // az AI már a hozzávalók nélkül próbált becsülni (találgatott mennyiségeket).
    return text.slice(0, 24000);
  } catch {
    return "";
  }
}
