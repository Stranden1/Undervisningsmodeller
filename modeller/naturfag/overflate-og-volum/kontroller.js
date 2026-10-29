// Overflate og volum – knapper, valg og løkka som driver modellen.
// Kobler modell (fysikk) og visning (tegning) sammen. Ingen fysikk her.

import { lagSnoforsok, overflateOgVolum, OPPDELINGER, SNO } from "./modell.js";
import { lagVisning, beskriv, STORRELSE } from "./visning.js";
import { hentMaterialer } from "../../../felles/js/data.js";
import { lagForutsi } from "../../../felles/js/forutsi.js";
import { settBeskrivelse } from "../../../felles/js/beskrivelse.js";
import { koblTilTutor } from "../../../felles/js/tilstand.js";
import { lagGraf } from "../../../felles/js/graf.js";
import { klargjorLerret } from "../../../felles/js/lerret.js";
import { formaterTid, formaterTall } from "../../../felles/js/format.js";

const data = await hentMaterialer();
const $ = (id) => document.getElementById(id);

const MAKS_DELSTEG = 200; // per skjermbilde
const MAKS_KJORINGER = 6; // så mange kurver beholdes i grafen
const MAALING_HVER = 300; // s modelltid mellom punktene i grafen
// Fargeblind-vennlige farger (Okabe–Ito), én per oppdeling. Varmekildene vises med strek.
// Svart i stedet for oransje (#E69F00) for 16: oransje hadde bare 2,3:1 mot hvitt, og en
// mørkere oransje blir lik den rødoransje (spredt) for fargeblinde.
const FARGE = { 1: "#0072B2", 4: "#009E73", 16: "#000000", 64: "#CC79A7", spredt: "#D55E00" };
const strekFor = (sol, underlag) => (sol && underlag ? [10, 3, 2, 3] : sol ? [7, 4] : underlag ? [2, 3] : []);

const ctx = klargjorLerret($("lerret"), STORRELSE.bredde, STORRELSE.hoyde);
const visning = lagVisning(data);
const graf = lagGraf($("graf"), {
  xMaks: 16,
  xFormat: (x) => formaterTall(x, 1),
  yMin: 0,
  yMaks: 100,
  xTekst: "tid i modellen (timer)",
  yTekst: "smeltet (%)",
  serier: [],
});

const glider = $("oppdeling");
const solValg = $("sol");
const underlagValg = $("underlag");
const startKnapp = $("start");

const t = {
  forsok: null,
  forutsi: null,
  referanse: null, // én blokk med samme varmekilder, til fasit
  kjorer: false,
  startet: false,
  ferdig: false,
  resultatVist: false,
  fart: 3600,
  maaltFart: 3600,
  sisteMaaling: -Infinity,
  serie: null, // navnet på kurven for denne kjøringen
};
const serieNavn = []; // i samme rekkefølge som seriene i grafen
const kjoringer = []; // ferdige kjøringer, for tutoren

function valgt() {
  return OPPDELINGER[Number(glider.value)];
}

function kjoringsNavn() {
  let navn = valgt().navn;
  if (solValg.checked) navn += " + sol";
  if (underlagValg.checked) navn += " + underlag";
  return navn;
}

// ---------------------------------------------------------------------------
// Tall: overflate og volum
// ---------------------------------------------------------------------------

function oppdaterTall() {
  const id = valgt().id;
  const blokk = overflateOgVolum("1");
  const n = overflateOgVolum(id);
  const forhold = n.perVolum / blokk.perVolum;
  const perVolum = `${formaterTall(n.perVolum, 3)} cm² per cm³`;
  const ganger = `${formaterTall(forhold, 1)} ganger så mye som én blokk`;
  let tekst;
  if (id === "1") tekst = `Én blokk, ${n.bredde} × ${n.hoyde} × ${n.lengde} cm. Overflate per volum: ${perVolum}.`;
  else if (id === "spredt")
    tekst = `Et lag som er ${n.hoyde} cm tykt, ${n.bredde} cm bredt og ${n.lengde} cm langt. Overflate per volum: ${perVolum} – ${ganger}.`;
  else
    tekst = `${formaterTall(n.antall)} staver, ${n.bredde} × ${n.hoyde} cm og ${n.lengde} cm lange. Overflate per volum: ${perVolum} – ${ganger}.`;
  $("tall-hoved").textContent = tekst;

  const rader = OPPDELINGER.map((o) => {
    const v = overflateOgVolum(o.id);
    const kort = o.deling !== null ? formaterTall(v.antall) : "Spredt";
    return `<tr class="${o.id === id ? "valgt" : ""}"><td>${kort}</td><td>${v.bredde}&nbsp;×&nbsp;${v.hoyde}&nbsp;cm</td><td>${formaterTall(v.overflate, 0)}</td><td>${formaterTall(v.perVolum, 3)}</td></tr>`;
  });
  const masse = (blokk.volum * 1e-6 * data.materialer[SNO].rho).toFixed(1).replace(".", ",");
  $("tall-tabell").innerHTML =
    `<caption class="kun-skjermleser">Overflate og volum for hver oppdeling</caption>` +
    // &shy; = myk bindestrek: lange ord deles bare når skjermen er smal, så tabellen får plass.
    `<tr><th>Biter</th><th>Tverr&shy;snitt</th><th>Over&shy;flate (cm²)</th><th>Per volum</th></tr>` +
    rader.join("") +
    `<tr><td colspan="4">Volum alltid ${formaterTall(blokk.volum)} cm³ (ca. ${masse} kg pakket snø)</td></tr>`;
}

// ---------------------------------------------------------------------------
// Bygg et nytt forsøk
// ---------------------------------------------------------------------------

function bygg() {
  const o = valgt();
  t.forsok = lagSnoforsok(data, { oppdeling: o.id, sol: solValg.checked, underlag: underlagValg.checked });
  t.referanse = null;
  t.kjorer = t.startet = t.ferdig = t.resultatVist = false;
  t.sisteMaaling = -Infinity;
  t.serie = null;
  $("oppdeling-verdi").textContent = o.navn;
  glider.setAttribute("aria-valuetext", o.navn);
  for (const el of [glider, solValg, underlagValg]) el.disabled = false;
  startKnapp.disabled = true;
  startKnapp.textContent = "Start";
  oppdaterTall();

  const sporsmal =
    o.id === "1"
      ? "Snøblokken er −5 °C og ligger i luft på +5 °C. Hvor begynner den å smelte?"
      : `Samme mengde snø som én blokk, men ${o.id === "spredt" ? "spredt utover" : `delt i ${o.navn}`}. Hvor lang tid tar det før all snøen er smeltet?`;
  const valg =
    o.id === "1"
      ? [
          { id: "hjorner", tekst: "På hjørnene" },
          { id: "sider", tekst: "Midt på sidene" },
          { id: "overalt", tekst: "Like mye overalt" },
        ]
      : [
          { id: "kortere", tekst: "Kortere tid enn én blokk" },
          { id: "like", tekst: "Like lang tid" },
          { id: "lengre", tekst: "Lengre tid enn én blokk" },
        ];
  t.forutsi = lagForutsi($("forutsi"), {
    sporsmal,
    valg,
    vedLaas: (gjetning) => {
      startKnapp.disabled = false;
      tutor.sendHendelse("gjetning", { oppdeling: o.id, gjetning });
    },
  });
  oppdaterTekst(true);
}

// ---------------------------------------------------------------------------
// Grafen
// ---------------------------------------------------------------------------

function fjernKurve(navn) {
  const i = serieNavn.indexOf(navn);
  if (i < 0) return;
  graf.fjernSerie(i);
  serieNavn.splice(i, 1);
}

function nyKurve() {
  const navn = kjoringsNavn();
  fjernKurve(navn); // samme valg igjen erstatter den gamle kurven
  while (serieNavn.length >= MAKS_KJORINGER) fjernKurve(serieNavn[0]);
  graf.leggTilSerie({ navn, farge: FARGE[valgt().id], strek: strekFor(solValg.checked, underlagValg.checked) });
  serieNavn.push(navn);
  t.serie = navn;
}

function maal(tving = false) {
  const tid = t.forsok.tid;
  if (!tving && tid - t.sisteMaaling < MAALING_HVER) return;
  t.sisteMaaling = tid;
  const i = serieNavn.indexOf(t.serie);
  if (i >= 0) graf.leggTil(i, tid / 3600, t.forsok.smeltetAndel() * 100);
}

// ---------------------------------------------------------------------------
// Fasit
// ---------------------------------------------------------------------------

// Forklaringen gjelder de to merkede cellene, som ligger der den sterkeste varmekilden virker.
const HJORNE_FORKLARING = {
  venstre:
    "Hjørnene når 0 °C først. En hjørnecelle har luft på to sider og får varme inn fra begge. En celle midt på en side får bare fra én. (I en ekte terning har hjørnet luft på tre sider.) Hjørnet er ikke tynnere – det har mer overflate per snømengde.",
  over:
    "Hjørnene øverst når 0 °C først. Sola varmer hele oversiden. Hjørnet får i tillegg varme fra lufta på siden, mens cellen midt på oversiden bare får varme ovenfra. Hjørnet er ikke tynnere – det har mer overflate per snømengde.",
  under:
    "Hjørnene nederst når 0 °C først. Det varme underlaget varmer hele undersiden, så bunnen smelter lenge før toppen. Hjørnet får i tillegg varme fra lufta på siden, så det når 0 °C litt før cellen midt på undersiden. Hjørnet er ikke tynnere – det har mer overflate per snømengde.",
};

function sjekkResultat() {
  if (t.resultatVist) return;
  const f = t.forsok;
  const gjetning = t.forutsi.gjetning();
  if (f.oppdeling === "1") {
    if (f.hjorneNullVed === null && f.midtNullVed === null) return;
    let fasit = "overalt";
    if (f.midtNullVed === null || f.hjorneNullVed < f.midtNullVed) fasit = "hjorner";
    else if (f.hjorneNullVed === null || f.midtNullVed < f.hjorneNullVed) fasit = "sider";
    t.resultatVist = true;
    t.forutsi.visResultat(
      fasit,
      fasit === "hjorner"
        ? HJORNE_FORKLARING[f.merkedeCeller.flate]
        : "Se på fargene: hvor kom varmen inn, og hvor mye overflate hadde de cellene som smeltet først?"
    );
    tutor.sendHendelse("resultat", { oppdeling: "1", fasit, gjetning });
    // Ved vanlig fart skjer dette etter under ett sekund. Stopp, så eleven rekker å se
    // hvor smeltingen begynner før resten av blokken tar over bildet.
    t.kjorer = false;
    startKnapp.textContent = "Fortsett";
    oppdaterTekst();
    settBeskrivelse(
      $("beskrivelse"),
      `${beskriv(f)} Modellen har stoppet, så du kan se hvor snøen begynner å smelte. Trykk Fortsett for å se resten.`,
      true
    );
    tutor.sendHendelse("pause", { oppdeling: "1", automatisk: true });
    return;
  }
  if (f.smeltetVed === null || !t.referanse || t.referanse.smeltetVed === null) return;
  const forhold = f.smeltetVed / t.referanse.smeltetVed;
  const fasit = forhold < 0.95 ? "kortere" : forhold > 1.05 ? "lengre" : "like";
  const overflate = overflateOgVolum(f.oppdeling).perVolum / overflateOgVolum("1").perVolum;
  t.resultatVist = true;
  t.forutsi.visResultat(
    fasit,
    `${valgt().navn}: ${formaterTid(f.smeltetVed)}. Én blokk med samme varmekilder: ${formaterTid(t.referanse.smeltetVed)}. ` +
      `Samme mengde snø, men ${formaterTall(overflate, 1)} ganger så mye overflate per volum. Varmen kommer inn gjennom overflaten, så mer overflate gir raskere smelting.`
  );
  tutor.sendHendelse("resultat", { oppdeling: f.oppdeling, fasit, gjetning });
}

// ---------------------------------------------------------------------------
// Tekst
// ---------------------------------------------------------------------------

function oppdaterTekst(beskrivOgsa = false, lesOpp = true) {
  const fartTekst = { 600: "10 min", 3600: "1 time", 14400: "4 timer" }[t.fart] ?? formaterTid(t.fart);
  let tekst = `Tid i modellen: ${formaterTid(t.forsok.tid)} · 1 s på skjermen = ${fartTekst} i modellen`;
  if (t.kjorer && t.maaltFart < 0.85 * t.fart) {
    tekst += ` (maskinen klarer bare ca. ${formaterTid(t.maaltFart)} nå)`;
  }
  $("tid").textContent = tekst;
  if (beskrivOgsa) {
    const b = beskriv(t.forsok);
    settBeskrivelse($("beskrivelse"), b, lesOpp);
  }
}

// ---------------------------------------------------------------------------
// Knapper og valg
// ---------------------------------------------------------------------------

startKnapp.addEventListener("click", () => {
  if (!t.forutsi.erLaast() || t.ferdig) return;
  if (!t.startet) {
    t.startet = true;
    for (const el of [glider, solValg, underlagValg]) el.disabled = true;
    nyKurve();
    maal(true);
    if (t.forsok.oppdeling !== "1") {
      t.referanse = lagSnoforsok(data, { oppdeling: "1", sol: solValg.checked, underlag: underlagValg.checked });
    }
  }
  t.kjorer = !t.kjorer;
  t.maaltFart = t.fart;
  startKnapp.textContent = t.kjorer ? "Pause" : "Fortsett";
  oppdaterTekst(true);
  tutor.sendHendelse(t.kjorer ? "start" : "pause", { oppdeling: t.forsok.oppdeling });
});

$("nullstill").addEventListener("click", () => {
  if (t.startet && !t.ferdig && t.serie) fjernKurve(t.serie);
  bygg();
  graf.tegn();
  tutor.sendHendelse("nullstill");
});

$("tom-graf").addEventListener("click", () => {
  graf.tomAlt();
  serieNavn.length = 0;
  if (t.startet && !t.ferdig) {
    nyKurve();
    maal(true);
  }
  graf.tegn();
});

for (const el of [glider, solValg, underlagValg]) {
  el.addEventListener("input", () => {
    if (t.startet && !t.ferdig) return;
    bygg();
    tutor.sendHendelse("valg", { oppdeling: valgt().id, sol: solValg.checked, underlag: underlagValg.checked });
  });
}

$("fart").addEventListener("change", (e) => {
  t.fart = Number(e.target.value);
  t.maaltFart = t.fart;
  oppdaterTekst();
});

// ---------------------------------------------------------------------------
// KI-tutor
// ---------------------------------------------------------------------------

const tutor = koblTilTutor({
  modell: "overflate-og-volum",
  hent: () => ({
    oppdeling: valgt().id,
    sol: solValg.checked,
    underlag: underlagValg.checked,
    gjetning: t.forutsi.gjetning(),
    kjorer: t.kjorer,
    ferdig: t.ferdig,
    overflatePerVolum: overflateOgVolum(valgt().id).perVolum,
    forsok: t.forsok.tilstand(),
    kjoringer,
  }),
  sett: (ny) => {
    if (t.startet && !t.ferdig) return;
    const i = OPPDELINGER.findIndex((o) => o.id === ny.oppdeling);
    if (i >= 0) glider.value = String(i);
    if (typeof ny.sol === "boolean") solValg.checked = ny.sol;
    if (typeof ny.underlag === "boolean") underlagValg.checked = ny.underlag;
    bygg();
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

const SMAA_STEG = 10; // s modelltid, samme takt som modellen sjekker 0 °C

/**
 * Ett bilde med simulering. Før første 0 °C i én blokk regnes det i små steg, og vi
 * stopper med en gang et hjørne eller en sidemidt når 0 °C. Ellers hopper ett bilde
 * (ca. 60 s modelltid) forbi forskjellen: med varmt underlag er den bare ca. 20 s.
 */
function stegFram(dtOnsket) {
  const f = t.forsok;
  if (f.oppdeling !== "1" || t.resultatVist) return f.stegMedBudsjett(dtOnsket, MAKS_DELSTEG);
  const antall = Math.ceil(dtOnsket / SMAA_STEG);
  const budsjett = Math.max(1, Math.floor(MAKS_DELSTEG / antall));
  let simulert = 0;
  for (let i = 0; i < antall; i++) {
    simulert += f.stegMedBudsjett(Math.min(SMAA_STEG, dtOnsket - simulert), budsjett);
    if (f.hjorneNullVed !== null || f.midtNullVed !== null) break;
  }
  return simulert;
}

function animer(naa) {
  const dtEkte = forrige === null ? 0 : Math.min(0.1, (naa - forrige) / 1000);
  forrige = naa;
  animTid += dtEkte;

  if (t.kjorer && dtEkte > 0) {
    bevegelsesTid += dtEkte;
    const simulert = stegFram(dtEkte * t.fart);
    t.maaltFart = 0.9 * t.maaltFart + 0.1 * (simulert / dtEkte);
    // Referanseblokken regnes ferdig i bakgrunnen, litt hvert bilde.
    if (t.referanse && t.referanse.smeltetVed === null) t.referanse.steg(1800);
    maal();
    sjekkResultat();
    if (t.forsok.smeltetVed !== null) {
      maal(true);
      t.kjorer = false;
      t.ferdig = true;
      startKnapp.textContent = "Ferdig";
      startKnapp.disabled = true;
      for (const el of [glider, solValg, underlagValg]) el.disabled = false;
      kjoringer.push({ navn: t.serie, smeltetid: Math.round(t.forsok.smeltetVed) });
      oppdaterTekst(true);
      tutor.sendHendelse("ferdig", { navn: t.serie, smeltetid: Math.round(t.forsok.smeltetVed) });
    }
    graf.tegn();
  } else if (t.ferdig && !t.resultatVist) {
    // Referansen kan bli ferdig etter at kjøringen er ferdig.
    if (t.referanse && t.referanse.smeltetVed === null) t.referanse.steg(1800);
    sjekkResultat();
  }

  visning.tegn(ctx, t.forsok, { tid: bevegelsesTid, visVarme: t.startet });

  if (animTid - sisteTekst > 0.2) {
    sisteTekst = animTid;
    const beskrivOgsa = animTid - sisteBeskrivelse > 4;
    if (beskrivOgsa) sisteBeskrivelse = animTid;
    oppdaterTekst(beskrivOgsa, false);
  }
  requestAnimationFrame(animer);
}

bygg();
graf.tegn();
requestAnimationFrame(animer);
