// Energi som sprer seg – tegning. Ingen fysikk her, bare lesing av tilstanden.

import { tegnFargeskala } from "../../../felles/js/fargeskala.js";
import { tegnPartikler, lagPartikler } from "../../../felles/js/partikler.js";
import { tegnCeller, PARTIKKELFARGE } from "../../../felles/js/gittertegning.js";
import { formaterGrader, formaterTid } from "../../../felles/js/format.js";
import { VANN_START, KLOSS_T_MAKS, klossPlass, elementPlass } from "./modell.js";

export const STORRELSE = { bredde: 760, hoyde: 400 };

const CELLE = 14; // samme cellestørrelse for alle kar, så mer vann faktisk ser større ut
const VEGG = 7;
const Y0 = 52;
const VEGGFARGE = "#b9b4a8";
const STROMFARGE = "#a8487f"; // samme som "som strøm" i søylene og grafen

// Vibrasjonen forsterkes over hele området modellen bruker (10–90 °C). Se "Hva modellen forenkler".
const FORSTERKNING = { minT: VANN_START, maksT: KLOSS_T_MAKS, minUtslag: 0.3, maksUtslag: 3.4 };

/** Hva som står midt i karet i hver fane. */
const DELEN = {
  kloss: { navn: "Kobberklossen", plass: klossPlass, temperatur: (r) => r.klossTemperatur },
  dyppekoker: { navn: "Varmeelementet", plass: elementPlass, temperatur: (r) => r.elementTemperatur },
};

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
   * @param {object} kar  fra lagKar eller lagDyppekoker
   * @param {{ tid: number, fane: "kloss" | "dyppekoker" }} vis  ekte tid (for jevn vibrasjon) og fane
   */
  function tegn(ctx, kar, { tid, fane }) {
    const { bredde, hoyde } = STORRELSE;
    ctx.clearRect(0, 0, bredde, hoyde);
    const g = kar.gitter;
    if (kar !== forrigeKar) {
      partikler = lagCellePartikler(g);
      forrigeKar = kar;
    }
    const delen = DELEN[fane];
    const r = kar.regnskap();
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

    // Omriss av delen i midten, så den kan skilles fra vannet også når fargene er like
    const k = delen.plass(kar.vannmengde);
    const kx = x0 + k.x * CELLE;
    const ky = y0 + k.y * CELLE;
    ctx.strokeStyle = "rgba(31,35,40,0.55)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(kx + 0.5, ky + 0.5, k.side * CELLE - 1, k.side * CELLE - 1);
    ctx.setLineDash([]);

    if (fane === "dyppekoker") tegnLedning(ctx, r, kx + (k.side * CELLE) / 2, ky, y0);

    // Overskrift
    ctx.fillStyle = "#5b616b";
    ctx.font = "15px system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText("Varmeisolert kar: ingen varme går inn eller ut", 12, 12);

    // Merkelapper til høyre for karet
    const lx = x0 + karB + VEGG + 18;
    ctx.textAlign = "left";
    ctx.font = "600 15px system-ui, sans-serif";
    ctx.fillStyle = "#1f2328";
    ctx.fillText(delen.navn, lx, y0 + karH / 2 - 34);
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillText(formaterGrader(delen.temperatur(r)), lx, y0 + karH / 2 - 14);
    ctx.font = "600 15px system-ui, sans-serif";
    ctx.fillText("Vannet", lx, y0 + karH / 2 + 14);
    ctx.font = "15px system-ui, sans-serif";
    const [vMin, vMaks] = vannSpenn(kar, k);
    const vannTekst = r.likevekt ? formaterGrader(r.minTemperatur) : `${formaterGrader(vMin)} – ${formaterGrader(vMaks)}`;
    ctx.fillText(vannTekst, lx, y0 + karH / 2 + 34);

    // Under karet
    ctx.textAlign = "center";
    ctx.font = "600 17px system-ui, sans-serif";
    ctx.fillStyle = "#1f2328";
    let status;
    if (r.likevekt) status = `Alt har samme temperatur: ${formaterGrader(kar.blandingstemperatur)}`;
    else if (r.tid === 0) status = "Gjett først, trykk så Start";
    else if (fane === "dyppekoker" && r.paa) status = "Strømmen blir til varme i elementet";
    else status = "Varmen sprer seg";
    ctx.fillText(status, bredde / 2, y0 + karH + VEGG + 14);

    tegnFargeskala(ctx, bredde - 170, hoyde - 30, 150, 8, VANN_START, KLOSS_T_MAKS);
  }

  return { tegn };
}

/** Ledning fra elementet opp gjennom lokket, med en merkelapp: strøm på eller av. */
function tegnLedning(ctx, r, x, yElement, yKar) {
  const paa = r.paa;
  const topp = yKar - VEGG - 16;
  ctx.strokeStyle = paa ? STROMFARGE : "#9aa0a8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, yElement);
  ctx.lineTo(x, topp);
  ctx.stroke();
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = paa ? STROMFARGE : "#5b616b";
  const tekst = paa ? `Strøm på – ${Math.round(r.somStrom * 100)} % igjen å levere` : "Strøm av";
  ctx.fillText(tekst, x + 10, topp + 4);
}

/** Kaldeste og varmeste vann (alt utenom delen i midten). */
function vannSpenn(kar, k) {
  const g = kar.gitter;
  let min = Infinity;
  let maks = -Infinity;
  for (let y = 0; y < g.ny; y++) {
    for (let x = 0; x < g.nx; x++) {
      if (x >= k.x && x < k.x + k.side && y >= k.y && y < k.y + k.side) continue;
      const T = g.temperatur(x, y);
      if (T < min) min = T;
      if (T > maks) maks = T;
    }
  }
  return [min, maks];
}

/** Tekst om hva som skjer (for skjermleser og som hjelp). */
export function beskriv(kar, fane) {
  const r = kar.regnskap();
  const pst = (x) => `${Math.round(x * 100)} %`;
  const arbeid = `Kan gjøre arbeid: ${(r.kanGjoreArbeid * 100).toFixed(1).replace(".", ",")} %.`;
  const slutt = r.likevekt ? ` Alt har nå samme temperatur, ${formaterGrader(kar.blandingstemperatur)}.` : "";

  if (fane === "dyppekoker") {
    if (r.tid === 0) {
      return `Vannet og varmeelementet er ${formaterGrader(VANN_START, 0)}. All energien er ennå strøm, og alt av den kan gjøre arbeid.`;
    }
    const strom = r.paa ? `${pst(r.somStrom)} av energien er ennå ikke levert som strøm, ` : "Strømmen er slått av. ";
    return (
      `Etter ${formaterTid(r.tid)} er elementet ${formaterGrader(r.elementTemperatur)}. ${strom}` +
      `${pst(r.varmeIKaret)} er varme i karet – til sammen ${pst(r.energiIAlt)}. ${arbeid}${slutt}`
    );
  }

  if (r.tid === 0) {
    return `Kobberklossen er ${formaterGrader(kar.klossT, 0)}, vannet er ${formaterGrader(VANN_START, 0)}. All varmen er i klossen.`;
  }
  return (
    `Etter ${formaterTid(r.tid)} er klossen ${formaterGrader(r.klossTemperatur)}. ` +
    `${pst(r.iKlossen)} av varmen er i klossen og ${pst(r.iVannet)} i vannet – til sammen ${pst(r.varmeIKaret)}. ${arbeid}${slutt}`
  );
}
