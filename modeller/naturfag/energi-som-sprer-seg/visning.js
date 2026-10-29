// Energi som sprer seg – tegning. Ingen fysikk her, bare lesing av tilstanden.

import { tegnFargeskala } from "../../../felles/js/fargeskala.js";
import { tegnPartikler, lagPartikler, lagVaeske } from "../../../felles/js/partikler.js";
import { tegnCeller, PARTIKKELFARGE } from "../../../felles/js/gittertegning.js";
import { formaterGrader, formaterTid } from "../../../felles/js/format.js";
import { VANN_START, KLOSS_T_MAKS, klossPlass, elementPlass, varmeUtAvDelen } from "./modell.js";

export const STORRELSE = { bredde: 760, hoyde: 400 };
// Smal skjerm (mobil): merkelappene står under karet i stedet for til høyre. Da kan
// tegningen være smalere, og teksten blir stor nok til å lese (F03).
export const SMAL_STORRELSE = { bredde: 400, hoyde: 500 };

const CELLE = 14; // samme cellestørrelse for alle kar, så mer vann faktisk ser større ut
const VEGG = 7;
const Y0 = 52;
const VEGGFARGE = "#b9b4a8";
const STROMFARGE = "#a8487f"; // samme som "som strøm" i søylene og grafen
const VARMEFARGE = "#b35c00"; // samme som varmepilene i «Varmeledning med partikler»
// Største varmestrøm per side i modellen: kobberkloss på 90 °C rett etter start (ca. 2,6 W
// i snittet). Pilene måles mot denne, så en kloss på 40 °C får mindre piler enn en på 90 °C.
const VARME_MAKS = 2.7;
const VARME_MIN = 0.02; // under ca. 1 % av maks vises ingen pil

// Vibrasjonen forsterkes over hele området modellen bruker (10–90 °C). Se "Hva modellen forenkler".
const FORSTERKNING = { minT: VANN_START, maksT: KLOSS_T_MAKS, minUtslag: 0.3, maksUtslag: 3.4 };

/** Hva som står midt i karet i hver fane. */
const DELEN = {
  kloss: { navn: "Kobberklossen", plass: klossPlass, temperatur: (r) => r.klossTemperatur },
  dyppekoker: { navn: "Varmeelementet", plass: elementPlass, temperatur: (r) => r.elementTemperatur },
};

// Væskepartiklene holder så stor avstand til vegger og metall at vibrasjonen ikke når over.
const MARGIN = 3;

export function lagVisning() {
  let fast = null;
  let vaeske = null;
  let forrigeKar = null;

  /**
   * Én prikk per celle. Metallet får faste plasser i et gitter. Vannet får prikker som
   * vandrer rundt hverandre, fordi partiklene i en væske ikke har faste plasser.
   */
  function lagCellePartikler(g) {
    const metall = [];
    const vann = [];
    for (let y = 0; y < g.ny; y++) {
      for (let x = 0; x < g.nx; x++) {
        const plass = { x: (x + 0.5) * CELLE, y: (y + 0.5) * CELLE, cx: x, cy: y };
        (g.materiale(x, y) === "vann" ? vann : metall).push(plass);
      }
    }
    fast = lagPartikler(metall, 7);
    vaeske = lagVaeske(vann, CELLE / 2 - MARGIN, 7);
  }

  /** Er (x, y), i piksler inne i karet, i vannet – med margin til vegger og metall? */
  function iVannet(g, x, y) {
    for (const [px, py] of [[x - MARGIN, y - MARGIN], [x + MARGIN, y - MARGIN], [x - MARGIN, y + MARGIN], [x + MARGIN, y + MARGIN]]) {
      const cx = Math.floor(px / CELLE);
      const cy = Math.floor(py / CELLE);
      if (cx < 0 || cy < 0 || cx >= g.nx || cy >= g.ny || g.materiale(cx, cy) !== "vann") return false;
    }
    return true;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} kar  fra lagKar eller lagDyppekoker
   * @param {{ tid: number, fane: "kloss" | "dyppekoker" }} vis  tid for partikkelbevegelsen (står stille i pause) og fane
   */
  function tegn(ctx, kar, { tid, fane }) {
    const bredde = ctx.logiskBredde;
    const hoyde = ctx.logiskHoyde;
    const smal = bredde < STORRELSE.bredde;
    ctx.clearRect(0, 0, bredde, hoyde);
    const g = kar.gitter;
    if (kar !== forrigeKar) {
      lagCellePartikler(g);
      forrigeKar = kar;
    }
    const delen = DELEN[fane];
    const r = kar.regnskap();
    const karB = g.nx * CELLE;
    const karH = g.ny * CELLE;
    const x0 = Math.round((bredde - karB) / 2);
    const y0 = smal ? Y0 + 20 : Y0; // plass til to linjer over ledningen

    // Isolert kar: tykk vegg rundt og lokk på
    ctx.fillStyle = VEGGFARGE;
    ctx.fillRect(x0 - VEGG, y0 - VEGG, karB + 2 * VEGG, karH + 2 * VEGG);
    ctx.clearRect(x0, y0, karB, karH);

    tegnCeller(ctx, g, x0, y0, CELLE);
    // Vannprikkene bytter celle når de vandrer, så cellen finnes ut fra hvor de er nå.
    vaeske.flytt(
      tid,
      (p) => g.temperatur(Math.floor(p.x / CELLE), Math.floor(p.y / CELLE)),
      (x, y) => iVannet(g, x, y),
      FORSTERKNING
    );
    const prikker = [
      ...fast,
      ...vaeske.partikler.map((p) => ({ ...p, cx: Math.floor(p.x / CELLE), cy: Math.floor(p.y / CELLE) })),
    ];
    tegnPartikler(
      ctx,
      prikker.map((p) => ({ ...p, x: x0 + p.x, y: y0 + p.y })),
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

    tegnVarmepiler(ctx, varmeUtAvDelen(g, k), kx, ky, k.side * CELLE, fane === "dyppekoker" ? 12 : 0);
    if (fane === "dyppekoker") tegnLedning(ctx, r, kx + (k.side * CELLE) / 2, ky, y0, smal);

    // Overskrift
    ctx.fillStyle = "#5b616b";
    ctx.font = "15px system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText("Varmeisolert kar: ingen varme går inn eller ut", 12, 12);

    // Merkelapper til høyre for karet (smal skjerm: under karet, se lenger ned)
    const [vMin, vMaks] = vannSpenn(kar, k);
    const vannTekst = r.likevekt ? formaterGrader(r.minTemperatur) : `${formaterGrader(vMin)} – ${formaterGrader(vMaks)}`;
    ctx.fillStyle = "#1f2328";
    if (smal) {
      ctx.textAlign = "center";
      ctx.font = "15px system-ui, sans-serif";
      const yTekst = y0 + karH + VEGG + 44;
      ctx.fillText(`${delen.navn}: ${formaterGrader(delen.temperatur(r))}`, bredde / 2, yTekst);
      ctx.fillText(`Vannet: ${vannTekst}`, bredde / 2, yTekst + 22);
    } else {
      const lx = x0 + karB + VEGG + 18;
      ctx.textAlign = "left";
      ctx.font = "600 15px system-ui, sans-serif";
      ctx.fillText(delen.navn, lx, y0 + karH / 2 - 34);
      ctx.font = "15px system-ui, sans-serif";
      ctx.fillText(formaterGrader(delen.temperatur(r)), lx, y0 + karH / 2 - 14);
      ctx.font = "600 15px system-ui, sans-serif";
      ctx.fillText("Vannet", lx, y0 + karH / 2 + 14);
      ctx.font = "15px system-ui, sans-serif";
      ctx.fillText(vannTekst, lx, y0 + karH / 2 + 34);
    }

    // Under karet
    ctx.textAlign = "center";
    ctx.font = "600 17px system-ui, sans-serif";
    ctx.fillStyle = "#1f2328";
    let status;
    if (r.likevekt) status = `Alt har samme temperatur: ${formaterGrader(kar.blandingstemperatur)}`;
    else if (r.tid === 0) status = "Gjett først, trykk så Start";
    else if (fane === "dyppekoker" && r.paa) status = "Strømmen varmer opp elementet";
    else status = "Energien sprer seg";
    ctx.fillText(status, bredde / 2, y0 + karH + VEGG + 14);

    // Forklaring til pilene
    ctx.strokeStyle = VARMEFARGE;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(12, hoyde - 22);
    ctx.lineTo(32, hoyde - 22);
    ctx.stroke();
    ctx.fillStyle = VARMEFARGE;
    ctx.beginPath();
    ctx.moveTo(38, hoyde - 22);
    ctx.lineTo(30, hoyde - 27);
    ctx.lineTo(30, hoyde - 17);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#1f2328";
    ctx.font = "14px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("varme: fra varmt til kaldt", 44, hoyde - 22);

    tegnFargeskala(ctx, bredde - 170, hoyde - 30, 150, 8, VANN_START, KLOSS_T_MAKS);
  }

  return { tegn };
}

/**
 * Én pil midt på hver side av delen, fra varmt mot kaldt. Lengde og tykkelse følger
 * varmestrømmen gjennom den siden (kvadratrot, så små strømmer fortsatt synes). Når
 * temperaturen er lik, er det ingen varmestrøm og ingen piler.
 */
function tegnVarmepiler(ctx, ut, kx, ky, s, oppForskyvning) {
  const midt = { x: kx + s / 2, y: ky + s / 2 };
  const sider = [
    { q: ut.venstre, kant: [kx, midt.y], retning: [-1, 0] },
    { q: ut.hoyre, kant: [kx + s, midt.y], retning: [1, 0] },
    { q: ut.opp, kant: [midt.x + oppForskyvning, ky], retning: [0, -1] }, // til siden for ledningen
    { q: ut.ned, kant: [midt.x, ky + s], retning: [0, 1] },
  ];
  ctx.strokeStyle = VARMEFARGE;
  ctx.fillStyle = VARMEFARGE;
  for (const { q, kant, retning } of sider) {
    if (Math.abs(q) < VARME_MIN) continue;
    const styrke = Math.sqrt(Math.min(1, Math.abs(q) / VARME_MAKS));
    const lengde = 12 + 30 * styrke;
    const bredde = 1.5 + 3 * styrke;
    // Positiv q: ut av delen. Negativ: inn i delen (vannet er varmest).
    const fortegn = q > 0 ? 1 : -1;
    const [dx, dy] = retning;
    const a = [kant[0] + dx * 3, kant[1] + dy * 3];
    const b = [kant[0] + dx * (3 + lengde), kant[1] + dy * (3 + lengde)];
    const [fra, til] = fortegn > 0 ? [a, b] : [b, a];
    const ux = (til[0] - fra[0]) / lengde;
    const uy = (til[1] - fra[1]) / lengde;
    ctx.lineWidth = bredde;
    ctx.beginPath();
    ctx.moveTo(fra[0], fra[1]);
    ctx.lineTo(til[0] - ux * 6, til[1] - uy * 6);
    ctx.stroke();
    const hode = 5 + bredde;
    ctx.beginPath();
    ctx.moveTo(til[0], til[1]);
    ctx.lineTo(til[0] - ux * 8 - uy * hode, til[1] - uy * 8 + ux * hode);
    ctx.lineTo(til[0] - ux * 8 + uy * hode, til[1] - uy * 8 - ux * hode);
    ctx.closePath();
    ctx.fill();
  }
}

/** Ledning fra elementet opp gjennom lokket, med en merkelapp: strøm på eller av. */
function tegnLedning(ctx, r, x, yElement, yKar, smal) {
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
  const igjen = `${Math.round(r.somStrom * 100)} % ikke tilført ennå`;
  if (!paa) ctx.fillText("Strøm av", x + 10, topp + 4);
  else if (!smal) ctx.fillText(`Strøm på – ${igjen}`, x + 10, topp + 4);
  else {
    // Smal tegning: én linje blir for lang, så teksten deles i to.
    ctx.fillText("Strøm på", x + 10, topp - 8);
    ctx.fillText(igjen, x + 10, topp + 8);
  }
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
      return `Vannet og varmeelementet er ${formaterGrader(VANN_START, 0)}. Ingen energi er tilført ennå. Energien strømmen skal gi, kan i prinsippet gjøre arbeid uten tap.`;
    }
    const strom = r.paa ? `${pst(r.somStrom)} av energien er ikke tilført ennå, ` : "Strømmen er slått av. ";
    return (
      `Etter ${formaterTid(r.tid)} er elementet ${formaterGrader(r.elementTemperatur)}. ${strom}` +
      `${pst(r.varmeIKaret)} er i karet – til sammen ${pst(r.energiIAlt)}. ${arbeid}${slutt}`
    );
  }

  if (r.tid === 0) {
    return `Kobberklossen er ${formaterGrader(kar.klossT, 0)}, vannet er ${formaterGrader(VANN_START, 0)}. All den ekstra energien er i klossen.`;
  }
  return (
    `Etter ${formaterTid(r.tid)} er klossen ${formaterGrader(r.klossTemperatur)}. ` +
    `${pst(r.iKlossen)} av den ekstra energien er i klossen og ${pst(r.iVannet)} i vannet – til sammen ${pst(r.varmeIKaret)}. ${arbeid}${slutt}`
  );
}
