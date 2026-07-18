// AI-alapú felismerés: a bevásárlólista tételei közül mely nevek jelenthetik
// valószínűleg ugyanazt az alapanyagot (szinonima, jelzős/jelző nélküli változat,
// elgépelés) -- csak JAVASLAT, a felhasználó dönt a végleges egyesítésről.

import { askAI } from "./aiProxy.js";

const DUPLICATE_SYSTEM_PROMPT = `Bevásárlólista-tételek neveit kapod, soronként egyet. A feladatod, hogy megtaláld, mely tételek jelentik VALÓSZÍNŰLEG ugyanazt az alapanyagot/terméket, csak más néven/formában írva.

Légy bátran gyakorlatias, ne csak a szó szerinti egyezést keresd -- ezek MIND tipikus, helyes párosítások, amiket fel kell ismerned:
- jelző nélküli és jelzős/általános alak: "hagyma" és "vöröshagyma" (magyar receptekben a puszta "hagyma" szinte mindig vöröshagymát jelent) -- EGYEZŐ.
- feldolgozási forma: "sajt" és "reszelt sajt", "paradicsom" és "aprított paradicsom (konzerv)" -- EGYEZŐ.
- egyes/többes szám, elgépelés, ékezethiba: "paradicsomok"/"paradicsom", "csirkemel"/"csirkemell" -- EGYEZŐ.

Csak akkor NE csoportosíts, ha a két név ténylegesen más terméket/élelmiszert takar, még ha hasonló is a hangzása -- pl. "újhagyma" (zöldhagyma, más zöldség) és "vöröshagyma" különbözőek; "tejföl" és "tejszín" különböző tejtermékek; "petrezselyemgyökér" és "petrezselyemzöld" különböző részek. Ha bizonytalan vagy, de a hétköznapi bevásárláskor valószínűleg ugyanazt vennéd meg -- inkább csoportosítsd össze, mert ez csak egy javaslat, amit a felhasználó úgyis jóváhagy vagy elutasít.

Válaszolj KIZÁRÓLAG ezzel a JSON formátummal, más szöveg nélkül:
{"groups": [["név1", "név2"], ["név3", "név4", "név5"]]}
Minden csoport a pontosan megadott, eredeti nevek tömbje (legalább 2 elem egy csoportban). Egy név csak egy csoportba kerülhet. Ha nincs egyetlen valószínű csoport sem, "groups" legyen üres tömb: [].`;

export async function findPossibleDuplicateGroups(names) {
  const uniqueNames = Array.from(new Set((names || []).map((n) => (n || "").trim()).filter(Boolean)));
  if (uniqueNames.length < 2) return [];
  const messages = [{ role: "user", content: uniqueNames.join("\n") }];
  const parsed = await askAI(messages, DUPLICATE_SYSTEM_PROMPT);
  const groups = parsed && Array.isArray(parsed.groups) ? parsed.groups : [];
  return groups
    .filter((g) => Array.isArray(g))
    .map((g) => Array.from(new Set(g.filter((n) => uniqueNames.includes(n)))))
    .filter((g) => g.length >= 2);
}
