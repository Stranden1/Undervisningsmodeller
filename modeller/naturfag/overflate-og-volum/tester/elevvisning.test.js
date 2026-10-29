// Det eleven ser og leser, skal stemme med fysikken (F08 i revisjonen 29.10.2026).
// Kjøres med `node --test` fra rotmappa.
//
// Fysikktestene viser at modellen regner riktig. Disse testene viser at resultatet,
// forklaringen og tekstlinja (som skjermleseren leser) sier det samme som modellen
// faktisk viser – også når varmen kommer fra sola eller et varmt underlag.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lagSnoforsok } from "../modell.js";
import { resultatEnBlokk, beskriv, merkeNavn } from "../visning.js";

const data = JSON.parse(readFileSync(new URL("../../../../felles/data/materialer.json", import.meta.url), "utf8"));

test("Resultat, forklaring og tekstlinje for én blokk stemmer med hvor snøen nådde 0 °C, for alle varmekilder", () => {
  const plassord = { venstre: /^Hjørnene når 0 °C først/, over: /^Hjørnene øverst/, under: /^Hjørnene nederst/ };
  for (const kilder of [{}, { sol: true }, { underlag: true }, { sol: true, underlag: true }]) {
    const navn = JSON.stringify(kilder);
    const f = lagSnoforsok(data, { oppdeling: "1", ...kilder });
    // Samme takt som modellen selv, og stopp der kontrolleren viser resultatet.
    while (!resultatEnBlokk(f)) f.steg(10);
    const { fasit, forklaring } = resultatEnBlokk(f);
    const { hjorne, side, flate } = f.merkedeCeller;

    // Det bildet viser: det merkede hjørnet har nådd 0 °C, den merkede sidecellen ikke.
    assert.ok(f.gitter.temperatur(...hjorne) >= 0, navn);
    assert.ok(f.gitter.temperatur(...side) < 0, navn);

    // Fasiten og forklaringen sier det samme, og nevner varmekilden som faktisk var på.
    assert.equal(fasit, "hjorner", navn);
    assert.match(forklaring, plassord[flate], navn);
    if (kilder.underlag) assert.match(forklaring, /underlaget/, navn);
    else assert.doesNotMatch(forklaring, /underlaget/, navn);
    if (kilder.sol && !kilder.underlag) assert.match(forklaring, /Sola/, navn);
    if (!kilder.sol) assert.doesNotMatch(forklaring, /Sola/, navn);

    // Tekstlinja under bildet sier det samme som bildet og fasiten.
    const tekst = beskriv(f);
    assert.match(tekst, /Den merkede hjørnecellen er 0 °C – smelter/, navn);
    assert.match(tekst, new RegExp(`Den merkede cellen ${merkeNavn(f.merkedeCeller, "side").toLowerCase()} er −`), navn);
    assert.match(tekst, /Det første hjørnet nådde 0 °C/, navn);
    assert.doesNotMatch(tekst, /Den første sidemidten/, navn);
  }
});
