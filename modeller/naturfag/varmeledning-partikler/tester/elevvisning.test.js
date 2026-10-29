// Det eleven ser og leser, skal stemme med fysikken (F08 i revisjonen 29.10.2026).
// Kjøres med `node --test` fra rotmappa.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lagTaPaa, lagIsbit, kaldestKloss, forstSmeltet, TA_PAA_MATERIALER, ROMTEMPERATUR } from "../modell.js";
import { beskrivTaPaa, beskrivIsbit, formaterTid } from "../visning.js";
import { formaterGrader } from "../../../../felles/js/format.js";

const data = JSON.parse(readFileSync(new URL("../../../../felles/data/materialer.json", import.meta.url), "utf8"));

test("Tekstlinja før start bruker temperaturene fra datafila og modellen", () => {
  const tekst = beskrivTaPaa(data, lagTaPaa(data, { venstre: "aluminium", hoyre: "tre" }), false);
  assert.ok(tekst.includes(`Fingeren (${formaterGrader(data.konstanter.hudtemperatur.verdi, 0)})`), tekst);
  assert.ok(tekst.includes(`Begge klossene er ${formaterGrader(ROMTEMPERATUR, 0)}`), tekst);
});

test("Ta på: fasiten peker på klossen der huden faktisk ble kaldest, og tekstlinja viser de samme tallene", () => {
  for (const m of TA_PAA_MATERIALER) {
    if (m === "tre") continue;
    const tp = lagTaPaa(data, { venstre: m, hoyre: "tre" });
    tp.steg(2); // kontrolleren viser resultatet etter 2 s
    const [a, b] = tp.scener.map((s) => s.kontaktTemperatur());
    const fasit = kaldestKloss(tp);
    if (fasit === "venstre") assert.ok(a < b, m);
    else if (fasit === "hoyre") assert.ok(b < a, m);
    else assert.ok(Math.abs(a - b) < 1, m);
    const tekst = beskrivTaPaa(data, tp, true);
    assert.ok(tekst.includes(formaterGrader(a)) && tekst.includes(formaterGrader(b)), `${m}: ${tekst}`);
  }
});

test("Isbit: isbiten fasiten sier smeltet først, er den tekstlinja sier er helt smeltet", () => {
  const ib = lagIsbit(data);
  while (forstSmeltet(ib) === null) ib.steg(10);
  const forst = forstSmeltet(ib);
  for (const s of ib.scener) assert.equal(s.smeltetVed !== null, s.materiale === forst, s.materiale);
  const tekst = beskrivIsbit(data, ib);
  assert.equal((tekst.match(/helt smeltet/g) ?? []).length, 1, tekst);
  assert.ok(tekst.startsWith(`Etter ${formaterTid(ib.tid)}:`), tekst);
});
