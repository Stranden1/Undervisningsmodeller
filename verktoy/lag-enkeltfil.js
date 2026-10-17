// Pakker en modell til én selvstendig HTML-fil som virker ved dobbeltklikk.
//
// Bruk fra rotmappa:
//   node verktoy/lag-enkeltfil.js                        (alle modeller)
//   node verktoy/lag-enkeltfil.js varmeledning-partikler (én modell)
//
// Resultatet havner i eksport/<modell>.html.
//
// Hvorfor dette trengs: nettlesere nekter å laste JS-moduler fra hverandre når en fil
// åpnes direkte fra disken (file://). Her legges alle modulene inn i én <script> i
// riktig rekkefølge, stilarkene legges inn som <style>, og materialverdiene legges i
// globalThis.NATURFAG_MATERIALER (se felles/js/data.js).
//
// Dette er en bevisst enkel "pakker": den forstår bare den skrivemåten prosjektet
// bruker – import { a, b } from "./fil.js"; og export foran function/const/let/class,
// samt export { a, b };. Bruker noen annen skrivemåte, stopper den med en tydelig feil.

import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const IMPORT = /^import\s*\{([\s\S]*?)\}\s*from\s*"([^"]+)";[ \t]*$/gm;
const EKSPORT_DEKLARASJON = /^export\s+((?:async\s+)?function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;
const EKSPORT_LISTE = /^export\s*\{([^}]*)\};?[ \t]*$/gm;

const vis = (fil) => relative(ROT, fil).split(sep).join("/");

/** Les en modul og alle modulene den importerer. Returnerer dem i rekkefølge: avhengigheter først. */
async function samleModuler(startFil) {
  const ferdig = new Map(); // fil -> { kode, avhengigheter }
  const besoker = new Set();

  async function besok(fil) {
    if (ferdig.has(fil)) return;
    if (besoker.has(fil)) throw new Error(`Sirkulær import: ${vis(fil)}`);
    besoker.add(fil);
    const kode = await readFile(fil, "utf8");
    const avhengigheter = [];
    for (const [, , fra] of kode.matchAll(IMPORT)) {
      if (!fra.startsWith(".")) throw new Error(`${vis(fil)}: kan bare pakke relative importer, ikke "${fra}"`);
      avhengigheter.push(resolve(dirname(fil), fra));
    }
    for (const a of avhengigheter) await besok(a);
    besoker.delete(fil);
    ferdig.set(fil, { kode, avhengigheter });
  }

  await besok(startFil);
  return ferdig;
}

/** Gjør om én modul til en blokk som legger eksportene sine i __moduler. */
function pakkModul(fil, kode) {
  const navn = vis(fil);
  const eksporter = [];

  let ny = kode.replace(IMPORT, (_, liste, fra) => {
    const kilde = vis(resolve(dirname(fil), fra));
    const deler = liste
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const [orig, alias] = d.split(/\s+as\s+/);
        return alias ? `${orig}: ${alias}` : orig;
      });
    return `const { ${deler.join(", ")} } = __moduler[${JSON.stringify(kilde)}];`;
  });

  ny = ny.replace(EKSPORT_DEKLARASJON, (_, type, id) => {
    eksporter.push(id);
    return `${type} ${id}`;
  });

  ny = ny.replace(EKSPORT_LISTE, (_, liste) => {
    for (const d of liste.split(",").map((x) => x.trim()).filter(Boolean)) {
      const [orig, alias] = d.split(/\s+as\s+/);
      eksporter.push(alias ? `${alias}: ${orig}` : orig);
    }
    return "";
  });

  // Sjekk at ingen import/export ble oversett.
  const rest = ny.match(/^\s*(import|export)\b.*$/m);
  if (rest) throw new Error(`${navn}: forstår ikke denne linja: ${rest[0].trim()}`);

  return (
    `// ---- ${navn} ----\n` +
    `__moduler[${JSON.stringify(navn)}] = await (async () => {\n${ny}\nreturn { ${eksporter.join(", ")} };\n})();\n`
  );
}

/** Ikke la innholdet avslutte <script>- eller <style>-taggen for tidlig. */
const trygg = (tekst, tagg) => tekst.replace(new RegExp(`</${tagg}`, "gi"), `<\\/${tagg}`);

export async function lagEnkeltfil(modell) {
  const mappe = join(ROT, "modeller", modell);
  let html = await readFile(join(mappe, "index.html"), "utf8");

  // Stilark -> <style>
  const lenker = [...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"\s*\/?>/g)];
  for (const [hele, href] of lenker) {
    const css = await readFile(resolve(mappe, href), "utf8");
    html = html.replace(hele, () => `<style>\n${trygg(css, "style")}\n</style>`);
  }

  // Modulskriptet -> ett innebygd skript
  const skript = html.match(/<script\s+type="module"\s+src="([^"]+)"><\/script>/);
  if (!skript) throw new Error(`${modell}: fant ikke <script type="module" src="...">`);
  const moduler = await samleModuler(resolve(mappe, skript[1]));
  let js = "const __moduler = {};\n";
  for (const [fil, { kode }] of moduler) js += pakkModul(fil, kode);

  const data = await readFile(join(ROT, "felles", "data", "materialer.json"), "utf8");
  JSON.parse(data); // stopp tidlig hvis fila er ødelagt

  html = html.replace(
    skript[0],
    () =>
      `<script>globalThis.NATURFAG_MATERIALER = ${trygg(data.trim(), "script")};</script>\n` +
      `  <script type="module">\n${trygg(js, "script")}</script>`
  );

  // Lenken tilbake til katalogen virker ikke i en løs fil.
  html = html.replace(/\s*<a class="tilbake"[^>]*>[^<]*<\/a>/, "");

  const dato = new Date().toISOString().slice(0, 10);
  html = html.replace(
    /<!doctype html>/i,
    `<!doctype html>\n<!-- Laget av verktoy/lag-enkeltfil.js fra modeller/${modell}/ (${dato}). Ikke rediger for hånd. -->`
  );
  return html;
}

async function hovedprogram() {
  const valgt = process.argv.slice(2);
  const alle = (await readdir(join(ROT, "modeller"), { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const modeller = valgt.length ? valgt : alle;
  await mkdir(join(ROT, "eksport"), { recursive: true });
  for (const m of modeller) {
    if (!alle.includes(m)) throw new Error(`Fant ingen modell som heter "${m}"`);
    const html = await lagEnkeltfil(m);
    const ut = join(ROT, "eksport", `${m}.html`);
    await writeFile(ut, html);
    console.log(`Laget ${vis(ut)} (${Math.round(Buffer.byteLength(html) / 1024)} kB)`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  hovedprogram().catch((feil) => {
    console.error(`Feil: ${feil.message}`);
    process.exitCode = 1;
  });
}
