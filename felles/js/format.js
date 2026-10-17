// Tall og tid skrevet slik elevene leser dem (norsk desimalkomma).

/** "20,4 °C" */
export function formaterGrader(T, desimaler = 1) {
  return `${T.toFixed(desimaler).replace(".", ",")} °C`;
}

/** "45 s", "4 min 12 s", "3 t 10 min" */
export function formaterTid(s) {
  const min = Math.floor(s / 60);
  const sek = Math.floor(s % 60);
  if (min === 0) return `${sek} s`;
  if (min < 60) return `${min} min ${sek} s`;
  return `${Math.floor(min / 60)} t ${min % 60} min`;
}

const tallFormat = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 2 });

/** "1 600", "0,75" */
export function formaterTall(x, maksDesimaler = 2) {
  if (maksDesimaler === 2) return tallFormat.format(x);
  return new Intl.NumberFormat("nb-NO", { maximumFractionDigits: maksDesimaler }).format(x);
}
