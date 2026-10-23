// Tilstand ut og inn, slik at en KI-tutor senere kan lese hva eleven gjør.
//
// Hver modell kaller koblTilTutor() én gang. Da kan tilstanden leses på tre måter:
//   1. I samme side:   window.undervisningsmodell.hentTilstand()
//   2. Fra en forelder-side (modellen ligger i en <iframe>):
//        iframe.contentWindow.postMessage({ kilde: "tutor", type: "hentTilstand" }, "*")
//      svaret kommer som { kilde: "undervisningsmodell", type: "tilstand", modell, tilstand }
//   3. Hendelser (f.eks. "eleven låste gjetningen") sendes automatisk til forelder-siden
//      som { kilde: "undervisningsmodell", type: "hendelse", modell, navn, data, tid }.
//
// Ingen nettverkskall: postMessage sender bare mellom vinduer i samme nettleser.
// Tilstanden skal aldri inneholde personopplysninger.

const KILDE = "undervisningsmodell";

/**
 * @param {object} oppsett
 * @param {string} oppsett.modell   kort navn, f.eks. "varmeledning-partikler"
 * @param {() => object} oppsett.hent   returnerer et vanlig objekt (kan gjøres om til JSON)
 * @param {(tilstand: object) => void} [oppsett.sett]   setter modellen i en gitt tilstand
 * @returns {{ sendHendelse: (navn: string, data?: object) => void }}
 */
export function koblTilTutor({ modell, hent, sett }) {
  const hentTilstand = () => strukturertKopi(hent());
  const settTilstand = (tilstand) => {
    if (typeof sett === "function") sett(tilstand);
  };

  function sendHendelse(navn, data = {}) {
    const melding = { kilde: KILDE, type: "hendelse", modell, navn, data, tid: Date.now() };
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(melding, "*");
    }
    window.dispatchEvent(new CustomEvent("undervisningsmodell", { detail: melding }));
  }

  window.addEventListener("message", (e) => {
    const m = e.data;
    if (!m || m.kilde !== "tutor") return;
    if (m.type === "hentTilstand" && e.source) {
      e.source.postMessage(
        { kilde: KILDE, type: "tilstand", modell, tilstand: hentTilstand() },
        "*"
      );
    } else if (m.type === "settTilstand" && m.tilstand) {
      settTilstand(m.tilstand);
    }
  });

  window.undervisningsmodell = { modell, hentTilstand, settTilstand, sendHendelse };
  return { sendHendelse };
}

function strukturertKopi(objekt) {
  return JSON.parse(JSON.stringify(objekt));
}
