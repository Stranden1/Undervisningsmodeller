// Energi som sprer seg – knapper, valg og løkka som driver modellen.
// Kobler modell (fysikk) og visning (tegning) sammen. Ingen fysikk her.

import { lagKar, klossPlass, VANNMENGDER, KAR } from "./modell.js";
import { lagVisning, beskriv, STORRELSE } from "./visning.js";
import { hentMaterialer } from "../../felles/js/data.js";
import { lagForutsi } from "../../felles/js/forutsi.js";
import { koblTilTutor } from "../../felles/js/tilstand.js";
import { lagGraf } from "../../felles/js/graf.js";
import { klargjorLerret } from "../../felles/js/lerret.js";
import { formaterTid, formaterTall, formaterGrader } from "../../felles/js/format.js";

const data = await hentMaterialer();
const $ = (id) => document.getElementById(id);

const MAKS_DELSTEG = 200; // per skjermbilde
// Simulerte sekunder per ekte sekund ved "Vanlig" fart når farten er helt oppe. Valgt
// slik at alt har samme temperatur etter ca. ett minutt (testene: lite 53 min, middels
// 167 min, mye 181 min). Større kar går fortere fordi varme sprer seg sakte i stille vann.
const BASIS_FART = { lite: 60, middels: 180, mye: 180 };
// Det meste skjer de første minuttene: klossen går fra 90 til 40 °C på ca. 4 min. Med
// konstant fart var det over på under 2 sekunder. Derfor starter farten lavt og øker
// med tiden i modellen (tid/4), opp til BASIS_FART. Skjermen viser farten hele tiden.
const START_FART = 10;
const GRAF_MINUTTER = { lite: 60, middels: 180, mye: 180 };
// Fargeblind-vennlige farger (Okabe–Ito), de samme som søylene i stil.css.
const SERIER = [
  { navn: "Varme i karet", farge: "#1f2328" },
  { navn: "i klossen", farge: "#D55E00", strek: [6, 4] },
  { navn: "i vannet", farge: "#0072B2", strek: [2, 3] },
  { navn: "Kan gjøre arbeid", farge: "#009E73" },
];

const ctx = klargjorLerret($("lerret"), STORRELSE.bredde, STORRELSE.hoyde);
const visning = lagVisning();
let graf = null;

/** Ny graf for hvert kar, så x-aksen passer karets størrelse. */
function lagNyGraf(minutter) {
  graf = lagGraf($("graf"), {
    xMaks: minutter,
    yMin: 0,
    yMaks: 100,
    xTekst: "tid i modellen (minutter)",
    yTekst: "% av varmen klossen hadde",
    serier: SERIER,
  });
}

const vannValg = $("vannmengde");
const tempValg = $("klosst");
const startKnapp = $("start");
const fartValg = $("fart");

for (const v of VANNMENGDER) {
  const o = document.createElement("option");
  o.value = v.id;
  o.textContent = v.navn;
  vannValg.append(o);
}
vannValg.value = "middels";

const t = {
  kar: null,
  forutsi: null,
  kjorer: false,
  startet: false,
  ferdig: false,
  startArbeid: 0,
  fart: BASIS_FART.middels,
  maaltFart: BASIS_FART.middels,
  sisteMaaling: -Infinity,
};

// ---------------------------------------------------------------------------
// Bygg et nytt kar
// ---------------------------------------------------------------------------

function bygg() {
  const vannmengde = vannValg.value;
  const klossT = Number(tempValg.value);
  t.kar = lagKar(data, { vannmengde, klossT });
  t.kjorer = t.startet = t.ferdig = false;
  t.startArbeid = t.kar.regnskap().kanGjoreArbeid;
  t.sisteMaaling = -Infinity;
  settFart();
  t.maaltFart = t.fart;
  $("klosst-verdi").textContent = formaterGrader(klossT, 0);
  tempValg.setAttribute("aria-valuetext", formaterGrader(klossT, 0));
  for (const el of [vannValg, tempValg]) el.disabled = false;
  startKnapp.disabled = true;
  startKnapp.textContent = "Start";

  lagNyGraf(GRAF_MINUTTER[vannmengde]);
  graf.tegn();

  t.forutsi = lagForutsi($("forutsi"), {
    sporsmal: `En kobberkloss på ${klossT} °C legges i vann på 10 °C i et lukket kar. Når alt har fått samme temperatur: hvor mye av varmen fra klossen finnes fortsatt i karet?`,
    valg: [
      { id: "ingenting", tekst: "Ingenting – den er brukt opp" },
      { id: "litt", tekst: "Litt – resten har forsvunnet" },
      { id: "alt", tekst: "Alt sammen" },
      { id: "mer", tekst: "Mer enn klossen hadde" },
    ],
    vedLaas: (gjetning) => {
      startKnapp.disabled = false;
      tutor.sendHendelse("gjetning", { vannmengde, klossT, gjetning });
    },
  });
  oppdaterRegnskap();
  oppdaterTekst(true);
}

function settFart() {
  const tid = t.kar ? t.kar.gitter.tid : 0;
  const grunn = Math.max(START_FART, Math.min(BASIS_FART[vannValg.value], tid / 4));
  t.fart = grunn * Number(fartValg.value);
}

// ---------------------------------------------------------------------------
// Energiregnskap: søyler, graf og tekst
// ---------------------------------------------------------------------------

const prosent = (x, d = 0) => `${formaterTall(Math.max(0, x) * 100, d)} %`;

function settSoyle(navn, andel, tekst) {
  $(`soyle-${navn}`).style.width = `${Math.min(100, Math.max(0, andel * 100))}%`;
  $(`tall-${navn}`).textContent = tekst;
}

function oppdaterRegnskap() {
  const r = t.kar.regnskap();
  settSoyle("total", r.varmeIKaret, prosent(r.varmeIKaret));
  settSoyle("kloss", r.iKlossen, prosent(r.iKlossen));
  settSoyle("vann", r.iVannet, prosent(r.iVannet));
  settSoyle("arbeid", r.kanGjoreArbeid, prosent(r.kanGjoreArbeid, 1));
  const joule = $("joule-tall");
  joule.hidden = !$("joule").checked;
  if (!joule.hidden) {
    joule.textContent =
      `Varme i karet: ${formaterTall(r.varmeJoule, 0)} J · kan gjøre arbeid: ${formaterTall(r.kanGjoreArbeidJoule, 1)} J. ` +
      `Gjelder et snitt som er ${KAR.dx * 1000} mm tykt.`;
  }
}

function maal(tving = false) {
  const r = t.kar.regnskap();
  if (!tving && r.tid - t.sisteMaaling < t.fart / 6) return;
  t.sisteMaaling = r.tid;
  const min = r.tid / 60;
  [r.varmeIKaret, r.iKlossen, r.iVannet, r.kanGjoreArbeid].forEach((v, i) => graf.leggTil(i, min, v * 100));
}

function oppdaterTekst(beskrivOgsa = false) {
  let tekst = `Tid i modellen: ${formaterTid(t.kar.gitter.tid)} · 1 s på skjermen = ${formaterTid(t.fart)} i modellen`;
  if (t.kjorer && t.maaltFart < 0.85 * t.fart) {
    tekst += ` (maskinen klarer bare ca. ${formaterTid(t.maaltFart)} nå)`;
  }
  $("tid").textContent = tekst;
  if (beskrivOgsa) {
    const b = beskriv(t.kar);
    if (b !== $("beskrivelse").textContent) $("beskrivelse").textContent = b;
  }
}

function visFasit() {
  const r = t.kar.regnskap();
  const k = klossPlass(t.kar.vannmengde);
  const klossCeller = k.side * k.side;
  const alleCeller = t.kar.gitter.nx * t.kar.gitter.ny;
  t.forutsi.visResultat(
    "alt",
    `All varmen er fortsatt i karet: ${prosent(r.varmeIKaret)}. Energi blir ikke brukt opp. ` +
      `Men den er spredt fra ${klossCeller} til ${alleCeller} partikler i snittet, så temperaturen ble bare ` +
      `${formaterGrader(t.kar.blandingstemperatur)}. Det som forsvant, var muligheten til å gjøre arbeid: ` +
      `fra ${prosent(t.startArbeid, 1)} til ${prosent(r.kanGjoreArbeid, 1)}. Energien har fått lavere kvalitet.`
  );
}

// ---------------------------------------------------------------------------
// Knapper og valg
// ---------------------------------------------------------------------------

startKnapp.addEventListener("click", () => {
  if (!t.forutsi.erLaast() || t.ferdig) return;
  if (!t.startet) {
    t.startet = true;
    for (const el of [vannValg, tempValg]) el.disabled = true;
    maal(true);
  }
  t.kjorer = !t.kjorer;
  t.maaltFart = t.fart;
  startKnapp.textContent = t.kjorer ? "Pause" : "Fortsett";
  oppdaterTekst(true);
  tutor.sendHendelse(t.kjorer ? "start" : "pause", { vannmengde: t.kar.vannmengde, klossT: t.kar.klossT });
});

$("nullstill").addEventListener("click", () => {
  bygg();
  tutor.sendHendelse("nullstill");
});

for (const el of [vannValg, tempValg]) {
  el.addEventListener("input", () => {
    if (t.startet && !t.ferdig) return;
    bygg();
    tutor.sendHendelse("valg", { vannmengde: vannValg.value, klossT: Number(tempValg.value) });
  });
}

fartValg.addEventListener("change", () => {
  settFart();
  t.maaltFart = t.fart;
  oppdaterTekst();
});

$("joule").addEventListener("change", oppdaterRegnskap);

// ---------------------------------------------------------------------------
// KI-tutor
// ---------------------------------------------------------------------------

const tutor = koblTilTutor({
  modell: "energi-som-sprer-seg",
  hent: () => {
    const r = t.kar.regnskap();
    const pst = (x) => Math.round(x * 1000) / 10;
    return {
      fane: "kloss",
      vannmengde: t.kar.vannmengde,
      klossTemperatur: t.kar.klossT,
      gjetning: t.forutsi.gjetning(),
      kjorer: t.kjorer,
      tid: Math.round(r.tid),
      varmeIKarProsent: pst(r.varmeIKaret),
      iKlossenProsent: pst(r.iKlossen),
      iVannetProsent: pst(r.iVannet),
      kanGjoreArbeidProsent: pst(r.kanGjoreArbeid),
      klossTemperaturNa: Math.round(r.klossTemperatur * 10) / 10,
      sluttTemperatur: Math.round(t.kar.blandingstemperatur * 10) / 10,
      ferdig: t.ferdig,
    };
  },
  sett: (ny) => {
    if (t.startet && !t.ferdig) return;
    if (VANNMENGDER.some((v) => v.id === ny.vannmengde)) vannValg.value = ny.vannmengde;
    if (typeof ny.klossTemperatur === "number") tempValg.value = String(ny.klossTemperatur);
    bygg();
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

  if (t.kjorer && dtEkte > 0) {
    settFart();
    const simulert = t.kar.stegMedBudsjett(dtEkte * t.fart, MAKS_DELSTEG);
    t.maaltFart = 0.9 * t.maaltFart + 0.1 * (simulert / dtEkte);
    maal();
    if (t.kar.regnskap().likevekt) {
      maal(true);
      t.kjorer = false;
      t.ferdig = true;
      startKnapp.textContent = "Ferdig";
      startKnapp.disabled = true;
      for (const el of [vannValg, tempValg]) el.disabled = false;
      visFasit();
      oppdaterTekst(true);
      tutor.sendHendelse("ferdig", { sluttTemperatur: t.kar.blandingstemperatur, gjetning: t.forutsi.gjetning() });
    }
    graf.tegn();
  }

  visning.tegn(ctx, t.kar, { tid: animTid });

  if (animTid - sisteTekst > 0.2) {
    sisteTekst = animTid;
    oppdaterRegnskap();
    const beskrivOgsa = animTid - sisteBeskrivelse > 4;
    if (beskrivOgsa) sisteBeskrivelse = animTid;
    oppdaterTekst(beskrivOgsa);
  }
  requestAnimationFrame(animer);
}

bygg();
requestAnimationFrame(animer);
