// Fysiske tester for den felles varmemotoren. Kjøres med `node --test` fra rotmappa.
// Hver test sammenligner med et svar vi kjenner fra fysikken – ikke bare "koden kjører".

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lagVarmegitter } from "../js/varmegitter.js";

const data = JSON.parse(readFileSync(new URL("../data/materialer.json", import.meta.url), "utf8"));
const M = data.materialer;
const L = data.konstanter.smeltevarme_is.verdi;

/** Varmekapasitet for én terningcelle med side dx. */
const C = (nokkel, dx) => M[nokkel].rho * M[nokkel].c * dx ** 3;

function minMaks(g) {
  let min = Infinity;
  let maks = -Infinity;
  for (const t of g.temperaturFelt) {
    if (Number.isNaN(t)) continue;
    min = Math.min(min, t);
    maks = Math.max(maks, t);
  }
  return { min, maks };
}

// ---------------------------------------------------------------------------
// 1. Energien er bevart
// ---------------------------------------------------------------------------

test("1a. Energien er bevart i et lukket system (fem materialer, med smelting)", () => {
  const g = lagVarmegitter({ nx: 24, ny: 12, dx: 1e-3, data, h: 0 });
  g.fyllRektangel(0, 0, 6, 12, "kobber", 60);
  g.fyllRektangel(6, 0, 6, 12, "tre", 20);
  g.fyllRektangel(12, 0, 4, 6, "is", -10);
  g.fyllRektangel(12, 6, 4, 6, "vann", 40);
  g.fyllRektangel(16, 0, 8, 12, "glass", 5);
  g.settCelle(20, 5, null); // et hull midt i glasset

  const for_ = g.totalEnergi();
  g.steg(600);
  const etter = g.totalEnergi();
  const skala = Math.abs(for_) + 1;
  assert.ok(Math.abs(etter - for_) / skala < 1e-9, `energien endret seg: ${for_} → ${etter} J`);
  assert.ok(g.smeltetMasse().smeltet > 0, "isen burde ha begynt å smelte");
});

test("1b. Med luft, effekt og fast temperatur stemmer energiregnskapet", () => {
  const g = lagVarmegitter({ nx: 16, ny: 10, dx: 1e-3, data, h: data.konstanter.h_stille_luft.verdi, luftTemperatur: 5 });
  g.fyllRektangel(2, 2, 6, 6, "aluminium", 30);
  g.fyllRektangel(8, 2, 6, 6, "is", -5);
  g.settEffekt(10, 2, 0.05);
  g.holdTemperatur(2, 5, 33);

  const for_ = g.totalEnergi();
  g.steg(300);
  const r = g.energiregnskap;
  const tilfort = r.luft + r.effekt + r.laast;
  assert.ok(Math.abs(g.totalEnergi() - for_ - tilfort) < 1e-9 * (Math.abs(for_) + 1));
});

// ---------------------------------------------------------------------------
// 2. Riktig likevektstemperatur
// ---------------------------------------------------------------------------

test("2a. Aluminium (80 °C) mot rustfritt stål (10 °C) ender på varmekapasitet-vektet snitt", (t) => {
  const dx = 1e-3;
  const g = lagVarmegitter({ nx: 16, ny: 8, dx, data, h: 0 });
  g.fyllRektangel(0, 0, 8, 8, "aluminium", 80);
  g.fyllRektangel(8, 0, 8, 8, "rustfritt_stal", 10);

  const Cal = 64 * C("aluminium", dx);
  const Cst = 64 * C("rustfritt_stal", dx);
  const forventet = (Cal * 80 + Cst * 10) / (Cal + Cst);

  g.steg(300);
  const { min, maks } = minMaks(g);
  t.diagnostic(`forventet ${forventet.toFixed(3)} °C, gitteret ${min.toFixed(3)}–${maks.toFixed(3)} °C`);
  assert.ok(Math.abs(min - forventet) < 0.01 && Math.abs(maks - forventet) < 0.01);
});

test("2b. Is (−10 °C) i vann (40 °C): ender på 0 °C med riktig mengde smeltet is", (t) => {
  // Klassisk kalorimetri: varmen vannet gir fra seg ned til 0 °C, minus det som trengs
  // for å varme isen opp til 0 °C, smelter isen.
  const dx = 2e-3;
  const g = lagVarmegitter({ nx: 12, ny: 4, dx, data, h: 0 });
  g.fyllRektangel(0, 0, 6, 4, "vann", 40);
  g.fyllRektangel(6, 0, 6, 4, "is", -10);

  const mVann = 24 * M.vann.rho * dx ** 3;
  const mIs = 24 * M.is.rho * dx ** 3;
  const fraVann = mVann * M.vann.c * 40;
  const tilIs = mIs * M.is.c * 10;
  const forventetSmeltet = (fraVann - tilIs) / L;
  assert.ok(forventetSmeltet > 0 && forventetSmeltet < mIs, "oppsettet skal gi delvis smelting");

  g.steg(30000);
  const { min, maks } = minMaks(g);
  const { smeltet } = g.smeltetMasse();
  t.diagnostic(
    `smeltet ${(smeltet * 1e3).toFixed(4)} g, forventet ${(forventetSmeltet * 1e3).toFixed(4)} g; temperatur ${min.toFixed(3)}–${maks.toFixed(3)} °C`
  );
  assert.ok(Math.abs(min) < 0.01 && Math.abs(maks) < 0.01, "alt skal ende på 0 °C");
  assert.ok(Math.abs(smeltet - forventetSmeltet) / forventetSmeltet < 1e-3);
});

// ---------------------------------------------------------------------------
// 3. Høyere varmeledningsevne gir raskere utjevning
// ---------------------------------------------------------------------------

/** Tid til forskjellen mellom varmeste og kaldeste celle er under 1 °C. */
function utjevningstid(dataSett, nokkel) {
  const g = lagVarmegitter({ nx: 40, ny: 1, dx: 1e-3, data: dataSett, h: 0 });
  g.fyllRektangel(0, 0, 20, 1, nokkel, 40);
  g.fyllRektangel(20, 0, 20, 1, nokkel, 0);
  const steg = 2;
  while (g.tid < 1e6) {
    const { min, maks } = minMaks(g);
    if (maks - min < 1) return g.tid;
    g.steg(steg);
  }
  throw new Error("ble aldri utjevnet");
}

test("3. Doblet varmeledningsevne gir halvert utjevningstid (samme ρ og c)", (t) => {
  // Bare k endres. ρ·c holdes likt, ellers ville også varmekapasiteten endret seg.
  const dobbel = structuredClone(data);
  dobbel.materialer.tre_dobbel_k = { ...M.tre, k: 2 * M.tre.k };

  const vanlig = utjevningstid(data, "tre");
  const raskere = utjevningstid(dobbel, "tre_dobbel_k");
  const forhold = raskere / vanlig;
  t.diagnostic(`tre: ${vanlig.toFixed(0)} s, tre med dobbel k: ${raskere.toFixed(0)} s, forhold ${forhold.toFixed(3)}`);
  assert.ok(raskere < vanlig);
  assert.ok(Math.abs(forhold - 0.5) < 0.02, `forventet ca. 0,5, fikk ${forhold}`);
});

// ---------------------------------------------------------------------------
// 4. Is står på 0 °C mens den smelter
// ---------------------------------------------------------------------------

test("4a. Isbit med jevn varmetilførsel: 0 °C-platå som varer nøyaktig m·L/P", (t) => {
  const dx = 0.01; // én celle på 1 cm
  const P = 0.1; // W
  const g = lagVarmegitter({ nx: 1, ny: 1, dx, data, h: 0 });
  g.settCelle(0, 0, "is", -10);
  g.settEffekt(0, 0, P);

  const m = M.is.rho * dx ** 3;
  const forventetOppvarming = (m * M.is.c * 10) / P;
  const forventetPlataa = (m * L) / P;

  let platåStart = null;
  let platåSlutt = null;
  while (g.tid < forventetOppvarming + forventetPlataa + 500) {
    g.steg(0.5);
    const T = g.temperatur(0, 0);
    const andel = g.smeltetAndel(0, 0);
    if (andel > 0 && andel < 1) assert.equal(T, 0, `temperaturen var ${T} °C under smelting`);
    if (T === 0 && platåStart === null) platåStart = g.tid;
    if (T > 0 && platåSlutt === null) platåSlutt = g.tid;
  }
  t.diagnostic(
    `oppvarming til 0 °C: ${platåStart.toFixed(1)} s (forventet ${forventetOppvarming.toFixed(1)}), ` +
      `platå: ${(platåSlutt - platåStart).toFixed(1)} s (forventet ${forventetPlataa.toFixed(1)})`
  );
  assert.ok(Math.abs(platåStart - forventetOppvarming) <= 0.5);
  assert.ok(Math.abs(platåSlutt - platåStart - forventetPlataa) <= 1);
  assert.ok(g.temperatur(0, 0) > 0, "etter platået skal vannet varmes videre");
});

test("4b. Isblokk i varm luft: ingen celle med is i seg er over 0 °C", (t) => {
  const g = lagVarmegitter({
    nx: 14, ny: 14, dx: 2e-3, data,
    h: data.konstanter.h_stille_luft.verdi, luftTemperatur: 20, kantErLuft: true,
  });
  g.fyllRektangel(2, 2, 10, 10, "is", -5);

  let maltSmeltende = 0;
  let midtPaaNull = 0;
  while (g.smeltetMasse().smeltet < 0.95 * g.smeltetMasse().totalt) {
    g.steg(20);
    for (let y = 2; y < 12; y++) {
      for (let x = 2; x < 12; x++) {
        const T = g.temperatur(x, y);
        const a = g.smeltetAndel(x, y);
        if (a < 1) assert.ok(T <= 0, `celle (${x},${y}) har is og er ${T} °C`);
        if (a > 0 && a < 1) {
          assert.equal(T, 0);
          maltSmeltende++;
        }
      }
    }
    if (g.temperatur(7, 7) === 0) midtPaaNull += 20;
  }
  t.diagnostic(`midtcellen sto på 0 °C i ${(midtPaaNull / 60).toFixed(0)} min; ${maltSmeltende} målinger av smeltende celler`);
  assert.ok(maltSmeltende > 100);
  assert.ok(midtPaaNull > 600, "midten skal stå lenge på 0 °C");
});

// ---------------------------------------------------------------------------
// 5. Hud mot materiale: temperaturen i grenseflaten
// ---------------------------------------------------------------------------

const effusivitet = (m) => Math.sqrt(m.k * m.rho * m.c);
const kontaktFormel = (nokkel) =>
  (effusivitet(M.hud) * 33 + effusivitet(M[nokkel]) * 20) / (effusivitet(M.hud) + effusivitet(M[nokkel]));
const MATERIALER_5 = ["kobber", "aluminium", "rustfritt_stal", "glass", "tre", "isopor"];

/** Hud (33 °C) mot materiale (20 °C) i en lang stav. Grenseflatetemperatur etter tid t. */
function kontaktTemperatur(nokkel, dx, t) {
  const nHud = Math.ceil(0.005 / dx);
  const nMat = Math.ceil(0.03 / dx);
  const g = lagVarmegitter({ nx: nHud + nMat, ny: 1, dx, data, h: 0 });
  g.fyllRektangel(0, 0, nHud, 1, "hud", data.konstanter.hudtemperatur.verdi);
  g.fyllRektangel(nHud, 0, nMat, 1, nokkel, 20);
  g.steg(t);
  return g.grenseflateTemperatur(nHud - 1, 0, nHud, 0);
}

test("5a. Valideringsmalen stemmer med effusivitetsformelen og materialverdiene", () => {
  for (const nokkel of MATERIALER_5) {
    assert.ok(Math.abs(kontaktFormel(nokkel) - data.valideringsmal[nokkel]) < 0.06, nokkel);
  }
});

test("5b. Gitteret treffer kontakttemperaturen 0,5 s etter berøring (celler på 0,2 mm)", (t) => {
  for (const nokkel of MATERIALER_5) {
    const gitter = kontaktTemperatur(nokkel, 2e-4, 0.5);
    const mal = data.valideringsmal[nokkel];
    t.diagnostic(`${nokkel.padEnd(15)} gitter ${gitter.toFixed(2)} °C, mal ${mal} °C, avvik ${(gitter - mal).toFixed(2)}`);
    assert.ok(Math.abs(gitter - mal) < 0.15, `${nokkel}: ${gitter.toFixed(2)} mot ${mal}`);
  }
});

test("5c. Med grove celler (1 mm) havner grenseflaten for nær materialets temperatur de første sekundene", (t) => {
  // Ikke en feil i fysikken, men en oppløsningsgrense: varmen har ennå ikke trengt
  // gjennom én hel hudcelle. Testen dokumenterer avviket, så vi husker det i fase 2.
  for (const nokkel of MATERIALER_5) {
    const grov = kontaktTemperatur(nokkel, 1e-3, 0.5);
    const riktig = kontaktFormel(nokkel);
    t.diagnostic(`${nokkel.padEnd(15)} 1 mm: ${grov.toFixed(2)} °C, formel ${riktig.toFixed(2)} °C, avvik ${(grov - riktig).toFixed(2)}`);
    assert.ok(grov <= riktig + 0.01 && grov > 20);
  }
});

// ---------------------------------------------------------------------------
// Tekniske tester
// ---------------------------------------------------------------------------

test("Stabilitet: kobber med store ønskede tidssteg gir aldri temperaturer utenfor start-intervallet", () => {
  const g = lagVarmegitter({ nx: 30, ny: 30, dx: 5e-4, data, h: 0 });
  g.fyllRektangel(0, 0, 30, 30, "kobber", 0);
  g.fyllRektangel(10, 10, 10, 10, "kobber", 100);
  for (let i = 0; i < 20; i++) {
    g.steg(0.5); // langt over største stabile delsteg
    const { min, maks } = minMaks(g);
    assert.ok(min >= -1e-9 && maks <= 100 + 1e-9, `min ${min}, maks ${maks}`);
  }
});

test("stegMedBudsjett simulerer mindre tid når delstegene ikke rekker", () => {
  const g = lagVarmegitter({ nx: 10, ny: 10, dx: 1e-3, data, h: 0 });
  g.fyllRektangel(0, 0, 10, 10, "kobber", 20);
  const grense = g.dtMaks();
  const simulert = g.stegMedBudsjett(1, 10);
  assert.ok(Math.abs(simulert - 10 * grense) < 1e-12);
  assert.ok(Math.abs(g.tid - simulert) < 1e-12);
  const helt = g.stegMedBudsjett(5 * grense, 10);
  assert.ok(Math.abs(helt - 5 * grense) < 1e-12);
});

test("flyttCelle tar med seg energien, fjernCelle fører den i regnskapet", () => {
  const g = lagVarmegitter({ nx: 4, ny: 4, dx: 1e-3, data, h: 0 });
  g.fyllRektangel(0, 2, 4, 2, "aluminium", 20);
  g.settCelle(1, 0, "is", -5);
  const start = g.totalEnergi();
  const energiIs = g.energi(1, 0);

  g.flyttCelle(1, 0, 1, 1);
  assert.equal(g.erTom(1, 0), true);
  assert.equal(g.materiale(1, 1), "is");
  assert.equal(g.energi(1, 1), energiIs);
  assert.equal(g.totalEnergi(), start);
  assert.equal(g.antallLuftflater(1, 2), 0, "aluminiumcellen under isen vender ikke lenger mot luft");

  const ut = g.fjernCelle(1, 1);
  assert.equal(ut.energi, energiIs);
  assert.ok(Math.abs(ut.masse - M.is.rho * 1e-9) < 1e-15);
  assert.ok(Math.abs(g.totalEnergi() + g.energiregnskap.fjernet - start) < 1e-12);
});

test("varmestromMellom gir k-snitt · temperaturforskjell, fra varm til kald", () => {
  const dx = 1e-3;
  const g = lagVarmegitter({ nx: 2, ny: 1, dx, data, h: 0 });
  g.settCelle(0, 0, "hud", 33);
  g.settCelle(1, 0, "tre", 20);
  const k = (2 * M.hud.k * M.tre.k) / (M.hud.k + M.tre.k);
  assert.ok(Math.abs(g.varmestromMellom(0, 0, 1, 0) - k * dx * 13) < 1e-12);
  assert.ok(g.varmestromMellom(1, 0, 0, 0) < 0);
});

test("Ukjent materiale gir tydelig feil", () => {
  const g = lagVarmegitter({ nx: 2, ny: 2, dx: 1e-3, data });
  assert.throws(() => g.settCelle(0, 0, "unobtainium", 20), /Ukjent materiale/);
});
