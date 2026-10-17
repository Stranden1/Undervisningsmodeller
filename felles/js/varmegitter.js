// Felles varmemotor: et 2D-gitter av celler der hver celle har et materiale og en energi.
//
// Ren fysikk – ingen DOM og ingen canvas, så fila kan testes i Node.
// Materialverdiene sendes inn (innholdet i felles/data/materialer.json), slik at motoren
// aldri har egne tall.
//
// Hovedidéer (forklart for lærere i docs/plan.html):
//  - Gitteret er et snitt gjennom tingene. Hver celle er en liten terning med side dx.
//  - Hver celle lagrer ENERGI (entalpi), og temperaturen regnes ut fra energien.
//    Da står is på 0 °C mens den smelter: tilført energi går med til å smelte,
//    ikke til å øke temperaturen.
//  - Varme flyter mellom naboceller etter temperaturforskjell (Fouriers lov).
//    Mellom to materialer brukes harmonisk snitt av k, som for to lag i serie.
//  - Luft simuleres ikke. Overflater mot tomme celler mister/får varme med et
//    varmeovergangstall h.
//  - Eksplisitt tidssteg (neste øyeblikk regnes direkte fra nåværende). Det er bare
//    stabilt for små steg, så motoren deler opp i så mange delsteg som trengs.

const TOM = 0;

/**
 * @param {object} oppsett
 * @param {number} oppsett.nx   antall celler bortover
 * @param {number} oppsett.ny   antall celler nedover
 * @param {number} oppsett.dx   cellestørrelse i meter
 * @param {object} oppsett.data innholdet i materialer.json
 * @param {number} [oppsett.h=0]              varmeovergangstall mot luft, W/m²·K (0 = isolert)
 * @param {number} [oppsett.luftTemperatur=20] °C
 * @param {boolean} [oppsett.kantErLuft=true] skal gitterets ytterkant regnes som luft?
 * @param {number} [oppsett.sikkerhet=0.9]    andel av største stabile tidssteg som brukes
 */
export function lagVarmegitter({
  nx,
  ny,
  dx,
  data,
  h = 0,
  luftTemperatur = 20,
  kantErLuft = true,
  sikkerhet = 0.9,
}) {
  const N = nx * ny;
  const dybde = dx; // cellene er terninger, så energiene blir ekte joule for en liten terning
  const volum = dx * dx * dybde;
  const flateAreal = dx * dybde;
  const smeltevarme = data.konstanter.smeltevarme_is.verdi;

  // ---------- Materialtabell ----------
  // Indeks 0 er "tom" (luft som ikke simuleres).
  const nokler = [null];
  const kFast = [0]; // k før smelting
  const kFlytende = [0]; // k etter smelting (lik kFast for materialer som ikke smelter)
  const rho = [0];
  const cFast = [0];
  const cFlytende = [0];
  const smelter = [false];
  const indeksFor = new Map();

  for (const [nokkel, m] of Object.entries(data.materialer)) {
    indeksFor.set(nokkel, nokler.length);
    nokler.push(nokkel);
    kFast.push(m.k);
    rho.push(m.rho);
    cFast.push(m.c);
    if (m.smelter_til) {
      const etter = data.materialer[m.smelter_til];
      if (!etter) throw new Error(`${nokkel} smelter til ukjent materiale ${m.smelter_til}`);
      kFlytende.push(etter.k);
      cFlytende.push(etter.c);
      smelter.push(true);
    } else {
      kFlytende.push(m.k);
      cFlytende.push(m.c);
      smelter.push(false);
    }
  }
  if (nokler.length > 255) throw new Error("For mange materialer");

  // ---------- Celletilstand ----------
  const mat = new Uint8Array(N); // materialindeks per celle
  const H = new Float64Array(N); // energi (J). 0 J = fast stoff ved 0 °C.
  const T = new Float64Array(N).fill(NaN); // temperatur (°C), regnet ut fra H
  const andel = new Float64Array(N); // smeltet andel 0–1
  const k = new Float64Array(N); // varmeledningsevne akkurat nå
  const Cfast = new Float64Array(N); // varmekapasitet før smelting (J/K)
  const Cflyt = new Float64Array(N); // varmekapasitet etter smelting (J/K)
  const Lcelle = new Float64Array(N); // energi som trengs for å smelte hele cellen (J)
  const luftFlater = new Uint8Array(N); // antall sider som vender mot luft
  const laast = new Uint8Array(N); // 1 = temperaturen holdes fast (f.eks. blod i hånda)
  const laastT = new Float64Array(N);
  const effekt = new Float64Array(N); // ytre tilført effekt (W), f.eks. sol

  let tid = 0;
  let dtMaksCache = null;
  // Energiregnskap: energi inn utenfra (luft, effekt, låste celler) og energi i fjernede
  // celler, for å kunne sjekke bevaring.
  const regnskap = { luft: 0, effekt: 0, laast: 0, fjernet: 0 };

  // ---------- Hjelpefunksjoner ----------

  function idx(x, y) {
    if (x < 0 || y < 0 || x >= nx || y >= ny) throw new RangeError(`Celle (${x}, ${y}) er utenfor gitteret`);
    return y * nx + x;
  }

  /** Energi for en celle med gitt temperatur. Ved nøyaktig 0 °C avgjør smeltet andel. */
  function energiFra(i, temperatur, smeltetAndel = 0) {
    if (Lcelle[i] > 0) {
      if (temperatur < 0) return Cfast[i] * temperatur;
      if (temperatur > 0) return Lcelle[i] + Cflyt[i] * temperatur;
      return smeltetAndel * Lcelle[i];
    }
    return Cfast[i] * temperatur;
  }

  /** Regn ut temperatur, smeltet andel og k fra energien. */
  function regnUt(i) {
    const m = mat[i];
    if (m === TOM) {
      T[i] = NaN;
      return;
    }
    const e = H[i];
    if (Lcelle[i] > 0) {
      if (e < 0) {
        T[i] = e / Cfast[i];
        andel[i] = 0;
      } else if (e <= Lcelle[i]) {
        // Smelter: all energi går til å bryte bindinger, temperaturen står på 0 °C.
        T[i] = 0;
        andel[i] = e / Lcelle[i];
      } else {
        T[i] = (e - Lcelle[i]) / Cflyt[i];
        andel[i] = 1;
      }
      // En halvveis smeltet celle er en blanding; enkleste rimelige valg er lineær blanding.
      k[i] = kFast[m] + andel[i] * (kFlytende[m] - kFast[m]);
    } else {
      T[i] = e / Cfast[i];
    }
  }

  function regnUtAlle() {
    for (let i = 0; i < N; i++) regnUt(i);
  }

  /** Harmonisk snitt: to halve celler i serie. Det dårligste materialet bestemmer. */
  function ledningstall(ka, kb) {
    return (dybde * 2 * ka * kb) / (ka + kb); // W/K. (areal/avstand = dybde når cellene er like store)
  }

  /** Varmeovergang fra cellemidten til lufta: halv celle med ledning i serie med h. */
  function luftLedning(i) {
    if (h <= 0 || luftFlater[i] === 0) return 0;
    const U = 1 / (1 / h + dx / (2 * k[i]));
    return U * flateAreal * luftFlater[i];
  }

  function oppdaterLuftFlater() {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const i = y * nx + x;
        if (mat[i] === TOM) {
          luftFlater[i] = 0;
          continue;
        }
        let n = 0;
        if (x === 0 ? kantErLuft : mat[i - 1] === TOM) n++;
        if (x === nx - 1 ? kantErLuft : mat[i + 1] === TOM) n++;
        if (y === 0 ? kantErLuft : mat[i - nx] === TOM) n++;
        if (y === ny - 1 ? kantErLuft : mat[i + nx] === TOM) n++;
        luftFlater[i] = n;
      }
    }
  }

  function geometriEndret() {
    oppdaterLuftFlater();
    dtMaksCache = null;
  }

  /**
   * Største stabile tidssteg. En celle må ikke kunne gi fra seg mer varme i ett steg
   * enn det som skal til for å nå naboens temperatur – ellers "skyter den over" og
   * regnestykket begynner å svinge. Kravet er dt ≤ C / (sum av ledningstall).
   */
  function dtMaks() {
    if (dtMaksCache !== null) return dtMaksCache;
    let minst = Infinity;
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const i = y * nx + x;
        const m = mat[i];
        if (m === TOM) continue;
        const ki = Math.max(kFast[m], kFlytende[m]);
        let sumG = 0;
        const naboer = [x > 0 ? i - 1 : -1, x < nx - 1 ? i + 1 : -1, y > 0 ? i - nx : -1, y < ny - 1 ? i + nx : -1];
        for (const j of naboer) {
          if (j < 0 || mat[j] === TOM) continue;
          sumG += ledningstall(ki, Math.max(kFast[mat[j]], kFlytende[mat[j]]));
        }
        if (h > 0 && luftFlater[i] > 0) {
          sumG += (1 / (1 / h + dx / (2 * ki))) * flateAreal * luftFlater[i];
        }
        if (sumG > 0) {
          const C = Lcelle[i] > 0 ? Math.min(Cfast[i], Cflyt[i]) : Cfast[i];
          minst = Math.min(minst, C / sumG);
        }
      }
    }
    dtMaksCache = sikkerhet * minst;
    return dtMaksCache;
  }

  function settCelleUtenGeometri(i, nokkel, temperatur, { smeltetAndel = 0 } = {}) {
    if (nokkel === null) {
      mat[i] = TOM;
      H[i] = 0;
      andel[i] = 0;
      k[i] = 0;
      Cfast[i] = Cflyt[i] = Lcelle[i] = 0;
      laast[i] = 0;
      effekt[i] = 0;
    } else {
      const m = indeksFor.get(nokkel);
      if (m === undefined) throw new Error(`Ukjent materiale: ${nokkel}`);
      const masse = rho[m] * volum;
      mat[i] = m;
      k[i] = kFast[m];
      Cfast[i] = masse * cFast[m];
      Cflyt[i] = masse * cFlytende[m];
      Lcelle[i] = smelter[m] ? masse * smeltevarme : 0;
      H[i] = energiFra(i, temperatur, smeltetAndel);
    }
    regnUt(i);
  }

  // ---------- Ett delsteg ----------

  function delsteg(dt) {
    regnUtAlle();

    // Ledning mellom naboer. Hvert par regnes én gang, og det som går ut av den ene
    // cellen går inn i den andre – derfor er energien bevart helt eksakt.
    for (let y = 0; y < ny; y++) {
      const rad = y * nx;
      for (let x = 0; x < nx - 1; x++) {
        const a = rad + x;
        const b = a + 1;
        if (mat[a] === TOM || mat[b] === TOM) continue;
        const q = ledningstall(k[a], k[b]) * (T[b] - T[a]) * dt;
        H[a] += q;
        H[b] -= q;
      }
    }
    for (let y = 0; y < ny - 1; y++) {
      const rad = y * nx;
      for (let x = 0; x < nx; x++) {
        const a = rad + x;
        const b = a + nx;
        if (mat[a] === TOM || mat[b] === TOM) continue;
        const q = ledningstall(k[a], k[b]) * (T[b] - T[a]) * dt;
        H[a] += q;
        H[b] -= q;
      }
    }

    for (let i = 0; i < N; i++) {
      if (mat[i] === TOM) continue;
      // Luft ved overflaten
      if (h > 0 && luftFlater[i] > 0) {
        const q = luftLedning(i) * (luftTemperatur - T[i]) * dt;
        H[i] += q;
        regnskap.luft += q;
      }
      // Ytre effekt (sol, varmeplate ...)
      if (effekt[i] !== 0) {
        const q = effekt[i] * dt;
        H[i] += q;
        regnskap.effekt += q;
      }
      // Celler med fast temperatur (f.eks. holdt varm av blodet)
      if (laast[i]) {
        const nyEnergi = energiFra(i, laastT[i]);
        regnskap.laast += nyEnergi - H[i];
        H[i] = nyEnergi;
      }
    }

    tid += dt;
  }

  // ---------- Det som kan brukes utenfra ----------

  const gitter = {
    nx,
    ny,
    dx,

    /** Simulert tid i sekunder. */
    get tid() {
      return tid;
    },

    get h() {
      return h;
    },
    set h(verdi) {
      h = verdi;
      dtMaksCache = null;
    },

    get luftTemperatur() {
      return luftTemperatur;
    },
    set luftTemperatur(verdi) {
      luftTemperatur = verdi;
    },

    /**
     * Sett materiale og temperatur i én celle. nokkel = null gjør cellen tom (luft).
     * For is og snø ved nøyaktig 0 °C kan smeltet andel oppgis.
     */
    settCelle(x, y, nokkel, temperatur = 0, valg = {}) {
      settCelleUtenGeometri(idx(x, y), nokkel, temperatur, valg);
      geometriEndret();
    },

    /** Fyll et rektangel (x, y øverst til venstre, b × hoyde celler). */
    fyllRektangel(x, y, b, hoyde, nokkel, temperatur = 0, valg = {}) {
      for (let yy = y; yy < y + hoyde; yy++) {
        for (let xx = x; xx < x + b; xx++) settCelleUtenGeometri(idx(xx, yy), nokkel, temperatur, valg);
      }
      geometriEndret();
    },

    /**
     * Fjern en celle (f.eks. smeltevann som renner bort). Energien og massen den hadde,
     * føres i energiregnskapet som "fjernet", så bevaring fortsatt kan sjekkes.
     * @returns {{ energi: number, masse: number }}
     */
    fjernCelle(x, y) {
      const i = idx(x, y);
      if (mat[i] === TOM) return { energi: 0, masse: 0 };
      const ut = { energi: H[i], masse: rho[mat[i]] * volum };
      regnskap.fjernet += H[i];
      settCelleUtenGeometri(i, null);
      geometriEndret();
      return ut;
    },

    /**
     * Flytt en celle med alt innhold til en tom plass (f.eks. is som synker ned når
     * cellen under har smeltet). Energien følger med, så ingenting går tapt.
     */
    flyttCelle(xFra, yFra, xTil, yTil) {
      const a = idx(xFra, yFra);
      const b = idx(xTil, yTil);
      if (mat[b] !== TOM) throw new Error(`Celle (${xTil}, ${yTil}) er ikke tom`);
      mat[b] = mat[a];
      H[b] = H[a];
      k[b] = k[a];
      Cfast[b] = Cfast[a];
      Cflyt[b] = Cflyt[a];
      Lcelle[b] = Lcelle[a];
      laast[b] = laast[a];
      laastT[b] = laastT[a];
      effekt[b] = effekt[a];
      settCelleUtenGeometri(a, null);
      regnUt(b);
      geometriEndret();
    },

    /** Massen i en celle (kg). */
    masse(x, y) {
      const i = idx(x, y);
      return mat[i] === TOM ? 0 : rho[mat[i]] * volum;
    },

    /** Hold en celle på fast temperatur (null slipper den). */
    holdTemperatur(x, y, temperatur) {
      const i = idx(x, y);
      if (temperatur === null) {
        laast[i] = 0;
      } else {
        laast[i] = 1;
        laastT[i] = temperatur;
        H[i] = energiFra(i, temperatur);
        regnUt(i);
      }
    },

    /** Ytre effekt inn i en celle, i watt (f.eks. sol på oversiden). */
    settEffekt(x, y, watt) {
      effekt[idx(x, y)] = watt;
    },

    materiale(x, y) {
      return nokler[mat[idx(x, y)]];
    },
    temperatur(x, y) {
      const t = T[idx(x, y)];
      return Number.isNaN(t) ? null : t;
    },
    smeltetAndel(x, y) {
      return andel[idx(x, y)];
    },
    energi(x, y) {
      return H[idx(x, y)];
    },
    erTom(x, y) {
      return mat[idx(x, y)] === TOM;
    },
    antallLuftflater(x, y) {
      return luftFlater[idx(x, y)];
    },

    /**
     * Temperaturen i grenseflaten mellom to naboceller. Varmen som går inn i flaten fra
     * den ene siden må gå ut på den andre, så flaten havner nærmest temperaturen til
     * cellen som leder best: T = (ka·Ta + kb·Tb) / (ka + kb).
     */
    grenseflateTemperatur(xa, ya, xb, yb) {
      const a = idx(xa, ya);
      const b = idx(xb, yb);
      return (k[a] * T[a] + k[b] * T[b]) / (k[a] + k[b]);
    },

    /** Varme per sekund (W) som strømmer fra celle a til nabocelle b akkurat nå. */
    varmestromMellom(xa, ya, xb, yb) {
      const a = idx(xa, ya);
      const b = idx(xb, yb);
      if (mat[a] === TOM || mat[b] === TOM) return 0;
      return ledningstall(k[a], k[b]) * (T[a] - T[b]);
    },

    /** Direkte tilgang for tegning (les, ikke skriv). Tomme celler har NaN. */
    get temperaturFelt() {
      return T;
    },
    get smeltetFelt() {
      return andel;
    },
    get materialFelt() {
      return mat;
    },
    materialNokkel(indeks) {
      return nokler[indeks];
    },

    /** Summen av energien i alle celler (J). */
    totalEnergi() {
      let sum = 0;
      for (let i = 0; i < N; i++) sum += H[i];
      return sum;
    },

    /** Energi inn utenfra siden start (J): luft, effekt, låste celler – og energi i fjernede celler (fjernet). */
    get energiregnskap() {
      return { ...regnskap };
    },

    /** Masse av is/snø som har smeltet, og total masse som kan smelte (kg). */
    smeltetMasse() {
      let smeltet = 0;
      let totalt = 0;
      for (let i = 0; i < N; i++) {
        if (Lcelle[i] > 0) {
          const masse = Lcelle[i] / smeltevarme;
          totalt += masse;
          smeltet += masse * andel[i];
        }
      }
      return { smeltet, totalt };
    },

    dtMaks,

    /**
     * Simuler dt sekunder. Deles automatisk i små nok delsteg.
     * @returns {number} antall delsteg som ble brukt
     */
    steg(dt) {
      if (dt <= 0) return 0;
      const grense = dtMaks();
      const n = Number.isFinite(grense) ? Math.max(1, Math.ceil(dt / grense)) : 1;
      const lite = dt / n;
      for (let s = 0; s < n; s++) delsteg(lite);
      regnUtAlle();
      return n;
    },

    /**
     * For animasjon: simuler opptil dtOnsket sekunder, men bruk høyst maksDelsteg.
     * Er maskinen for treg, går simuleringen saktere enn ønsket i stedet for å bli
     * ustabil. Returnerer hvor mye tid som faktisk ble simulert, slik at skjermen
     * ærlig kan vise "1 s = X s simulert".
     */
    stegMedBudsjett(dtOnsket, maksDelsteg) {
      if (dtOnsket <= 0) return 0;
      const grense = dtMaks();
      if (!Number.isFinite(grense)) {
        this.steg(dtOnsket);
        return dtOnsket;
      }
      const trengs = Math.ceil(dtOnsket / grense);
      if (trengs <= maksDelsteg) {
        this.steg(dtOnsket);
        return dtOnsket;
      }
      for (let s = 0; s < maksDelsteg; s++) delsteg(grense);
      regnUtAlle();
      return maksDelsteg * grense;
    },
  };

  return gitter;
}
