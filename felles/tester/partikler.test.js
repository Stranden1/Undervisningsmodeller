// Tester for tegningen av væskepartikler. Kjøres med `node --test` fra rotmappa.
// Væsken skal se ut som en væske: prikkene har ingen fast plass, de blir inne i væsken,
// og de vandrer raskere når det er varmt.

import { test } from "node:test";
import assert from "node:assert/strict";
import { lagVaeske } from "../js/partikler.js";

// Et kar på 100 × 100 px med en fast kloss i midten (40–60). Prikkene må holde seg utenfor.
const erLedig = (x, y) => x > 0 && x < 100 && y > 0 && y < 100 && !(x > 40 && x < 60 && y > 40 && y < 60);
const plasser = [];
for (let y = 5; y < 100; y += 10) {
  for (let x = 5; x < 100; x += 10) if (erLedig(x, y)) plasser.push({ x, y });
}

/** Kjør i et antall sekunder med fast temperatur, og gi snittavstanden fra start. */
function vandring(T, sekunder) {
  const v = lagVaeske(plasser, 3, 1);
  const start = v.partikler.map((p) => [p.x, p.y]);
  for (let t = 0; t <= sekunder; t += 1 / 60) {
    v.flytt(t, () => T, erLedig, { minT: 10, maksT: 90 });
    for (const p of v.partikler) assert.ok(erLedig(p.x, p.y), `prikk utenfor væsken: ${p.x}, ${p.y}`);
  }
  const avstand = v.partikler.map((p, i) => Math.hypot(p.x - start[i][0], p.y - start[i][1]));
  return avstand.reduce((s, a) => s + a, 0) / avstand.length;
}

test("Væskeprikkene har ingen fast plass, men blir inne i væsken", () => {
  // Etter 20 s har prikkene flyttet seg mer enn avstanden mellom to plasser (10 px).
  assert.ok(vandring(50, 20) > 10);
});

test("Væskeprikkene vandrer raskere når det er varmt", () => {
  assert.ok(vandring(90, 10) > 2 * vandring(10, 10));
});
