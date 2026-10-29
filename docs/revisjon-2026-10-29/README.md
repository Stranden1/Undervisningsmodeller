# Underlag for revisjon 29. oktober 2026

Dette er revisjonsfiler, ikke endringer i modellene. Codex laget dem 29.10.2026 ut fra Git `8958ff8`. Rapportene ligger i denne mappa: [prosjektrevisjon](prosjektrevisjon.md), [modellgjennomgang](modellgjennomgang.md), [inspirasjon og research](inspirasjon-og-research.md), [idébank](idebank.md) og [utviklingsplan](utviklingsplan.md).

**Status:** Funnene er vurdert av eieren og Claude 29.10.2026. Utviklingsplanen og idébanken er forslag, ikke vedtatt retning. Særlig er utvidelse til barneskolen og nye fag (brøk, tiere, norsk, KRLE) ikke bestemt. Prosjektets ramme står i `AGENTS.md`. Rettet etter revisjonen: F01 (commit `2a8e01e`).

## Miljø og kjøringer

- Kildegrunnlag: Git `8958ff8`, Windows, Node 24.12.0, Chrome 156.0.8078.74.
- `node --test`: 63 bestått, 0 feil, omtrent 45,05 s. Dette er oppsummering av observert terminalresultat; full opprinnelig testutskrift er ikke lagret her.
- Lokal server: `node verktoy/server.js`, `http://127.0.0.1:8000`.
- [nettleserproving.mjs](nettleserproving.mjs) og [resultater](nettleserresultater.json): 39 registrerte prøver/målinger, inkludert offline eksport og emulert berøring.
- [tillegg-nettleser.mjs](tillegg-nettleser.mjs) og [resultater](tillegg-nettleser.json): redusert bevegelse før innlasting, fokusrekkefølge, 640-pikslers oppsett, malens glider og første smelting i isbitforsøket. Første forsøk brukte feil fanenavn i testskriptet; dette ble rettet og skriptet kjørt ferdig.
- [kontrollberegninger.mjs](kontrollberegninger.mjs) og [resultater](kontrollberegninger.json): selvstendige regnestykker og fysisk reproduksjon av snøfunn.

`pass` i nettleserloggen betyr at den aktuelle kjøringen/målingen fullførte uten å bryte skriptets påstander. Det betyr ikke at alle målte egenskaper er gode: fortsatt partikkelbevegelse og svært små tegninger er registrerte funn. Rapportene tolker disse eksplisitt.

## Gjenta prøvene

Fra rotmappen:

```powershell
node --test
node docs/revisjon-2026-10-29/kontrollberegninger.mjs
```

For nettleserprøvene må lokal server være startet i en annen terminal. Skriptene bruker en allerede installert Playwright, angitt som argument; de installerer ingenting og endrer ikke prosjektets avhengigheter:

```powershell
node docs/revisjon-2026-10-29/nettleserproving.mjs '<absolutt-sti-til-playwright/index.mjs>'
node docs/revisjon-2026-10-29/tillegg-nettleser.mjs '<absolutt-sti-til-playwright/index.mjs>'
```

Chrome må være tilgjengelig. Revisjonen brukte Playwright fra den lokale, ferdig installerte arbeidsruntime. Skriptene er øyeblikksbilder av denne revisjonen; UI-endringer kan kreve nye selektorer og forventninger. De opprinnelige filene i `eksport/` er ikke endret. Prøvekopiene skriptet laget i `enkeltfiler/`, er slettet etterpå fordi de ble utdaterte; skriptet lager dem på nytt hvis det kjøres.

## Skjermbilder

| Modell | Stor skjerm | Nettbrett | Mobil | Smal mobil |
|---|---|---|---|---|
| Varmeledning | [1440×1000](varmeledning-partikler-desktop.png) | [768×1024](varmeledning-partikler-nettbrett.png) | [390×844](varmeledning-partikler-mobil.png) | [320×568](varmeledning-partikler-smal.png) |
| Snø | [1440×1000](overflate-og-volum-desktop.png) | [768×1024](overflate-og-volum-nettbrett.png) | [390×844](overflate-og-volum-mobil.png) | [320×568](overflate-og-volum-smal.png) |
| Energi | [1440×1000](energi-som-sprer-seg-desktop.png) | [768×1024](energi-som-sprer-seg-nettbrett.png) | [390×844](energi-som-sprer-seg-mobil.png) | [320×568](energi-som-sprer-seg-smal.png) |

Sentrale handlingsløp: [varmeledning ferdig](varmeledning-resultat.png), [is underveis](isbit-underveis.png), [første is smeltet](isbit-forst-smeltet.png), [snøens luftpause](sno-observasjonspause.png), [feiltilfelle med varmt underlag](sno-underlag-pause.png), [64 biter ferdig](sno-64-ferdig.png), [sammenligningsgraf](sno-sammenligning.png), [energi ved likevekt](energi-kloss-ferdig.png), [strøm avslått](dyppekoker-strom-av.png).

## Avgrensning

Ingen fysisk iPad, Chromebook, skjermleser eller projektor er prøvd. Ingen elevforsøk ble gjennomført. Nettbrett/mobil er vindusstørrelser og berøringsemulering i ekte Chrome på Windows. Det er ikke en komplett WCAG-revisjon eller validering av alle fysiske tidsskalaer. Modellenes åpne begrensninger og de utestede tilfellene står i modellrapporten.
