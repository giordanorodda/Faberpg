import type { Phase, Season } from '../core/time';
import type { WeatherKind } from '../core/weather';

export interface AmbientLine {
  text: string;
  phases?: Phase[];
  seasons?: Season[];
  weather?: WeatherKind[];
}

/**
 * Piccole cose che accadono mentre aspetti che un pesce abbocchi (§19).
 * Non premiano niente: servono a far sentire che il mondo c'è.
 */
export const FISHING_AMBIENT: AmbientLine[] = [
  { text: 'Una rana salta in acqua, poco più in là.' },
  { text: 'Il vento passa tra le canne.' },
  { text: 'Un cerchio si allarga sull\'acqua. Non era il tuo galleggiante.' },
  { text: 'Una libellula si posa sulla punta della canna, poi ci ripensa.', seasons: [0, 1], phases: ['morning', 'midday', 'afternoon'] },
  { text: 'Dal paese arriva il rumore di un martello. Ottavio, forse.', phases: ['morning', 'afternoon'] },
  { text: 'Un airone attraversa lo stagno, basso, senza fretta.', phases: ['dawn', 'evening'] },
  { text: 'La nebbia si sfilaccia sull\'acqua.', phases: ['dawn'] },
  { text: 'Le prime stelle si specchiano nello stagno.', phases: ['evening', 'night'], weather: ['clear'] },
  { text: 'Un gufo, nel bosco. Poi un altro, più lontano, che risponde.', phases: ['night'] },
  { text: 'Le rane hanno cominciato a cantare tutte insieme.', phases: ['evening', 'night'], seasons: [0, 1] },
  { text: 'La pioggia fa sull\'acqua mille cerchi piccoli.', weather: ['rain'] },
  { text: 'Le nuvole si muovono; per un momento lo stagno diventa d\'argento.', weather: ['cloudy'] },
  { text: 'Dall\'osteria arriva una risata, attutita dalla distanza.', phases: ['evening'] },
  { text: 'Un pesce salta, lontano, come per farsi vedere.' },
  { text: 'Hai freddo alle mani. Non abbastanza per smettere.', seasons: [2, 3] },
  { text: 'Le foglie gialle galleggiano piano verso la riva.', seasons: [2] },
];

/** Cosa vedi quando esamini le cose (tasto E davanti a un oggetto). Chiave: `edificio:carattere` o `carattere`. */
export const INSPECT: Record<string, string[]> = {
  'player:S': [
    'Sullo scaffale ci sono tre libri di Agnese: un erbario con le pagine gonfie, un almanacco vecchio di vent\'anni, un quaderno di conti.',
    'Al quaderno manca una pagina. È stata strappata con cura, quasi con gentilezza.',
  ],
  'player:F': ['Il focolare. La cenere è vecchia, ma c\'è legna asciutta accanto. Qualcuno l\'ha preparata per te.'],
  'player:h': ['Il tavolo e la sedia di casa. La sedia traballa un poco.'],
  'tavern:S': ['Bottiglie senza etichetta. Martino le riconosce dal colore del tappo.'],
  'tavern:F': ['Il fuoco dell\'osteria non si spegne mai del tutto, nemmeno d\'estate.'],
  'shop:S': ['Barattoli, matasse di filo, candele allineate per altezza.', 'Un cartello scritto a mano: "Si guarda con gli occhi".'],
  'monti:l': ['Il telaio di Clelia. Un tessuto a metà, a righe blu e gialle.'],
  'workshop:h': ['Il banco da lavoro: trucioli, una pialla, una sedia senza schienale che aspetta.'],
  w: ['Il pozzo. In fondo, un cerchio di cielo.', 'Se ti sporgi, il cerchio ti restituisce la faccia.'],
  n: ['Una panca di legno consumato. Qualcuno ci ha inciso due iniziali, poi le ha raschiate via.'],
  k: ['Una botte. Suona piena.'],
  F: ['Un focolare. Odore di fumo e di pane.'],
  S: ['Uno scaffale. Non è tuo, e non è il caso di frugare.'],
  B: ['Un letto. Non è il tuo.'],
  l: ['Un telaio.'],
  C: ['Un bancone di legno lucidato da mille gomiti.'],
  h: ['Un tavolo.'],
  r: ['Canne alte. Qualcosa ci si muove dentro, poi si ferma.'],
  f: ['La staccionata degli orti. Un paletto è nuovo: legno di Ottavio, si vede.'],
  X: ['Il sentiero prosegue oltre il mondo che conosci.', 'Non oggi.'],
};
