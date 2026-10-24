// Tekstbeskrivelsen under lerretet: hva som skjer, med ord. Leses også av skjermleser.
//
// Mens modellen kjører, endres teksten ofte. Leser skjermleseren opp hver endring, blir
// det mas som drukner alt annet eleven gjør. Derfor leses teksten bare opp når eleven
// selv gjør noe (Start, Pause, Nullstill, nytt valg) eller forsøket er ferdig. Underveis
// oppdateres den stille, så den er riktig når eleven leser den selv.
//
// Bruk: <p id="beskrivelse" class="beskrivelse" aria-live="polite"></p>
//   settBeskrivelse(el, tekst, true);   // eleven trykket noe: les opp
//   settBeskrivelse(el, tekst, false);  // løkka: bare oppdater

/**
 * @param {HTMLElement} element
 * @param {string} tekst
 * @param {boolean} lesOpp
 */
export function settBeskrivelse(element, tekst, lesOpp) {
  if (tekst === element.textContent) return;
  element.setAttribute("aria-live", lesOpp ? "polite" : "off");
  element.textContent = tekst;
}
