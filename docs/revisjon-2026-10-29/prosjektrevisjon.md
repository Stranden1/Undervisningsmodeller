# Revisjon av Undervisningsmodeller

**Dato:** 29. oktober 2026. **Grunnlag:** arbeidsmappen ved Git-revisjon `8958ff8`. Revisjonen endrer ikke eksisterende modeller, felleskode, eksportfiler eller planer. Nye rapporter og prøvingsunderlag ligger ved siden av dem.

## Konklusjon

Prosjektet har en uvanlig god kjerne for et lite undervisningsprosjekt: avgrensede fenomener, eksplisitte misoppfatninger, gjetning før forsøk, fysikk skilt fra tegning, energiregnskap og fungerende deling uten nett. Det er et godt grunnlag for **lærerstøttet utprøving**, men ikke dokumentert som ferdig kvalitetssikret for alle elever og enheter.

De største problemene krever ikke en omskriving. Ett konkret avvik i snømodellens observasjonspause gir eleven en forklaring som ikke passer til de merkede cellene. Energimodellens språk gjør et presist regnskap vanskeligere å forstå. Alle tre har svært liten tekst inne i tegningene på mobil. Klasseromsbruk, skjermlesere og faktisk billig maskinvare er ennå ikke verifisert i denne revisjonen.

**Behold ren HTML, JavaScript-moduler og Canvas 2D.** Prioriter presisjon i det eleven møter, en liten felles standard og dokumentert læringsverdi før flere modeller. Den beste neste investeringen er et godt elevforsøk, ikke et nytt rammeverk.

## Hva som finnes

| Modell | Fenomen og misoppfatning | Relevant målgruppe | Samlet vurdering |
|---|---|---|---|
| Varmeledning med partikler | Berøring av like varme materialer; «metall er kaldere enn tre». Isbitforsøket utfordrer overføring av denne forestillingen. | Primært 8.–10.; deler kan brukes i 5.–7. med lærer | Mest umiddelbart forståelig og mest moden |
| Overflate og volum | Energi kommer inn gjennom tilgjengelige flater; «like mye snø må smelte like fort» | Primært 8.–10.; utvalgte sammenligninger i 5.–7. | God utforsking og sammenligningsgraf; konkret feil i forklaringsløpet med varmt underlag |
| Energi som sprer seg | Energi bevares mens temperaturforskjeller og mulighet for arbeid avtar; «energien er brukt opp» | 10. trinn med støtte; fordypning i videregående | Mest faglig ambisiøs, men størst behov for språklig og didaktisk bearbeiding |

Alle tre ligger i naturfag. Samfunnsfagmappen er en intensjon, ikke en ferdig modell. Malen er et utviklingsutgangspunkt med plassholderfysikk, ikke en fjerde undervisningsressurs. Prosjektet dekker foreløpig én tematisk familie, termiske fenomener, og ikke en bred fagkatalog.

## Undersøkelsesgrunnlag og begrensninger

Kildekode, lærer-README-er, delte hjelpefiler, data, mal, eksportverktøy, lokal server, katalog, tester og plan-/designdokumentasjon er gjennomgått. Tidligere gjennomgang fra 24. oktober er brukt som historikk; rettede problemer er ikke presentert som nye feil.

- `node --test`: **63 tester besto, ingen feilet**, omtrent 45 sekunder på denne maskinen. Dette omfatter også felleskode, mal og eksportverktøy, ikke 63 separate elevsituasjoner.
- Ekte Chrome, versjon **156.0.8078.74**, på Windows: alle tre modeller åpnet og brukt. Playwright er et verktøy som styrer nettleseren for gjentakbare prøver; det er ikke lagt inn som prosjektavhengighet.
- 39 registrerte prøver/målinger i hovedskriptet. At en måling er registrert med `pass`, betyr at skriptet fullførte den; målinger av liten tekst og fortsatt bevegelse er **ikke** godkjenning av tilgjengelighet.
- Skjermflater: 1440×1000, 768×1024, 390×844 og 320×568; tillegg ved 640×480. Nettbrettberøring er emulert i Chrome. Det er ikke en fysisk iPad-test.
- Kontroller, pause, nullstilling, prediksjon, faner, endeverdier og flere fullførte forsøk ble prøvd. Se den presise dekningsmatrisen i [modellgjennomgang.md](modellgjennomgang.md).
- Eksisterende og nygenererte enkeltfiler for alle tre startet via `file://` med nettverket avslått. Eksportene samsvarte med kildekoden når dato og linjeskift ble ignorert.
- Ingen eksterne nettverksforespørsler fra modellene ble registrert. Ingen JavaScript-unntak i de prøvde løpene. Én konsollfeil var en manglende `favicon.ico`, altså det lille nettleserikonet; dette påvirker ikke modellen.
- Uavhengige regnestykker kontrollerte kontakttemperatur, snømengde, energibalanse, likevekt og maksimal arbeidsmulighet. Tall og fremgangsmåte er lagret.

**Ikke utført:** faktisk iPad/Safari, Firefox, fysisk Chromebook, skjermleser som NVDA/VoiceOver, full nettleserzoom-/tekstforstørrelsesrevisjon, projektor i klasserom, systematisk langtids-/minnetest, full romlig konvergensanalyse eller måling av læringsutbytte. «Ingen horisontal rulling ved 320 piksler» er ikke det samme som full WCAG-samsvar. Testnavn om Chromebook måler beregningsarbeid, ikke ytelse på en Chromebook.

[Prøvingsunderlag, skjermbilder og gjentakelse](README.md).

## Arkitekturen: viderefør hovedgrepet

| Del | Styrke | Gjeld og anbefaling |
|---|---|---|
| `modell.js` | Kan kjøres i Node uten nettside; fysiske feil kan testes isolert | Behold. I andre fag betyr dette rene regler/data, ikke nødvendigvis fysikk. Ikke tving alle modeller inn i varmegitteret. |
| `visning.js` | Tegner en tilstand; felles partikkel- og gittertegning gir konsistens | Fast logisk størrelse krympes på smal skjerm. Lag tilpassede oppsett og tekst i HTML rundt tegningen. |
| `kontroller.js` | Tydelig kobling mellom elevhandling, simulering og tekst | Løkker, faner og nullstilling gjentas med små forskjeller. Trekk først ut atferd som er bevist felles, ikke hele modellstyringen. |
| `varmegitter.js` | Energi lagres og føres mellom celler, smelteplatå håndteres; stabilitetsgrense begrenser tidssteg | God spesialisert motor. Bevaring er sterkere validert enn absolutte smeltetider. Dokumenter modellens anvendelsesområde. |
| `forutsi.js` | Tydelig gjetning og resultat side om side; felles pedagogisk grep | Utvid oppgavene med begrunnelse/overføring uten obligatorisk fritekstlagring eller innlogging. |
| `graf.js` | Lett, lokal og gjenbrukbar, linjetyper supplerer farge | Behov for lesbar mobilvisning, HTML-forklaring/tabell og etter hvert andre grafslag. Ikke legg inn et stort diagramverktøy nå. |
| `tilstand.js` | Enkel bro til mulig fremtidig veileder via `postMessage`, meldinger mellom innbakte nettsider | Avklar om `settTilstand` setter inngangsvalg eller gjenoppretter hele forsøket. Dagens utsending og innsetting er ikke et ensartet rundturformat. |
| `data.js` og JSON | Tall er samlet lokalt; offline er enkelt | Kilder er ofte for upresise. Skille målt verdi, typisk verdi og valgt scenario. Eksporten er spesielt tilpasset materialfilen. |
| `lag-enkeltfil.js` | Reell fordel for lærere: en fil kan flyttes og åpnes uten oppsett | Behold og test mot flere lokale datakilder før samfunnsfag introduseres. Støtt et dokumentert, begrenset modulformat. |
| Katalog og dokumentasjon | Oversiktlig ved tre modeller; lærer-README finnes for alle | Samme opplysninger må vedlikeholdes flere steder. Innfør små metadatafiler før katalogen blir stor. Behold historiske planer som historikk. |
| Ny-modell-malen | God mappeinndeling og teststart | Henger etter praksisen i ferdige modeller. Endring av temperatur under kjøring nullstiller fysikken, men lar gjetning/kjøring stå. Rett før kopiering. |

Ingen tunge eksterne kjøreavhengigheter eller nødvendige byggesteg er funnet. Modellenes importgrenser støtter selvstendig uttrekk. Dette er en verdifull egenskap, ikke midlertidig teknisk fattigdom.

### En liten struktur som tåler vekst

Foreslått `metadata.json` per modell: stabil ID, tittel, fag, primær alder, anbefalte forkunnskaper, én hovedmisoppfatning, støttede språk, læreplankode og lenke til aktuelt mål, modellversjon, dataversjon, status og sist faglig gjennomgått. Mål må beskrives som **bidrag til**, ikke «oppfylt kompetansemål». Ikke sett elevens vanskelighetsgrad automatisk etter alder.

Bruk metadata til katalogkontroll og oversikt. En enkel lokal kontrollkommando kan finne duplikate ID-er, manglende README-er, kilder og feil importgrenser. Selve modellene skal fortsatt virke uten å bygge noe først.

Avklar en liten tilstandskontrakt: `schemaVersion`, `modelId`, `inputs`, `prediction`, `runStatus`, `observations`. Innganger valideres. Full lagring/gjenoppretting av et varmegitter er et annet behov og bør vente. Meldinger skal ved innbaking knyttes til forventet forelder/opprinnelse. Dagens åpne `postMessage` er et begrenset integrasjonsproblem, ikke dokumentasjon på lekkasje av personopplysninger.

### Del det som faktisk er felles

Først: start/pause/nullstill, pedagogisk status, tydelig fart, tallformatering, tekstalternativ, prediksjon og tilgjengelige kontrollmønstre. Deretter ved dokumentert behov: diskrete objekter, tilfeldig trekking med gjentakbar start og kategorigraf. En ny felles funksjon bør ha minst to reelle brukere. Ikke lag en universell «modellbygger» før man kjenner modelltypene.

Designstandarden kan være én side med regler og eksempler: farge + linjemønster, typografi, aktive/inaktive knapper, luft, fokusmarkering, figurforklaringer, kort oppgavetekst og scenestørrelser. Et nytt designsystem som eget programvareprosjekt er unødvendig.

### Canvas, HTML, SVG og WebGL

| Teknologi | Anbefalt bruk |
|---|---|
| Canvas 2D – tegning på én bildeflate | Behold for gitter, partikler og mange objekter. Hjelpetekst og betjening må ligge i tilgjengelig HTML. |
| HTML/CSS – nettsidens ordinære struktur og stil | Førstevalg for knapper, tall, brøksymboler, tekstkort, tabeller, setningsbygging og forklaringer. Gir god tastatur- og tekstforstørrelsesstøtte. |
| SVG – vektortegning med individuelle elementer | Kan være nyttig for få geometriske objekter, piler og valgbar grafikk. Vurder først ved en konkret modell; gjeldende prosjektregel er Canvas 2D. Ingen generell konvertering anbefales. |
| WebGL – grafikk på grafikkprosessoren | Ingen påvist nødvendighet. 3D, store partikkelsystemer og tilhørende feilsøking vil øke kostnaden uten tydelig gevinst nå. |

Skarp tegning på høyoppløselige skjermer er allerede håndtert. Det løser ikke liten skrift når hele scenen krympes. På svak maskinvare bør man begrense beregningsarbeid per bilde og la simulasjonstid følge faktisk utførte steg, slik mye av dagens kode gjør. Pause bør også stoppe unødvendig tegning, og skjulte faner bør ha én felles policy.

## Prioriterte svakheter

P1 = før bred elevutprøving av berørt funksjon. P2 = før samlingen utvides vesentlig. P3 = senere forbedring. Ingen feil er vurdert som akutt sikkerhetskritisk.

| ID | Prioritet | Funn | Konsekvens og tiltak |
|---|---|---|---|
| F01 | P1 | Snø: varmt underlag utløser hjørnepause mens merket hjørne fortsatt er under 0 °C | Rett koblingen mellom celle, stopp og forklaring. Se reproduksjon i modellrapporten. |
| F02 | P1 | Energi: «all varmen er i klossen» og «varme i karet» | Presiser indre energi over valgt startnivå; skill energi, temperatur og varmeoverføring. Behold korrekt regnskap. |
| F03 | P1 | Tegning og graf blir meget små på mobil | Lag responsivt sceneoppsett og lesbare HTML-etiketter. Ingen automatisk godkjenning bare fordi siden passer i bredden. |
| F04 | P1 | Partikler beveger seg før start og i pause; redusert bevegelse gir bare lavere fart | Gi en full stoppmulighet og reell kontroll over bevegelse. Kontroller WCAG 2.2.2. |
| F05 | P2 | Flere datakilder er bare «standard tabellverdi» eller ufullstendig artikkelhenvisning | Fullfør kildekjeden, gyldighetsområde og usikkerhet. Ikke erstatt typiske verdier med falsk presisjon. |
| F06 | P2 | Malen bevarer kjøring/gjetning når fysikken nullstilles av glider | Rett malen og verifiser et nytt minimalt prosjekt før flere modeller kopieres. |
| F07 | P2 | Tilstand, fanebytte og historikk har ulike betydninger mellom modeller | Avklar kontrakt og elevforventning. «Tøm graf» tømmer synlig graf, ikke snømodellens utsendte kjørehistorikk. |
| F08 | P2 | Automatisk faglig testing er bedre utviklet enn testing av elevens forklaring | Legg til få men meningsfulle nettlesertester av observasjon–resultat–tekst, særlig alternative varmekilder. |
| F09 | P2 | Ingen dokumentert klasseromsvalidering i revisjonens underlag | Samle elevforklaringer før/etter, overføringsoppgave og observasjon av betjening. Se fase E. |
| F10 | P3 | Ingen tydelig lisensfil funnet i prosjektet | Eieren bør velge vilkår for kode og undervisningsinnhold før andre oppfordres til gjenbruk. Ikke velg på eierens vegne. |

## Pedagogisk retning og alder

Behold forutsi–observer–forklar, men bruk en gjetning som starten på en samtale. Flervalget alene viser ikke hvorfor eleven tror noe. Legg til ett kort muntlig/parvis spørsmål før kjøring og én overføringsoppgave etterpå. Unngå poeng for «riktig gjetning»; feil forventning er ofte en faglig mulighet.

Ikke bygg tre obligatoriske moduser i alle modeller. Velg én primær målgruppe og eventuelt ett fordypningslag under «Mer». Oppgavekort kan differensiere spørsmål uten å skape tre forskjellige fysikkmotorer.

| Nivå | Egnet utforming | Unngå |
|---|---|---|
| 1.–4. | Felles tavle/pardemonstrasjon, få ord, store objekter, telle/flytte/bytte, kobling til virkelige klosser | Samme termiske fagside med teksten bare forkortet; obligatorisk individuell skjermøkt |
| 5.–7. | Ett forsøk, forklaring i hverdagsspråk, brøk/tallinje eller enkel graf når det hjelper | Mange samtidige kurver og ubeskrevne enheter |
| 8.–10. | Kontrollert variasjon, figur + graf + tall, tydelige modellgrenser og fagbegreper | «Se hva som skjer» uten spørsmål eller sammenligningsgrunnlag |
| Videregående | Validering, formler, usikkerhet, sammenligning av modellantakelser | Å anta at flere kontroller automatisk gir mer faglig dybde |

Gjeldende [naturfagplan NAT01-05](https://www.udir.no/lk20/nat01-05/gyldighet-og-innfoering) trådte i kraft 1.8.2026. Udir presiserer særskilt varsom digital bruk på 1.–4. trinn; det taler for korte, målrettede aktiviteter sammen med fysisk arbeid. Se [Udirs oppdaterte råd](https://www.udir.no/kvalitet-og-kompetanse/digitalisering-skole/rad-for-god-digital-praksis-og-skjermbruk-i-skolen/). Alle alderstilpasninger i idébanken er anbefalinger, ikke påstander om validert effekt.

Bokmål bør fortsatt være ferdig standard først. Når én modell skal på nynorsk: flytt elevtekster til lokale språkfiler med stabile nøkler, bruk samme fysikk, sett riktig `lang`, og få en faglig språklesing. Unngå automatisk oversettelse ved kjøring og nettavhengighet. Lærer-README og enkeltfil må følge valgt språk. Ikke bygg et stort oversettelsessystem før denne piloten.

## Første fem forbedringer og fem nye modeller

1. Rett F01 med en prøve som sammenholder merket celle, temperatur og fasit.
2. Revider energispråk og systemgrense (F02), med før/etter-forklaring for elever.
3. Gjør scenene og grafene lesbare på smale skjermer (F03).
4. Innfør full bevegelsespause og kontroller tilgjengelighet (F04).
5. Gjør material- og antakelseskildene etterprøvbare, og knytt dem til valideringsprøver (F05).

Deretter anbefales **Brøk – samme helhet**, **Ti enere blir én tier**, **Tilfeldig betyr ikke jevnt**, **Masse som ikke forsvinner** og **Algoritmen velger utsnittet**. De to første gir en avgrenset prøve på barneskolebruk; de tre neste utvider til stokastikk, kjemi og samfunnsfag. [Idébanken](idebank.md) viser poeng, begrunnelser og fem konkrete konsepter. [Veikartet](utviklingsplan.md) angir rekkefølge og stoppkriterier.

## Ambisjon og hva som bør vente

Ambisjonen bør være en liten, pålitelig norsk samling der hvert fenomen er faglig kontrollert, prøvd med elever, tilgjengelig og lett å ta med seg. En modell er verdifull når eleven kan forklare en ny situasjon etterpå, ikke når den har mange valg.

Ikke bruk den nærmeste tiden på universell modellbygger, KI-tutor, innlogging, læringsanalyse, skytjenester, spillpoeng, tredimensjonal grafikk, et stort rammeverk eller parallell produksjon av 20 modeller. Ikke bygg en norsk kopi av alt PhET allerede gjør. Prosjektets særpreg kan være presise norske misoppfatninger, korte undervisningsløp, åpen modellkritikk og enkel offline deling.
