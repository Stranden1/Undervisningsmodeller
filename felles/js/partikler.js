// Partikler som vibrerer etter temperatur. I fast stoff har de faste plasser; i en
// væske (lagVaeske) vandrer de i tillegg rundt hverandre.
//
// ÆRLIGHET: Partiklenes bevegelsesenergi er proporsjonal med temperaturen i kelvin.
// Mellom −20 °C (253 K) og 40 °C (313 K) er forskjellen i utslag bare ca. 10 %, som
// knapt synes. Her forsterkes forskjellen kraftig: utslaget går nesten fra null ved
// −20 °C til fullt ved 40 °C. Dette må stå i modellens "Hva modellen forenkler".

export const FORSTERKNING = { minT: -20, maksT: 40, minUtslag: 0.25, maksUtslag: 3.2 };

// Har brukeren slått på «redusert bevegelse» i maskinen eller nettleseren, står partiklene
// helt stille. Temperaturen vises fortsatt med farger og tall. Innstillingen leses på
// nytt hver gang, så det virker også om den endres mens siden er åpen.
const bevegelsesValg =
  typeof window !== "undefined" ? window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null : null;

/** Ønsker brukeren redusert bevegelse? */
export function redusertBevegelse() {
  return bevegelsesValg?.matches ?? false;
}

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

/** Hvor fort væskepartikler vandrer (px/s), fra kaldeste til varmeste temperatur. */
export const VANDRING = { min: 3, maks: 14 };

/**
 * Lag partikler i en væske. De vibrerer som andre partikler, men har ingen fast plass:
 * de vandrer hit og dit og glir forbi hverandre, raskere jo varmere det er. Det viser
 * forskjellen på fast stoff og væske. Det er ikke strømning – hver partikkel vandrer for
 * seg, så væsken som helhet flytter seg ikke.
 * @param {{x: number, y: number}[]} plasser  midten av hver celle med væske
 * @param {number} spredning  startpunktet legges tilfeldig inntil så mange piksler fra midten
 */
export function lagVaeske(plasser, spredning, fro = 1) {
  const tilfeldig = lagTilfeldig(fro);
  const partikler = lagPartikler(
    plasser.map((p) => ({
      ...p,
      x: p.x + (tilfeldig() * 2 - 1) * spredning,
      y: p.y + (tilfeldig() * 2 - 1) * spredning,
      retning: tilfeldig() * Math.PI * 2,
    })),
    fro + 1
  );
  let forrige = null;

  return {
    partikler,
    /**
     * Flytt partiklene fram til et nytt tidspunkt.
     * @param {number} tid  ekte tid (s)
     * @param {(p: object) => number | null} temperaturFor
     * @param {(x: number, y: number) => boolean} erLedig  kan en partikkel være her?
     * @param {object} [forsterkning]  samme temperaturområde som vibrasjonen
     */
    flytt(tid, temperaturFor, erLedig, forsterkning = {}) {
      const dt = forrige === null ? 0 : Math.min(0.1, Math.max(0, tid - forrige));
      forrige = tid;
      if (dt === 0 || redusertBevegelse()) return;
      const { minT, maksT } = { ...FORSTERKNING, ...forsterkning };
      for (const p of partikler) {
        const T = temperaturFor(p);
        if (T === null || Number.isNaN(T)) continue;
        const andel = Math.min(1, Math.max(0, (T - minT) / (maksT - minT)));
        const fart = VANDRING.min + andel * (VANDRING.maks - VANDRING.min);
        // Retningen endrer seg litt hele tiden, så banen blir en tilfeldig vandring.
        p.retning += (tilfeldig() - 0.5) * 5 * Math.sqrt(dt);
        const nyX = p.x + Math.cos(p.retning) * fart * dt;
        const nyY = p.y + Math.sin(p.retning) * fart * dt;
        // Spretter tilbake fra vegger og fra det faste stoffet.
        if (erLedig(nyX, p.y)) p.x = nyX;
        else p.retning = Math.PI - p.retning;
        if (erLedig(p.x, nyY)) p.y = nyY;
        else p.retning = -p.retning;
      }
    },
  };
}

/**
 * Tegn partiklene.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object[]} partikler fra lagPartikler
 * @param {(p: object) => number | null} temperaturFor  temperatur for partikkelens celle (null = ikke tegn)
 * @param {number} tid  sekunder (ekte tid, for jevn bevegelse). Står tiden stille, står
 *   partiklene stille, så kontrolleren lar den bare gå mens modellen kjører.
 * @param {{ radius?: number, farge?: (p: object) => string, forsterkning?: object }} [valg]
 */
export function tegnPartikler(ctx, partikler, temperaturFor, tid, valg = {}) {
  const radius = valg.radius ?? 2.4;
  const stille = redusertBevegelse();
  const forsterkning = { ...FORSTERKNING, ...valg.forsterkning };
  for (const p of partikler) {
    const T = temperaturFor(p);
    if (T === null || Number.isNaN(T)) continue;
    const A = stille ? 0 : utslag(T, forsterkning);
    // Varmere partikler svinger også litt raskere.
    const andel = Math.min(1, Math.max(0, (T - forsterkning.minT) / (forsterkning.maksT - forsterkning.minT)));
    const w = 10 + 15 * andel;
    const x = p.x + A * (Math.sin(w * p.fx * tid + p.px) + 0.5 * Math.sin(1.7 * w * p.fy * tid + p.py)) / 1.5;
    const y = p.y + A * (Math.sin(w * p.fy * tid + p.py) + 0.5 * Math.sin(1.3 * w * p.fx * tid + p.px)) / 1.5;
    ctx.fillStyle = valg.farge ? valg.farge(p) : "rgba(31,35,40,0.7)";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
