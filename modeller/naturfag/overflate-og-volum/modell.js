// Overflate og volum – ren fysikk. Ingen DOM og ingen canvas.
//
// Samme mengde snø ligger som én blokk, delt i 4, 16 eller 64 biter, eller spredt i et
// tynt lag. Varme kommer inn gjennom overflaten (luft, og valgfritt sol og varmt
// underlag). Smeltevann renner bort, og snøen over synker ned.

import { lagVarmegitter } from "../../../felles/js/varmegitter.js";

/** Snøtype og starttemperatur. Valgt av eieren 2026-10-17. */
export const SNO = "pakket_sno";
export const SNO_START = -5; // °C
export const LUFT_T = 5; // °C
export const UNDERLAG_T = 5; // °C, varm bakke under bitene

/**
 * Oppdelingene eleven kan velge. deling = antall biter langs hver side i snittet.
 * I snittet blir det deling² biter (staver, se GEOMETRI.dybde).
 */
export const OPPDELINGER = [
  { id: "1", navn: "Én blokk", deling: 1 },
  { id: "4", navn: "4 biter", deling: 2 },
  { id: "16", navn: "16 biter", deling: 4 },
  { id: "64", navn: "64 biter", deling: 8 },
  { id: "spredt", navn: "Spredt utover", deling: null },
];

// Geometri i celler. dx = 1 cm. Blokken er 16 × 16 cm i snittet.
export const GEOMETRI = {
  dx: 0.01,
  side: 16,
  // Snittet regner som om alt går like langt inn i skjermen: blokken er en terning på
  // 16 cm, og bitene er staver som er 16 cm lange. Forsiden og baksiden får ingen varme.
  dybde: 16,
  mellomrom: 1, // luft mellom bitene
  spredtHoyde: 4, // det spredte laget er 4 cm tykt (64 cm bredt)
  bredde: 70,
  hoyde: 24,
};

/** Plasseringen av bitene i gitteret: [{ x, y, b, h }], nederst i gitteret, midtstilt. */
export function lagBiter(oppdelingId) {
  const G = GEOMETRI;
  const valg = OPPDELINGER.find((o) => o.id === oppdelingId);
  if (!valg) throw new Error(`Ukjent oppdeling: ${oppdelingId}`);
  if (valg.deling === null) {
    const b = (G.side * G.side) / G.spredtHoyde;
    return [{ x: Math.floor((G.bredde - b) / 2), y: G.hoyde - G.spredtHoyde, b, h: G.spredtHoyde }];
  }
  const n = valg.deling;
  const s = G.side / n;
  const total = n * s + (n - 1) * G.mellomrom;
  const x0 = Math.floor((G.bredde - total) / 2);
  const y0 = G.hoyde - total;
  const biter = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      biter.push({ x: x0 + c * (s + G.mellomrom), y: y0 + r * (s + G.mellomrom), b: s, h: s });
    }
  }
  return biter;
}

/**
 * Overflate og volum for nøyaktig de bitene simuleringen regner på: staver med
 * tverrsnittet fra snittet og lengden GEOMETRI.dybde. Overflaten er den varmen kan
 * komme inn gjennom i modellen, altså sidene rundt. Endene (forside og bakside) er ikke med.
 * Mål i cm, cm² og cm³ (dx = 1 cm).
 */
export function overflateOgVolum(oppdelingId) {
  const G = GEOMETRI;
  const biter = lagBiter(oppdelingId);
  let overflate = 0;
  let volum = 0;
  for (const b of biter) {
    overflate += 2 * (b.b + b.h) * G.dybde;
    volum += b.b * b.h * G.dybde;
  }
  const { b, h } = biter[0];
  return { antall: biter.length, bredde: b, hoyde: h, lengde: G.dybde, overflate, volum, perVolum: overflate / volum };
}

/**
 * @param {object} data materialer.json
 * @param {{ oppdeling: string, sol?: boolean, underlag?: boolean }} valg
 */
export function lagSnoforsok(data, { oppdeling, sol = false, underlag = false }) {
  const G = GEOMETRI;
  const gitter = lagVarmegitter({
    nx: G.bredde,
    ny: G.hoyde,
    dx: G.dx,
    data,
    h: data.konstanter.h_stille_luft.verdi,
    luftTemperatur: LUFT_T,
  });
  const biter = lagBiter(oppdeling);
  for (const b of biter) {
    gitter.fyllRektangel(b.x, b.y, b.b, b.h, SNO, SNO_START);
    for (let x = b.x; x < b.x + b.b; x++) {
      if (underlag) gitter.settUnderlag(x, b.y + b.h - 1, UNDERLAG_T);
    }
  }

  // Sola: effekt inn på oversiden av den øverste snøcellen i hver kolonne.
  const solPerCelle = sol
    ? data.konstanter.solinnstraling_var.verdi * data.konstanter.sol_tatt_opp_sno.verdi * G.dx * G.dx
    : 0;

  const startMasse = gitter.smeltetMasse().totalt;
  let rantBort = 0;
  let smeltetVed = null;

  // For "én blokk": når når et hjørne og midten av en side 0 °C?
  const blokk = oppdeling === "1" ? biter[0] : null;
  let hjorneNullVed = null;
  let midtNullVed = null;

  function hjorner() {
    const { x, y, b, h } = blokk;
    return [[x, y], [x + b - 1, y], [x, y + h - 1], [x + b - 1, y + h - 1]];
  }
  function sidemidter() {
    const { x, y, b, h } = blokk;
    const mx = x + Math.floor(b / 2);
    const my = y + Math.floor(h / 2);
    return [[mx, y], [x, my], [x + b - 1, my], [mx, y + h - 1]];
  }
  const naddNull = (celler) =>
    celler.some(([x, y]) => !gitter.erTom(x, y) && gitter.temperatur(x, y) >= 0);

  // To celler merkes i bildet, så eleven kan sammenligne et hjørne med midten av en side.
  // De ligger på flaten der den sterkeste varmekilden virker. Da er det merkede hjørnet
  // det som faktisk når 0 °C først, og sidecellen den som når 0 °C først av sidemidtene.
  // Underlaget varmer mest, så sola, så lufta (se testene).
  function velgMerkedeCeller() {
    const { x, y, b, h } = blokk;
    const mx = x + Math.floor(b / 2);
    const my = y + Math.floor(h / 2);
    if (underlag) return { flate: "under", hjorne: [x, y + h - 1], side: [mx, y + h - 1] };
    if (sol) return { flate: "over", hjorne: [x, y], side: [mx, y] };
    return { flate: "venstre", hjorne: [x, y], side: [x, my] };
  }

  /**
   * Sidene der en celle får varme inn, og fra hva: [{ retning: [dx, dy], kilder: [...] }].
   * Luft der nabocellen er tom, sol på oversiden av den øverste snøen, underlag under bunnen.
   */
  function varmeInn(cx, cy) {
    const tom = (x, y) => x < 0 || y < 0 || x >= G.bredde || y >= G.hoyde || gitter.erTom(x, y);
    const sider = [];
    if (tom(cx - 1, cy)) sider.push({ retning: [-1, 0], kilder: ["luft"] });
    if (tom(cx + 1, cy)) sider.push({ retning: [1, 0], kilder: ["luft"] });
    if (tom(cx, cy - 1)) sider.push({ retning: [0, -1], kilder: solPerCelle > 0 ? ["luft", "sol"] : ["luft"] });
    if (tom(cx, cy + 1)) sider.push({ retning: [0, 1], kilder: underlag ? ["underlag"] : ["luft"] });
    return sider;
  }

  /** Smeltevann renner bort, snøen synker ned i biten sin, og sola treffer den øverste cellen. */
  function etterSteg() {
    for (const b of biter) {
      for (let x = b.x; x < b.x + b.b; x++) {
        for (let y = b.y; y < b.y + b.h; y++) {
          if (!gitter.erTom(x, y) && gitter.smeltetAndel(x, y) >= 1) rantBort += gitter.fjernCelle(x, y).masse;
        }
        let bunn = b.y + b.h - 1;
        for (let y = b.y + b.h - 1; y >= b.y; y--) {
          if (gitter.erTom(x, y)) continue;
          if (y !== bunn) gitter.flyttCelle(x, y, x, bunn);
          bunn--;
        }
        if (solPerCelle > 0) {
          let topp = true;
          for (let y = b.y; y < b.y + b.h; y++) {
            if (gitter.erTom(x, y)) continue;
            gitter.settEffekt(x, y, topp ? solPerCelle : 0);
            topp = false;
          }
        }
      }
    }
    if (blokk) {
      if (hjorneNullVed === null && naddNull(hjorner())) hjorneNullVed = gitter.tid;
      if (midtNullVed === null && naddNull(sidemidter())) midtNullVed = gitter.tid;
    }
    if (smeltetVed === null && smeltetAndel() >= 0.999) smeltetVed = gitter.tid;
  }

  function smeltetAndel() {
    return (gitter.smeltetMasse().smeltet + rantBort) / startMasse;
  }

  etterSteg(); // sett sola på fra start

  const BIT = 10; // s; hvor ofte vann renner og snø synker
  return {
    gitter,
    biter,
    oppdeling,
    sol,
    underlag,
    startMasse,
    get rantBort() {
      return rantBort;
    },
    get tid() {
      return gitter.tid;
    },
    get smeltetVed() {
      return smeltetVed;
    },
    get hjorneNullVed() {
      return hjorneNullVed;
    },
    get midtNullVed() {
      return midtNullVed;
    },
    /** For én blokk: { flate: "venstre" | "over" | "under", hjorne: [x, y], side: [x, y] }. Ellers null. */
    merkedeCeller: blokk ? velgMerkedeCeller() : null,
    varmeInn,
    smeltetAndel,
    /** Masse snø som er igjen i gitteret (kg), smeltet eller ikke. */
    snoIgjen() {
      return gitter.smeltetMasse().totalt;
    },
    steg(dt) {
      const n = Math.max(1, Math.ceil(dt / BIT));
      for (let i = 0; i < n; i++) {
        gitter.steg(dt / n);
        etterSteg();
      }
    },
    /** For animasjon: høyst maksDelsteg delsteg. Returnerer simulert tid. */
    stegMedBudsjett(dtOnsket, maksDelsteg) {
      const dt = Math.min(dtOnsket, gitter.dtMaks() * maksDelsteg);
      this.steg(dt);
      return dt;
    },
    tilstand() {
      return {
        oppdeling,
        sol,
        underlag,
        tid: Math.round(gitter.tid),
        smeltetAndel: Math.round(smeltetAndel() * 1000) / 1000,
        smeltetVed: smeltetVed === null ? null : Math.round(smeltetVed),
        hjorneNullVed: hjorneNullVed === null ? null : Math.round(hjorneNullVed),
        midtNullVed: midtNullVed === null ? null : Math.round(midtNullVed),
      };
    },
  };
}

/** Tid (s) til all snøen er smeltet, regnet raskt uten tegning. Til fasit og tester. */
export function smeltetid(data, valg, maksTid = 7 * 24 * 3600) {
  const f = lagSnoforsok(data, valg);
  while (f.smeltetVed === null && f.tid < maksTid) f.steg(600);
  return f.smeltetVed;
}
