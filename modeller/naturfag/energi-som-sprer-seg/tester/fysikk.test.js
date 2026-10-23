// Fysiske tester for "Energi som sprer seg". Kjøres med `node --test` fra rotmappa.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  lagKar,
  blandingstemperatur,
  kanGjoreArbeid,
  VANNMENGDER,
  VANN_START,
  LIKEVEKT_GRENSE,
  KLOSS_T_MIN,
  KLOSS_T_MAKS,
} from "../modell.js";

const data = JSON.parse(readFileSync(new URL("../../../../felles/data/materialer.json", import.meta.url), "utf8"));
const grader = (T) => `${T.toFixed(2)} °C`;
const prosent = (x) => `${(100 * x).toFixed(1)} %`;

/** Kjør til alt har samme temperatur. Returnerer simulert tid i sekunder. */
function tilLikevekt(kar, maksTid = 6 * 3600) {
  while (!kar.regnskap().likevekt) {
    kar.steg(30);
    if (kar.gitter.tid > maksTid) throw new Error("Nådde ikke likevekt");
  }
  return kar.gitter.tid;
}

test("Kan gjøre arbeid: formelen stemmer med en håndregning for to like deler", () => {
  // To deler med samme C: T_slutt = √(T1·T2), så W = C·(√T1 − √T2)² (kelvin).
  const C = 1000;
  const T1 = 90;
  const T2 = 10;
  const forventet = C * (Math.sqrt(T1 + 273.15) - Math.sqrt(T2 + 273.15)) ** 2;
  assert.ok(Math.abs(kanGjoreArbeid([[C, T1], [C, T2]]) - forventet) < 1e-9 * forventet);
  // Alt likt: ingenting å hente ut.
  assert.equal(kanGjoreArbeid([[C, 25], [3 * C, 25]]), 0);
});

test("Energien i det lukkede karet er bevart", () => {
  for (const v of VANNMENGDER) {
    const kar = lagKar(data, { vannmengde: v.id, klossT: KLOSS_T_MAKS });
    const for_ = kar.gitter.totalEnergi();
    kar.steg(3600);
    const etter = kar.gitter.totalEnergi();
    assert.ok(Math.abs(etter - for_) < 1e-9 * Math.abs(for_), `${v.id}: avvik ${etter - for_} J`);
    assert.ok(Math.abs(kar.regnskap().varmeIKaret - 1) < 1e-9, v.id);
  }
});

test("Sluttemperaturen er lik blandingstemperaturen fra kalorimetri", (t) => {
  for (const v of VANNMENGDER) {
    for (const klossT of [KLOSS_T_MIN, KLOSS_T_MAKS]) {
      const kar = lagKar(data, { vannmengde: v.id, klossT });
      const tid = tilLikevekt(kar);
      const forventet = blandingstemperatur(data, v.id, klossT);
      const r = kar.regnskap();
      t.diagnostic(`${v.id}, ${klossT} °C: ${grader(r.minTemperatur)}–${grader(r.maksTemperatur)} (håndregning ${grader(forventet)}), likevekt etter ${Math.round(tid / 60)} min`);
      // Stille vann leder sakte, så de siste hundredelene tar lang tid. Når forskjellen er
      // under grensen, må håndregningen ligge mellom kaldeste og varmeste celle.
      assert.ok(r.minTemperatur <= forventet + 1e-9 && forventet <= r.maksTemperatur + 1e-9);
      assert.ok(r.maksTemperatur - r.minTemperatur < LIKEVEKT_GRENSE);
    }
  }
});

test("Mer vann gir lavere sluttemperatur, men like mye varme", () => {
  const slutt = VANNMENGDER.map((v) => blandingstemperatur(data, v.id, KLOSS_T_MAKS));
  for (let i = 1; i < slutt.length; i++) assert.ok(slutt[i] < slutt[i - 1]);
  for (const v of VANNMENGDER) {
    const kar = lagKar(data, { vannmengde: v.id, klossT: KLOSS_T_MAKS });
    kar.steg(600);
    assert.ok(Math.abs(kar.regnskap().varmeIKaret - 1) < 1e-9);
  }
});

test("Varmen går fra klossen til vannet, aldri motsatt vei", () => {
  const kar = lagKar(data, { vannmengde: "middels", klossT: KLOSS_T_MAKS });
  let forrige = kar.regnskap();
  assert.ok(Math.abs(forrige.iKlossen - 1) < 1e-12 && Math.abs(forrige.iVannet) < 1e-12);
  for (let i = 0; i < 200; i++) {
    kar.steg(10);
    const r = kar.regnskap();
    assert.ok(r.iKlossen <= forrige.iKlossen + 1e-12, "klossen fikk varme tilbake");
    assert.ok(r.iVannet >= forrige.iVannet - 1e-12, "vannet ga varme tilbake");
    assert.ok(r.minTemperatur >= VANN_START - 1e-9, "noe ble kaldere enn vannet var");
    assert.ok(r.maksTemperatur <= KLOSS_T_MAKS + 1e-9, "noe ble varmere enn klossen var");
    forrige = r;
  }
});

test("«Kan gjøre arbeid» synker hele tiden og ender på 0", (t) => {
  for (const v of VANNMENGDER) {
    const kar = lagKar(data, { vannmengde: v.id, klossT: KLOSS_T_MAKS });
    const start = kar.regnskap().kanGjoreArbeid;
    assert.ok(start > 0.05 && start < 0.2, `${v.id}: start ${prosent(start)}`);
    let forrige = start;
    const underveis = {};
    while (!kar.regnskap().likevekt) {
      kar.steg(5);
      const na = kar.regnskap().kanGjoreArbeid;
      assert.ok(na <= forrige + 1e-12, `${v.id}: steg fra ${forrige} til ${na}`);
      forrige = na;
      for (const s of [60, 300]) if (underveis[s] === undefined && kar.gitter.tid >= s) underveis[s] = na;
    }
    t.diagnostic(`${v.id}: start ${prosent(start)}, 1 min ${prosent(underveis[60])}, 5 min ${prosent(underveis[300])}, likevekt ${prosent(forrige)}`);
    assert.ok(forrige < 0.001);
  }
});

test("Lett nok for en billig Chromebook", (t) => {
  // Visningen skal nå likevekt på ca. ett minutt. Da må hvert skjermbilde (60 per sekund)
  // simulere likevektstid/60/60 sekunder. Arbeidet per bilde er delsteg × celler.
  // Målt 23. okt.: ca. 20 ns per celleoppdatering på utviklings-PC-en. Fase 1 fant at
  // ca. 9 ms per bilde var for tungt. 60 000 oppdateringer ≈ 1,2 ms, så en Chromebook
  // som er 5–7 ganger tregere, har fortsatt tid til å tegne.
  for (const v of VANNMENGDER) {
    const kar = lagKar(data, { vannmengde: v.id, klossT: KLOSS_T_MAKS });
    const likevekt = tilLikevekt(kar);
    const perBilde = likevekt / 60 / 60;
    const delsteg = Math.ceil(perBilde / kar.gitter.dtMaks());
    const arbeid = delsteg * v.nx * v.ny;
    t.diagnostic(`${v.id}: likevekt ${Math.round(likevekt / 60)} min, ${delsteg} delsteg × ${v.nx * v.ny} celler = ${arbeid} per bilde`);
    assert.ok(arbeid < 60000);
  }
});

test("Klossens temperatur utenfor 40–90 °C avvises", () => {
  assert.throws(() => lagKar(data, { klossT: 120 }), RangeError);
  assert.throws(() => lagKar(data, { klossT: 20 }), RangeError);
});
