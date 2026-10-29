// Energi som sprer seg – ren fysikk. Ingen DOM og ingen canvas.
//
// En varm kobberkloss ligger midt i kaldt vann i et lukket, isolert kar. Varmen leder
// fra klossen ut i vannet til alt har samme temperatur. Modellen fører et energiregnskap:
//   - "Varme i karet": energien over vannets starttemperatur. Den står stille, fordi
//     karet er lukket (ingen luft, ingen kant mot omgivelsene).
//   - "Kan gjøre arbeid": det meste en tenkt, perfekt varmekraftmaskin kunne hentet ut
//     av temperaturforskjellene inne i karet. Den synker mot 0 når temperaturen jevner
//     seg ut. Det er dette som menes med at energien får lavere kvalitet.
//
// Bygger på den felles varmemotoren. Motoren endres ikke.

import { lagVarmegitter } from "../../../felles/js/varmegitter.js";

/** Vannet i karet ved start (°C). Valgt i planen 2026-10-21: kaldt springvann. */
export const VANN_START = 10;
/** Klossens starttemperatur kan velges mellom disse (°C). */
export const KLOSS_T_MIN = 40;
export const KLOSS_T_MAKS = 90;
export const KLOSS_MATERIALE = "kobber";

// 4 mm celler: kobber tåler da ca. 31 ms per delsteg, så det går lett på en billig
// Chromebook. Klossen er 7 × 7 celler = 2,8 cm.
export const KAR = { dx: 4e-3, kloss: 7 };

/** Vannmengden velges ved å gjøre karet større. Mål i celler (bredde, høyde). */
export const VANNMENGDER = [
  { id: "lite", navn: "Lite", nx: 15, ny: 15 },
  { id: "middels", navn: "Middels", nx: 20, ny: 15 },
  { id: "mye", navn: "Mye", nx: 25, ny: 20 },
];

/** Alt har "samme temperatur" når forskjellen mellom varmeste og kaldeste celle er under dette (°C). */
export const LIKEVEKT_GRENSE = 0.1;

const KELVIN = 273.15;

function vannmengde(id) {
  const v = VANNMENGDER.find((m) => m.id === id);
  if (!v) throw new Error(`Ukjent vannmengde: ${id}`);
  return v;
}

/** Hvor klossen ligger: midt i karet. */
export function klossPlass(vannmengdeId) {
  const { nx, ny } = vannmengde(vannmengdeId);
  return { x: Math.floor((nx - KAR.kloss) / 2), y: Math.floor((ny - KAR.kloss) / 2), side: KAR.kloss };
}

/**
 * Varme per sekund (W) som strømmer ut av delen i midten (klossen eller elementet),
 * per side. Positiv = fra delen ut i vannet. Summen over kantcellene på hver side.
 * Gjelder snittet (`KAR.dx` tykt), så tallene er små; visningen bruker dem bare relativt.
 * @param {object} gitter  kar.gitter
 * @param {{ x: number, y: number, side: number }} plass  fra klossPlass eller elementPlass
 */
export function varmeUtAvDelen(gitter, { x, y, side }) {
  const ut = { venstre: 0, hoyre: 0, opp: 0, ned: 0 };
  for (let i = 0; i < side; i++) {
    ut.venstre += gitter.varmestromMellom(x, y + i, x - 1, y + i);
    ut.hoyre += gitter.varmestromMellom(x + side - 1, y + i, x + side, y + i);
    ut.opp += gitter.varmestromMellom(x + i, y, x + i, y - 1);
    ut.ned += gitter.varmestromMellom(x + i, y + side - 1, x + i, y + side);
  }
  return ut;
}

/** Varmekapasiteten til én celle (J/K): tetthet · spesifikk varmekapasitet · volum. */
function cellekapasitet(data, nokkel) {
  const m = data.materialer[nokkel];
  return m.rho * m.c * KAR.dx ** 3;
}

/**
 * Temperaturen alt ender på, regnet for hånd (kalorimetri): varmen klossen gir fra seg
 * er lik varmen vannet tar opp, så T = (C_kloss·T_kloss + C_vann·T_vann) / (C_kloss + C_vann).
 * Brukes til å teste motoren, og kan vises for eleven etterpå.
 */
export function blandingstemperatur(data, vannmengdeId, klossT) {
  const { nx, ny } = vannmengde(vannmengdeId);
  const klossCeller = KAR.kloss * KAR.kloss;
  const Ck = klossCeller * cellekapasitet(data, KLOSS_MATERIALE);
  const Cv = (nx * ny - klossCeller) * cellekapasitet(data, "vann");
  return (Ck * klossT + Cv * VANN_START) / (Ck + Cv);
}

/**
 * Største arbeid (J) en perfekt varmekraftmaskin kan hente ut av et lukket system av
 * deler med varmekapasitet C og temperatur T (°C), uten noe utenfor å slippe varme til.
 *
 * Hvorfor denne formelen: en perfekt maskin lager ingen ny entropi. Da ender alle delene
 * på en felles temperatur T_slutt der ln T_slutt = Σ C·ln T / Σ C (temperaturer i kelvin).
 * Energien som ikke er igjen som varme, er blitt arbeid: W = Σ C·T − Σ C · T_slutt.
 * W er 0 når alt har samme temperatur, og kan bare synke når varme leder av seg selv.
 *
 * @param {Iterable<[number, number]>} deler  par av [C (J/K), T (°C)]
 */
export function kanGjoreArbeid(deler) {
  let sumC = 0;
  let sumCT = 0;
  let sumClnT = 0;
  for (const [C, Tc] of deler) {
    const T = Tc + KELVIN;
    sumC += C;
    sumCT += C * T;
    sumClnT += C * Math.log(T);
  }
  if (sumC === 0) return 0;
  // Avrundingsfeil kan gi et bittelite negativt tall når alt er likt. Arbeid er aldri negativt.
  return Math.max(0, sumCT - sumC * Math.exp(sumClnT / sumC));
}

/** Tomt, lukket kar fylt med vann. Ingen varmeovergang mot luft (h = 0), ingen luft langs kanten. */
function lagLukketKar(data, vannmengdeId) {
  const { nx, ny } = vannmengde(vannmengdeId);
  const gitter = lagVarmegitter({ nx, ny, dx: KAR.dx, data, h: 0, kantErLuft: false });
  gitter.fyllRektangel(0, 0, nx, ny, "vann", VANN_START);
  return gitter;
}

/** Varmekapasitet per celle, regnet én gang. Materialene endrer seg ikke underveis. */
function lagCelleliste(gitter, data, erDel) {
  const celler = [];
  for (let y = 0; y < gitter.ny; y++) {
    for (let x = 0; x < gitter.nx; x++) {
      celler.push({ x, y, C: cellekapasitet(data, gitter.materiale(x, y)), erDel: erDel(x, y) });
    }
  }
  return celler;
}

/**
 * Les av temperaturene. "Varme" er energi over vannets starttemperatur (J), delt på
 * delen (klossen eller varmeelementet) og resten (vannet).
 */
function maal(gitter, celler) {
  let del = 0;
  let resten = 0;
  let delCT = 0;
  let delC = 0;
  let min = Infinity;
  let maks = -Infinity;
  const deler = [];
  for (const c of celler) {
    const T = gitter.temperatur(c.x, c.y);
    const over = c.C * (T - VANN_START);
    if (c.erDel) {
      del += over;
      delCT += c.C * T;
      delC += c.C;
    } else {
      resten += over;
    }
    if (T < min) min = T;
    if (T > maks) maks = T;
    deler.push([c.C, T]);
  }
  return { del, resten, delTemperatur: delCT / delC, min, maks, arbeid: kanGjoreArbeid(deler) };
}

/**
 * Lag karet med kloss og vann.
 * @param {object} data  materialer.json
 * @param {{ vannmengde?: string, klossT?: number }} valg
 */
export function lagKar(data, { vannmengde: vannmengdeId = "middels", klossT = KLOSS_T_MAKS } = {}) {
  if (!(klossT >= KLOSS_T_MIN && klossT <= KLOSS_T_MAKS)) {
    throw new RangeError(`Klossens temperatur må være mellom ${KLOSS_T_MIN} og ${KLOSS_T_MAKS} °C`);
  }
  const gitter = lagLukketKar(data, vannmengdeId);
  const plass = klossPlass(vannmengdeId);
  gitter.fyllRektangel(plass.x, plass.y, plass.side, plass.side, KLOSS_MATERIALE, klossT);
  const celler = lagCelleliste(gitter, data, (x, y) => gitter.materiale(x, y) === KLOSS_MATERIALE);

  // 100 % = varmen klossen hadde over vannets temperatur ved start.
  // Prosent i stedet for joule: snittet er bare 4 mm tykt, så joule-tallet sier lite.
  const startVarme = celler.reduce((s, c) => s + (c.erDel ? c.C * (klossT - VANN_START) : 0), 0);
  const blanding = blandingstemperatur(data, vannmengdeId, klossT);

  function regnskap() {
    const m = maal(gitter, celler);
    const varme = m.del + m.resten;
    return {
      tid: gitter.tid,
      iKlossen: m.del / startVarme,
      iVannet: m.resten / startVarme,
      varmeIKaret: varme / startVarme,
      energiIAlt: varme / startVarme,
      kanGjoreArbeid: m.arbeid / startVarme,
      kanGjoreArbeidJoule: m.arbeid,
      varmeJoule: varme,
      klossTemperatur: m.delTemperatur,
      minTemperatur: m.min,
      maksTemperatur: m.maks,
      likevekt: m.maks - m.min < LIKEVEKT_GRENSE,
    };
  }

  return {
    gitter,
    vannmengde: vannmengdeId,
    klossT,
    /** Temperaturen alt skal ende på (håndregning). */
    blandingstemperatur: blanding,
    regnskap,
    steg: (dt) => gitter.steg(dt),
    stegMedBudsjett: (dt, maksDelsteg) => gitter.stegMedBudsjett(dt, maksDelsteg),
  };
}

// ---------------------------------------------------------------------------
// Fane 2: dyppekoker
// ---------------------------------------------------------------------------

// Et varmeelement av rustfritt stål midt i vannet får strøm i en fast tid og slås så av.
// Energien er like stor som varmen kobberklossen på 90 °C kom med, så fanene kan
// sammenlignes. Strøm er energi av høyeste kvalitet: alt kan i prinsippet gjøre arbeid.
//
// Elementet er 5 × 5 celler (2 cm) og står på i 5 min. Prøvekjørt 23. okt.: da blir det
// høyst ca. 75 °C. Mindre element eller kortere tid ga 95–190 °C, og koking er ikke med
// i modellen. Effekten er derfor valgt etter dette, ikke etter en ekte dyppekoker.
export const ELEMENT_MATERIALE = "rustfritt_stal";
export const DYPPEKOKER = { side: 5, paaTid: 300 };

/** Hvor varmeelementet står: midt i karet. */
export function elementPlass(vannmengdeId) {
  const { nx, ny } = vannmengde(vannmengdeId);
  const side = DYPPEKOKER.side;
  return { x: Math.floor((nx - side) / 2), y: Math.floor((ny - side) / 2), side };
}

/** Elektrisk energi (J i snittet): det samme som kobberklossen på 90 °C har over vannets temperatur. */
export function dyppekokerEnergi(data) {
  return KAR.kloss * KAR.kloss * cellekapasitet(data, KLOSS_MATERIALE) * (KLOSS_T_MAKS - VANN_START);
}

/** Temperaturen alt ender på når all strømmen er blitt varme i vann og element (håndregning). */
export function dyppekokerSluttemperatur(data, vannmengdeId) {
  const { nx, ny } = vannmengde(vannmengdeId);
  const elementCeller = DYPPEKOKER.side ** 2;
  const C =
    elementCeller * cellekapasitet(data, ELEMENT_MATERIALE) +
    (nx * ny - elementCeller) * cellekapasitet(data, "vann");
  return VANN_START + dyppekokerEnergi(data) / C;
}

/**
 * Lag karet med vann og dyppekoker.
 * @param {object} data  materialer.json
 * @param {{ vannmengde?: string }} valg
 */
export function lagDyppekoker(data, { vannmengde: vannmengdeId = "middels" } = {}) {
  const gitter = lagLukketKar(data, vannmengdeId);
  const plass = elementPlass(vannmengdeId);
  gitter.fyllRektangel(plass.x, plass.y, plass.side, plass.side, ELEMENT_MATERIALE, VANN_START);
  const celler = lagCelleliste(gitter, data, (x, y) => gitter.materiale(x, y) === ELEMENT_MATERIALE);
  const elementCeller = celler.filter((c) => c.erDel);

  const strom = dyppekokerEnergi(data); // J
  const effekt = strom / DYPPEKOKER.paaTid; // W i snittet
  let paa = true;
  let slattAvVed = null;

  function settEffekt(watt) {
    for (const c of elementCeller) gitter.settEffekt(c.x, c.y, watt / elementCeller.length);
  }
  settEffekt(effekt);

  /** Tid (s) til all strømmen er levert. Motoren teller levert energi selv. */
  function tidIgjen() {
    return Math.max(0, (strom - gitter.energiregnskap.effekt) / effekt);
  }
  function slaaAvHvisFerdig() {
    // Liten margin for avrunding: 1 µs med strøm er ingenting.
    if (paa && tidIgjen() < 1e-6) {
      settEffekt(0);
      paa = false;
      slattAvVed = gitter.tid;
    }
  }

  /** Simuler dt sekunder. Strømmen slås av nøyaktig når all energien er levert. */
  function steg(dt) {
    let igjen = dt;
    if (paa) {
      const d = Math.min(igjen, tidIgjen());
      if (d > 0) gitter.steg(d);
      igjen -= d;
      slaaAvHvisFerdig();
    }
    if (!paa && igjen > 0) gitter.steg(igjen);
  }

  /** For animasjon. Stopper ved avslåingen, så strømmen aldri står på for lenge. */
  function stegMedBudsjett(dt, maksDelsteg) {
    const d = paa ? Math.min(dt, tidIgjen()) : dt;
    const simulert = d > 0 ? gitter.stegMedBudsjett(d, maksDelsteg) : 0;
    slaaAvHvisFerdig();
    return simulert;
  }

  function regnskap() {
    const m = maal(gitter, celler);
    const levert = gitter.energiregnskap.effekt;
    const igjen = strom - levert;
    const varme = m.del + m.resten;
    return {
      tid: gitter.tid,
      paa,
      slattAvVed,
      somStrom: igjen / strom,
      iElementet: m.del / strom,
      iVannet: m.resten / strom,
      varmeIKaret: varme / strom,
      energiIAlt: (igjen + varme) / strom,
      // Strøm kan i prinsippet bli til arbeid uten tap. Varme bare til en liten del.
      kanGjoreArbeid: (igjen + m.arbeid) / strom,
      kanGjoreArbeidJoule: igjen + m.arbeid,
      varmeJoule: varme,
      stromLevertJoule: levert,
      elementTemperatur: m.delTemperatur,
      minTemperatur: m.min,
      maksTemperatur: m.maks,
      likevekt: !paa && m.maks - m.min < LIKEVEKT_GRENSE,
    };
  }

  return {
    gitter,
    vannmengde: vannmengdeId,
    /** Temperaturen alt skal ende på (håndregning). */
    blandingstemperatur: dyppekokerSluttemperatur(data, vannmengdeId),
    regnskap,
    steg,
    stegMedBudsjett,
  };
}
