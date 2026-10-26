// Overflate og volum – tegning. Ingen fysikk her, bare lesing av tilstanden.

import { tegnFargeskala, temperaturFarge } from "../../../felles/js/fargeskala.js";
import { tegnPartikler } from "../../../felles/js/partikler.js";
import { tegnCeller, lagGitterPartikler, PARTIKKELFARGE } from "../../../felles/js/gittertegning.js";
import { formaterTid, formaterGrader } from "../../../felles/js/format.js";
import { GEOMETRI, OPPDELINGER, LUFT_T, UNDERLAG_T } from "./modell.js";

export const STORRELSE = { bredde: 760, hoyde: 380 };

const CELLE = 10;
const X0 = (STORRELSE.bredde - GEOMETRI.bredde * CELLE) / 2;
const Y0 = 70;
const SOLFARGE = "#9a6c00"; // mørk gul: 4,6:1 mot hvitt, så sol-teksten kan leses (#c98a00 hadde 2,9:1)
const MERKEFARGE = "#1f2328";
const VARMEFARGE = "#D55E00"; // rødoransje (Okabe–Ito), varm ende som fargeskalaen
const MERKENAVN = { hjorne: "Hjørnecelle", side: "Midt på siden" };

/** "−4,2 °C", eller "0 °C – smelter" når cellen har nådd smeltepunktet. */
function celleTemperatur(g, x, y) {
  const T = g.temperatur(x, y);
  return T >= 0 ? "0 °C – smelter" : formaterGrader(T).replace("-", "−");
}

function tegnPil(ctx, x1, y1, x2, y2) {
  const v = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.moveTo(x2 - 6 * Math.cos(v - 0.5), y2 - 6 * Math.sin(v - 0.5));
  ctx.lineTo(x2, y2);
  ctx.lineTo(x2 - 6 * Math.cos(v + 0.5), y2 - 6 * Math.sin(v + 0.5));
  ctx.stroke();
}

/**
 * Ring rundt hjørnecellen og cellen midt på siden, med navn og temperatur. Når forsøket
 * er startet, viser piler hver side der cellen har luft (eller underlag) og får varme inn.
 */
function tegnMerkedeCeller(ctx, forsok, visVarme) {
  const g = forsok.gitter;
  const tomUtenfor = (x, y) => x < 0 || y < 0 || x >= g.nx || y >= g.ny || g.erTom(x, y);
  for (const [nokkel, [cx, cy]] of Object.entries(forsok.merkedeCeller)) {
    if (g.erTom(cx, cy)) continue; // smeltet bort
    const mx = X0 + (cx + 0.5) * CELLE;
    const my = Y0 + (cy + 0.5) * CELLE;

    ctx.strokeStyle = MERKEFARGE;
    ctx.lineWidth = 2;
    ctx.strokeRect(mx - CELLE / 2 - 1.5, my - CELLE / 2 - 1.5, CELLE + 3, CELLE + 3);

    if (visVarme) {
      ctx.strokeStyle = VARMEFARGE;
      ctx.lineWidth = 2.5;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        if (!tomUtenfor(cx + dx, cy + dy)) continue;
        tegnPil(ctx, mx + dx * 26, my + dy * 26, mx + dx * 10, my + dy * 10);
      }
    }

    ctx.fillStyle = MERKEFARGE;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.font = "600 15px system-ui, sans-serif";
    ctx.fillText(MERKENAVN[nokkel], mx - 34, my - 18);
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillText(celleTemperatur(g, cx, cy), mx - 34, my + 1);
  }

  if (visVarme) {
    ctx.strokeStyle = VARMEFARGE;
    ctx.lineWidth = 2.5;
    tegnPil(ctx, 12, STORRELSE.hoyde - 22, 36, STORRELSE.hoyde - 22);
    ctx.fillStyle = MERKEFARGE;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText("varme inn gjennom overflaten", 44, STORRELSE.hoyde - 22);
  }
}

export function lagVisning(data) {
  let partikler = null;
  let forrigeForsok = null;

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} forsok fra lagSnoforsok
   * @param {{ tid: number, visVarme?: boolean }} vis  ekte tid (for jevn vibrasjon), og om
   *   pilene for varme inn skal vises (først etter at eleven har gjettet og startet)
   */
  function tegn(ctx, forsok, { tid, visVarme = false }) {
    const { bredde, hoyde } = STORRELSE;
    ctx.clearRect(0, 0, bredde, hoyde);
    if (forsok !== forrigeForsok) {
      partikler = lagGitterPartikler(forsok.gitter, CELLE, 5);
      forrigeForsok = forsok;
    }
    const g = forsok.gitter;
    const yBakke = Y0 + GEOMETRI.hoyde * CELLE;

    // Lufta
    ctx.fillStyle = "#5b616b";
    ctx.font = "15px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`Luft: +${LUFT_T} °C`, 12, 10);

    // Sola
    if (forsok.sol) {
      const sol = data.konstanter.solinnstraling_var.verdi;
      const opp = Math.round(data.konstanter.sol_tatt_opp_sno.verdi * 100);
      ctx.fillStyle = SOLFARGE;
      ctx.textAlign = "right";
      ctx.fillText(`Sol: ${sol} W/m², snøen tar opp ${opp} %`, bredde - 12, 10);
      ctx.strokeStyle = SOLFARGE;
      ctx.lineWidth = 2;
      for (let x = X0 + 30; x < X0 + GEOMETRI.bredde * CELLE - 20; x += 46) {
        ctx.beginPath();
        ctx.moveTo(x, 34);
        ctx.lineTo(x, 52);
        ctx.moveTo(x - 4, 47);
        ctx.lineTo(x, 53);
        ctx.lineTo(x + 4, 47);
        ctx.stroke();
      }
    }

    // Rister eller varmt underlag under hver bit
    for (const b of forsok.biter) {
      const x = X0 + b.x * CELLE;
      const y = Y0 + (b.y + b.h) * CELLE;
      if (forsok.underlag) {
        ctx.fillStyle = temperaturFarge(UNDERLAG_T);
        ctx.fillRect(x - 2, y, b.b * CELLE + 4, 3);
        ctx.fillStyle = "rgba(107,74,43,0.8)";
        ctx.fillRect(x - 2, y + 2, b.b * CELLE + 4, 1.5);
      } else {
        ctx.strokeStyle = "#9aa0a8";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.moveTo(x - 2, y + 1);
        ctx.lineTo(x + b.b * CELLE + 2, y + 1);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Smeltevann samles nederst
    const vann = forsok.rantBort / forsok.startMasse;
    if (vann > 0) {
      const lengde = Math.min(GEOMETRI.bredde * CELLE - 20, 40 + 600 * vann);
      ctx.fillStyle = "rgba(40,110,190,0.55)";
      ctx.beginPath();
      ctx.roundRect(bredde / 2 - lengde / 2, yBakke + 6, lengde, 4, 2);
      ctx.fill();
    }

    tegnCeller(ctx, g, X0, Y0, CELLE);
    tegnPartikler(
      ctx,
      partikler.map((p) => ({ ...p, x: X0 + p.x, y: Y0 + p.y })),
      (p) => g.temperatur(p.cx, p.cy),
      tid,
      { radius: 2.6, farge: (p) => PARTIKKELFARGE[g.materiale(p.cx, p.cy)] }
    );
    if (forsok.merkedeCeller) tegnMerkedeCeller(ctx, forsok, visVarme);

    // Tekst under
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#1f2328";
    ctx.font = "600 17px system-ui, sans-serif";
    const valg = OPPDELINGER.find((o) => o.id === forsok.oppdeling);
    const andel = forsok.smeltetAndel();
    const status = forsok.smeltetVed !== null ? "alt smeltet" : `${Math.round(andel * 100)} % smeltet`;
    ctx.fillText(`${valg.navn} · ${status}`, bredde / 2, yBakke + 18);
    if (forsok.underlag) {
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillStyle = "#5b616b";
      ctx.textAlign = "left";
      ctx.fillText(`Underlaget holder +${UNDERLAG_T} °C`, 12, yBakke + 20);
    }

    tegnFargeskala(ctx, bredde - 170, hoyde - 30, 150, 8);
  }

  return { tegn };
}

/** Tekst om hva som skjer (for skjermleser og som hjelp). */
export function beskriv(forsok) {
  const valg = OPPDELINGER.find((o) => o.id === forsok.oppdeling);
  const deler = [`${valg.navn}. Etter ${formaterTid(forsok.tid)} er ${Math.round(forsok.smeltetAndel() * 100)} % av snøen smeltet.`];
  const m = forsok.merkedeCeller;
  if (m) {
    const g = forsok.gitter;
    const tekst = (navn, [x, y]) =>
      g.erTom(x, y) ? `${navn} har smeltet bort` : `${navn} er ${celleTemperatur(g, x, y)}`;
    deler.push(`${tekst("Den merkede hjørnecellen", m.hjorne)}. ${tekst("Den merkede cellen midt på siden", m.side)}.`);
  }
  if (forsok.hjorneNullVed !== null) deler.push(`Hjørnene nådde 0 °C etter ${formaterTid(forsok.hjorneNullVed)}.`);
  if (forsok.midtNullVed !== null) deler.push(`Midten av sidene nådde 0 °C etter ${formaterTid(forsok.midtNullVed)}.`);
  if (forsok.smeltetVed !== null) deler.push(`All snøen var smeltet etter ${formaterTid(forsok.smeltetVed)}.`);
  return deler.join(" ");
}
