// MAL: tegner tilstanden. Inneholder ingen fysikk – bare lesing av tilstand.

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ tid: number, temperatur: number, omgivelse: number }} tilstand
 */
export function tegn(ctx, tilstand) {
  const { width: b, height: h } = ctx.canvas;
  ctx.clearRect(0, 0, b, h);

  // En søyle som viser temperaturen mellom 0 og 100 °C.
  const andel = Math.min(1, Math.max(0, tilstand.temperatur / 100));
  const sovleH = (h - 80) * andel;
  ctx.fillStyle = "#d9730d";
  ctx.fillRect(b / 2 - 30, h - 40 - sovleH, 60, sovleH);
  ctx.strokeStyle = "#5b616b";
  ctx.strokeRect(b / 2 - 30, 40, 60, h - 80);

  // Strek for omgivelsenes temperatur.
  const yOmg = h - 40 - (h - 80) * (tilstand.omgivelse / 100);
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(b / 2 - 60, yOmg);
  ctx.lineTo(b / 2 + 60, yOmg);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#1f2328";
  ctx.font = "16px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${tilstand.temperatur.toFixed(1)} °C`, b / 2 + 45, h - 40 - sovleH + 5);
  ctx.fillStyle = "#5b616b";
  ctx.textAlign = "right";
  ctx.fillText(`rommet ${tilstand.omgivelse} °C`, b / 2 - 65, yOmg + 5);
}

/** Kort tekst om hva som skjer, for skjermleser og som hjelp. */
export function beskriv(tilstand) {
  return `Etter ${tilstand.tid.toFixed(0)} sekunder er temperaturen ${tilstand.temperatur.toFixed(1)} °C.`;
}
