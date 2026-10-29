// Energi som sprer seg – faner, knapper, valg og løkka som driver modellen.
// Kobler modell (fysikk) og visning (tegning) sammen. Ingen fysikk her.

import { lagKar, lagDyppekoker, VANNMENGDER, KAR } from "./modell.js";
import { lagVisning, beskriv, STORRELSE } from "./visning.js";
import { hentMaterialer } from "../../../felles/js/data.js";
import { lagForutsi } from "../../../felles/js/forutsi.js";
import { settBeskrivelse } from "../../../felles/js/beskrivelse.js";
import { koblTilTutor } from "../../../felles/js/tilstand.js";
import { lagGraf } from "../../../felles/js/graf.js";
import { klargjorLerret } from "../../../felles/js/lerret.js";
import { formaterTid, formaterTall, formaterGrader } from "../../../felles/js/format.js";

const data = await hentMaterialer();
const $ = (id) => document.getElementById(id);

const MAKS_DELSTEG = 200; // per skjermbilde
// Det meste skjer de første minuttene: klossen går fra 90 til 40 °C på ca. 4 min. Med
// konstant fart var det over på under 2 sekunder. Derfor starter farten lavt og øker
// med tiden i modellen (tid/4), opp til fanens toppfart. Skjermen viser farten hele tiden.
const START_FART = 10;
// Grafen starter med 10 min på x-aksen og dobler den når tiden går forbi. Da synes de
// første minuttene, der det meste skjer, mens forsøket pågår.
const GRAF_START_MINUTTER = 10;
const prosent = (x, d = 0) => `${formaterTall(Math.max(0, x) * 100, d)} %`;

// Fargeblind-vennlige farger (Okabe–Ito). Søylene bruker de samme.
const FARGE = { total: "#1f2328", kloss: "#D55E00", vann: "#0072B2", strom: "#a8487f", varme: "#D55E00", arbeid: "#009E73" };

/**
 * Alt som er ulikt i de to fanene. Toppfarten (simulerte sekunder per ekte sekund ved
 * "Vanlig") er valgt slik at alt har samme temperatur etter ca. ett minutt. Testene:
 * kloss 53/167/181 min, dyppekoker 69/215/210 min for lite/middels/mye vann.
 */
const FANER = {
  kloss: {
    toppfart: { lite: 60, middels: 180, mye: 180 },
    lag: (vannmengde) => lagKar(data, { vannmengde, klossT: Number($("klosst").value) }),
    oppsett: "Vannet er alltid 10 °C ved start. Karet er varmeisolert: ingen varme går inn eller ut.",
    hundre:
      "100 % = energien klossen hadde ekstra ved start, fordi den var varmere enn vannet (10 °C). Vannet hadde også energi fra før, men den regner vi ikke med.",
    yTekst: "% av klossens ekstra energi",
    soyler: [
      { navn: "Ekstra energi i karet", verdi: (r) => r.varmeIKaret, farge: FARGE.total },
      { navn: "i klossen", verdi: (r) => r.iKlossen, farge: FARGE.kloss, strek: [6, 4] },
      { navn: "i vannet", verdi: (r) => r.iVannet, farge: FARGE.vann, strek: [2, 3] },
    ],
    joule: (r) => `Ekstra energi i karet: ${formaterTall(r.varmeJoule, 0)} J · kan gjøre arbeid: ${formaterTall(r.kanGjoreArbeidJoule, 1)} J.`,
    forutsi: (kar) => ({
      sporsmal: `En kobberkloss på ${kar.klossT} °C legges i vann på 10 °C i et lukket kar. Klossen har ekstra energi fordi den er varmere enn vannet. Når alt har fått samme temperatur: hvor mye av den ekstra energien finnes fortsatt i karet?`,
      valg: [
        { id: "ingenting", tekst: "Ingenting – den er brukt opp" },
        { id: "litt", tekst: "Litt – resten har forsvunnet" },
        { id: "alt", tekst: "Alt sammen" },
        { id: "mer", tekst: "Mer enn klossen hadde" },
      ],
    }),
    tenkEtter: [
      "Se på søylen «Ekstra energi i karet» mens klossen ble kald. Endret den seg? Hva betyr det?",
      "En kopp varm te blir stående til den har romtemperatur. Hvor ble energien fra teen av?",
    ],
    fasit: (kar, r) => ({
      id: "alt",
      tekst:
        `All den ekstra energien er fortsatt i karet: ${prosent(r.varmeIKaret)}. Energi blir ikke brukt opp. ` +
        `Men den er spredt fra den lille klossen til alt vannet, så temperaturen ble bare ` +
        `${formaterGrader(kar.blandingstemperatur)}. Det som forsvant, var muligheten til å få arbeid ut av temperaturforskjellene i karet: ` +
        `fra ${prosent(t.startArbeid, 1)} til ${prosent(r.kanGjoreArbeid, 1)}. Energien har fått lavere kvalitet.`,
    }),
  },

  dyppekoker: {
    toppfart: { lite: 70, middels: 215, mye: 215 },
    lag: (vannmengde) => lagDyppekoker(data, { vannmengde }),
    oppsett: "Vannet er 10 °C ved start. Dyppekokeren får strøm i 5 minutter og slås så av. Karet er varmeisolert.",
    hundre:
      "100 % = energien strømmen tilfører karet. Det er like mye som kobberklossen på 90 °C hadde ekstra. Vannets energi fra før regner vi ikke med.",
    yTekst: "% av energien fra strømmen",
    soyler: [
      { navn: "Energi i alt", verdi: (r) => r.energiIAlt, farge: FARGE.total },
      { navn: "ikke tilført ennå", verdi: (r) => r.somStrom, farge: FARGE.strom, strek: [6, 4] },
      { navn: "i karet", verdi: (r) => r.varmeIKaret, farge: FARGE.varme, strek: [2, 3] },
    ],
    joule: (r) =>
      `Tilført med strøm: ${formaterTall(r.stromLevertJoule, 0)} J · i karet: ${formaterTall(r.varmeJoule, 0)} J · ` +
      `kan gjøre arbeid: ${formaterTall(r.kanGjoreArbeidJoule, 1)} J.`,
    forutsi: () => ({
      sporsmal:
        "Elektrisk energi kan i prinsippet gjøre arbeid uten tap: 100 %. Dyppekokeren bruker den til å varme opp vannet. Når alt i karet har fått samme temperatur: hvor mye av energien kan fortsatt gjøre arbeid i karet?",
      valg: [
        { id: "alt", tekst: "Fortsatt 100 % – energien er jo bevart" },
        { id: "halve", tekst: "Omtrent halvparten" },
        { id: "litt", tekst: "Litt, ca. 10 %" },
        { id: "ingenting", tekst: "Ingenting" },
      ],
    }),
    tenkEtter: [
      "Se på søylene etter at strømmen ble slått av. Hvor mye av energien fra strømmen er fortsatt i karet?",
      "Energien er bevart. Hvorfor sier vi likevel at vi «sparer energi» når vi slår av lyset?",
    ],
    fasit: (kar, r) => ({
      id: "ingenting",
      tekst:
        `Ved start var ingen energi tilført ennå, og all energien strømmen skulle gi, kunne gjøre arbeid. Da strømmen ble slått av, kunne bare ` +
        `${prosent(t.arbeidVedAvslaaing ?? 0, 1)} fortsatt bli arbeid. Nå er det ${prosent(r.kanGjoreArbeid, 1)}, ` +
        `fordi det ikke finnes noen temperaturforskjell igjen i karet. ` +
        `Energien i alt er fortsatt ${prosent(r.energiIAlt)} – den er spredt i hele karet, som lunkent vann på ` +
        `${formaterGrader(kar.blandingstemperatur)}. Elektrisk energi har høy kvalitet. Energien i lunkent vann har lav kvalitet.`,
    }),
  },
};

const ctx = klargjorLerret($("lerret"), STORRELSE.bredde, STORRELSE.hoyde);
const visning = lagVisning();
let graf = null;

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
  fane: "kloss",
  kar: null,
  forutsi: null,
  kjorer: false,
  startet: false,
  ferdig: false,
  startArbeid: 0,
  arbeidVedAvslaaing: null,
  fart: START_FART,
  maaltFart: START_FART,
  sisteMaaling: -Infinity,
};
const fane = () => FANER[t.fane];

// ---------------------------------------------------------------------------
// Bygg et nytt kar
// ---------------------------------------------------------------------------

function bygg() {
  const f = fane();
  const vannmengde = vannValg.value;
  t.kar = f.lag(vannmengde);
  t.kjorer = t.startet = t.ferdig = false;
  t.startArbeid = t.kar.regnskap().kanGjoreArbeid;
  t.arbeidVedAvslaaing = null;
  t.sisteMaaling = -Infinity;
  settFart();
  t.maaltFart = t.fart;

  const klossT = Number(tempValg.value);
  $("klosst-verdi").textContent = formaterGrader(klossT, 0);
  tempValg.setAttribute("aria-valuetext", formaterGrader(klossT, 0));
  $("klosst-kontroll").hidden = t.fane !== "kloss";
  $("oppsett-tekst").textContent = f.oppsett;
  $("hundre-tekst").textContent = f.hundre;
  const soyler = $("soyler");
  f.soyler.forEach((s, i) => {
    const id = ["total", "del1", "del2"][i];
    $(`navn-${id}`).textContent = s.navn;
    if (i > 0) soyler.style.setProperty(`--${id}-farge`, s.farge);
  });

  for (const el of [vannValg, tempValg]) el.disabled = false;
  startKnapp.disabled = true;
  startKnapp.textContent = "Start";

  // Ny graf for hvert kar, med fanens serier.
  graf = lagGraf($("graf"), {
    xMaks: GRAF_START_MINUTTER,
    yMin: 0,
    yMaks: 100,
    xTekst: "tid i modellen (minutter)",
    yTekst: f.yTekst,
    serier: [...f.soyler.map(({ navn, farge, strek }) => ({ navn, farge, strek })), { navn: "Kan gjøre arbeid", farge: FARGE.arbeid }],
  });
  graf.tegn();

  const fanen = t.fane;
  t.forutsi = lagForutsi($("forutsi"), {
    ...f.forutsi(t.kar),
    vedLaas: (gjetning) => {
      startKnapp.disabled = false;
      tutor.sendHendelse("gjetning", { fane: fanen, vannmengde, gjetning });
    },
  });
  oppdaterRegnskap();
  oppdaterTekst(true);
}

function settFart() {
  const tid = t.kar ? t.kar.gitter.tid : 0;
  const grunn = Math.max(START_FART, Math.min(fane().toppfart[vannValg.value], tid / 4));
  t.fart = grunn * Number(fartValg.value);
}

// ---------------------------------------------------------------------------
// Energiregnskap: søyler, graf og tekst
// ---------------------------------------------------------------------------

function settSoyle(id, andel, tekst) {
  $(`soyle-${id}`).style.width = `${Math.min(100, Math.max(0, andel * 100))}%`;
  $(`tall-${id}`).textContent = tekst;
}

function oppdaterRegnskap() {
  const r = t.kar.regnskap();
  fane().soyler.forEach((s, i) => {
    const v = s.verdi(r);
    settSoyle(["total", "del1", "del2"][i], v, prosent(v));
  });
  settSoyle("arbeid", r.kanGjoreArbeid, prosent(r.kanGjoreArbeid, 1));
  const joule = $("joule-tall");
  joule.hidden = !$("joule").checked;
  if (!joule.hidden) joule.textContent = `${fane().joule(r)} Gjelder et snitt som er ${KAR.dx * 1000} mm tykt.`;
}

function maal(tving = false) {
  const r = t.kar.regnskap();
  if (!tving && r.tid - t.sisteMaaling < t.fart / 6) return;
  t.sisteMaaling = r.tid;
  const min = r.tid / 60;
  const verdier = [...fane().soyler.map((s) => s.verdi(r)), r.kanGjoreArbeid];
  verdier.forEach((v, i) => graf.leggTil(i, min, v * 100));
}

function oppdaterTekst(beskrivOgsa = false, lesOpp = true) {
  let tekst = `Tid i modellen: ${formaterTid(t.kar.gitter.tid)} · 1 s på skjermen = ${formaterTid(t.fart)} i modellen`;
  if (t.kjorer && t.maaltFart < 0.85 * t.fart) {
    tekst += ` (maskinen klarer bare ca. ${formaterTid(t.maaltFart)} nå)`;
  }
  $("tid").textContent = tekst;
  if (beskrivOgsa) {
    const b = beskriv(t.kar, t.fane);
    settBeskrivelse($("beskrivelse"), b, lesOpp);
  }
}

function visFasit() {
  const { id, tekst } = fane().fasit(t.kar, t.kar.regnskap());
  t.forutsi.visResultat(id, tekst, fane().tenkEtter);
}

// ---------------------------------------------------------------------------
// Faner
// ---------------------------------------------------------------------------

const faneKnapper = [$("fane-kloss"), $("fane-dyppekoker")];

function velgFane(navn, fokus = false) {
  if (!FANER[navn]) return;
  for (const knapp of faneKnapper) {
    const valgt = knapp.id === `fane-${navn}`;
    knapp.setAttribute("aria-selected", String(valgt));
    knapp.tabIndex = valgt ? 0 : -1;
    if (valgt && fokus) knapp.focus();
  }
  $("panel").setAttribute("aria-labelledby", `fane-${navn}`);
  if (navn === t.fane) return;
  // Begge fanene deler kar og graf, så et fanebytte starter et nytt forsøk. Det som
  // kjørte, stoppes. Det står i hjelpeteksten under fanene, og leses opp her.
  const forrige = t.startet ? $(`fane-${t.fane}`).textContent : null;
  t.fane = navn;
  bygg();
  if (forrige) {
    settBeskrivelse($("beskrivelse"), `Nytt forsøk: ${$(`fane-${navn}`).textContent}. Forsøket med ${forrige.toLowerCase()} er nullstilt.`, true);
  }
  tutor.sendHendelse("fane", { fane: navn, nullstilt: forrige !== null });
}

faneKnapper.forEach((knapp, i) => {
  knapp.addEventListener("click", () => velgFane(knapp.id.replace("fane-", "")));
  knapp.addEventListener("keydown", (e) => {
    // Piltastene går til nabofanen, Home og End til første og siste (vanlig for faner).
    const steg = { ArrowRight: i + 1, ArrowLeft: i + faneKnapper.length - 1, Home: 0, End: faneKnapper.length - 1 }[e.key];
    if (steg === undefined) return;
    e.preventDefault();
    const neste = faneKnapper[steg % faneKnapper.length];
    velgFane(neste.id.replace("fane-", ""), true);
  });
});

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
  tutor.sendHendelse(t.kjorer ? "start" : "pause", { fane: t.fane, vannmengde: t.kar.vannmengde });
});

$("nullstill").addEventListener("click", () => {
  bygg();
  tutor.sendHendelse("nullstill", { fane: t.fane });
});

for (const el of [vannValg, tempValg]) {
  el.addEventListener("input", () => {
    if (t.startet && !t.ferdig) return;
    bygg();
    tutor.sendHendelse("valg", { fane: t.fane, vannmengde: vannValg.value, klossT: Number(tempValg.value) });
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
    const felles = {
      fane: t.fane,
      vannmengde: t.kar.vannmengde,
      gjetning: t.forutsi.gjetning(),
      kjorer: t.kjorer,
      tid: Math.round(r.tid),
      energiIAltProsent: pst(r.energiIAlt),
      varmeIKarProsent: pst(r.varmeIKaret),
      kanGjoreArbeidProsent: pst(r.kanGjoreArbeid),
      sluttTemperatur: Math.round(t.kar.blandingstemperatur * 10) / 10,
      ferdig: t.ferdig,
    };
    if (t.fane === "dyppekoker") {
      return {
        ...felles,
        stromPaa: r.paa,
        somStromProsent: pst(r.somStrom),
        elementTemperatur: Math.round(r.elementTemperatur * 10) / 10,
      };
    }
    return {
      ...felles,
      klossTemperatur: t.kar.klossT,
      iKlossenProsent: pst(r.iKlossen),
      iVannetProsent: pst(r.iVannet),
      klossTemperaturNa: Math.round(r.klossTemperatur * 10) / 10,
    };
  },
  sett: (ny) => {
    if (t.startet && !t.ferdig) return;
    if (VANNMENGDER.some((v) => v.id === ny.vannmengde)) vannValg.value = ny.vannmengde;
    if (typeof ny.klossTemperatur === "number") tempValg.value = String(ny.klossTemperatur);
    if (FANER[ny.fane] && ny.fane !== t.fane) velgFane(ny.fane);
    else bygg();
  },
});

// ---------------------------------------------------------------------------
// Løkka
// ---------------------------------------------------------------------------

let forrige = null;
let animTid = 0;
// Klokka for partikkelbevegelsen går bare mens modellen kjører. Før start, i pause og
// etter at forsøket er ferdig står bildet helt stille (WCAG 2.2.2).
let bevegelsesTid = 0;
let sisteTekst = 0;
let sisteBeskrivelse = 0;

function animer(naa) {
  const dtEkte = forrige === null ? 0 : Math.min(0.1, (naa - forrige) / 1000);
  forrige = naa;
  animTid += dtEkte;

  if (t.kjorer && dtEkte > 0) {
    bevegelsesTid += dtEkte;
    settFart();
    const simulert = t.kar.stegMedBudsjett(dtEkte * t.fart, MAKS_DELSTEG);
    t.maaltFart = 0.9 * t.maaltFart + 0.1 * (simulert / dtEkte);
    const r = t.kar.regnskap();
    if (t.fane === "dyppekoker" && t.arbeidVedAvslaaing === null && !r.paa) {
      t.arbeidVedAvslaaing = r.kanGjoreArbeid;
      maal(true);
      tutor.sendHendelse("strom-av", { kanGjoreArbeidProsent: Math.round(r.kanGjoreArbeid * 1000) / 10 });
    }
    maal();
    if (r.likevekt) {
      maal(true);
      t.kjorer = false;
      t.ferdig = true;
      startKnapp.textContent = "Ferdig";
      startKnapp.disabled = true;
      for (const el of [vannValg, tempValg]) el.disabled = false;
      visFasit();
      oppdaterTekst(true);
      tutor.sendHendelse("ferdig", { fane: t.fane, sluttTemperatur: t.kar.blandingstemperatur, gjetning: t.forutsi.gjetning() });
    }
    graf.tegn();
  }

  visning.tegn(ctx, t.kar, { tid: bevegelsesTid, fane: t.fane });

  if (animTid - sisteTekst > 0.2) {
    sisteTekst = animTid;
    oppdaterRegnskap();
    const beskrivOgsa = animTid - sisteBeskrivelse > 4;
    if (beskrivOgsa) sisteBeskrivelse = animTid;
    oppdaterTekst(beskrivOgsa, false);
  }
  requestAnimationFrame(animer);
}

bygg();
requestAnimationFrame(animer);
