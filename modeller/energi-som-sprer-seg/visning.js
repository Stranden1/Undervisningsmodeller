// Energi som sprer seg – tegning. Ingen fysikk her, bare lesing av tilstanden.

import { tegnFargeskala } from "../../felles/js/fargeskala.js";
import { tegnPartikler, lagPartikler } from "../../felles/js/partikler.js";
import { tegnCeller, PARTIKKELFARGE } from "../../felles/js/gittertegning.js";
import { formaterGrader, formaterTid } from "../../felles/js/format.js";
import { VANN_START, KLOSS_T_MAKS, klossPlass } from "./modell.js";

export const STORRELSE = { bredde: 760, hoyde: 400 };

const CELLE = 14; // samme cellestørrelse for alle kar, så mer vann faktisk ser større ut
const VEGG = 7;
const Y0 = 52;
const VEGGFARGE = "#b9b4a8";

// Vibrasjonen forsterkes over hele området modellen bruker (10–90 °C). Se "Hva modellen forenkler".
const FORSTERKNING = { minT: VANN_START, maksT: KLOSS_T_MAKS, minUtslag: 0.3, maksUtslag: 3.4 };

export function lagVisning() {
  let partikler = null;
  let forrigeKar = null;

  /** Én partikkel per celle, så eleven ser hvor mange partikler varmen fordeles på. */
  function lagCellePartikler(g) {
    const plasser = [];
    for (let y = 0; y < g.ny; y++) {
      for (let x = 0; x < g.nx; x++) {
        plasser.push({ x: (x + 0.5) * CELLE, y: (y + 0.5) * CELLE, cx: x, cy: y });
      }
    }
    return lagPartikler(plasser, 7);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} kar  fra lagKar
   * @param {{ tid: number }} vis  ekte tid (for jevn vibrasjon)
   */
  function tegn(ctx, kar, { tid }) {
    const { bredde, hoyde } = STORRELSE;
    ctx.clearRect(0, 0, bredde, hoyde);
    const g = kar.gitter;
    if (kar !== forrigeKar) {
      partikler = lagCellePartikler(g);
      forrigeKar = kar;
    }
    const karB = g.nx * CELLE;
    const karH = g.ny * CELLE;
    const x0 = Math.round((bredde - karB) / 2);
    const y0 = Y0;

    // Isolert kar: tykk vegg rundt og lokk på
    ctx.fillStyle = VEGGFARGE;
    ctx.fillRect(x0 - VEGG, y0 - VEGG, karB + 2 * VEGG, karH + 2 * VEGG);
    ctx.clearRect(x0, y0, karB, karH);

    tegnCeller(ctx, g, x0, y0, CELLE);
    tegnPartikler(
      ctx,
      partikler.map((p) => ({ ...p, x: x0 + p.x, y: y0 + p.y })),
      (p) => g.temperatur(p.cx, p.cy),
      tid,
      { radius: 2.3, farge: (p) => PARTIKKELFARGE[g.materiale(p.cx, p.cy)], forsterkning: FORSTERKNING }
    );

    // Omriss av klossen, så den kan skilles fra vannet også når fargene er like
    const k = klossPlass(kar.vannmengde);
    ctx.strokeStyle = "rgba(31,35,40,0.55)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(x0 + k.x * CELLE + 0.5, y0 + k.y * CELLE + 0.5, k.side * CELLE - 1, k.side * CELLE - 1);
    ctx.setLineDash([]);

    // Overskrift
    const r = kar.regnskap();
    ctx.fillStyle = "#5b616b";
    ctx.font = "15px system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText("Isolert kar: ingen varme går inn eller ut", 12, 12);

    // Merkelapper til høyre for karet
    const lx = x0 + karB + VEGG + 18;
    ctx.textAlign = "left";
    ctx.font = "600 15px system-ui, sans-serif";
    ctx.fillStyle = "#1f2328";
    ctx.fillText("Kobberklossen", lx, y0 + karH / 2 - 34);
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillText(formaterGrader(r.klossTemperatur), lx, y0 + karH / 2 - 14);
    ctx.font = "600 15px system-ui, sans-serif";
    ctx.fillText("Vannet", lx, y0 + karH / 2 + 14);
    ctx.font = "15px system-ui, sans-serif";
    const vannTekst = r.likevekt
      ? formaterGrader(r.minTemperatur)
      : `${formaterGrader(vannMin(kar))} – ${formaterGrader(vannMaks(kar))}`;
    ctx.fillText(vannTekst, lx, y0 + karH / 2 + 34);

    // Under karet
    ctx.textAlign = "center";
    ctx.font = "600 17px system-ui, sans-serif";
    ctx.fillStyle = "#1f2328";
    const status = r.likevekt
      ? `Alt har samme temperatur: ${formaterGrader(kar.blandingstemperatur)}`
      : r.tid === 0
        ? "Gjett først, trykk så Start"
        : "Varmen sprer seg";
    ctx.fillText(status, bredde / 2, y0 + karH + VEGG + 14);

    tegnFargeskala(ctx, bredde - 170, hoyde - 30, 150, 8, VANN_START, KLOSS_T_MAKS);
  }

  return { tegn };
}

function vannTemperaturer(kar) {
  const g = kar.gitter;
  const k = klossPlass(kar.vannmengde);
  const T = [];
  for (let y = 0; y < g.ny; y++) {
    for (let x = 0; x < g.nx; x++) {
      const iKloss = x >= k.x && x < k.x + k.side && y >= k.y && y < k.y + k.side;
      if (!iKloss) T.push(g.temperatur(x, y));
    }
  }
  return T;
}
const vannMin = (kar) => Math.min(...vannTemperaturer(kar));
const vannMaks = (kar) => Math.max(...vannTemperaturer(kar));

/** Tekst om hva som skjer (for skjermleser og som hjelp). */
export function beskriv(kar) {
  const r = kar.regnskap();
  const pst = (x) => `${Math.round(x * 100)} %`;
  if (r.tid === 0) {
    return `Kobberklossen er ${formaterGrader(kar.klossT, 0)}, vannet er ${formaterGrader(VANN_START, 0)}. All varmen er i klossen.`;
  }
  const deler = [
    `Etter ${formaterTid(r.tid)} er klossen ${formaterGrader(r.klossTemperatur)}.`,
    `${pst(r.iKlossen)} av varmen er i klossen og ${pst(r.iVannet)} i vannet – til sammen ${pst(r.varmeIKaret)}.`,
    `Kan gjøre arbeid: ${(r.kanGjoreArbeid * 100).toFixed(1).replace(".", ",")} %.`,
  ];
  if (r.likevekt) deler.push(`Alt har nå samme temperatur, ${formaterGrader(kar.blandingstemperatur)}.`);
  return deler.join(" ");
}
