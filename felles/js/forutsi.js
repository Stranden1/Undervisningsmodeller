// "Gjett først"-komponent.
//
// Eleven velger et svar og låser det før simuleringen kan startes.
// Etterpå vises gjetningen ved siden av resultatet.
//
// Bruk:
//   const forutsi = lagForutsi(document.getElementById("forutsi"), {
//     sporsmal: "Hvilken isbit smelter først?",
//     valg: [ { id: "al", tekst: "På aluminium" }, { id: "tre", tekst: "På tre" } ],
//     vedLaas: (valgId) => { /* nå kan Play slås på */ },
//   });
//   forutsi.visResultat("al", "Isbiten på aluminium smeltet først.", [
//     "Se på klossene under isen: hvilken ble kaldest?",   // observer
//     "Hvorfor tiner frossen mat fort på en metallbenk?",  // overføring
//   ]);
//
// Spørsmålene under "Tenk etter" er ment for samtale eller papir, ikke skrivefelt.
// Eleven skal begrunne svaret sitt, ikke bare lese fasiten.
//
// Skjermleser: låsing flytter fokus til gjetningen, og resultatet og en ny runde
// leses opp gjennom en skjult statuslinje. Statuslinja må finnes før teksten
// endres, ellers leses den ikke. Derfor beholdes den når komponenten lages på
// nytt i samme element (modellene gjør det hver gang forsøket endres).

let teller = 0;

/** Elementer der eleven har låst en gjetning som ennå ikke er forkastet. */
const laast = new WeakSet();

function hentStatuslinje(element) {
  let melding = element.querySelector(":scope > .forutsi-melding");
  if (!melding) {
    melding = document.createElement("p");
    melding.className = "forutsi-melding kun-skjermleser";
    melding.setAttribute("role", "status");
  }
  return melding;
}

/**
 * @param {HTMLElement} element
 * @param {object} oppsett
 * @param {string} oppsett.sporsmal
 * @param {{id: string, tekst: string}[]} oppsett.valg
 * @param {(valgId: string) => void} [oppsett.vedLaas]
 */
export function lagForutsi(element, { sporsmal, valg, vedLaas }) {
  const gruppe = `forutsi-${++teller}`;
  let gjetning = null;

  element.classList.add("forutsi");
  const melding = hentStatuslinje(element);
  const innhold = document.createElement("div");
  element.replaceChildren(innhold, melding);

  /** Les opp en kort tekst. Tømmes først, så samme tekst to ganger også leses. */
  function lesOpp(tekst) {
    melding.textContent = "";
    setTimeout(() => (melding.textContent = tekst), 100);
  }

  function tegnSporsmal() {
    // En låst gjetning som forkastes (nytt forsøk eller Nullstill) skal ikke
    // forsvinne i stillhet: Start blir grå, og eleven må vite hvorfor.
    if (laast.has(element)) {
      laast.delete(element);
      lesOpp("Nytt forsøk. Gjett på nytt før du trykker Start.");
    }
    gjetning = null;
    innhold.innerHTML = "";

    const skjema = document.createElement("form");
    const felt = document.createElement("fieldset");
    const tittel = document.createElement("legend");
    tittel.textContent = "Gjett først: " + sporsmal;
    felt.append(tittel);

    for (const v of valg) {
      const etikett = document.createElement("label");
      etikett.className = "valg";
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = gruppe;
      radio.value = v.id;
      etikett.append(radio, document.createTextNode(v.tekst));
      felt.append(etikett);
    }

    const knapp = document.createElement("button");
    knapp.type = "submit";
    knapp.className = "knapp knapp-hoved";
    knapp.textContent = "Lås gjetningen";
    knapp.disabled = true;

    felt.addEventListener("change", () => {
      knapp.disabled = !skjema.querySelector("input:checked");
    });

    skjema.addEventListener("submit", (e) => {
      e.preventDefault();
      const valgt = skjema.querySelector("input:checked");
      if (!valgt) return;
      gjetning = valgt.value;
      tegnLaast();
      if (vedLaas) vedLaas(gjetning);
    });

    skjema.append(felt, knapp);
    innhold.append(skjema);
  }

  function tegnLaast() {
    laast.add(element);
    innhold.innerHTML = "";
    const p = document.createElement("p");
    p.className = "laast";
    p.textContent = `Din gjetning: ${tekstFor(gjetning)}`;
    const hint = document.createElement("p");
    hint.textContent = "Trykk Start og se hva som skjer.";
    innhold.append(p, hint);
    // Knappen som hadde fokus er borte. Flytt fokus hit, så tastaturet ikke mister
    // plassen og skjermleseren leser gjetningen.
    p.tabIndex = -1;
    p.focus();
  }

  function tekstFor(id) {
    const funnet = valg.find((v) => v.id === id);
    return funnet ? funnet.tekst : "–";
  }

  tegnSporsmal();

  return {
    /** Valgt id, eller null hvis eleven ikke har låst ennå. */
    gjetning: () => gjetning,
    erLaast: () => gjetning !== null,
    /** Vis gjetningen ved siden av det som faktisk skjedde, og spørsmål å tenke over. */
    visResultat(fasitId, forklaring = "", tenkEtter = []) {
      const haddeFokus = innhold.contains(document.activeElement);
      innhold.innerHTML = "";
      const liste = document.createElement("dl");
      liste.className = "sammenligning";
      const rader = [
        ["Du gjettet", tekstFor(gjetning)],
        ["Det skjedde", tekstFor(fasitId)],
      ];
      for (const [navn, verdi] of rader) {
        const dt = document.createElement("dt");
        dt.textContent = navn;
        const dd = document.createElement("dd");
        dd.textContent = verdi;
        liste.append(dt, dd);
      }
      innhold.append(liste);
      if (forklaring) {
        const p = document.createElement("p");
        p.textContent = forklaring;
        innhold.append(p);
      }
      if (tenkEtter.length) {
        const boks = document.createElement("div");
        boks.className = "tenk-etter";
        const tittel = document.createElement("p");
        tittel.innerHTML = "<strong>Tenk etter</strong> – svar muntlig eller på papir:";
        const ol = document.createElement("ol");
        for (const s of tenkEtter) {
          const li = document.createElement("li");
          li.textContent = s;
          ol.append(li);
        }
        boks.append(tittel, ol);
        innhold.append(boks);
      }
      // Fokus flyttes bare hvis det sto på gjetningen, som nå er borte. Ellers kan
      // eleven være et annet sted på siden, og da holder det å lese opp.
      if (haddeFokus) {
        liste.tabIndex = -1;
        liste.focus();
      }
      const sporsmal = tenkEtter.length ? ` Tenk etter: ${tenkEtter.join(" ")}` : "";
      lesOpp(`Du gjettet: ${tekstFor(gjetning)}. Det skjedde: ${tekstFor(fasitId)}. ${forklaring}${sporsmal}`);
    },
    /** Start på nytt med samme spørsmål. */
    nullstill: tegnSporsmal,
  };
}
