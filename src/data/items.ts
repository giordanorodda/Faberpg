import type { Phase, Season } from '../core/time';
import type { WeatherKind } from '../core/weather';
import type { ForageKind } from '../world/types';

export type ItemCategory = 'attrezzo' | 'pesce' | 'raccolto' | 'ricordo';

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  description: string;
}

/**
 * Oggetti. La descrizione è ciò che il giocatore legge nell'inventario:
 * meglio una frase che dica qualcosa dell'oggetto che una statistica (§20).
 */
export const ITEMS: ItemDef[] = [
  { id: 'canna', name: 'Canna da pesca', category: 'attrezzo', description: 'Era appesa dietro la porta, nella casa di Agnese. Sul manico c\'è una tacca, incisa col coltello.' },
  { id: 'alborella', name: 'Alborella', category: 'pesce', description: 'Piccola e argentata. Nuota in branchi vicino alla riva.' },
  { id: 'persico', name: 'Pesce persico', category: 'pesce', description: 'Strisce scure sui fianchi, pinne rosse. Teresa dice che è il suo preferito.' },
  { id: 'tinca', name: 'Tinca', category: 'pesce', description: 'Verde scura, viscida, paziente. Sa di fango buono, dice Martino.' },
  { id: 'carpa', name: 'Carpa', category: 'pesce', description: 'Pesante, dorata. Ha l\'aria di chi abita lo stagno da molto prima di te.' },
  { id: 'anguilla', name: 'Anguilla', category: 'pesce', description: 'Esce col buio. Si attorciglia al polso come un pensiero.' },
  { id: 'luccio', name: 'Luccio', category: 'pesce', description: 'Lungo, coi denti. Pietro ne parlerebbe per un\'ora.' },
  { id: 'ortica', name: 'Ortica giovane', category: 'raccolto', description: 'Punge. Bollita, diventa una minestra verde e buona.' },
  { id: 'tarassaco', name: 'Tarassaco', category: 'raccolto', description: 'Foglie amare e un fiore giallo che diventerà soffione.' },
  { id: 'prugnolo', name: 'Prugnolo', category: 'raccolto', description: 'Un fungo bianco, primaverile, che profuma di farina. Cresce in cerchio.' },
  { id: 'fragoline', name: 'Fragoline di bosco', category: 'raccolto', description: 'Minuscole e rosse. Ne mangi una ogni tre che raccogli.' },
  { id: 'more', name: 'More', category: 'raccolto', description: 'Ti tingono le dita. I rovi ti ricordano che non erano per te.' },
  { id: 'porcino', name: 'Porcino', category: 'raccolto', description: 'Il cappello bruno, il gambo panciuto. Un piccolo tesoro d\'autunno.' },
  { id: 'castagne', name: 'Castagne', category: 'raccolto', description: 'Lucide, appena uscite dal riccio.' },
  { id: 'rosa_canina', name: 'Bacche di rosa canina', category: 'raccolto', description: 'Rosse anche sotto la brina. Ada ci fa una marmellata aspra.' },
  { id: 'menta', name: 'Menta d\'acqua', category: 'raccolto', description: 'Cresce sulla riva. Basta sfiorarla per sentirne l\'odore.' },
  { id: 'sasso', name: 'Sasso piatto', category: 'ricordo', description: 'Liscio e piatto. Lino direbbe che fa almeno sei salti.' },
];

export function item(id: string): ItemDef {
  const it = ITEMS.find((i) => i.id === id);
  if (!it) throw new Error(`Oggetto sconosciuto: ${id}`);
  return it;
}

export interface FishDef {
  item: string;
  /** Relative chance when conditions match. */
  weight: number;
  phases?: Phase[];
  seasons?: Season[];
  weather?: WeatherKind[];
}

/** Cosa può abboccare nello stagno, e quando. */
export const FISH: FishDef[] = [
  { item: 'alborella', weight: 10 },
  { item: 'persico', weight: 6, phases: ['dawn', 'morning', 'afternoon', 'evening'] },
  { item: 'tinca', weight: 5, phases: ['dawn', 'evening'] },
  { item: 'tinca', weight: 3, weather: ['rain', 'cloudy'] },
  { item: 'carpa', weight: 3, seasons: [0, 1, 2] },
  { item: 'anguilla', weight: 6, phases: ['night'] },
  { item: 'luccio', weight: 1, phases: ['dawn', 'evening'], seasons: [2, 3, 0] },
];

export interface ForageDef {
  item: string;
  kinds: ForageKind[];
  seasons: Season[];
  weight: number;
}

/** Cosa si può trovare nei punti di raccolta, secondo la stagione. */
export const FORAGE: ForageDef[] = [
  { item: 'ortica', kinds: ['prato'], seasons: [0], weight: 5 },
  { item: 'tarassaco', kinds: ['prato'], seasons: [0, 1], weight: 4 },
  { item: 'prugnolo', kinds: ['bosco'], seasons: [0], weight: 3 },
  { item: 'fragoline', kinds: ['bosco', 'prato'], seasons: [0, 1], weight: 3 },
  { item: 'more', kinds: ['bosco', 'prato'], seasons: [1], weight: 5 },
  { item: 'porcino', kinds: ['bosco'], seasons: [2], weight: 4 },
  { item: 'castagne', kinds: ['bosco'], seasons: [2], weight: 5 },
  { item: 'rosa_canina', kinds: ['prato', 'bosco'], seasons: [2, 3], weight: 4 },
  { item: 'menta', kinds: ['riva'], seasons: [0, 1, 2], weight: 5 },
  { item: 'sasso', kinds: ['riva'], seasons: [0, 1, 2, 3], weight: 1 },
];

/** Probabilità che un punto di raccolta offra qualcosa in un dato giorno. */
export const FORAGE_DAILY_CHANCE = 0.45;
