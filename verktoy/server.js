// En liten lokal webserver for utvikling, uten noe som må installeres.
//
// Start fra rotmappa:   node verktoy/server.js
// Åpne så:              http://localhost:8000
//
// Serveren svarer bare på denne maskinen (127.0.0.1), ikke på nettverket.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORT = Number(process.env.PORT) || 8000;

const TYPER = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8", // vises som tekst i nettleseren i stedet for å lastes ned
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  try {
    const sti = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    let fil = normalize(join(ROT, sti));
    // Ikke la noen be om filer utenfor prosjektmappa.
    if (fil !== ROT && !fil.startsWith(ROT + sep)) {
      res.writeHead(403).end("Ikke tillatt");
      return;
    }
    const info = await stat(fil).catch(() => null);
    if (info && info.isDirectory()) {
      if (!sti.endsWith("/")) {
        res.writeHead(301, { Location: sti + "/" }).end();
        return;
      }
      fil = join(fil, "index.html");
    }
    const innhold = await readFile(fil);
    res.writeHead(200, {
      "Content-Type": TYPER[extname(fil).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store", // alltid nyeste versjon under utvikling
    });
    res.end(innhold);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Fant ikke fila");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Undervisningsmodeller kjører på http://localhost:${PORT}  (stopp med Ctrl+C)`);
});
