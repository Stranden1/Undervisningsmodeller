// Partikler som vibrerer etter temperatur.
//
// ÆRLIGHET: Partiklenes bevegelsesenergi er proporsjonal med temperaturen i kelvin.
// Mellom −20 °C (253 K) og 40 °C (313 K) er forskjellen i utslag bare ca. 10 %, som
// knapt synes. Her forsterkes forskjellen kraftig: utslaget går nesten fra null ved
// −20 °C til fullt ved 40 °C. Dette må stå i modellens "Hva modellen forenkler".

export const FORSTERKNING = { minT: -20, maksT: 40, minUtslag: 0.25, maksUtslag: 3.2 };

const redusertBevegelse =
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Utslag i piksler for en temperatur (forsterket, se over).
 * En modell med et annet temperaturområde kan sende inn sin egen forsterkning.
 */
export function utslag(T, forsterkning = FORSTERKNING) {
  const { minT, maksT, minUtslag, maksUtslag } = forsterkning;
  const a = Math.min(1, Math.max(0, (T - minT) / (maksT - minT)));
  return minUtslag + a * (maksUtslag - minUtslag);
}

/** Enkel, forutsigbar tilfeldighet, så partiklene ser like ut hver gang. */
function lagTilfeldig(fro) {
  let s = fro >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Lag partikler på faste plasser.
 * @param {{x: number, y: number, celle: any}[]} plasser  hvileplass og hvilken celle partikkelen hører til
 */
export function lagPartikler(plasser, fro = 1) {
  const tilfeldig = lagTilfeldig(fro);
  return plasser.map((p) => ({
    ...p,
    fx: 0.8 + tilfeldig() * 0.6,
    fy: 0.8 + tilfeldig() * 0.6,
    px: tilfeldig() * Math.PI * 2,
    py: tilfeldig() * Math.PI * 2,
  }));
}

/**
 * Tegn partiklene.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object[]} partikler fra lagPartikler
 * @param {(p: object) => number | null} temperaturFor  temperatur for partikkelens celle (null = ikke tegn)
 * @param {number} tid  sekunder (ekte tid, for jevn bevegelse)
 * @param {{ radius?: number, farge?: (p: object) => string, forsterkning?: object }} [valg]
 */
export function tegnPartikler(ctx, partikler, temperaturFor, tid, valg = {}) {
  const radius = valg.radius ?? 2.4;
  const fart = redusertBevegelse ? 0.15 : 1;
  const forsterkning = { ...FORSTERKNING, ...valg.forsterkning };
  for (const p of partikler) {
    const T = temperaturFor(p);
    if (T === null || Number.isNaN(T)) continue;
    const A = utslag(T, forsterkning);
    // Varmere partikler svinger også litt raskere.
    const andel = Math.min(1, Math.max(0, (T - forsterkning.minT) / (forsterkning.maksT - forsterkning.minT)));
    const w = (10 + 15 * andel) * fart;
    const x = p.x + A * (Math.sin(w * p.fx * tid + p.px) + 0.5 * Math.sin(1.7 * w * p.fy * tid + p.py)) / 1.5;
    const y = p.y + A * (Math.sin(w * p.fy * tid + p.py) + 0.5 * Math.sin(1.3 * w * p.fx * tid + p.px)) / 1.5;
    ctx.fillStyle = valg.farge ? valg.farge(p) : "rgba(31,35,40,0.7)";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
