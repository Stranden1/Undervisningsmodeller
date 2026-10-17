// MAL: fysiske tester. Kjøres med `node --test` fra rotmappa.
// Sammenlign med kjente svar – ikke bare "koden kjører".

import { test } from "node:test";
import assert from "node:assert/strict";
import { lagModell } from "../modell.js";

test("temperaturen nærmer seg omgivelsene og går aldri forbi", () => {
  const m = lagModell({ startTemperatur: 80, omgivelse: 20, rate: 0.05 });
  for (let i = 0; i < 10000; i++) {
    m.steg(0.1);
    assert.ok(m.tilstand.temperatur >= 20, "gikk under omgivelsene");
  }
  assert.ok(Math.abs(m.tilstand.temperatur - 20) < 0.01);
});

test("nullstill gir starttilstanden tilbake", () => {
  const m = lagModell({ startTemperatur: 80, omgivelse: 20, rate: 0.05 });
  m.steg(30);
  m.nullstill();
  assert.equal(m.tilstand.temperatur, 80);
  assert.equal(m.tilstand.tid, 0);
});
