// Fargeskala for temperatur: blå (kaldt) – lys grå (rom) – oransje (varmt).
// Blå/oransje kan skilles også ved rød-grønn fargeblindhet. Temperaturen skal likevel
// alltid også vises som tall eller tekst et sted.

const STOPP = [
  [-20, [31, 78, 140]],
  [-5, [91, 143, 201]],
  [0, [169, 200, 232]],
  [20, [230, 226, 218]],
  [30, [242, 178, 107]],
  [40, [196, 90, 0]],
  // Over 40 °C (bare "Energi som sprer seg" går så høyt): mørkere brunoransje.
  [65, [150, 62, 6]],
  [90, [104, 38, 10]],
];

/** RGB-farge for en temperatur i °C, som [r, g, b]. */
export function temperaturRgb(T) {
  if (T <= STOPP[0][0]) return STOPP[0][1];
  for (let i = 1; i < STOPP.length; i++) {
    const [t1, f1] = STOPP[i];
    if (T <= t1) {
      const [t0, f0] = STOPP[i - 1];
      const a = (T - t0) / (t1 - t0);
      return [0, 1, 2].map((j) => Math.round(f0[j] + a * (f1[j] - f0[j])));
    }
  }
  return STOPP[STOPP.length - 1][1];
}

/** CSS-farge for en temperatur i °C. */
export function temperaturFarge(T, alfa = 1) {
  const [r, g, b] = temperaturRgb(T);
  return alfa === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alfa})`;
}

/** Tegn en liten fargeskala-forklaring. */
export function tegnFargeskala(ctx, x, y, bredde, hoyde, minT = -20, maksT = 40) {
  for (let i = 0; i < bredde; i++) {
    ctx.fillStyle = temperaturFarge(minT + ((maksT - minT) * i) / (bredde - 1));
    ctx.fillRect(x + i, y, 1, hoyde);
  }
  ctx.strokeStyle = "#d8d5cc";
  ctx.strokeRect(x + 0.5, y + 0.5, bredde - 1, hoyde - 1);
  ctx.fillStyle = "#5b616b";
  ctx.font = "12px system-ui, sans-serif";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText(`${minT} °C`, x, y + hoyde + 3);
  ctx.textAlign = "right";
  ctx.fillText(`${maksT} °C`, x + bredde, y + hoyde + 3);
  if (minT < 0 && maksT > 0) {
    ctx.textAlign = "center";
    ctx.fillText("0 °C", x + (bredde * (0 - minT)) / (maksT - minT), y + hoyde + 3);
  }
}
