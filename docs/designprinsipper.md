# Designprinsipper

Kortversjon av hvordan modellene skal se ut og oppføre seg. Reglene står i `AGENTS.md`;
her er det praktiske.

## Sideoppsett
- Scenen (lerretet) til venstre, panelet til høyre. På smal skjerm stables de.
- Panelet har alltid samme rekkefølge: **Gjett først** → kontroller → tall/graf →
  **Hva modellen forenkler**.
- Start-knappen er låst til eleven har låst en gjetning (`felles/js/forutsi.js`).

## Farger
- Alle farger er definert som variabler øverst i `felles/stil.css`.
- Kald/varm vises som **blå/oransje**, ikke rød/grønn, så fargeblinde kan skille dem.
- Temperatur skal aldri bare vises med farge: det står også et tall eller en tekst.

## Tekst
- Bokmål, korte setninger, for 13–16 år.
- Forklar med forhold eleven forstår ("leder ca. 1600 ganger bedre") før enheter.
- Hver modell skriver hva som skjer i en tekstlinje under lerretet. Den leses også av
  skjermleser.

## Bevegelse og ytelse
- Rolig animasjon. Ingen blinking eller pynt.
- Få partikler som standard. Må gå jevnt på en billig Chromebook og en iPad.
- Vis alltid hvor fort tiden går i modellen ("1 s = 10 s simulert") når den ikke er sanntid.
- Bildet beveger seg bare mens modellen går. Før start, i pause og når forsøket er ferdig
  står partiklene helt stille (WCAG 2.2.2). Kontrolleren har en egen klokke for
  partikkelbevegelsen som bare går mens modellen kjører.
- Har brukeren slått på «redusert bevegelse» i maskinen, står partiklene stille hele
  tiden (`felles/js/partikler.js`). Temperaturen vises fortsatt med farger og tall.

## Tastatur
- Alle knapper og glidebrytere er vanlige HTML-elementer, så Tab og piltaster virker.
- Fokus vises med en tydelig gul ramme.
