// Varmeledning med partikler – tegning. Ingen fysikk her, bare lesing av tilstanden.

import { temperaturFarge, tegnFargeskala } from "../../../felles/js/fargeskala.js";
import { tegnPartikler } from "../../../felles/js/partikler.js";
import { tegnCeller, lagGitterPartikler, PARTIKKELFARGE } from "../../../felles/js/gittertegning.js";
import { formaterGrader, formaterTid } from "../../../felles/js/format.js";
import { TA_PAA_GEOMETRI, ISBIT_GEOMETRI, ROMTEMPERATUR } from "./modell.js";

export { formaterTid };

export const TA_PAA_STORRELSE = { bredde: 760, hoyde: 370 };
export const ISBIT_STORRELSE = { bredde: 760, hoyde: 330 };

// På smal skjerm (mobil) står de to klossene over hverandre i stedet for side om
// side. Da blir alt dobbelt så stort, og teksten kan leses (F03). Fargeskalaen
// flyttes til bunnen, så den ikke kommer i veien for fingeren.
export const TA_PAA_STABLET = { bredde: 380, hoyde: 2 * 370 + 30 };
export const ISBIT_STABLET = { bredde: 390, hoyde: 2 * 330 };

/**
 * Når klossene står over hverandre, finnes ikke venstre og høyre i bildet. Gjetningen
 * og menyene sier likevel «Venstre» og «Høyre», så klossene får det som påskrift.
 */
function sidenavn(ctx, i) {
  if (ctx.logiskBredde >= 760) return "";
  return i === 0 ? "Venstre kloss: " : "Høyre kloss: ";
}

/** Flytt tegningen av scene nr. i hvis klossene står over hverandre. */
function flyttScene(ctx, i, kolonne, rad) {
  ctx.save();
  if (ctx.logiskBredde < 760) ctx.translate(-i * kolonne, i * rad);
}

export function materialNavn(data, nokkel) {
  return data.materialer[nokkel]?.navn ?? nokkel;
}

/** Materialnavn midt i en setning: "aluminium", "tre (furu)". */
function navnISetning(data, nokkel) {
  const navn = materialNavn(data, nokkel);
  return navn.charAt(0).toLowerCase() + navn.slice(1);
}

// ---------------------------------------------------------------------------
// Felles: piler for varmestrøm
// ---------------------------------------------------------------------------

function tegnPil(ctx, x, y1, y2, bredde) {
  ctx.strokeStyle = "#b35c00";
  ctx.fillStyle = "#b35c00";
  ctx.lineWidth = bredde;
  ctx.beginPath();
  ctx.moveTo(x, y1);
  ctx.lineTo(x, y2 - 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 5 - bredde, y2 - 7);
  ctx.lineTo(x + 5 + bredde, y2 - 7);
  ctx.lineTo(x, y2);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------------------
// "Ta på"
// ---------------------------------------------------------------------------

const TP_CELLE = 8;
const TP_TOPP = 120; // y der hudlaget starter når fingeren berører

export function lagTaPaaVisning(data) {
  const G = TA_PAA_GEOMETRI;
  let partikler = null;

  function sceneX(i) {
    return 20 + i * 390 + (340 - G.bredde * TP_CELLE) / 2;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} taPaa  fra lagTaPaa
   * @param {{ berort: boolean, tid: number }} vis  berort = fingeren ligger på klossen
   */
  function tegn(ctx, taPaa, { berort, tid }) {
    const stablet = ctx.logiskBredde < TA_PAA_STORRELSE.bredde;
    ctx.clearRect(0, 0, ctx.logiskBredde, ctx.logiskHoyde);
    if (!partikler) partikler = taPaa.scener.map((s, i) => lagGitterPartikler(s.gitter, TP_CELLE, 7 + i));
    const loft = berort ? 0 : 28; // fingeren svever over klossen før start

    taPaa.scener.forEach((scene, i) => {
      flyttScene(ctx, i, 390, TA_PAA_STORRELSE.hoyde);
      const x0 = sceneX(i);
      const g = scene.gitter;
      const forskyv = (y) => (y < G.hudRader ? -loft : 0);
      const fingerX = x0 + G.fingerFra * TP_CELLE;
      const fingerB = (G.fingerTil - G.fingerFra) * TP_CELLE;

      // Resten av fingeren (bare pynt, holdt på hudtemperatur av blodet)
      ctx.fillStyle = temperaturFarge(data.konstanter.hudtemperatur.verdi);
      ctx.beginPath();
      ctx.roundRect(fingerX, 30 - loft, fingerB, TP_TOPP - 30 + 1, [fingerB / 3, fingerB / 3, 0, 0]);
      ctx.fill();
      ctx.strokeStyle = "rgba(138,75,59,0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      tegnCeller(ctx, g, x0, TP_TOPP, TP_CELLE, forskyv);

      // Kant rundt klossen
      ctx.strokeStyle = "rgba(31,35,40,0.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 0.5, TP_TOPP + G.hudRader * TP_CELLE + 0.5, G.bredde * TP_CELLE - 1, G.klossRader * TP_CELLE - 1);

      tegnPartikler(
        ctx,
        partikler[i].map((p) => ({ ...p, x: x0 + p.x, y: TP_TOPP + p.y + forskyv(p.cy) })),
        (p) => g.temperatur(p.cx, p.cy),
        tid,
        { radius: 2.6, farge: (p) => PARTIKKELFARGE[g.materiale(p.cx, p.cy)] }
      );

      // Piler: varme ut av fingeren og inn i klossen
      if (berort) {
        const q = scene.varmestromUt();
        if (q > 1) {
          const styrke = Math.min(1, Math.max(0, Math.log10(q / 50) / 2.7));
          const yKontakt = TP_TOPP + G.hudRader * TP_CELLE;
          for (const andel of [0.25, 0.5, 0.75]) {
            tegnPil(ctx, fingerX + fingerB * andel, yKontakt - 14, yKontakt + 10 + 46 * styrke, 1.5 + 3 * styrke);
          }
          ctx.fillStyle = "#b35c00";
          ctx.font = "600 15px system-ui, sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          // Over klossen, på hvit bakgrunn (4,7:1). På kanten av klossen var den vanskelig å lese.
          ctx.fillText("varme", fingerX + fingerB + 8, yKontakt - 12);
        }
      }

      // Tekst
      ctx.fillStyle = "#1f2328";
      ctx.font = "600 18px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const yBunn = TP_TOPP + (G.hudRader + G.klossRader) * TP_CELLE;
      ctx.fillText(sidenavn(ctx, i) + materialNavn(data, scene.materiale), x0 + (G.bredde * TP_CELLE) / 2, yBunn + 10);
      ctx.font = "15px system-ui, sans-serif";
      ctx.fillStyle = "#5b616b";
      const hjorne = g.temperatur(1, g.ny - 2);
      ctx.fillText(`Termometer i klossen: ${formaterGrader(hjorne)}`, x0 + (G.bredde * TP_CELLE) / 2, yBunn + 34);
      ctx.fillStyle = "#1f2328";
      ctx.fillText(`Finger, ${formaterGrader(data.konstanter.hudtemperatur.verdi, 0)}`, fingerX + fingerB / 2, 66 - loft);
      ctx.restore();
    });

    tegnFargeskala(ctx, ctx.logiskBredde / 2 - 75, stablet ? 2 * TA_PAA_STORRELSE.hoyde + 6 : 10, 150, 8);
  }

  return {
    tegn,
    /** Kall når scenene byttes ut (nytt materiale eller nullstilling). */
    nullstill() {
      partikler = null;
    },
  };
}

// ---------------------------------------------------------------------------
// "Isbit på kloss"
// ---------------------------------------------------------------------------

const IB_CELLE = 6;
const IB_TOPP = 70;

export function lagIsbitVisning(data) {
  const G = ISBIT_GEOMETRI;
  let partikler = null;

  function sceneX(i) {
    return 10 + i * 380 + (370 - G.bredde * IB_CELLE) / 2;
  }

  function tegn(ctx, isbit, { tid }) {
    ctx.clearRect(0, 0, ctx.logiskBredde, ctx.logiskHoyde);
    if (!partikler) partikler = isbit.scener.map((s, i) => lagGitterPartikler(s.gitter, IB_CELLE, 3 + i));

    isbit.scener.forEach((scene, i) => {
      flyttScene(ctx, i, 380, ISBIT_STORRELSE.hoyde);
      const x0 = sceneX(i);
      const g = scene.gitter;
      const yKloss = IB_TOPP + G.isRader * IB_CELLE;
      const breddePx = G.bredde * IB_CELLE;

      // Dam av smeltevann på hver side av isbiten (bare tegning)
      const vann = scene.rantBort / scene.startMasse;
      if (vann > 0) {
        const lengde = Math.min(breddePx / 2 - 10, 20 + 130 * vann);
        const midt = x0 + ((G.isFra + G.isTil) / 2) * IB_CELLE;
        ctx.fillStyle = "rgba(40,110,190,0.6)";
        ctx.beginPath();
        ctx.roundRect(midt - lengde, yKloss - 4, 2 * lengde, 4, 2);
        ctx.fill();
      }

      tegnCeller(ctx, g, x0, IB_TOPP, IB_CELLE);
      ctx.strokeStyle = "rgba(31,35,40,0.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 0.5, yKloss + 0.5, breddePx - 1, G.klossRader * IB_CELLE - 1);

      tegnPartikler(
        ctx,
        partikler[i].map((p) => ({ ...p, x: x0 + p.x, y: IB_TOPP + p.y })),
        (p) => g.temperatur(p.cx, p.cy),
        tid,
        { radius: 1.9, farge: (p) => PARTIKKELFARGE[g.materiale(p.cx, p.cy)] }
      );

      // Tekst
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#1f2328";
      ctx.font = "600 18px system-ui, sans-serif";
      const yBunn = yKloss + G.klossRader * IB_CELLE;
      ctx.fillText(sidenavn(ctx, i) + materialNavn(data, scene.materiale), x0 + breddePx / 2, yBunn + 10);
      ctx.font = "15px system-ui, sans-serif";
      ctx.fillStyle = "#5b616b";
      const andel = scene.smeltetAndel();
      const tekst = scene.smeltetVed !== null ? "Helt smeltet" : `Smeltet: ${Math.round(andel * 100)} %`;
      ctx.fillText(tekst, x0 + breddePx / 2, 14);
      const T = scene.klossTemperaturUnderIs();
      if (T !== null) ctx.fillText(`Klossen under isen: ${formaterGrader(T)}`, x0 + breddePx / 2, yBunn + 34);
      ctx.restore();
    });

    tegnFargeskala(ctx, ctx.logiskBredde / 2 - 75, ctx.logiskHoyde - 30, 150, 8);
  }

  return {
    tegn,
    nullstill() {
      partikler = null;
    },
  };
}

// ---------------------------------------------------------------------------
// Tekstbeskrivelser (for skjermleser og som hjelp)
// ---------------------------------------------------------------------------

export function beskrivTaPaa(data, taPaa, berort) {
  const [a, b] = taPaa.scener;
  const navnA = navnISetning(data, a.materiale);
  const navnB = navnISetning(data, b.materiale);
  if (!berort) {
    const hud = formaterGrader(data.konstanter.hudtemperatur.verdi, 0);
    return `Fingeren (${hud}) er klar over to klosser: ${navnA} til venstre og ${navnB} til høyre. Begge klossene er ${formaterGrader(ROMTEMPERATUR, 0)}.`;
  }
  return (
    `Etter ${taPaa.tid.toFixed(1).replace(".", ",")} s: huden mot ${navnA} er ${formaterGrader(a.kontaktTemperatur())}, ` +
    `huden mot ${navnB} er ${formaterGrader(b.kontaktTemperatur())}. Varmen strømmer fra fingeren og inn i klossene.`
  );
}

export function beskrivIsbit(data, isbit) {
  const deler = isbit.scener.map((s) => {
    const navn = navnISetning(data, s.materiale);
    return s.smeltetVed !== null
      ? `isbiten på ${navn} er helt smeltet`
      : `isbiten på ${navn} er ${Math.round(s.smeltetAndel() * 100)} % smeltet`;
  });
  return `Etter ${formaterTid(isbit.tid)}: ${deler.join(", ")}.`;
}
