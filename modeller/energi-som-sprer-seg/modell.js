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

import { lagVarmegitter } from "../../felles/js/varmegitter.js";

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

/**
 * Lag karet med kloss og vann.
 * @param {object} data  materialer.json
 * @param {{ vannmengde?: string, klossT?: number }} valg
 */
export function lagKar(data, { vannmengde: vannmengdeId = "middels", klossT = KLOSS_T_MAKS } = {}) {
  if (!(klossT >= KLOSS_T_MIN && klossT <= KLOSS_T_MAKS)) {
    throw new RangeError(`Klossens temperatur må være mellom ${KLOSS_T_MIN} og ${KLOSS_T_MAKS} °C`);
  }
  const { nx, ny } = vannmengde(vannmengdeId);
  // Lukket kar: ingen varmeovergang mot luft (h = 0) og ingen luft langs kanten.
  const gitter = lagVarmegitter({ nx, ny, dx: KAR.dx, data, h: 0, kantErLuft: false });
  gitter.fyllRektangel(0, 0, nx, ny, "vann", VANN_START);
  const plass = klossPlass(vannmengdeId);
  gitter.fyllRektangel(plass.x, plass.y, plass.side, plass.side, KLOSS_MATERIALE, klossT);

  // Varmekapasitet per celle, regnet én gang. Materialene endrer seg ikke underveis.
  const celler = [];
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const nokkel = gitter.materiale(x, y);
      celler.push({ x, y, C: cellekapasitet(data, nokkel), erKloss: nokkel === KLOSS_MATERIALE });
    }
  }

  // 100 % = varmen klossen hadde over vannets temperatur ved start.
  // Prosent i stedet for joule: snittet er bare 4 mm tykt, så joule-tallet sier lite.
  const startVarme = celler.reduce((s, c) => s + (c.erKloss ? c.C * (klossT - VANN_START) : 0), 0);
  const blanding = blandingstemperatur(data, vannmengdeId, klossT);

  function regnskap() {
    let kloss = 0;
    let vann = 0;
    let min = Infinity;
    let maks = -Infinity;
    let klossSum = 0;
    let klossC = 0;
    const deler = [];
    for (const c of celler) {
      const T = gitter.temperatur(c.x, c.y);
      const over = c.C * (T - VANN_START);
      if (c.erKloss) {
        kloss += over;
        klossSum += c.C * T;
        klossC += c.C;
      } else {
        vann += over;
      }
      if (T < min) min = T;
      if (T > maks) maks = T;
      deler.push([c.C, T]);
    }
    const arbeid = kanGjoreArbeid(deler);
    return {
      tid: gitter.tid,
      iKlossen: kloss / startVarme,
      iVannet: vann / startVarme,
      varmeIKaret: (kloss + vann) / startVarme,
      kanGjoreArbeid: arbeid / startVarme,
      kanGjoreArbeidJoule: arbeid,
      varmeJoule: kloss + vann,
      klossTemperatur: klossSum / klossC,
      minTemperatur: min,
      maksTemperatur: maks,
      likevekt: maks - min < LIKEVEKT_GRENSE,
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
