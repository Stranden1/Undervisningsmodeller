// Enkel sanntidsgraf på canvas. Flere serier, faste akser, x-aksen kan vokse.
//
// Bruk:
//   const graf = lagGraf(canvas, {
//     xMaks: 20, yMin: 18, yMaks: 34, xTekst: "tid (s)", yTekst: "°C",
//     serier: [{ navn: "Aluminium", farge: "#1f5fa8" }, { navn: "Tre", farge: "#b35c00", strek: [6, 4] }],
//     referanser: [{ y: 33, tekst: "huden før" }],
//   });
//   graf.leggTil(0, t, T); graf.tegn();

import { klargjorLerret } from "./lerret.js";

/** Én størrelsesvakt per lerret. */
const vakter = new WeakMap();

export function lagGraf(canvas, oppsett) {
  const STORST = oppsett.bredde ?? 560;
  const H = oppsett.hoyde ?? 240;
  let B = STORST;
  const ctx = klargjorLerret(canvas, B, H);

  // På en smal skjerm tegnes grafen i den bredden den faktisk har, i stedet for å
  // krympe hele bildet. Da blir teksten 12 skjermpiksler også på mobil (F03).
  // Høyden er den samme, så grafen blir litt høyere i forhold til bredden.
  function tilpassBredde() {
    const vist = Math.round(canvas.clientWidth);
    const ny = Math.max(260, Math.min(STORST, vist));
    if (!vist || ny === B) return;
    B = ny;
    klargjorLerret(canvas, B, H);
    tegn();
  }
  if (typeof ResizeObserver !== "undefined") {
    // Lages en ny graf på samme lerret (nytt forsøk), skal den gamle slutte å tegne.
    vakter.get(canvas)?.disconnect();
    const vakt = new ResizeObserver(tilpassBredde);
    vakt.observe(canvas);
    vakter.set(canvas, vakt);
  }
  const marg = { v: 52, h: 16, o: 28, u: 40 };
  const serier = oppsett.serier.map((s) => ({ ...s }));
  const xFormat = oppsett.xFormat ?? ((x) => String(Math.round(x)));
  const yFormat = oppsett.yFormat ?? ((y) => String(Math.round(y)));
  let xMaks = oppsett.xMaks;
  let data = serier.map(() => []);

  const px = (x) => marg.v + (x / xMaks) * (B - marg.v - marg.h);
  const py = (y) => marg.o + (1 - (y - oppsett.yMin) / (oppsett.yMaks - oppsett.yMin)) * (H - marg.o - marg.u);

  function fineSteg(spenn, antall) {
    const grovt = spenn / antall;
    const tierpotens = 10 ** Math.floor(Math.log10(grovt));
    for (const m of [1, 2, 2.5, 5, 10]) if (m * tierpotens >= grovt) return m * tierpotens;
    return 10 * tierpotens;
  }

  /** Plasser forklaringene; bryt linja når den blir for lang. */
  function plasserForklaring() {
    ctx.font = "12px system-ui, sans-serif";
    const plasser = [];
    let lx = marg.v;
    let linje = 0;
    for (const s of serier) {
      const b = 30 + ctx.measureText(s.navn).width + 16;
      if (lx + b > B - marg.h && lx > marg.v) {
        linje++;
        lx = marg.v;
      }
      plasser.push({ x: lx, y: 12 + linje * 16 });
      lx += b;
    }
    marg.o = 28 + linje * 16;
    return plasser;
  }

  function tegn() {
    ctx.clearRect(0, 0, B, H);
    const forklaring = plasserForklaring();
    ctx.font = "12px system-ui, sans-serif";

    // Rutenett og akser
    ctx.strokeStyle = "#ebe8e0";
    ctx.fillStyle = "#5b616b";
    ctx.lineWidth = 1;
    const ySteg = fineSteg(oppsett.yMaks - oppsett.yMin, 4);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let y = Math.ceil(oppsett.yMin / ySteg) * ySteg; y <= oppsett.yMaks + 1e-9; y += ySteg) {
      ctx.beginPath();
      ctx.moveTo(marg.v, py(y));
      ctx.lineTo(B - marg.h, py(y));
      ctx.stroke();
      ctx.fillText(yFormat(y), marg.v - 6, py(y));
    }
    const xSteg = fineSteg(xMaks, 5);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let x = 0; x <= xMaks + 1e-9; x += xSteg) {
      ctx.beginPath();
      ctx.moveTo(px(x), marg.o);
      ctx.lineTo(px(x), H - marg.u);
      ctx.stroke();
      ctx.fillText(xFormat(x), px(x), H - marg.u + 4);
    }
    ctx.fillText(oppsett.xTekst, (marg.v + B - marg.h) / 2, H - 16);
    ctx.save();
    ctx.translate(12, (marg.o + H - marg.u) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = "middle";
    ctx.fillText(oppsett.yTekst, 0, 0);
    ctx.restore();

    // Referanselinjer
    for (const r of oppsett.referanser ?? []) {
      ctx.strokeStyle = "#9aa0a8";
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(marg.v, py(r.y));
      ctx.lineTo(B - marg.h, py(r.y));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#5b616b";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText(r.tekst, B - marg.h - 4, py(r.y) - 2);
    }

    // Seriene
    serier.forEach((s, i) => {
      const punkter = data[i];
      if (punkter.length === 0) return;
      ctx.strokeStyle = s.farge;
      ctx.lineWidth = 2.5;
      ctx.setLineDash(s.strek ?? []);
      ctx.beginPath();
      punkter.forEach(([x, y], j) => {
        const yy = py(Math.min(oppsett.yMaks, Math.max(oppsett.yMin, y)));
        if (j === 0) ctx.moveTo(px(x), yy);
        else ctx.lineTo(px(x), yy);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Forklaring øverst
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    serier.forEach((s, i) => {
      const { x, y } = forklaring[i];
      ctx.strokeStyle = s.farge;
      ctx.lineWidth = 2.5;
      ctx.setLineDash(s.strek ?? []);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 24, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#1f2328";
      ctx.fillText(s.navn, x + 30, y);
    });
  }

  return {
    leggTil(serie, x, y) {
      while (oppsett.utvidX !== false && x > xMaks) xMaks *= 2;
      data[serie].push([x, y]);
    },
    /** Bytt navn på seriene (f.eks. når eleven velger nytt materiale). */
    settSerieNavn(navn) {
      navn.forEach((n, i) => (serier[i].navn = n));
    },
    /** Legg til en ny serie (f.eks. en ny kjøring). Returnerer nummeret. */
    leggTilSerie(serie) {
      serier.push({ ...serie });
      data.push([]);
      return serier.length - 1;
    },
    /** Fjern en serie. Numrene til seriene etter den flyttes én ned. */
    fjernSerie(i) {
      serier.splice(i, 1);
      data.splice(i, 1);
    },
    get antallSerier() {
      return serier.length;
    },
    /** Tøm dataene, men behold seriene. */
    nullstill() {
      data = serier.map(() => []);
      xMaks = oppsett.xMaks;
    },
    /** Fjern alle serier. */
    tomAlt() {
      serier.length = 0;
      data = [];
      xMaks = oppsett.xMaks;
    },
    tegn,
  };
}
