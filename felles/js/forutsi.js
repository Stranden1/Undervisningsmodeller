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
//   forutsi.visResultat("al", "Isbiten på aluminium smeltet først.");

let teller = 0;

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

  function tegnSporsmal() {
    gjetning = null;
    element.innerHTML = "";

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
    element.append(skjema);
  }

  function tegnLaast() {
    element.innerHTML = "";
    const p = document.createElement("p");
    p.className = "laast";
    p.textContent = `Din gjetning: ${tekstFor(gjetning)}`;
    const hint = document.createElement("p");
    hint.textContent = "Trykk Start og se hva som skjer.";
    element.append(p, hint);
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
    /** Vis gjetningen ved siden av det som faktisk skjedde. */
    visResultat(fasitId, forklaring = "") {
      element.innerHTML = "";
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
      element.append(liste);
      if (forklaring) {
        const p = document.createElement("p");
        p.textContent = forklaring;
        element.append(p);
      }
    },
    /** Start på nytt med samme spørsmål. */
    nullstill: tegnSporsmal,
  };
}
