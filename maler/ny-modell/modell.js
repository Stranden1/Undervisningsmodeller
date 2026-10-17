// MAL: ren fysikk. Ingen DOM, ingen canvas – fila skal kunne testes i Node.
//
// Eksempelet under er bare en plassholder som viser mønsteret:
// en gjenstand som nærmer seg omgivelsenes temperatur. Bytt det ut med modellens
// egen fysikk. Fysiske verdier hentes fra felles/data/materialer.json, ikke herfra.

/**
 * @param {object} innstillinger
 * @param {number} innstillinger.startTemperatur  °C
 * @param {number} innstillinger.omgivelse         °C
 * @param {number} innstillinger.rate              1/s – PLASSHOLDER, ikke en fysisk verdi
 */
export function lagModell({ startTemperatur, omgivelse, rate }) {
  const tilstand = { tid: 0, temperatur: startTemperatur, omgivelse };

  function steg(dt) {
    // Varmestrømmen er proporsjonal med temperaturforskjellen, så forskjellen
    // krymper med samme andel hvert sekund. Eksakt løsning brukes i stedet for
    // T += -rate·(T−T0)·dt, fordi den aldri kan "skyte over" omgivelsene.
    const forskjell = tilstand.temperatur - tilstand.omgivelse;
    tilstand.temperatur = tilstand.omgivelse + forskjell * Math.exp(-rate * dt);
    tilstand.tid += dt;
  }

  function nullstill() {
    tilstand.tid = 0;
    tilstand.temperatur = startTemperatur;
  }

  return { tilstand, steg, nullstill };
}
