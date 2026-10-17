# Naturfagsmodeller

Interaktive modeller for naturfag i norsk skole (ungdomsskole og Vg1). Hver modell tar for
seg ett fenomen og én vanlig misoppfatning. Eleven gjetter først, ser hva som skjer, og
forklarer hvorfor.

Alt er vanlig HTML og JavaScript. Ingenting må installeres eller bygges, det er ingen
innlogging, ingen sporing og ingen kall til nettet.

## Kom i gang

Du trenger [Node.js](https://nodejs.org) (allerede installert på denne maskinen).
Åpne en terminal i denne mappa og skriv:

```bash
node verktoy/server.js
```

Åpne så <http://localhost:8000> i nettleseren. Stopp serveren med `Ctrl+C`.

Kjør de fysiske testene:

```bash
node --test
```

Lag enkeltfiler som kan deles, legges i Teams/Classroom eller åpnes uten internett
(havner i `eksport/`):

```bash
node verktoy/lag-enkeltfil.js
```

Kjør dette på nytt hver gang en modell er endret. Filene i `eksport/` skal ikke
redigeres for hånd.

## Modeller

| Modell | Fenomen | Status |
|---|---|---|
| `modeller/varmeledning-partikler/` | Hvorfor kjennes metall kaldere enn tre? | Klar til elevtesting |
| `modeller/overflate-og-volum/` | Hvorfor smelter snø raskest på kanten? | Klar til elevtesting |

Planen ligger i [`docs/plan.html`](docs/plan.html).

## Mapper

- `felles/` – stil, felles JavaScript og materialverdier (`felles/data/materialer.json`)
- `modeller/` – én mappe per modell, med lærerveiledning i `README.md`
- `maler/ny-modell/` – kopieres når en ny modell startes
- `verktoy/` – lokal server og verktøyet som lager enkeltfiler
- `eksport/` – ferdige enkeltfiler som kan deles (lages av verktøyet)
- `docs/` – plan og designprinsipper

Reglene for hvordan prosjektet bygges står i [`AGENTS.md`](AGENTS.md).
