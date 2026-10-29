# Utviklingsplan etter revisjonen

**29.10.2026. Status: anbefalt plan, ikke igangsatt implementering.** Se [prosjektrevisjonen](prosjektrevisjon.md), [modellfunnene](modellgjennomgang.md), [researchgrunnlaget](inspirasjon-og-research.md) og [idébanken](idebank.md).

## Retning og arbeidsmåte

Gjør de tre eksisterende modellene til en pålitelig liten samling før bredden økes. Behold dagens tekniske hovedstruktur og offline deling. Lag deretter én ny modell om gangen, med en tidlig barneskolepilot og en avgrenset samfunnsfaglig modell.

Arbeidsformen følger prosjektets trinnvise utvikling: (1) fenomen, misoppfatning, avgrensning og kilder; (2) testet faglig kjerne; (3) visning og betjening; (4) elevprøving og revisjon. **Eieren ser og vurderer en konkret leveranse mellom trinnene.** Ingen fase skal erklæres ferdig bare fordi koden kjører.

Prioritet: **P1** før bred utprøving av berørt funksjon; **P2** før videre vekst; **P3** ved dokumentert behov. Ansvar «utvikler» kan være eieren med kodeassistent; «fagleser» betyr en person som faktisk kan vurdere faginnholdet. AI-kontroll alene er ikke uavhengig fagfellevurdering.

## Fase A – Kvalitetssikring

**Mål:** Få det beregnede, synlige og forklarte til å stemme overens. Behold fungerende motor og fornuftige forenklinger.

| Oppgave | Prioritet / ansvar | Begrunnelse | Avhengighet | Ferdig når |
|---|---|---|---|---|
| A1. Rett snømodellens hjørnepause og varmekildeforklaring, F01 | P1, utvikler + eier | En synlig markør viser under null mens forklaringen viser til en annen celle | Velg didaktisk løsning: luftforsøk først eller konsekvent sporing av navngitte celler | Luft, sol, underlag og kombinasjon gir samsvar mellom markør, faktisk temperatur, stopp og forklaring; én målrettet nettleserprøve fanger opprinnelig feil |
| A2. Presiser energi, varme og regnskapsgrense, F02 | P1, eier/fagleser + utvikler | Korrekt matematikk blir misvisende med lagret «varme» og utydelig referansenivå | Avklar formuleringer og hovedmål for 10. trinn | Scene, graf, tall, prediksjon, tekstalternativ og README bruker samme begreper; 10 °C-referansen er forståelig; tenkt arbeid avgrenses til karet |
| A3. Fullfør kildegrunnlaget, F05 | P2, eier/fagleser | «Standard tabellverdi» kan ikke etterprøves | Ingen kodeendring nødvendig for kildekartlegging | Hver empirisk verdi har kilde, enhet, materialevariant, temperatur-/bruksområde og status som typisk/målt/valgt; Marín-henvisningen er avklart |
| A4. Kontroller de viktigste modellantakelsene | P2, fagleser + utvikler | Absolutte tider er svakere validert enn bevaring og rekkefølge | A3 | Kontakttemperatur, energibevaring, smelteplatå og likevekt har uavhengige referanser; minst én begrunnet følsomhetsprøve per fagmotor; tidsprognoser beskrives med riktige forbehold |
| A5. Utvid prøving av forklaring og tilstand | P2, utvikler | Dagens tester overser noen feil mellom fysikk og undervisningsløp | A1–A2 | Start/gjetning, pause, nullstill, valgt yttergrense og resultatekst prøves sammen; testene verifiserer elevsynlig mening, ikke bare at funksjoner blir kalt |
| A6. Oppdater status og eksporter | P2, utvikler + eier | En feil kan ellers leve videre i enkeltfilen | A1–A5 for berørt modell | Oppdatert versjon er pakket; enkeltfil åpner via `file://` uten nett; katalogen beskriver faktisk prøvingsstatus |

**Faseport:** Ingen kjent P1-feil i berørt fagforklaring står åpen. Alle relevante eksisterende tester består. Rapporten skiller fortsatt hva som er kontrollert i kode, i nettleser og mot virkelige forsøk. Eieren godkjenner tekst og didaktisk avgrensning før kosmetisk viderearbeid.

**Størrelsesorden:** 4–7 effektive arbeidsdager, med usikkerhet særlig i kildearbeid og faglesing. Ingen ny konveksjonsmotor, realistisk snømodell eller universell energimotor inngår.

## Fase B – Visuell og pedagogisk forbedring

**Mål:** Elever skal kunne se fenomenet, forstå neste handling og undersøke uten unødige betjeningshindre.

| Oppgave | Prioritet / ansvar | Begrunnelse | Avhengighet | Ferdig når |
|---|---|---|---|---|
| B1. Lag tilpassede sceneoppsett, F03 | P1, utvikler + eier | Dagens sceneetiketter kan bli 5–7 skjermpiksler | A1/A2 bestemmer hvilken informasjon som skal vises | Ved 320/390/768 og stor skjerm er sentrale etiketter ordinær lesbar tekst, ikke krympet bilde; ingen tap av nødvendig informasjon eller overlapping |
| B2. Samle prediksjon og start i tydelig flyt | P1, utvikler | På mobil ligger handlingene langt fra hverandre | B1 | Ny elev finner og bruker lås/start uten instruksjon fra utvikler; tastaturfokus og status etter låsing er synlig og logisk |
| B3. Full pause og redusert bevegelse, F04 | P1, utvikler | Elever kan ikke få et helt stille bilde | Ingen fagmotorendring nødvendig | Pause/valgt stillstand stopper relevant synlig bevegelse; preferanse ved innlasting og endring underveis håndteres; tall/faglig status er fortsatt tilgjengelig |
| B4. Tilgjengelig graf og observasjonstekst | P2, utvikler + brukerprøver | Canvas alene gjør detaljer vanskelig å hente uten syn | A2 og B1 | Sentral utvikling kan leses i tekst/tabell; serier har tekst og mønster; endringer leses ikke opp kontinuerlig; hele prøveoppgaven gjennomføres med tastatur og faktisk skjermleser |
| B5. Én tydelig observasjonsoppgave og én overføringsoppgave per modell | P2, eier | Riktig flervalg er ikke nok til å vise forståelse | A1–A2 | Oppgave og lærerrespons finnes i README; en elev må begrunne og bruke ideen i en ny situasjon |
| B6. Lærer-/projektorprøve | P2, eier/lærer | Stor monitor er ikke bakerste rad | B1–B5 | En faktisk tavle-/projektorøkt viser lesbare hovedtall, piler og kurver; eventuelt enkelt demonstrasjonsvalg begrunnes av prøven |
| B7. Reell enhetsmatrise | P2, utvikler/lærer | Chrome-emulering dekker ikke Safari eller svak maskinvare | B1–B4 | Minst én fysisk iPad/Safari og én rimelig Chromebook er prøvd; nettleserversjon, enhet og avvik er notert; ingen fastlåsing eller merkbar betjeningsforsinkelse i hovedløp |

**Faseport:** Elevene kan starte, observere, stoppe og forklare en valgt sammenheng på målgruppens enheter. Gjennomfør manuell kontroll av relevante WCAG-kriterier; en grønn automatisk rapport er ikke nok. Ønsket ytelse bør konkretiseres på prøveutstyret, eksempelvis respons på pause innen omtrent 0,2 s og stabil lesbar animasjon rundt minst 30 bilder/s i standardløpet. Dette er foreslåtte brukskriterier, ikke en påstand om dagens målte ytelse.

**Størrelsesorden:** 6–10 effektive arbeidsdager pluss tilgang til utstyr og elever. Prioriter lesbarhet og handling før et generelt demonstrasjonsmodus bygges.

## Fase C – Felles struktur

**Mål:** Nye fag skal kunne bruke gode fellesmønstre uten å arve termiske antakelser eller feil i malen.

| Oppgave | Prioritet / ansvar | Begrunnelse | Avhengighet | Ferdig når |
|---|---|---|---|---|
| C1. Oppdater malen, F06 | P2, utvikler | Glideren nullstiller fysikken uten å nullstille kjøring/gjetning | Avklar B2/B3-atferd | Ny startverdi gir en konsistent ny oppgave; malen bruker skarpt canvas, norsk tallformat, eksplisitt fart og gjeldende tilgjengelighetsmønstre |
| C2. Én side med design- og samspillsregler | P2, eier + utvikler | Konsistens skal overleve nye fag | Erfaring fra B | Regler har eksempler for fokus, knapper, graf, tekstalternativ, mobilscene, forklaring og pause; de tre modellene følger dem der det er faglig relevant |
| C3. Små metadatafiler og katalogkontroll | P2, utvikler | Tittel, trinn, mål og status dupliseres | Eier velger felter | Alle modeller har stabil ID, hovedmisoppfatning, målgruppe, kilde-/planlenker og prøvingsstatus; kontroll finner mangler/duplikater; vanlig visning krever fortsatt ikke bygging |
| C4. Definer tilstand og hendelser, F07 | P2, utvikler | `settTilstand` betyr ikke full restaurering i dag | Beslutning om innganger versus lagret forsøk | Versjonert format, validerte innganger og dokumentert nullstilling/fanebytte; innbaking prøves med forventet avsender og uten utilsiktet datadeling |
| C5. Flere lokale datatyper i eksport | P2, utvikler | Samfunnsfag skal ikke være avhengig av `materialer.json` | Første ny datakrevende modell spesifisert | Eksportpakke med en ekstra lokal datafil virker offline; kilder følger med; importer utenfor egen mappe/felles avvises eller fanges i kontroll |
| C6. Bokmål/nynorsk-pilot | P3, eier + språkleser | To komplette kopier av koden blir vanskelig å vedlikeholde | Én moden modell med avklart tekst | Samme modellkjerne bruker lokale språkfiler; `lang`, grafetiketter, opplesning, veiledning og eksport er kontrollert på begge målformer |
| C7. Lisens og enkel versjonering | P2, eier | Uklart grunnlag for andres gjenbruk | Kartlagt eierskap og eksterne kilder | Eier har valgt og dokumentert vilkår; eksport viser modell-/dataversjon og dato; endringer kan spores |

**Faseport:** En liten ny modell kan bygges fra malen, åpnes fra lokal server, eksporteres og prøves uten kopiering av en annen modells fysikk. Ikke bruk dette som begrunnelse for et stort felles rammeverk. C5 og C6 kan vente til den konkrete piloten trenger dem.

**Størrelsesorden:** 4–7 effektive arbeidsdager for C1–C5/C7; nynorskpiloten anslås separat etter tekstmengde. C1 bør gjøres før fase D selv om resten av C går trinnvis.

## Fase D – Nye modeller

**Mål:** Utvide samlingen med fem avgrensede modeller, men bare fortsette i denne rekkefølgen så lenge utprøvingen støtter valget.

| Rekkefølge | Leveranse | Prioritet | Avhengigheter | Ferdigkriterium utover felleskrav |
|---|---|---|---|---|
| D1 | Brøk – samme helhet, 5. trinn | P2, første nye | A/B, C1–C2; M5-kobling og eksakt brøkregning | Eleven skiller nevner fra delstørrelse og kan forklare samme brøk i en ny representasjon; helheten holdes synlig; alle likeverdige visninger stemmer |
| D2 | Ti enere blir én tier, 1.–2. trinn | P2, småskolepilot | D1s erfaring med store objekter, småskolelærer | Bytt/løs opp bevarer total; eleven klarer samme handling med fysiske klosser; aktiviteten fungerer kort på tavle/i par |
| D3 | Tilfeldig betyr ikke jevnt, 5.–9. | P2 | Enkel kategorigraf og etterprøvbar tilfeldig trekking | Ingen kunstig utjevning; korte/lange og flere serier kan sammenlignes; eleven skiller sannsynlighet fra observert frekvens |
| D4 | Masse som ikke forsvinner, 8.–10. | P2 | Kjemifaglig godkjent reaksjon, A3/C5 ved massedata | Atomer bevares, systemgrense er tydelig, gass som går ut er regnet med; eleven forklarer et nytt åpent/lukket forsøk |
| D5 | Algoritmen velger utsnittet, 8.–10. | P2 | Lokale kortdata, samfunnsfagleser, C5 | Kortgrunnlag er konstant ved regelbytte; rangeringsforklaring stemmer; ingen empiriske påstander om virkelige plattformer uten kilde |

**Felles ferdigkrav for hver modell:** README med fenomen, én hovedmisoppfatning, forkunnskaper, konkret læreplanbidrag, oppgaver, begrensninger og kilder; testet regel-/fysikkjerne; synkronisert figur/tall/egnet ekstra representasjon; gjetning før første forsøk; tastatur og tekstalternativ; full pause; offline eksport; dokumentert lærer-/elevprøve og kjente begrensninger.

En graf skal brukes når den bidrar faglig. For setnings- eller etikkmodeller kan parallelle tekster, argumentkart eller tabell være den riktige andre representasjonen. Ikke tving en tidsgraf inn i alle fag.

**Faseport per modell:** Eieren ser først spesifikasjon/papirprototype, så testet kjerne, så grensesnitt. Pilotresultatet avgjør om modellen modnes, innsnevres eller legges bort. Ikke start neste nye kjerne for å slippe å ferdigstille den første.

**Størrelsesorden:** Se separate anslag i [konseptene](idebank.md). Til sammen omtrent 26–43 effektive arbeidsdager for de fem avgrensede prototypene, i tillegg til fellesarbeid og elevrevisjoner. For en lærer som gjør dette ved siden av jobb er det et arbeid over måneder, ikke en troverdig femukersplan. Hvis kapasiteten er liten, velg D1 alene som neste leveranse.

## Fase E – Kvalitet i faktisk undervisning

**Denne fasen begynner etter de første A/B-rettingene og gjentas gjennom D.** Den skal ikke utsettes til alle fem nye modeller er ferdige.

### Et lite, gjennomførbart prøveopplegg

1. **Før prøven:** Velg én misoppfatning og to korte spørsmål: ett nær modellen og ett i en annen situasjon. Skriv hva et godt svar må inneholde. Ikke bruk identisk flervalg alene før og etter.
2. **Betjeningsprøve:** To–tre elevpar i målgruppen prøver uten muntlig forklaring av knappene. Be dem si hva de forsøker å gjøre. Noter hvor de stopper opp, feilaktige tolkninger av figurene og om de finner start/pause.
3. **Faglig prøve:** Bruk modellen i en vanlig undervisningsøkt. Samle en kort førforklaring, elevens observasjon og etterforklaring. Følg opp med overføringsspørsmålet uten modellen.
4. **Sammenligning:** Prøv når mulig samme faglige mål med fysiske materialer eller statiske bilder i en sammenlignbar økt. Vær forsiktig med årsakspåstander fra små grupper, ulike lærere eller ulike forkunnskaper.
5. **Revisjon:** Velg de to viktigste hindringene og rett dem. Gjenta prøven med nye elever eller en ny oppgave, slik at innlært knapperekkefølge ikke forveksles med forståelse.

| Oppgave | Prioritet / ansvar | Avhengighet | Ferdig når |
|---|---|---|---|
| E1. Rubrikk for forklaringer | P2, eier/faglærer | Avklart læringsmål fra A eller D | Tre nivåer har konkrete eksempler: misoppfatning, delvis årsaksforklaring, overført forståelse |
| E2. Betjening og tilgjengelighet med elever | P2, lærer + utvikler | B1–B4 eller tilsvarende ny modell | De viktigste hindringene er dokumentert med handling og konsekvens; ingen kjent hindring blokkerer hovedoppgaven for deltakernes bruksmåter |
| E3. Faglige før-/etter- og overføringsoppgaver | P2, lærer | E1 | Rapport viser faktiske anonymiserte svarmønstre og antall deltakere, ikke bare «elevene likte det» |
| E4. Lærervurdering av økten | P2, lærer | E2/E3 | Notat om forberedelse, tidsbruk, nødvendig støtte, diskusjon og misforståelser; minst én lærer utenfor utviklingsarbeidet har prøvd ressursen |
| E5. Beslutning og publiseringsstatus | P2, eier | E2–E4 | Status settes til utkast / prøvd med lærer / prøvd med elever / revidert; åpne svakheter og riktig målgruppe er synlige |

En enkel rubrikk for varmeledning kan være: **0:** «metall har lavere starttemperatur»; **1:** beskriver at hånden mister energi, men kobler ikke dette til begge klossenes like starttemperatur; **2:** forklarer ulik overføring ved lik starttemperatur og bruker ideen på et materiale som er varmere enn hånden. Tilpass rubrikken faglig før bruk. Tallene er lokale vurderingskategorier, ikke en standardisert testskala.

Bruk anonyme sammenstillinger og frivillige, vanlige klasseaktiviteter innen skolens rutiner. Prosjektet trenger ikke å lagre elevnavn, lydopptak eller handlingslogger på nett. Oppbevar eventuelle elevsvar i skolens godkjente arbeidsflyt; legg bare anonymiserte mønstre i offentlig prosjektdokumentasjon.

**Faseport:** Det finnes konkrete tegn på at elever kan forklare og overføre hovedideen, og ingen systematisk ny misoppfatning fra metaforen står uadressert. Små pilotutvalg gir utviklingskunnskap, ikke bevis på generell effekt. Hvis elevene bare lærer å velge riktig svar i modellen, må oppgaven eller metaforen endres.

## Foreslått nærmeste arbeidsrekkefølge

1. **Første arbeidsbolk:** A1 og A2. Vis eieren korrigert elevløp og målrettede prøver.
2. **Andre bolk:** B1–B3 i én modell først, deretter i de to andre. Gjør A3 parallelt som kildearbeid, uten å endre fysiske verdier uten grunn.
3. **Tredje bolk:** B4/B7 og en liten E-prøve. Revider på bakgrunn av faktisk forståelse og betjening.
4. **Fjerde bolk:** C1–C4/C7 i den størrelsen erfaringene tilsier; velg om D1 eller en ny revisjon av eksisterende modeller gir størst nytte.
5. **Deretter:** D1, kort E-runde, og først så D2. C5 innføres når den første nye datatypen krever den. D3–D5 er en prioritert kø, ikke samtidige prosjekter.

Fasene summeres ikke til et fast kalenderløfte. Møter, kildearbeid, faglig gjennomgang, språk og tilgang til elever/utstyr må planlegges rundt undervisningen. En fornuftig første milepæl er **tre forbedrede modeller og én prøvd ny modell**, ikke å realisere hele idébanken.

## Det som bevisst ikke inngår nå

- Stor omskriving til et rammeverk eller ny byggkjede.
- Innlogging, skydatabase, automatisk elevsporing eller en ferdig KI-tutor.
- Tre komplette vanskelighetsmoduser i alle modeller.
- WebGL/3D, realistisk væskestrøm eller detaljerte vær-/snøprognoser uten eget dokumentert læringsbehov.
- Full katalog på tvers av alle fag før den første modellen utenfor termisk fysikk er prøvd.
- Automatisk «moralsk fasit», politisk fasit eller læringsscore fra samfunns-/etikkmodeller.
- Ekstern kode-/bilderebruk uten konkret lisensavklaring.

Disse valgene kan vurderes senere dersom et dokumentert behov oppstår. Den langsiktige verdien ligger i gode, selvstendige undervisningsmodeller med tydelig faglig ansvar.
