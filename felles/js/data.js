// Henter materialverdiene. Alle modeller bruker denne, så verdiene bare finnes ett sted.
//
// Når en modell pakkes til én enkelt fil (verktoy/lag-enkeltfil.js), legges innholdet
// i globalThis.NATURFAG_MATERIALER, og da trengs ingen henting.

export async function hentMaterialer() {
  if (globalThis.NATURFAG_MATERIALER) return globalThis.NATURFAG_MATERIALER;
  const svar = await fetch(new URL("../data/materialer.json", import.meta.url));
  if (!svar.ok) throw new Error(`Fant ikke materialer.json (${svar.status})`);
  return svar.json();
}
