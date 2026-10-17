// Fysiske tester for "Overflate og volum". Kjøres med `node --test` fra rotmappa.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lagSnoforsok, smeltetid, lagBiter, overflateOgVolum, OPPDELINGER } from "../modell.js";

const data = JSON.parse(readFileSync(new URL("../../../felles/data/materialer.json", import.meta.url), "utf8"));
const timer = (s) => `${(s / 3600).toFixed(1)} t`;

test("Alle oppdelinger har samme mengde snø", () => {
  const masser = OPPDELINGER.map((o) => lagSnoforsok(data, { oppdeling: o.id }).startMasse);
  for (const m of masser) assert.ok(Math.abs(m - masser[0]) < 1e-12);
});

test("Bitene overlapper ikke og ligger inne i gitteret", () => {
  for (const o of OPPDELINGER) {
    const f = lagSnoforsok(data, { oppdeling: o.id });
    const g = f.gitter;
    let celler = 0;
    for (const b of lagBiter(o.id)) {
      assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.b <= g.nx && b.y + b.h <= g.ny, o.id);
      celler += b.b * b.h;
    }
    assert.equal(celler, 16 * 16, o.id);
  }
});

for (const kilder of [{}, { sol: true }, { underlag: true }]) {
  const navn = Object.keys(kilder).join(" og ") || "bare luft";
  test(`Flere biter smelter raskere totalt (${navn})`, (t) => {
    const tider = ["1", "4", "16", "64"].map((id) => smeltetid(data, { oppdeling: id, ...kilder }));
    t.diagnostic(`1: ${timer(tider[0])}, 4: ${timer(tider[1])}, 16: ${timer(tider[2])}, 64: ${timer(tider[3])}`);
    for (let i = 1; i < tider.length; i++) assert.ok(tider[i] < tider[i - 1]);
    // Halvert sidekant gir dobbelt så mye overflate per volum. Tiden bør da omtrent halveres.
    for (let i = 1; i < tider.length; i++) {
      const forhold = tider[i] / tider[i - 1];
      assert.ok(forhold > 0.3 && forhold < 0.65, `forhold ${forhold.toFixed(2)}`);
    }
  });
}

test("Spredt utover smelter raskere enn én blokk", () => {
  assert.ok(smeltetid(data, { oppdeling: "spredt" }) < smeltetid(data, { oppdeling: "1" }));
});

test("Hjørnene når 0 °C før midten av en side", (t) => {
  for (const kilder of [{}, { sol: true }, { underlag: true }]) {
    const f = lagSnoforsok(data, { oppdeling: "1", ...kilder });
    while (f.midtNullVed === null) f.steg(30);
    t.diagnostic(`${JSON.stringify(kilder)}: hjørne ${Math.round(f.hjorneNullVed / 60)} min, sidemidt ${Math.round(f.midtNullVed / 60)} min`);
    assert.ok(f.hjorneNullVed < f.midtNullVed);
  }
});

test("Snøen står på 0 °C mens den smelter, og ingen snø er over 0 °C", () => {
  const f = lagSnoforsok(data, { oppdeling: "4", sol: true });
  const g = f.gitter;
  let smeltende = 0;
  while (f.smeltetVed === null) {
    f.steg(300);
    for (let y = 0; y < g.ny; y++) {
      for (let x = 0; x < g.nx; x++) {
        if (g.erTom(x, y)) continue;
        const a = g.smeltetAndel(x, y);
        const T = g.temperatur(x, y);
        if (a > 0 && a < 1) {
          assert.equal(T, 0);
          smeltende++;
        }
        if (a < 1) assert.ok(T <= 0, `snø på ${T} °C`);
      }
    }
  }
  assert.ok(smeltende > 100);
});

test("Massen er bevart: snø igjen + vann som rant bort = start", () => {
  const f = lagSnoforsok(data, { oppdeling: "16", underlag: true });
  f.steg(2 * 3600);
  assert.ok(Math.abs(f.snoIgjen() + f.rantBort - f.startMasse) < 1e-12);
});

test("Energiregnskapet går opp med luft, sol og underlag", () => {
  const f = lagSnoforsok(data, { oppdeling: "16", sol: true, underlag: true });
  const start = f.gitter.totalEnergi();
  f.steg(3 * 3600);
  const r = f.gitter.energiregnskap;
  const forventet = start + r.luft + r.effekt + r.laast + r.underlag - r.fjernet;
  assert.ok(Math.abs(f.gitter.totalEnergi() - forventet) < 1e-9 * (Math.abs(start) + Math.abs(r.fjernet)));
  assert.ok(r.effekt > 0 && r.underlag > 0 && r.luft > 0);
});

test("Overflate per volum dobles når sidekanten halveres (terninger)", () => {
  const tall = ["1", "4", "16", "64"].map(overflateOgVolum);
  for (let i = 1; i < tall.length; i++) {
    assert.ok(Math.abs(tall[i].perVolum / tall[i - 1].perVolum - 2) < 1e-12);
    assert.equal(tall[i].volum, tall[0].volum);
    assert.equal(tall[i].antall, 8 * tall[i - 1].antall);
  }
});
