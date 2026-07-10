// Híd a testvérapphoz (Kalórianapló) -- egyirányú deep link, ami átadja egy
// megfőzött recept leírását, hogy a Kalórianapló saját, már működő AI-becslése
// azonnal kiszámolja a makrókat. Nem duplikáljuk a becslő logikát.

export function buildLogFoodUrl(description) {
  return "kalorianaplo://logfood?description=" + encodeURIComponent(description);
}

export function openInKalorianaplo(description) {
  window.location.href = buildLogFoodUrl(description);
}
