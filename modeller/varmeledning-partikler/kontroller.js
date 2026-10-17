// Varmeledning med partikler – knapper, valg og løkka som driver modellen.
// Kobler modell (fysikk) og visning (tegning) sammen. Ingen fysikk her.

import {
  lagTaPaa,
  lagIsbit,
  kaldestKloss,
  forstSmeltet,
  TA_PAA_MATERIALER,
  ROMTEMPERATUR,
} from "./modell.js";
import {
  lagTaPaaVisning,
  lagIsbitVisning,
  TA_PAA_STORRELSE,
  ISBIT_STORRELSE,
  beskrivTaPaa,
  beskrivIsbit,
  formaterTid,
  materialNavn,
} from "./visning.js";
import { hentMaterialer } from "../../felles/js/data.js";
import { lagForutsi } from "../../felles/js/forutsi.js";
import { koblTilTutor } from "../../felles/js/tilstand.js";
import { lagGraf } from "../../felles/js/graf.js";
import { klargjorLerret } from "../../felles/js/lerret.js";
import { temperaturFarge } from "../../felles/js/fargeskala.js";

const data = await hentMaterialer();
const $ = (id) => document.getElementById(id);

const MAKS_DELSTEG = 400; // per skjermbilde og scene; holder en treg Chromebook i gang
const TA_PAA_VARIGHET = 20; // sekunder
const HUD_T = data.konstanter.hudtemperatur.verdi;
const SERIEFARGER = [
  { farge: "#1f5fa8" },
  { farge: "#b35c00", strek: [7, 5] },
];

const tall = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 1 });
const grader = (T) => `${T.toFixed(1).replace(".", ",")} °C`;
const liten = (s) => s.charAt(0).toLowerCase() + s.slice(1);

/** "ca. 1 600 ganger bedre", avrundet til to gjeldende siffer. */
function forholdTekst(a, b) {
  const kA = data.materialer[a].k;
  const kB = data.materialer[b].k;
  const [best, dårligst] = kA >= kB ? [a, b] : [b, a];
  const r = Math.max(kA, kB) / Math.min(kA, kB);
  if (r < 1.15) {
    return `${materialNavn(data, a)} og ${liten(materialNavn(data, b))} leder varme omtrent like godt.`;
  }
  const siffer = 10 ** Math.max(0, Math.floor(Math.log10(r)) - 1);
  const avrundet = r < 10 ? Math.round(r * 10) / 10 : Math.round(r / siffer) * siffer;
  return `${materialNavn(data, best)} leder varme ca. ${tall.format(avrundet)} ganger bedre enn ${liten(materialNavn(data, dårligst))}.`;
}

// ---------------------------------------------------------------------------
// Ta på
// ---------------------------------------------------------------------------

const tp = {
  ctx: klargjorLerret($("tapaa-lerret"), TA_PAA_STORRELSE.bredde, TA_PAA_STORRELSE.hoyde),
  visning: lagTaPaaVisning(data),
  graf: lagGraf($("tapaa-graf"), {
    xMaks: TA_PAA_VARIGHET,
    yMin: 18,
    yMaks: 34,
    xTekst: "tid (s)",
    yTekst: "temperatur (°C)",
    utvidX: false,
    serier: [
      { navn: "", ...SERIEFARGER[0] },
      { navn: "", ...SERIEFARGER[1] },
    ],
    referanser: [
      { y: HUD_T, tekst: "fingeren før" },
      { y: ROMTEMPERATUR, tekst: "klossene før" },
    ],
  }),
  modell: null,
  forutsi: null,
  kjorer: false,
  berort: false,
  ferdig: false,
  resultatVist: false,
  fart: 1,
};

const velgVenstre = $("tapaa-venstre");
const velgHoyre = $("tapaa-hoyre");
for (const velg of [velgVenstre, velgHoyre]) {
  for (const m of TA_PAA_MATERIALER) velg.add(new Option(materialNavn(data, m), m));
}
velgVenstre.value = "aluminium";
velgHoyre.value = "tre";

function byggTaPaa() {
  const venstre = velgVenstre.value;
  const hoyre = velgHoyre.value;
  tp.modell = lagTaPaa(data, { venstre, hoyre });
  tp.visning.nullstill();
  tp.kjorer = tp.berort = tp.ferdig = tp.resultatVist = false;
  tp.graf.nullstill();
  tp.graf.settSerieNavn([`Venstre: ${materialNavn(data, venstre)}`, `Høyre: ${materialNavn(data, hoyre)}`]);
  tp.graf.tegn();
  velgVenstre.disabled = velgHoyre.disabled = false;
  $("tapaa-start").disabled = true;
  $("tapaa-start").textContent = "Start";
  $("tapaa-forhold").textContent = forholdTekst(venstre, hoyre);
  tegnVerditabell(venstre, hoyre);
  lagFolesMaler();

  tp.forutsi = lagForutsi($("tapaa-forutsi"), {
    sporsmal: "Begge klossene har ligget lenge i rommet. Hvilken kjennes kaldest når fingeren tar på?",
    valg: [
      { id: "venstre", tekst: `Venstre: ${materialNavn(data, venstre)}` },
      { id: "hoyre", tekst: `Høyre: ${materialNavn(data, hoyre)}` },
      { id: "like", tekst: "De kjennes like kalde" },
    ],
    vedLaas: (valg) => {
      $("tapaa-start").disabled = false;
      velgVenstre.disabled = velgHoyre.disabled = true;
      tutor.sendHendelse("gjetning", { fane: "tapaa", valg });
    },
  });
  oppdaterTaPaaTekst(true);
}

function tegnVerditabell(venstre, hoyre) {
  const rader = [...new Set(["hud", venstre, hoyre])].map((m) => {
    const v = data.materialer[m];
    return `<tr><td>${v.navn}</td><td>${tall.format(v.k)}</td><td>${tall.format(v.rho)}</td><td>${tall.format(v.c)}</td></tr>`;
  });
  $("tapaa-verdier").innerHTML =
    "<caption class='kun-skjermleser'>Materialverdier</caption>" +
    "<tr><th>Materiale</th><th title='varmeledningsevne'>k (W/m·K)</th><th title='tetthet'>ρ (kg/m³)</th><th title='spesifikk varmekapasitet'>c (J/kg·K)</th></tr>" +
    rader.join("");
}

// "Føles som"-måler: hvor nær klossens temperatur huden blir dratt.
function lagFolesMaler() {
  const beholder = $("tapaa-foles");
  beholder.innerHTML = "";
  const gradient = `linear-gradient(to right, ${temperaturFarge(ROMTEMPERATUR)}, ${temperaturFarge(
    (ROMTEMPERATUR + HUD_T) / 2
  )}, ${temperaturFarge(HUD_T)})`;
  tp.modell.scener.forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "foles";
    div.innerHTML = `
      <div class="navn"><span>${i === 0 ? "Venstre" : "Høyre"}: ${materialNavn(data, s.materiale)}</span><span class="tall"></span></div>
      <div class="spor" style="background:${gradient}"><div class="merke"></div></div>
      <div class="ender"><span>like kald som klossen</span><span>like varm som fingeren</span></div>
      <div class="ord"></div>`;
    beholder.append(div);
  });
}

function oppdaterFoles() {
  const maalere = $("tapaa-foles").children;
  tp.modell.scener.forEach((s, i) => {
    const m = maalere[i];
    if (!m) return;
    const T = tp.berort ? s.kontaktTemperatur() : HUD_T;
    const a = Math.min(1, Math.max(0, (T - ROMTEMPERATUR) / (HUD_T - ROMTEMPERATUR)));
    m.querySelector(".merke").style.left = `${a * 100}%`;
    m.querySelector(".tall").textContent = tp.berort ? `huden: ${grader(T)}` : "";
    let ord = "Ikke berørt ennå";
    if (tp.berort) {
      if (a < 0.2) ord = "Kjennes kald";
      else if (a < 0.5) ord = "Kjennes kjølig";
      else if (a < 0.85) ord = "Kjennes litt kjølig";
      else ord = "Kjennes nesten ikke";
    }
    m.querySelector(".ord").textContent = ord;
  });
}

/** Tidslinja oppdateres ofte. Beskrivelsen (lest av skjermleser) bare når beskriv = true. */
function oppdaterTaPaaTekst(beskriv = false) {
  const tid = tp.modell.tid;
  const fartTekst = tp.fart === 1 ? "sanntid" : "¼ fart (sakte film)";
  $("tapaa-tid").textContent = tp.berort
    ? `Tid siden fingeren tok på: ${tid.toFixed(1).replace(".", ",")} s · ${fartTekst}`
    : "Trykk Start for å legge fingeren på klossene.";
  const tekst = beskrivTaPaa(data, tp.modell, tp.berort);
  if (beskriv && tekst !== $("tapaa-beskrivelse").textContent) $("tapaa-beskrivelse").textContent = tekst;
}

function stegTaPaa(dtEkte) {
  if (!tp.kjorer) return;
  const igjen = TA_PAA_VARIGHET - tp.modell.tid;
  tp.modell.stegMedBudsjett(Math.min(igjen, dtEkte * tp.fart), MAKS_DELSTEG);
  tp.modell.scener.forEach((s, i) => tp.graf.leggTil(i, tp.modell.tid, s.kontaktTemperatur()));

  if (!tp.resultatVist && tp.modell.tid >= 2) {
    tp.resultatVist = true;
    const fasit = kaldestKloss(tp.modell);
    const scene = fasit === "venstre" ? tp.modell.scener[0] : tp.modell.scener[1];
    const forklaring =
      fasit === "like"
        ? "Klossene leder varme omtrent like godt, så huden blir omtrent like kald mot begge."
        : `Begge klossene var ${ROMTEMPERATUR} °C. ${materialNavn(data, scene.materiale)} leder varmen raskere bort fra fingeren, så huden der blir kaldere. Det er varme som strømmer ut av fingeren – ikke kulde som strømmer inn.`;
    tp.forutsi.visResultat(fasit, forklaring);
    tutor.sendHendelse("resultat", { fane: "tapaa", fasit, gjetning: tp.forutsi.gjetning() });
  }
  if (tp.modell.tid >= TA_PAA_VARIGHET - 1e-9) {
    tp.kjorer = false;
    tp.ferdig = true;
    $("tapaa-start").textContent = "Ferdig";
    $("tapaa-start").disabled = true;
    tutor.sendHendelse("ferdig", { fane: "tapaa" });
  }
}

$("tapaa-start").addEventListener("click", () => {
  if (!tp.forutsi.erLaast() || tp.ferdig) return;
  tp.berort = true;
  tp.kjorer = !tp.kjorer;
  $("tapaa-start").textContent = tp.kjorer ? "Pause" : "Fortsett";
  if (tp.kjorer && tp.modell.tid === 0) {
    tp.modell.scener.forEach((s, i) => tp.graf.leggTil(i, 0, s.kontaktTemperatur()));
  }
  oppdaterTaPaaTekst(true);
  tutor.sendHendelse(tp.kjorer ? "start" : "pause", { fane: "tapaa" });
});

$("tapaa-nullstill").addEventListener("click", () => {
  byggTaPaa();
  tutor.sendHendelse("nullstill", { fane: "tapaa" });
});

$("tapaa-sakte").addEventListener("change", (e) => {
  tp.fart = e.target.checked ? 0.25 : 1;
  oppdaterTaPaaTekst();
});

for (const velg of [velgVenstre, velgHoyre]) {
  velg.addEventListener("change", () => {
    if (tp.forutsi?.erLaast()) return;
    byggTaPaa();
    tutor.sendHendelse("materiale", { venstre: velgVenstre.value, hoyre: velgHoyre.value });
  });
}

// ---------------------------------------------------------------------------
// Isbit på kloss
// ---------------------------------------------------------------------------

const ib = {
  ctx: klargjorLerret($("isbit-lerret"), ISBIT_STORRELSE.bredde, ISBIT_STORRELSE.hoyde),
  visning: lagIsbitVisning(data),
  graf: lagGraf($("isbit-graf"), {
    xMaks: 20,
    yMin: 0,
    yMaks: 100,
    xTekst: "tid i modellen (min)",
    yTekst: "smeltet (%)",
    serier: [
      { navn: "Isbit på aluminium", ...SERIEFARGER[0] },
      { navn: "Isbit på tre", ...SERIEFARGER[1] },
    ],
  }),
  modell: null,
  forutsi: null,
  kjorer: false,
  ferdig: false,
  resultatVist: false,
  fart: 30,
  maaltFart: 30,
  sisteMaaling: -Infinity,
};

function byggIsbit() {
  ib.modell = lagIsbit(data);
  ib.visning.nullstill();
  ib.kjorer = ib.ferdig = ib.resultatVist = false;
  ib.sisteMaaling = -Infinity;
  ib.graf.nullstill();
  leggTilIsbitMaaling();
  ib.graf.tegn();
  $("isbit-start").disabled = true;
  $("isbit-start").textContent = "Start";
  $("isbit-forhold").textContent = forholdTekst("aluminium", "tre");
  ib.forutsi = lagForutsi($("isbit-forutsi"), {
    sporsmal: "Begge klossene er 20 °C. Hvilken isbit smelter først?",
    valg: [
      { id: "aluminium", tekst: "Isbiten på aluminium" },
      { id: "tre", tekst: "Isbiten på tre" },
      { id: "like", tekst: "De smelter like fort" },
    ],
    vedLaas: (valg) => {
      $("isbit-start").disabled = false;
      tutor.sendHendelse("gjetning", { fane: "isbit", valg });
    },
  });
  oppdaterIsbitTekst(true);
}

function leggTilIsbitMaaling() {
  const t = ib.modell.tid;
  if (t - ib.sisteMaaling < 5) return;
  ib.sisteMaaling = t;
  ib.modell.scener.forEach((s, i) => ib.graf.leggTil(i, t / 60, s.smeltetAndel() * 100));
}

function oppdaterIsbitTekst(beskriv = false) {
  const t = ib.modell.tid;
  let tekst = `Tid i modellen: ${formaterTid(t)} · 1 s på skjermen = ${ib.fart} s i modellen`;
  if (ib.kjorer && ib.maaltFart < 0.85 * ib.fart) {
    tekst += ` (maskinen klarer bare ca. ${Math.round(ib.maaltFart)} s nå)`;
  }
  $("isbit-tid").textContent = tekst;
  const beskrivelse = beskrivIsbit(data, ib.modell);
  if (beskriv && beskrivelse !== $("isbit-beskrivelse").textContent) $("isbit-beskrivelse").textContent = beskrivelse;
}

function stegIsbit(dtEkte) {
  if (!ib.kjorer || dtEkte <= 0) return;
  const simulert = ib.modell.stegMedBudsjett(dtEkte * ib.fart, MAKS_DELSTEG);
  // Glatt måling av hvor fort simuleringen faktisk går, for ærlig visning.
  ib.maaltFart = 0.9 * ib.maaltFart + 0.1 * (simulert / dtEkte);
  leggTilIsbitMaaling();

  const forst = forstSmeltet(ib.modell);
  if (!ib.resultatVist && forst !== null) {
    ib.resultatVist = true;
    const forklaring =
      forst === "aluminium"
        ? "Aluminium leder varme svært godt, så varme fra hele klossen strømmer inn i isen. Se at aluminiumen under isen ble kald – den ga fra seg varme. Treet leder så dårlig at isen nesten bare får varme fra lufta."
        : "Her smeltet isbiten på tre først. Se på grafen og fargene: hvor kom varmen fra?";
    ib.forutsi.visResultat(forst, forklaring);
    tutor.sendHendelse("resultat", { fane: "isbit", fasit: forst, gjetning: ib.forutsi.gjetning() });
  }
  if (ib.modell.scener.every((s) => s.smeltetVed !== null)) {
    ib.kjorer = false;
    ib.ferdig = true;
    $("isbit-start").textContent = "Ferdig";
    $("isbit-start").disabled = true;
    tutor.sendHendelse("ferdig", { fane: "isbit" });
  }
}

$("isbit-start").addEventListener("click", () => {
  if (!ib.forutsi.erLaast() || ib.ferdig) return;
  ib.kjorer = !ib.kjorer;
  ib.maaltFart = ib.fart;
  $("isbit-start").textContent = ib.kjorer ? "Pause" : "Fortsett";
  oppdaterIsbitTekst(true);
  tutor.sendHendelse(ib.kjorer ? "start" : "pause", { fane: "isbit" });
});

$("isbit-nullstill").addEventListener("click", () => {
  byggIsbit();
  tutor.sendHendelse("nullstill", { fane: "isbit" });
});

$("isbit-fart").addEventListener("change", (e) => {
  ib.fart = Number(e.target.value);
  ib.maaltFart = ib.fart;
  oppdaterIsbitTekst();
});

// ---------------------------------------------------------------------------
// Faner
// ---------------------------------------------------------------------------

let aktivFane = "tapaa";
const faner = [$("fane-tapaa"), $("fane-isbit")];

function velgFane(navn, fokus = false) {
  aktivFane = navn;
  for (const f of faner) {
    const valgt = f.id === `fane-${navn}`;
    f.setAttribute("aria-selected", String(valgt));
    f.tabIndex = valgt ? 0 : -1;
    $(f.getAttribute("aria-controls")).hidden = !valgt;
    if (valgt && fokus) f.focus();
  }
  // Den skjulte fanen settes på pause.
  if (navn !== "tapaa" && tp.kjorer) {
    tp.kjorer = false;
    $("tapaa-start").textContent = "Fortsett";
  }
  if (navn !== "isbit" && ib.kjorer) {
    ib.kjorer = false;
    $("isbit-start").textContent = "Fortsett";
  }
  tutor.sendHendelse("fane", { fane: navn });
}

faner.forEach((f, i) => {
  f.addEventListener("click", () => velgFane(f.id.replace("fane-", "")));
  f.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const neste = faner[(i + (e.key === "ArrowRight" ? 1 : faner.length - 1)) % faner.length];
    velgFane(neste.id.replace("fane-", ""), true);
  });
});

// ---------------------------------------------------------------------------
// KI-tutor
// ---------------------------------------------------------------------------

const tutor = koblTilTutor({
  modell: "varmeledning-partikler",
  hent: () => ({
    fane: aktivFane,
    taPaa: {
      venstre: velgVenstre.value,
      hoyre: velgHoyre.value,
      gjetning: tp.forutsi.gjetning(),
      fingerenBerorer: tp.berort,
      kjorer: tp.kjorer,
      kaldest: tp.resultatVist ? kaldestKloss(tp.modell) : null,
      ...tp.modell.tilstand(),
    },
    isbit: {
      gjetning: ib.forutsi.gjetning(),
      kjorer: ib.kjorer,
      fart: ib.fart,
      forstSmeltet: forstSmeltet(ib.modell),
      ...ib.modell.tilstand(),
    },
  }),
  sett: (t) => {
    if (t.fane === "tapaa" || t.fane === "isbit") velgFane(t.fane);
    if (!tp.forutsi.erLaast() && (TA_PAA_MATERIALER.includes(t.venstre) || TA_PAA_MATERIALER.includes(t.hoyre))) {
      if (TA_PAA_MATERIALER.includes(t.venstre)) velgVenstre.value = t.venstre;
      if (TA_PAA_MATERIALER.includes(t.hoyre)) velgHoyre.value = t.hoyre;
      byggTaPaa();
    }
  },
});

// ---------------------------------------------------------------------------
// Løkka
// ---------------------------------------------------------------------------

let forrige = null;
let animTid = 0;
let sisteTekst = 0;
let sisteBeskrivelse = 0;

function animer(naa) {
  const dtEkte = forrige === null ? 0 : Math.min(0.1, (naa - forrige) / 1000);
  forrige = naa;
  animTid += dtEkte;

  if (aktivFane === "tapaa") {
    stegTaPaa(dtEkte);
    tp.visning.tegn(tp.ctx, tp.modell, { berort: tp.berort, tid: animTid });
    if (tp.kjorer || tp.berort) tp.graf.tegn();
  } else {
    stegIsbit(dtEkte);
    ib.visning.tegn(ib.ctx, ib.modell, { tid: animTid });
    if (ib.kjorer) ib.graf.tegn();
  }

  // Tall oppdateres fem ganger i sekundet. Beskrivelsen, som leses av skjermleser,
  // bare hvert fjerde sekund, så den ikke drukner alt annet.
  if (animTid - sisteTekst > 0.2) {
    sisteTekst = animTid;
    const beskriv = animTid - sisteBeskrivelse > 4;
    if (beskriv) sisteBeskrivelse = animTid;
    oppdaterFoles();
    if (aktivFane === "tapaa") oppdaterTaPaaTekst(beskriv);
    else oppdaterIsbitTekst(beskriv);
  }
  requestAnimationFrame(animer);
}

byggTaPaa();
byggIsbit();
requestAnimationFrame(animer);
