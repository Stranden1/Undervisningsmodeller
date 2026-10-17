// MAL: knapper, glidebrytere og løkka som driver modellen.
// Kobler modell (fysikk) og visning (tegning) sammen, og eier ingen av delene.

import { lagModell } from "./modell.js";
import { tegn, beskriv } from "./visning.js";
import { lagForutsi } from "../../felles/js/forutsi.js";
import { koblTilTutor } from "../../felles/js/tilstand.js";

const lerret = document.getElementById("lerret");
const ctx = lerret.getContext("2d");
const beskrivelse = document.getElementById("beskrivelse");
const startKnapp = document.getElementById("start");
const nullstillKnapp = document.getElementById("nullstill");
const startGlider = document.getElementById("starttemperatur");
const startVerdi = document.getElementById("starttemperatur-verdi");

let modell = lagNy();
let kjorer = false;
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
    if (typeof t.starttemperatur === "number") {
      startGlider.value = t.starttemperatur;
      oppdaterGlider();
    }
  },
});

function oppdaterGlider() {
  startVerdi.textContent = `${startGlider.value} °C`;
  modell = lagNy();
  tegnAlt();
}

function tegnAlt() {
  tegn(ctx, modell.tilstand);
  beskrivelse.textContent = beskriv(modell.tilstand);
}

function animer(naa) {
  if (!kjorer) return;
  const dtEkte = forrigeTid === null ? 0 : Math.min(0.1, (naa - forrigeTid) / 1000);
  forrigeTid = naa;
  modell.steg(dtEkte * 10); // 10 ganger raskere enn ekte tid
  tegnAlt();
  if (!resultatVist && modell.tilstand.tid > 60) {
    resultatVist = true;
    forutsi.visResultat("rom", "Temperaturen nærmer seg romtemperaturen, men går aldri forbi den.");
  }
  requestAnimationFrame(animer);
}

startKnapp.addEventListener("click", () => {
  if (!forutsi.erLaast()) return;
  kjorer = !kjorer;
  startKnapp.textContent = kjorer ? "Pause" : "Start";
  forrigeTid = null;
  if (kjorer) requestAnimationFrame(animer);
  tutor.sendHendelse(kjorer ? "start" : "pause");
});

nullstillKnapp.addEventListener("click", () => {
  kjorer = false;
  resultatVist = false;
  startKnapp.textContent = "Start";
  startKnapp.disabled = true;
  forutsi.nullstill();
  modell = lagNy();
  tegnAlt();
  tutor.sendHendelse("nullstill");
});

startGlider.addEventListener("input", oppdaterGlider);

oppdaterGlider();
