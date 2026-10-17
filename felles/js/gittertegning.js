// Tegner et varmegitter: hver celle farget etter temperatur, med partikler oppå.
// Brukes av alle modeller som bygger på felles/js/varmegitter.js.

import { temperaturFarge } from "./fargeskala.js";
import { lagPartikler } from "./partikler.js";

/** Partikkelfarge per materiale, så elevene ser hva som er hva. */
export const PARTIKKELFARGE = {
  kobber: "rgba(122,62,29,0.8)",
  aluminium: "rgba(61,68,80,0.8)",
  rustfritt_stal: "rgba(61,68,80,0.8)",
  glass: "rgba(47,111,115,0.8)",
  tre: "rgba(107,74,43,0.8)",
  isopor: "rgba(110,115,124,0.7)",
  hud: "rgba(138,75,59,0.8)",
  is: "rgba(43,79,122,0.8)",
  vann: "rgba(43,79,122,0.6)",
  nysno: "rgba(43,79,122,0.7)",
  pakket_sno: "rgba(43,79,122,0.7)",
};

/**
 * Tegn cellene. En celle som er i ferd med å smelte, "synker": nederst temperaturfargen
 * for det som er igjen, øverst lyst vann for det som har smeltet. Et mørkt slør ville
 * sett ut som kulde.
 * @param {(y: number) => number} [forskyvning] ekstra y-forskyvning per rad (piksler)
 */
export function tegnCeller(ctx, gitter, x0, y0, celle, forskyvning = () => 0) {
  for (let y = 0; y < gitter.ny; y++) {
    const dy = forskyvning(y);
    for (let x = 0; x < gitter.nx; x++) {
      const T = gitter.temperatur(x, y);
      if (T === null) continue;
      const px = x0 + x * celle;
      const py = y0 + y * celle + dy;
      const andel = gitter.smeltetAndel(x, y);
      // +0.5 gir ingen hårfine sprekker mellom cellene
      if (andel > 0 && andel < 1) {
        const vannH = celle * andel;
        ctx.fillStyle = "rgba(120,180,235,0.55)";
        ctx.fillRect(px, py, celle + 0.5, vannH + 0.5);
        ctx.fillStyle = temperaturFarge(T);
        ctx.fillRect(px, py + vannH, celle + 0.5, celle - vannH + 0.5);
      } else {
        ctx.fillStyle = temperaturFarge(T);
        ctx.fillRect(px, py, celle + 0.5, celle + 0.5);
      }
    }
  }
}

/** Partikkelplasser: én partikkel per 2 × 2 celler, relativt til gitterets øvre venstre hjørne. */
export function lagGitterPartikler(gitter, celle, fro = 1) {
  const plasser = [];
  for (let y = 0; y + 1 < gitter.ny; y += 2) {
    for (let x = 0; x + 1 < gitter.nx; x += 2) {
      plasser.push({ x: (x + 1) * celle, y: (y + 1) * celle, cx: x, cy: y });
    }
  }
  return lagPartikler(plasser, fro);
}
