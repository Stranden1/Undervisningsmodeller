// Fysiske tester for fane 2 i "Energi som sprer seg": dyppekoker i et lukket kar.
// Kjøres med `node --test` fra rotmappa.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  lagDyppekoker,
  lagKar,
  dyppekokerEnergi,
  dyppekokerSluttemperatur,
  DYPPEKOKER,
  VANNMENGDER,
  KLOSS_T_MAKS,
  LIKEVEKT_GRENSE,
} from "../modell.js";

const data = JSON.parse(readFileSync(new URL("../../../../felles/data/materialer.json", import.meta.url), "utf8"));
const grader = (T) => `${T.toFixed(2)} °C`;
const prosent = (x) => `${(100 * x).toFixed(1)} %`;
const naer = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;

/** Kjør til alt har samme temperatur. Returnerer simulert tid i sekunder. */
function tilLikevekt(d, maksTid = 6 * 3600) {
  while (!d.regnskap().likevekt) {
    d.steg(30);
    if (d.gitter.tid > maksTid) throw new Error("Nådde ikke likevekt");
  }
  return d.gitter.tid;
}

test("Strømmen er like mye energi som varmen kobberklossen på 90 °C kom med", () => {
  const kloss = lagKar(data, { vannmengde: "middels", klossT: KLOSS_T_MAKS }).regnskap().varmeJoule;
  assert.ok(naer(dyppekokerEnergi(data), kloss, 1e-9 * kloss));
});

test("Strømmen slås av etter nøyaktig 5 min, med nøyaktig riktig energi", () => {
  // Både med vanlige steg og med ujevne skjermbilde-steg som ikke treffer 300 s.
  for (const kjor of [(d) => d.steg(7), (d) => d.stegMedBudsjett(1 / 60 * 13.7, 200)]) {
    const d = lagDyppekoker(data, { vannmengde: "middels" });
    while (d.regnskap().paa) kjor(d);
    const r = d.regnskap();
    assert.ok(naer(r.slattAvVed, DYPPEKOKER.paaTid, 1e-6), `slått av ved ${r.slattAvVed} s`);
    assert.ok(naer(r.stromLevertJoule, dyppekokerEnergi(data), 1e-6));
    // Etter avslåing kommer det ikke mer strøm.
    d.steg(600);
    assert.ok(naer(d.regnskap().stromLevertJoule, dyppekokerEnergi(data), 1e-6));
  }
});

test("Energien i alt er bevart: strøm som er igjen + varme i karet = 100 %", () => {
  for (const v of VANNMENGDER) {
    const d = lagDyppekoker(data, { vannmengde: v.id });
    const start = d.gitter.totalEnergi();
    for (let i = 0; i < 100; i++) {
      d.steg(9);
      const r = d.regnskap();
      assert.ok(naer(r.energiIAlt, 1), `${v.id}: ${r.energiIAlt}`);
      assert.ok(naer(r.varmeIKaret, 1 - r.somStrom), `${v.id}: varmen er ikke lik strømmen som er brukt`);
      // Motorens eget regnskap: energien i cellene har økt med nøyaktig det strømmen ga.
      assert.ok(naer(d.gitter.totalEnergi() - start, r.stromLevertJoule, 1e-9 * Math.abs(start)));
    }
  }
});

test("Ingen celle kommer i nærheten av 100 °C (koking er ikke med i modellen)", (t) => {
  for (const v of VANNMENGDER) {
    const d = lagDyppekoker(data, { vannmengde: v.id });
    let maks = -Infinity;
    while (d.gitter.tid < DYPPEKOKER.paaTid + 120) {
      d.steg(2);
      maks = Math.max(maks, d.regnskap().maksTemperatur);
    }
    t.diagnostic(`${v.id}: varmeste celle ${grader(maks)}`);
    assert.ok(maks < 90);
  }
});

test("Sluttemperaturen er lik håndregningen: all strømmen er blitt varme", (t) => {
  for (const v of VANNMENGDER) {
    const d = lagDyppekoker(data, { vannmengde: v.id });
    const tid = tilLikevekt(d);
    const forventet = dyppekokerSluttemperatur(data, v.id);
    const r = d.regnskap();
    t.diagnostic(`${v.id}: ${grader(r.minTemperatur)}–${grader(r.maksTemperatur)} (håndregning ${grader(forventet)}), likevekt etter ${Math.round(tid / 60)} min`);
    assert.ok(r.minTemperatur <= forventet + 1e-9 && forventet <= r.maksTemperatur + 1e-9);
    assert.ok(r.maksTemperatur - r.minTemperatur < LIKEVEKT_GRENSE);
  }
});

test("«Kan gjøre arbeid» starter på 100 %, synker hele tiden og ender på 0", (t) => {
  for (const v of VANNMENGDER) {
    const d = lagDyppekoker(data, { vannmengde: v.id });
    assert.ok(naer(d.regnskap().kanGjoreArbeid, 1), "strøm skal være 100 % nyttig ved start");
    let forrige = 1;
    let vedAvslaaing = null;
    while (!d.regnskap().likevekt) {
      d.steg(5);
      const r = d.regnskap();
      // Strømmen som går inn, gir varme som bare delvis kan gjøre arbeid, så summen synker.
      assert.ok(r.kanGjoreArbeid <= forrige + 1e-12, `${v.id}: steg fra ${forrige} til ${r.kanGjoreArbeid}`);
      forrige = r.kanGjoreArbeid;
      if (vedAvslaaing === null && !r.paa) vedAvslaaing = r.kanGjoreArbeid;
    }
    t.diagnostic(`${v.id}: start 100 %, når strømmen slås av ${prosent(vedAvslaaing)}, likevekt ${prosent(forrige)}`);
    // Trappen strøm → varmt vann → lunkent vann: i det strømmen er brukt opp, er mesteparten
    // av kvaliteten allerede borte.
    assert.ok(vedAvslaaing < 0.2);
    assert.ok(forrige < 0.001);
  }
});

test("Fane 2 er lett nok for en billig Chromebook", (t) => {
  // Samme regel som for fane 1 (se fysikk.test.js): under 60 000 celleoppdateringer per bilde
  // når likevekt skal nås på ca. ett minutt.
  for (const v of VANNMENGDER) {
    const d = lagDyppekoker(data, { vannmengde: v.id });
    const likevekt = tilLikevekt(d);
    const delsteg = Math.ceil(likevekt / 60 / 60 / d.gitter.dtMaks());
    const arbeid = delsteg * v.nx * v.ny;
    t.diagnostic(`${v.id}: likevekt ${Math.round(likevekt / 60)} min, ${delsteg} delsteg × ${v.nx * v.ny} celler = ${arbeid} per bilde`);
    assert.ok(arbeid < 60000);
  }
});
