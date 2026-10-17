// Varmeledning med partikler – ren fysikk. Ingen DOM og ingen canvas.
//
// To scenarier som begge bygger på den felles varmemotoren:
//   "Ta på":         en finger (hud) legges på to klosser samtidig.
//   "Isbit på kloss": en isbit fra fryseren legges på aluminium og på tre.
// Hvert scenario har to scener side om side, som regnes med samme tidssteg.

import { lagVarmegitter } from "../../felles/js/varmegitter.js";

/** Materialer eleven kan velge i "Ta på". */
export const TA_PAA_MATERIALER = ["kobber", "aluminium", "rustfritt_stal", "glass", "tre", "isopor"];
/** Klossene i "Isbit på kloss". */
export const ISBIT_MATERIALER = ["aluminium", "tre"];

/** Romtemperatur i begge scenarier (°C). */
export const ROMTEMPERATUR = 20;
/** Isbit rett fra fryseren (°C). Valgt av eieren 2026-10-17. */
export const ISBIT_START = -18;

// ---------------------------------------------------------------------------
// Geometri. Alt måles i celler.
// ---------------------------------------------------------------------------

// "Ta på": små celler (0,5 mm), fordi kontakttemperaturen bare blir riktig når
// cellene er små nok til at varmen rekker gjennom huden (se fase 1-testene).
export const TA_PAA_GEOMETRI = {
  dx: 5e-4,
  bredde: 40, // 2 cm
  hudRader: 4, // 2 mm hud
  klossRader: 20, // 1 cm kloss
  fingerFra: 10, // fingeren er 1 cm bred, midt på klossen
  fingerTil: 30,
};

// "Isbit": større celler (2 mm), ellers blir det for tungt for en billig Chromebook.
export const ISBIT_GEOMETRI = {
  dx: 2e-3,
  bredde: 60, // 12 cm
  isRader: 10, // 2 cm isbit
  klossRader: 15, // 3 cm kloss
  isFra: 25,
  isTil: 35,
};

// ---------------------------------------------------------------------------
// "Ta på"
// ---------------------------------------------------------------------------

function lagBeroring(data, materiale) {
  const G = TA_PAA_GEOMETRI;
  const hudT = data.konstanter.hudtemperatur.verdi;
  const gitter = lagVarmegitter({
    nx: G.bredde,
    ny: G.hudRader + G.klossRader,
    dx: G.dx,
    data,
    h: data.konstanter.h_stille_luft.verdi,
    luftTemperatur: ROMTEMPERATUR,
  });
  gitter.fyllRektangel(G.fingerFra, 0, G.fingerTil - G.fingerFra, G.hudRader, "hud", hudT);
  gitter.fyllRektangel(0, G.hudRader, G.bredde, G.klossRader, materiale, ROMTEMPERATUR);
  // Blodet holder baksiden av hudlaget på hudtemperatur.
  for (let x = G.fingerFra; x < G.fingerTil; x++) gitter.holdTemperatur(x, 0, hudT);

  const yHud = G.hudRader - 1;
  const yKloss = G.hudRader;
  const midtFra = Math.floor((G.fingerFra + G.fingerTil) / 2) - 2;
  const kontaktBredde = (G.fingerTil - G.fingerFra) * G.dx;

  return {
    materiale,
    gitter,
    /** Temperaturen i huden der den berører klossen (snitt av fire celler midt under fingeren). */
    kontaktTemperatur() {
      let sum = 0;
      for (let x = midtFra; x < midtFra + 4; x++) sum += gitter.grenseflateTemperatur(x, yHud, x, yKloss);
      return sum / 4;
    },
    /** Varme som strømmer fra fingeren inn i klossen, per kvadratmeter (W/m²). Positiv = ut av fingeren. */
    varmestromUt() {
      let sum = 0;
      for (let x = G.fingerFra; x < G.fingerTil; x++) sum += gitter.varmestromMellom(x, yHud, x, yKloss);
      return sum / (kontaktBredde * gitter.dx);
    },
  };
}

/**
 * @param {object} data materialer.json
 * @param {{ venstre: string, hoyre: string }} valg
 */
export function lagTaPaa(data, { venstre, hoyre }) {
  const scener = [lagBeroring(data, venstre), lagBeroring(data, hoyre)];
  return lagPar(scener, (s) => ({
    materiale: s.materiale,
    kontaktTemperatur: avrund(s.kontaktTemperatur(), 2),
    varmestromUt: avrund(s.varmestromUt(), 0),
  }));
}

/**
 * Hvilken kloss kjennes kaldest? "venstre", "hoyre" eller "like" (forskjell under 0,3 °C).
 */
export function kaldestKloss(taPaa) {
  const [a, b] = taPaa.scener.map((s) => s.kontaktTemperatur());
  if (Math.abs(a - b) < 0.3) return "like";
  return a < b ? "venstre" : "hoyre";
}

// ---------------------------------------------------------------------------
// "Isbit på kloss"
// ---------------------------------------------------------------------------

function lagIsbitScene(data, materiale) {
  const G = ISBIT_GEOMETRI;
  const gitter = lagVarmegitter({
    nx: G.bredde,
    ny: G.isRader + G.klossRader,
    dx: G.dx,
    data,
    h: data.konstanter.h_stille_luft.verdi,
    luftTemperatur: ROMTEMPERATUR,
  });
  gitter.fyllRektangel(G.isFra, 0, G.isTil - G.isFra, G.isRader, "is", ISBIT_START);
  gitter.fyllRektangel(0, G.isRader, G.bredde, G.klossRader, materiale, ROMTEMPERATUR);

  const xMidt = Math.floor((G.isFra + G.isTil) / 2);
  const startMasse = gitter.smeltetMasse().totalt;
  let rantBort = 0; // masse smeltevann som har rent bort (kg)
  let smeltetVed = null;

  /**
   * Smeltevann renner bort, og isen over synker ned så den hviler på klossen.
   * Ellers ville vannet bli liggende som et isolerende lag mellom is og kloss
   * (vann leder varme nesten fire ganger dårligere enn is).
   */
  function rennOgSynk() {
    for (let y = 0; y < G.isRader; y++) {
      for (let x = G.isFra; x < G.isTil; x++) {
        if (!gitter.erTom(x, y) && gitter.smeltetAndel(x, y) >= 1) rantBort += gitter.fjernCelle(x, y).masse;
      }
    }
    for (let x = G.isFra; x < G.isTil; x++) {
      // Pakk isen i hver kolonne nedover mot klossen.
      let bunn = G.isRader - 1;
      for (let y = G.isRader - 1; y >= 0; y--) {
        if (gitter.erTom(x, y)) continue;
        if (y !== bunn) gitter.flyttCelle(x, y, x, bunn);
        bunn--;
      }
    }
  }

  return {
    materiale,
    gitter,
    rennOgSynk,
    smeltetAndel() {
      return (gitter.smeltetMasse().smeltet + rantBort) / startMasse;
    },
    /** Isbitens masse ved start (kg). */
    startMasse,
    /** Masse smeltevann som har rent bort (kg), til tegning av en dam. */
    get rantBort() {
      return rantBort;
    },
    /** Temperaturen i klossen rett under midten av isbiten. */
    klossTemperaturUnderIs() {
      return gitter.temperatur(xMidt, G.isRader);
    },
    /** Simulert tid (s) da all isen var smeltet, eller null. */
    get smeltetVed() {
      return smeltetVed;
    },
    sjekkFerdig() {
      if (smeltetVed === null && this.smeltetAndel() >= 0.999) smeltetVed = gitter.tid;
    },
  };
}

export function lagIsbit(data) {
  const scener = ISBIT_MATERIALER.map((m) => lagIsbitScene(data, m));
  const par = lagPar(
    scener,
    (s) => ({
      materiale: s.materiale,
      smeltetAndel: avrund(s.smeltetAndel(), 3),
      klossTemperaturUnderIs: avrund(s.klossTemperaturUnderIs(), 2),
      smeltetVed: s.smeltetVed === null ? null : Math.round(s.smeltetVed),
    }),
    () =>
      scener.forEach((s) => {
        s.rennOgSynk();
        s.sjekkFerdig();
      })
  );
  return par;
}

/** Hvilken isbit smeltet først? "aluminium", "tre", "like" eller null (ingen ferdig ennå). */
export function forstSmeltet(isbit) {
  const [a, b] = isbit.scener;
  if (a.smeltetVed === null && b.smeltetVed === null) return null;
  if (a.smeltetVed !== null && b.smeltetVed !== null && Math.abs(a.smeltetVed - b.smeltetVed) < 1) return "like";
  if (b.smeltetVed === null) return a.materiale;
  if (a.smeltetVed === null) return b.materiale;
  return a.smeltetVed < b.smeltetVed ? a.materiale : b.materiale;
}

// ---------------------------------------------------------------------------
// Felles: to scener som går i takt
// ---------------------------------------------------------------------------

function lagPar(scener, beskrivScene, etterSteg = () => {}) {
  return {
    scener,
    get tid() {
      return scener[0].gitter.tid;
    },
    /**
     * Simuler dt sekunder i begge scenene. Deles i biter på høyst 1 s, slik at det som
     * skal skje mellom stegene (f.eks. at smeltevann renner bort) skjer ofte nok.
     */
    steg(dt) {
      const n = Math.max(1, Math.ceil(dt / 1));
      for (let i = 0; i < n; i++) {
        for (const s of scener) s.gitter.steg(dt / n);
        etterSteg();
      }
    },
    /**
     * For animasjon: simuler opptil dtOnsket, men høyst maksDelsteg delsteg i hver scene.
     * Begge scenene får samme tid, så de alltid kan sammenlignes.
     * @returns {number} simulert tid
     */
    stegMedBudsjett(dtOnsket, maksDelsteg) {
      const mulig = Math.min(...scener.map((s) => s.gitter.dtMaks() * maksDelsteg));
      const dt = Math.min(dtOnsket, mulig);
      this.steg(dt);
      return dt;
    },
    /** Kort sammendrag for KI-tutoren. */
    tilstand() {
      return { tid: avrund(this.tid, 2), scener: scener.map(beskrivScene) };
    },
  };
}

function avrund(x, desimaler) {
  const f = 10 ** desimaler;
  return Math.round(x * f) / f;
}
