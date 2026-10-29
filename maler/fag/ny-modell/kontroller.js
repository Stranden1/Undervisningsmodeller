// MAL: knapper, glidebrytere og løkka som driver modellen.
// Kobler modell (fysikk) og visning (tegning) sammen, og eier ingen av delene.

import { lagModell } from "./modell.js";
import { tegn, beskriv } from "./visning.js";
import { lagForutsi } from "../../../felles/js/forutsi.js";
import { settBeskrivelse } from "../../../felles/js/beskrivelse.js";
import { koblTilTutor } from "../../../felles/js/tilstand.js";
import { klargjorLerret } from "../../../felles/js/lerret.js";
import { formaterTid } from "../../../felles/js/format.js";

// Skarpt lerret: vi tegner i 640 × 400 logiske piksler, uansett skjerm.
const ctx = klargjorLerret(document.getElementById("lerret"), 640, 400);
const tidTekst = document.getElementById("tid");
const FART = 10; // 1 s på skjermen = 10 s i modellen. Vis alltid farten for eleven.
const beskrivelse = document.getElementById("beskrivelse");
const startKnapp = document.getElementById("start");
const nullstillKnapp = document.getElementById("nullstill");
const startGlider = document.getElementById("starttemperatur");
const startVerdi = document.getElementById("starttemperatur-verdi");

let modell = lagNy();
let kjorer = false;
let startet = false; // glideren låses fra første Start til Nullstill
let forrigeTid = null;
let resultatVist = false;

function lagNy() {
  return lagModell({
    startTemperatur: Number(startGlider.value),
    omgivelse: 20,
    rate: 0.05, // PLASSHOLDER
  });
}

const forutsi = lagForutsi(document.getElementById("forutsi"), {
  sporsmal: "Hva skjer med temperaturen hvis vi venter lenge?",
  valg: [
    { id: "rom", tekst: "Den stopper på romtemperatur" },
    { id: "under", tekst: "Den fortsetter under romtemperatur" },
    { id: "null", tekst: "Den synker helt til 0 °C" },
  ],
  vedLaas: (valg) => {
    startKnapp.disabled = false;
    tutor.sendHendelse("gjetning", { valg });
  },
});

const tutor = koblTilTutor({
  modell: "ny-modell",
  hent: () => ({
    ...modell.tilstand,
    kjorer,
    gjetning: forutsi.gjetning(),
    starttemperatur: Number(startGlider.value),
  }),
  sett: (t) => {
    if (startet) return; // valg kan bare endres før start, som for eleven
    if (typeof t.starttemperatur === "number") {
      startGlider.value = t.starttemperatur;
      oppdaterGlider();
    }
  },
});

// Glideren endrer oppsettet for et nytt forsøk. Den er låst mens et forsøk pågår, så
// fysikken aldri nullstilles mens gjetning og kjøring står igjen (F06 i revisjonen).
function oppdaterGlider() {
  if (startet) return;
  startVerdi.textContent = `${startGlider.value} °C`;
  modell = lagNy();
  tegnAlt();
}

/** lesOpp = true når eleven har trykket noe. Ellers oppdateres beskrivelsen stille. */
function tegnAlt(lesOpp = false) {
  tegn(ctx, modell.tilstand);
  tidTekst.textContent = `Tid i modellen: ${formaterTid(modell.tilstand.tid)} · 1 s på skjermen = ${FART} s i modellen`;
  settBeskrivelse(beskrivelse, beskriv(modell.tilstand), lesOpp);
}

function animer(naa) {
  if (!kjorer) return;
  const dtEkte = forrigeTid === null ? 0 : Math.min(0.1, (naa - forrigeTid) / 1000);
  forrigeTid = naa;
  modell.steg(dtEkte * FART);
  tegnAlt();
  if (!resultatVist && modell.tilstand.tid > 60) {
    resultatVist = true;
    forutsi.visResultat("rom", "Temperaturen nærmer seg romtemperaturen, men går aldri forbi den.");
  }
  requestAnimationFrame(animer);
}

startKnapp.addEventListener("click", () => {
  if (!forutsi.erLaast()) return;
  startet = true;
  startGlider.disabled = true;
  kjorer = !kjorer;
  startKnapp.textContent = kjorer ? "Pause" : "Fortsett";
  forrigeTid = null;
  if (kjorer) requestAnimationFrame(animer);
  tegnAlt(true);
  tutor.sendHendelse(kjorer ? "start" : "pause");
});

nullstillKnapp.addEventListener("click", () => {
  kjorer = false;
  startet = false;
  startGlider.disabled = false;
  resultatVist = false;
  startKnapp.textContent = "Start";
  startKnapp.disabled = true;
  forutsi.nullstill();
  modell = lagNy();
  tegnAlt(true);
  tutor.sendHendelse("nullstill");
});

startGlider.addEventListener("input", oppdaterGlider);

oppdaterGlider();
