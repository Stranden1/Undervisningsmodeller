// Det eleven ser og leser, skal stemme med fysikken (F08 i revisjonen 29.10.2026).
// Kjøres med `node --test` fra rotmappa.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lagKar, lagDyppekoker } from "../modell.js";
import { beskriv } from "../visning.js";
import { formaterGrader } from "../../../../felles/js/format.js";

const data = JSON.parse(readFileSync(new URL("../../../../felles/data/materialer.json", import.meta.url), "utf8"));

function tilLikevekt(kar) {
  while (!kar.regnskap().likevekt) {
    kar.steg(30);
    if (kar.regnskap().tid > 6 * 3600) throw new Error("Nådde ikke likevekt");
  }
}

test("Kloss: tekstlinja underveis og ved likevekt viser tallene fra energiregnskapet", () => {
  for (const vannmengde of ["lite", "middels", "mye"]) {
    const kar = lagKar(data, { vannmengde, klossT: 90 });
    kar.steg(60);
    const r = kar.regnskap();
    const underveis = beskriv(kar, "kloss");
    assert.ok(underveis.includes(`${Math.round(r.iKlossen * 100)} % av den ekstra energien er i klossen`), underveis);
    assert.match(underveis, /til sammen 100 %/, vannmengde);

    tilLikevekt(kar);
    const slutt = beskriv(kar, "kloss");
    assert.match(slutt, /til sammen 100 %/, vannmengde);
    assert.ok(slutt.includes(`Alt har nå samme temperatur, ${formaterGrader(kar.blandingstemperatur)}`), slutt);
  }
});

test("Dyppekoker: tekstlinja følger strømmen, og til slutt er all energien i karet", () => {
  const d = lagDyppekoker(data, { vannmengde: "middels" });
  assert.match(beskriv(d, "dyppekoker"), /Ingen energi er tilført ennå/);
  d.steg(60);
  assert.match(beskriv(d, "dyppekoker"), /av energien er ikke tilført ennå/);
  tilLikevekt(d);
  const slutt = beskriv(d, "dyppekoker");
  assert.match(slutt, /Strømmen er slått av/);
  assert.match(slutt, /100 % er i karet – til sammen 100 %/);
});
