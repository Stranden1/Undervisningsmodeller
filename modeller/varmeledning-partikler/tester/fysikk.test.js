// Fysiske tester for "Varmeledning med partikler". Kjøres med `node --test` fra rotmappa.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lagTaPaa, lagIsbit, kaldestKloss, forstSmeltet, TA_PAA_MATERIALER } from "../modell.js";

const data = JSON.parse(readFileSync(new URL("../../../felles/data/materialer.json", import.meta.url), "utf8"));

/** Kontakttemperatur etter 1 s for hvert materiale. */
function kontaktEtter1s() {
  const svar = {};
  for (const m of TA_PAA_MATERIALER) {
    const tp = lagTaPaa(data, { venstre: m, hoyre: "tre" });
    tp.steg(1);
    svar[m] = tp.scener[0].kontaktTemperatur();
  }
  return svar;
}

test("Ta på: kontakttemperaturen etter 1 s ligger nær valideringsmalen", (t) => {
  const svar = kontaktEtter1s();
  for (const [m, T] of Object.entries(svar)) {
    const mal = data.valideringsmal[m];
    t.diagnostic(`${m.padEnd(15)} ${T.toFixed(2)} °C (mal ${mal})`);
    assert.ok(Math.abs(T - mal) < 0.3, `${m}: ${T.toFixed(2)} mot ${mal}`);
  }
});

test("Ta på: rekkefølgen fra kaldest til varmest følger effusiviteten", () => {
  const svar = kontaktEtter1s();
  const e = (m) => Math.sqrt(data.materialer[m].k * data.materialer[m].rho * data.materialer[m].c);
  const etterEffusivitet = [...TA_PAA_MATERIALER].sort((a, b) => e(b) - e(a));
  const etterKontakt = [...TA_PAA_MATERIALER].sort((a, b) => svar[a] - svar[b]);
  assert.deepEqual(etterKontakt, etterEffusivitet);
});

test("Ta på: varmen strømmer alltid ut av fingeren, og mest inn i aluminium", () => {
  const tp = lagTaPaa(data, { venstre: "aluminium", hoyre: "tre" });
  for (let i = 0; i < 30; i++) {
    tp.steg(1);
    const [al, tre] = tp.scener.map((s) => s.varmestromUt());
    assert.ok(al > 0 && tre > 0, "varmen skal gå fra fingeren og inn i klossen");
    assert.ok(al > tre);
  }
  assert.equal(kaldestKloss(tp), "venstre");
});

test("Ta på: to like klosser kjennes like", () => {
  const tp = lagTaPaa(data, { venstre: "glass", hoyre: "glass" });
  tp.steg(2);
  assert.equal(kaldestKloss(tp), "like");
});

test("Isbit: smelter først på aluminium, og isen er aldri over 0 °C", (t) => {
  const ib = lagIsbit(data);
  const [al, tre] = ib.scener;
  let forrige = [0, 0];
  while (ib.tid < 15 * 60) {
    ib.steg(10);
    for (const [i, s] of ib.scener.entries()) {
      const a = s.smeltetAndel();
      assert.ok(a >= forrige[i] - 1e-12, "smeltet andel skal aldri gå ned");
      forrige[i] = a;
      const g = s.gitter;
      for (let y = 0; y < g.ny; y++) {
        for (let x = 0; x < g.nx; x++) {
          if (g.materiale(x, y) === "is" && g.smeltetAndel(x, y) < 1) assert.ok(g.temperatur(x, y) <= 0);
        }
      }
    }
  }
  t.diagnostic(`etter 15 min: aluminium ${(al.smeltetAndel() * 100).toFixed(0)} %, tre ${(tre.smeltetAndel() * 100).toFixed(0)} %`);
  assert.equal(forstSmeltet(ib), "aluminium");
  assert.ok(tre.smeltetAndel() < 0.5);
});

test("Isbit: energiregnskapet går opp, også når smeltevann renner bort", () => {
  const ib = lagIsbit(data);
  const start = ib.scener.map((s) => s.gitter.totalEnergi());
  ib.steg(600);
  for (const [i, s] of ib.scener.entries()) {
    const r = s.gitter.energiregnskap;
    const forventet = start[i] + r.luft + r.effekt + r.laast - r.fjernet;
    assert.ok(Math.abs(s.gitter.totalEnergi() - forventet) < 1e-6 * Math.abs(start[i]));
  }
});
