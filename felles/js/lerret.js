// Skarpt lerret på skjermer med høy oppløsning (iPad, mange Chromebooks).
// Vi tegner i faste "logiske" piksler, og lerretet skaleres med CSS.

/**
 * @param {HTMLCanvasElement} canvas
 * @param {number} bredde logisk bredde
 * @param {number} hoyde  logisk høyde
 * @returns {CanvasRenderingContext2D}
 */
export function klargjorLerret(canvas, bredde, hoyde) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(bredde * dpr);
  canvas.height = Math.round(hoyde * dpr);
  canvas.style.aspectRatio = `${bredde} / ${hoyde}`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.logiskBredde = bredde;
  ctx.logiskHoyde = hoyde;
  return ctx;
}
