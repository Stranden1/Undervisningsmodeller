# Naturfagsmodeller

En samling interaktive modeller for naturfag i norsk skole (ungdomsskole og Vg1 først).
Hver modell skal kunne brukes alene, løftes ut og bakes inn i andre ting senere.
Dette er et "body of work" – konsistens og kvalitet er viktigere enn fart.

Eieren er lektor med master i naturfagdidaktikk, ikke utvikler. Forklar tekniske
begreper og forkortelser kort første gang de dukker opp i en økt.

## Pedagogiske prinsipper (viktigst)

1. **Én modell = ett fenomen + én kjent misoppfatning.** Skriv misoppfatningen ned i
   modellens README før du koder.
2. **Forutsi før du prøver.** Hver modell har et steg der eleven gjetter (f.eks. "Hvilken
   smelter først?") før Play er mulig. Gjetningen vises ved siden av resultatet etterpå.
3. **Gjør det usynlige synlig.** Partikler, energi og varmestrøm vises – ikke bare tall.
4. **Begrens kontrollene.** Heller tre glidebrytere som betyr noe enn ti. Skjul avanserte
   valg bak "Mer".
5. **Flere representasjoner samtidig.** Animasjon + graf + tall, synkronisert.
6. **Vær ærlig om modellen.** Hver modell har en synlig "Hva modellen forenkler"-boks.
7. **Forståelig før pent.** Rolig, ren stil. Ingen pynt som stjeler oppmerksomhet.

## Tekniske regler

- **Ren HTML + JavaScript med ES-moduler, ingen build-steg.** (ES-moduler = JS-filer som
  importerer hverandre direkte i nettleseren. Build-steg = et ekstra verktøy som må kjøres
  før siden virker – det vil vi unngå.)
- Nettlesere blokkerer ES-moduler når en fil åpnes direkte fra disken (`file://`). Under
  utvikling kjøres derfor en enkel lokal server (f.eks. `python -m http.server` i
  rotmappa, så `http://localhost:8000`). For deling og innbaking finnes et lite skript,
  `verktoy/lag-enkeltfil.js`, som pakker én modell til én selvstendig HTML-fil som
  virker ved dobbeltklikk og kan legges hvor som helst.
- Tegning med **Canvas 2D**. Ingen tunge biblioteker uten at eieren har godkjent det.
- **Ingen innlogging, ingen sporing, ingen eksterne kall.** Ingen personopplysninger.
  Alt skal virke offline og kunne publiseres som statisk side (f.eks. GitHub Pages).
- Skal kjøre jevnt på en billig Chromebook og iPad. Test med få partikler som standard.
- **Skill fysikk fra visning** (som PhET gjør):
  - `modell.js` – ren fysikk, ingen DOM/canvas. Kan testes i Node.
  - `visning.js` – tegner tilstanden. Inneholder ingen fysikk.
  - `kontroller.js` – knapper og glidebrytere.
- **Fysiske verdier hentes alltid fra `felles/data/materialer.json`.** Ikke finn opp tall.
  Mangler en verdi: si fra, ikke gjett.
- En modell kan bare importere fra sin egen mappe og fra `felles/`. **Aldri fra en annen
  modell.** Da kan den løftes ut alene.
- Hver modell eksponerer tilstanden sin via `felles/js/tilstand.js`
  (`hentTilstand()`, `settTilstand()`, hendelser via `postMessage`), slik at en sokratisk
  KI-tutor senere kan lese hva eleven gjør. Hold dette enkelt.
- Tilgjengelighet: tastaturstyring, fargeblind-vennlige farger, tekstbeskrivelse av hva
  som skjer (for skjermleser).

## Språk og navn

- Alt eleven ser: **bokmål**, kort og presist, tilpasset 13–16 år.
- Mappe- og filnavn: norsk, små bokstaver, bindestrek, uten æøå (`overflate-og-volum`).
- Kode (variabler, funksjoner): engelsk eller norsk, men konsekvent innen en modell.
- Kommentarer i fysikkoden forklarer *hvorfor*, på norsk.

## Mappestruktur

```
Naturfagsmodeller/
├── AGENTS.md               ← denne fila
├── README.md               ← oversikt for mennesker
├── index.html              ← katalog over alle modeller
├── felles/
│   ├── stil.css            ← felles utseende (farger, typografi, knapper)
│   ├── js/
│   │   ├── partikler.js    ← tegning av vibrerende partikler
│   │   ├── graf.js         ← enkel sanntidsgraf
│   │   ├── forutsi.js      ← "gjett først"-komponent
│   │   └── tilstand.js     ← tilstand ut/inn for KI-tutor
│   └── data/
│       └── materialer.json ← materialverdier med kilder
├── modeller/
│   └── <modellnavn>/
│       ├── index.html
│       ├── modell.js
│       ├── visning.js
│       ├── kontroller.js
│       ├── README.md       ← lærerveiledning (se under)
│       └── tester/
│           └── fysikk.test.js
├── maler/ny-modell/        ← kopieres når en ny modell startes
├── verktoy/
│   └── lag-enkeltfil.js    ← pakker en modell til én HTML-fil
├── eksport/                ← ferdige enkeltfiler (genereres, ikke rediger for hånd)
└── docs/
    └── designprinsipper.md
```

Modellens README skal alltid ha: fenomen, misoppfatning, kompetansemål (LK20),
forslag til elevoppgaver (forutsi–observer–forklar), hva modellen forenkler, kilder.

## Validering – kode som kjører er ikke det samme som riktig fysikk

KI-generert simuleringskode kan se perfekt ut og være feil. Derfor:

- **Tekniske tester:** glidebrytere oppdaterer alt, reset virker, ingenting havner utenfor
  lerretet, ingen feil i konsollen.
- **Fysiske tester** i `tester/` (kjøres med `node --test`): sammenlign mot kjente svar.
  Eksempler: energien er bevart i et lukket system; to klosser ender på riktig
  likevektstemperatur; doblet varmeledningsevne gir raskere utjevning; temperaturen står
  stille på 0 °C mens is smelter.
- Bygg **trinnvis**: få kjernen til å virke og bestå testene før visning og ekstra
  funksjoner legges til. Stopp og vis eieren etter hver fase.
- Når du er usikker på fysikken: si det og forklar valget, ikke skjul det.
