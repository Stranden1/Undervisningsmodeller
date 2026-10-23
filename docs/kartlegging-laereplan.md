# Kartlegging: læreplan, læreverk og hull

Skrevet 18. oktober 2026. Grunnlag: læreplanen i naturfag (NAT01-05, gjelder fra
1.8.2026), åpne sider fra forlagene, NDLA, viten.no og PhET.

**Kort fortalt**

1. Læreverkene og NDLA bruker mest **film, animasjon og læringsstier**. De viser det
   riktige svaret. Nesten ingen lar eleven **gjette først** og deretter se gjetningen sin
   bli utfordret. Det er vår nisje.
2. Det største hullet er der begrepet er **usynlig og har en seiglivet misoppfatning**,
   men ingen god norsk simulering finnes: hvor massen i et tre kommer fra, at masse
   "forsvinner" når noe brenner, og at energi "brukes opp".
3. To kompetansemål blir nesten aldri møtt med modeller: **"gjøre rede for modellenes
   styrker og begrensninger"** og **"bruke programmering til å utforske"**. Begge kan vi
   bygge inn i alle modellene, ikke bare én.
4. "Håndholding" passer godt med det vi har: en modell kan få **oppgavekort** som låser
   og åpner kontroller trinnvis. `tilstand.js` gjør jobben nesten alene.

Forbehold: Det meste av innholdet hos Gyldendal, Cappelen Damm og Aschehoug ligger bak
lisens. Jeg har bare sett det forlagene beskriver offentlig. Du som har lisenser, bør
sjekke punktene under "Hva læreverkene gjør" mot det du faktisk ser.

---

## 1. Kompetansemålene – hvor gir en modell mest?

En modell gjør mest nytte der fenomenet er **usynlig, for raskt/sakte, for lite/stort**,
og der elevene har en **kjent misoppfatning**. Tabellen sorterer målene etter det.

### Etter 10. trinn

| Kompetansemål (forkortet) | Det usynlige | Kjent misoppfatning | Modellidé | Verdi |
|---|---|---|---|---|
| Energibevaring og energikvalitet | Energi sprer seg ut som varme | "Energi brukes opp" | **Energi som sprer seg** – ball som spretter, lampe, bremsing. Bruker varmemotoren vår | ★★★ |
| Fotosyntese, celleånding, karbonkretsløp | CO₂ fra lufta blir til tremasse | "Treet får massen fra jorda" (van Helmont) | **Hvor kommer treet fra?** Følg karbonatomer fra lufta inn i treet og ut igjen | ★★★ |
| Kjemiske reaksjoner, massebevaring, forbrenning | Gass som dannes og forsvinner | "Ved blir borte når den brenner" / "stålull blir lettere" | **Vekta under bålet** – lukket og åpent system, atomer telles | ★★★ |
| Drivhuseffekten | Infrarød stråling | "Ozonhullet gir global oppvarming" / "varmen spretter av CO₂" | **Strålingsbalanse** – sollys inn, IR ut, CO₂ tar opp og sender ut igjen | ★★ (PhET har en) |
| Celler, oppbygning og funksjon | Forhold mellom overflate og volum | "Store celler er bedre" | **Gjenbruk** av overflate-og-volum-modellen: hvorfor celler er små | ★★ (nesten ferdig) |
| Abiotiske/biotiske faktorer, energi og materie i økosystem | Energi forsvinner i hvert ledd | "Energi går i kretsløp som materie" | **Energipyramide vs. stoffkretsløp** side om side | ★★ |
| Atommodeller og periodesystemet | Elektroner, skall | "Atomer er små kuler med farge" | NDLA og PhET dekker "bygg et atom" godt | ★ |
| Evolusjonsteorien | Variasjon og utvalg over mange generasjoner | "Dyr tilpasser seg fordi de trenger det" | PhET *Naturleg utval* finnes på norsk | ★ |
| Platetektonikk | Svært sakte prosess | "Kontinentene flyter på flytende magma" | viten.no har læringssti | ★ |
| Nervesystem/hormonsystem, immunforsvar og vaksiner | Celler og signalstoffer | "Vaksinen er en mild sykdom" | viten.no har *Virus og vaksine* med modeller | ★ |
| Sender og mottaker, programmering | – | – | Se avsnitt 3 | – |

### Vg1 studieforberedende

| Kompetansemål (forkortet) | Det usynlige | Kjent misoppfatning | Modellidé | Verdi |
|---|---|---|---|---|
| Elektromagnetisk og ioniserende stråling | Fotonenergi, ionisering | "All stråling er radioaktiv og farlig" / "mobilen gir kreft som røntgen" | **Hvilken stråling kan rive løs et elektron?** Frekvens vs. intensitet | ★★★ |
| Bølgefenomener | Energi flytter seg, ikke stoffet | "Bølgen frakter vannet med seg" | **Kork på bølger** – partikler beveger seg opp og ned | ★★ |
| Kjemiske bindinger og egenskaper | Krefter mellom partikler | "Bindinger brytes når noe koker" (vann → H₂ + O) | **Koking vs. spalting** – krefter mellom og i molekyler | ★★★ |
| Miljøgifter i næringskjeder | Konsentrasjon øker oppover | "Mest gift der det er mest utslipp" | **Kvikksølv i fjorden** – opphopning ledd for ledd (norsk kontekst) | ★★ |
| Big bang | Rommet utvider seg | "Big bang var en eksplosjon i rommet" | Ballong-/rosinbolle-modell | ★ |
| DNA og arv, bioteknologi | – | – | Dekket av viten.no (*Gentesting*, *Proteiner*) | ★ |

★★★ = stort hull, sterk misoppfatning, passer vår måte å jobbe på.
★ = godt dekket andre steder, lav prioritet.

---

## 2. Hva læreverkene og nettstedene gjør

| Kilde | Hva de tilbyr (åpent beskrevet) | Typisk form |
|---|---|---|
| **Gyldendal – Element** (8–10) | Grunnbøker, Smart Bok, Fagrom, Skolestudio | Digital bok, oppgaver. Simuleringer nevnes ikke |
| **Cappelen Damm – Naturfag 8–10** | Mest brukte på ungdomstrinnet. Ny utgave av 8 og 9 fra skolestart 2026. "Skolen" har læringsstier med film, podkast, spill og oppgaver | Film og læringsstier. Vekt på dybdelæring og forsøk |
| **Cappelen Damm – Kosmos** (Vg1) | Gratis elevnettsted med læringsstier. Filmer og animasjoner i betalt Pluss-lisens | Kort teori + animasjon |
| **Aschehoug – Aunivers / Lokus123** | Fant ikke et eget naturfagverk for 8–10. Lokus123 har naturfagsider | Plattform med ferdige opplegg |
| **NDLA** (Vg1) | Interaktivt: *Bygg eit atom*, *Ionebinding*, *Periodesystemet*, *Surare hav*, *Fordøyinga*. E-forelesninger. Animasjonsfilmer fra FuseSchool | Film + enkle interaktive oppgaver |
| **viten.no** (Naturfagsenteret) | 13 læringsstier, bl.a. *Celler*, *Fotosyntese, celleånding og karbonkretsløp*, *Virus og vaksine*, *Platetektonikk*, *Radioaktivitet* | Forskningsbaserte læringsstier, noen med elevmodeller |
| **PhET** (norsk oversettelse støttet av NDLA) | Mange simuleringer: tilstandsformer, drivhuseffekt, naturlig utvalg, bølger, bygg et atom | Fri utforsking. Lite styring, ingen "gjett først" innebygd |

**Mønsteret:** Forlagene satser på tekst, film og læringsstier. Den interaktive biten er
for det meste PhET (fri utforsking) eller små NDLA-oppgaver (dra og slipp, quiz).
Det som mangler, er modeller som:

- er bygd rundt **én bestemt misoppfatning**,
- tvinger fram en **gjetning** før eleven får se,
- viser **flere representasjoner samtidig** (partikler + graf + tall),
- er **ærlige om hva de forenkler**,
- og bruker **norske hverdagsfenomener** (snø, is på bilruta, vedovn, vannkraft, fjord).

---

## 3. Nye vinkler

### a) Modellkompetanse som eget lag i alle modeller
Målet "gjøre rede for modellenes styrker og begrensninger" (10. trinn) og "drøfte hvordan
modeller bidrar til at vi kan forstå verden" (Vg1) står i læreplanen, men læreverkene
behandler det som tekst. Vi kan gjøre det **konkret**:

- **Slå forenklinger av og på.** F.eks. "La smeltevannet bli liggende" i isbit-modellen.
  Eleven ser hvor mye svaret endrer seg.
- **Modell mot forsøk.** Hver modell får et forslag til et enkelt forsøk med samme oppsett
  (isbit på aluminium og tre er et klassisk). Eleven legger inn sine målinger, og grafen
  viser modell og virkelighet sammen. Avviket er utgangspunkt for samtale.

### b) "Se regelen" – en dør inn til programmeringsmålene
10. trinn: "bruke programmering til å utforske naturfaglige fenomener". Vg1: "vurdere og
lage programmer som modellerer naturfaglige fenomener". Fordi fysikken vår ligger i en
egen fil (`modell.js`), kan vi vise **regelen modellen følger** i klartekst, f.eks.
*"Hver celle gir fra seg varme til naboen: varme = ledningsevne × temperaturforskjell"*.
Et "Mer"-valg kan la eleven endre ett tall eller én regel og se følgene. Ingen andre
norske ressurser jeg fant, gjør dette.

### c) Samisk kunnskap koblet til en modell
Målet om samers tradisjonelle kunnskap om naturen er vanskelig å finne gode opplegg til.
Snø har mange samiske begreper som beskriver hvordan snøen er pakket og lagdelt, og hvor
mye den isolerer. Det knytter seg direkte til overflate-og-volum-modellen og varmemotoren
(nysnø vs. pakket snø isolerer ulikt). Dette bør gjøres i samarbeid med samiske kilder,
ikke gjettes.

### d) Én motor, mange fenomener
Varmemotoren kan bære flere modeller med lite ekstra arbeid: energikvalitet, isolasjon av
hus (energibruk og miljø), hvorfor celler er små, termos/svettetøy. Det gir konsistens.

---

## 4. Håndholding: fra styrt til fri

Du beskriver et verktøy du kan bruke selv, med håndholding først og fri flyt senere.
Et forslag som passer arkitekturen vi allerede har:

**Tre trinn i hver modell**

1. **Guidet.** Ett oppgavekort om gangen. Bare kontrollene som trengs, er åpne. Eleven må
   gjette før Start. Kortet stiller ett "Hvorfor?"-spørsmål etterpå.
2. **Delvis åpen.** Eleven får et mål ("Få isbiten til å smelte på under 5 minutter") og
   flere kontroller, men ikke alle.
3. **Fri.** Alt er åpent, inkludert "Mer" og "Se regelen".

**Hvordan det kobles til oppgaver**

- Hver modell får en liten fil med oppgavekort (scenario + spørsmål + hvilke kontroller
  som er åpne). Den ligger i modellens egen mappe, så modellen kan fortsatt løftes ut.
- En lenke kan peke rett på et kort, f.eks. `.../varmeledning-partikler/?oppgave=2`.
  Da kan du lime lenken inn i en oppgave i Teams, OneNote eller læringsplattformen.
- `tilstand.js` brukes til å **sette** modellen i startoppsettet for kortet
  (`settTilstand`) og **lese** hva eleven gjorde (`hentTilstand`). Det er samme grensesnitt
  en KI-tutor senere skal bruke, så vi bygger ikke noe to ganger.
- Ingen innlogging og ingen lagring på server. Elevens svar kan vises på skjermen og
  kopieres, eller lagres lokalt i nettleseren.

Dette er et forslag. Det bør prøves på én modell før det blir en fast del av malen.

---

## 5. Forslag til rekkefølge

1. **Energi som sprer seg** (energikvalitet) – gjenbruker varmemotoren, stort hull,
   sterk misoppfatning, kjernemål på 10. trinn.
2. **Oppgavekort med håndholding** i en eksisterende modell – prøver ut idéen før den
   kopieres til alle.
3. **Hvor kommer treet fra?** (fotosyntese og karbon) – sterkeste misoppfatning i biologi,
   lite dekket som modell.
4. **Vekta under bålet** (massebevaring ved forbrenning) – kjemi, enkelt å koble til et
   elevforsøk.
5. **Hvilken stråling kan rive løs et elektron?** (Vg1) – aktuelt, mye feilinformasjon,
   kobler til kildekritikk-målet.

Åpne spørsmål til deg:
- Skal Vg1 vente til ungdomstrinnet er godt dekket, eller vil du ha én Vg1-modell tidlig?
- Hvilke læringsplattformer bruker skolen din (Teams, Showbie, itslearning …)? Det
  påvirker hvordan oppgavelenkene bør se ut.
- Har du tilgang til de lisensierte læreverkene, slik at du kan se om de har simuleringer
  jeg ikke fant?

---

## Kilder

- Udir: [Naturfag NAT01-05, kompetansemål etter 10. trinn](https://www.udir.no/lk20/nat01-05/kompetansemaal-og-vurdering/kv1078)
- Udir: [Naturfag NAT01-05, kompetansemål etter Vg1 studieforberedende](https://www.udir.no/lk20/nat01-05/kompetansemaal-og-vurdering/kv1079)
- Gyldendal: [Naturfag for ungdomstrinnet (Element)](https://www.gyldendal.no/ungdomsskole/naturfag)
- Cappelen Damm: [Naturfag 8–10 fra Cappelen Damm](https://cappelendamm.no/verk/naturfag-8-10-fra-cappelen-damm-153458)
- Cappelen Damm: [Kosmos elev- og lærernettsted (LK20)](https://www.cappelendamm.no/verk/kosmos-elev--og-larernettsted-naturfag-lk20-149044)
- Bærum kommune: [Om Aschehoug univers](https://www.baerum.kommune.no/tjenester/skole/digitale-laremidler/aschehoug-univers/)
- NDLA: [Naturfag (SF)](https://ndla.no/nn/f/naturfag-sf/e36b0e533c38)
- Naturfagsenteret: [viten.no](https://www.viten.no/)
- PhET: [norske simuleringer](https://phet.colorado.edu/nn/)
- Realfagsløyper: [Modul 2N – Digitale ressurser for dybdelæring i naturfag](https://realfagsloyper.no/ungdomstrinn/djupnelaering/modul-2n-digitale-ressurser-dybdelaering-i-naturfag) (fikk ikke åpnet siden)
- UiO/ARK&APP: [Læremidler og arbeidsformer i naturfag i ungdomsskolen](https://www.uv.uio.no/iped/forskning/prosjekter/ark-app/publikasjoner/downloads/rapport_5_naturfag_5_12_ferdig.pdf)
- Misoppfatningene i tabellene er godt kjente i naturfagdidaktisk forskning (bl.a. Driver
  mfl., *Making Sense of Secondary Science*). De bør sjekkes mot kilden før de skrives
  inn i en modells README.
