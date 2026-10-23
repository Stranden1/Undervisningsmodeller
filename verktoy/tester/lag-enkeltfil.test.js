// Tester for verktoy/lag-enkeltfil.js. Kjøres med `node --test` fra rotmappa.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lagEnkeltfil } from "../lag-enkeltfil.js";

for (const modell of ["varmeledning-partikler", "overflate-og-volum", "energi-som-sprer-seg"]) {
  test(`${modell}: blir én fil uten eksterne filer`, async () => {
    const html = await lagEnkeltfil(modell);
    assert.ok(!/<link\s+rel="stylesheet"/.test(html), "stilark skal være lagt inn");
    assert.ok(!/<script[^>]+src=/.test(html), "skript skal være lagt inn");
    assert.ok(!/(src|href)="\.\.\//.test(html), "ingen lenker ut av fila");
    assert.ok(html.includes("globalThis.NATURFAG_MATERIALER"), "materialverdiene skal være med");
    assert.ok(!/https?:\/\/(?!www\.w3\.org)[^"'\s]+\.(js|css)/.test(html), "ingen eksterne kall");
  });

  test(`${modell}: det innebygde skriptet er gyldig JavaScript`, async () => {
    const html = await lagEnkeltfil(modell);
    const skript = html.match(/<script type="module">\n([\s\S]*?)<\/script>/)[1];
    assert.ok(!/^\s*(import|export)\b/m.test(skript), "ingen import/export igjen");
    const mappe = mkdtempSync(join(tmpdir(), "enkeltfil-"));
    try {
      const fil = join(mappe, "skript.mjs");
      writeFileSync(fil, skript);
      execFileSync(process.execPath, ["--check", fil]); // kaster ved syntaksfeil
    } finally {
      rmSync(mappe, { recursive: true, force: true });
    }
  });
}
