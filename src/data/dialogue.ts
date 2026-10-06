import type { DialogueLine } from '../dialogue/types';

/**
 * Battute degli abitanti. BOZZE: sono segnaposto da riscrivere.
 *
 * Ogni battuta ha una o più pagine (`text`). Il testo tra parentesi è narrazione.
 * `when` dice quando la battuta può essere detta (vedi dialogue/types.ts):
 *   phase: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night'
 *   weather: 'clear' | 'cloudy' | 'rain'
 *   season: 0 primavera, 1 estate, 2 autunno, 3 inverno
 *   at: id di un edificio, di una zona o di un luogo (es. 'tavern', 'stagno', 'square_bench1')
 *   activity: 'work' | 'rest' | 'eat' | 'chat' | 'fish' | 'play' | 'walk'
 *   minFam / maxFam: confidenza col giocatore (cresce di 1 per ogni giorno in cui ci parli)
 *   first: true solo per il primo incontro
 *   flag / notFlag: qualcosa che il mondo ricorda (impostato con `sets`)
 *   playerHas: un oggetto (o una categoria, es. 'pesce') nell'inventario
 * `once`: detta una sola volta in tutta la partita.
 * `note`: frase che finisce nel taccuino del giocatore.
 *
 * Fra le battute possibili il gioco preferisce quelle non ancora sentite oggi
 * e quelle più specifiche per il momento.
 */
export const DIALOGUE: Record<string, DialogueLine[]> = {
  martino: [
    {
      when: { first: true },
      text: [
        'Eccoti. Dormito bene, nella casa di Agnese?',
        'Le chiavi le avevo io da quando... be\', da quando non serviva più nessuno ad aprire. Adesso servono a te.',
      ],
      sets: ['met_martino'],
      note: 'Martino, l\'oste, aveva le chiavi della casa di Agnese. Ha esitato, prima di dire "da quando".',
    },
    { when: { at: ['tavern'], phase: ['dawn', 'morning'] }, text: ['Presto, eh? Il caffè non c\'è, ma c\'è latte caldo.', 'Il caffè arriva col carro, e il carro arriva quando vuole.'] },
    { when: { at: ['tavern'], phase: ['evening'] }, text: ['Sera piena, stasera. O mezza piena.', 'Io la sera la conto a teste, non a bicchieri.'] },
    { when: { at: ['tavern'], phase: ['night'] }, text: ['Si chiude, si chiude. Il letto non aspetta, e nemmeno Ada.'] },
    { when: { weather: ['rain'] }, text: ['Con questa pioggia Nella non va agli orti, Bruna resta al margine del bosco e io vendo il doppio.', 'Il tempo brutto è il mio socio.'] },
    { when: { weather: ['clear'], phase: ['midday', 'afternoon'] }, text: ['Bella giornata. Di quelle che poi non si ricordano, perché non succede niente.', 'Le migliori.'] },
    { when: { activity: ['rest'] }, text: ['Mezz\'ora seduto. È la mia unica regola.', 'Siediti anche tu, se vuoi. Ma non chiedermi niente.'] },
    {
      when: { minFam: 2 },
      text: ['Agnese veniva qui il giovedì. Ordinava un bicchiere d\'acqua e uno di vino.', 'E beveva l\'acqua.'],
      once: true,
      note: 'Agnese, il giovedì all\'osteria: un bicchiere d\'acqua e uno di vino. Beveva l\'acqua.',
    },
    { when: { flag: 'heard_key', minFam: 1 }, text: ['La chiave di Pietro? Ce l\'ha da quando lo conosco.', 'Una volta l\'ha provata sulla porta della mia cantina. Non era quella.'], once: true },
    { when: { playerHas: 'tinca' }, text: ['Quella è una tinca? Ada le fa con le erbe e un filo d\'aceto.', 'Le tinche sanno di fango, dicono. Di fango buono, dico io.'] },
    { text: ['Tutto bene, alla casa? Se il camino tira male, è il vento da nord. Non c\'è niente da fare, col vento da nord.'] },
    { text: ['Qui le notizie arrivano tardi e ripartono presto. Come i forestieri. Tu però sei rimasto.'] },
  ],

  ada: [
    {
      when: { first: true },
      text: ['Tu sei quello della casa di Agnese. Mangi?', 'Si vede che non mangi.'],
      sets: ['met_ada'],
    },
    { when: { activity: ['work'], at: ['tavern'] }, text: ['Non adesso. O adesso, ma parla mentre giro.'] },
    { when: { activity: ['work'], phase: ['dawn', 'morning'] }, text: ['Brodo di ieri, pane di ieri. Domani sarà tutto di oggi.'] },
    { when: { activity: ['work'], phase: ['evening'] }, text: ['Stasera c\'è zuppa. C\'era anche ieri.', 'Non è la stessa zuppa.'] },
    { when: { at: ['shop'] }, text: ['Teresa ha pesato le lenticchie due volte. Io le ho contate.', 'Siamo pari.'] },
    { when: { activity: ['rest'] }, text: ['Il pozzo, la piazza, le galline dei Monti.', 'Due ore così, e torno di là.'] },
    {
      when: { season: [0] },
      text: ['In primavera nei prati c\'è l\'ortica giovane.', 'Si coglie coi guanti e si mangia senza.'],
      note: 'Ada: in primavera, l\'ortica giovane nei prati. Si coglie coi guanti, si mangia senza.',
    },
    { when: { weather: ['rain'] }, text: ['Quando piove hanno tutti fame prima. Non so perché. Nessuno lo sa.'] },
    {
      when: { minFam: 2 },
      text: ['Agnese mi ha insegnato il pane con la patata.', 'Non dirlo a Martino. Lui crede che sia la ricetta di sua madre.'],
      once: true,
      note: 'Il pane con la patata dell\'osteria era una ricetta di Agnese. Martino non lo sa.',
    },
    { text: ['Hai una faccia da minestra. Non è un insulto.'] },
  ],

  teresa: [
    {
      when: { first: true },
      text: ['Benvenuto. Si guarda con gli occhi.', 'Le mani in tasca, grazie.'],
      sets: ['met_teresa'],
    },
    { when: { activity: ['work'] }, text: ['Farina, sale, olio, candele, filo. Il resto si ordina, e arriva quando arriva.'] },
    { when: { activity: ['work'], minFam: 1 }, text: ['Ho un registro per ogni cosa. Anche per chi deve pagare.', 'Tu ancora non ci sei. Tienilo come un complimento.'] },
    { when: { at: ['tavern'] }, text: ['Il martedì e il venerdì esco.', 'Gli altri giorni mi faccio compagnia da sola. Sono una compagnia migliore.'] },
    { when: { activity: ['rest', 'eat'], at: ['shop'] }, text: ['È chiuso. Lo dice la porta.', 'Ma visto che sei qui, siediti. Non toccare niente.'] },
    { text: ['Se vedi mio nipote vicino all\'acqua, digli che la nonna lo vede.', 'Non è vero. Ma lui ci crede.'] },
    { when: { weather: ['rain'] }, text: ['Con l\'umido mi fanno male le dita. Le monete le conto lo stesso.'] },
    {
      when: { minFam: 3 },
      text: [
        'Mio marito, Gino, diceva che una bottega è un orologio: se apri tardi, il paese va avanti storto.',
        'Sono quattro inverni che apro alle otto in punto.',
      ],
      once: true,
      note: 'Teresa apre la bottega alle otto in punto da quattro inverni, da quando è morto Gino.',
    },
    {
      when: { minFam: 2, flag: 'heard_giant' },
      text: ['Il gigante? Lino ha cominciato a parlarne l\'inverno in cui sua madre è partita.', 'Lasciaglielo, il gigante.'],
      once: true,
      note: 'Lino ha cominciato a parlare del gigante l\'inverno in cui sua madre è partita.',
    },
  ],

  lino: [
    {
      when: { first: true },
      text: ['Tu non sei di qui.', 'Lo sai che nel bosco vive un gigante?'],
      sets: ['heard_giant'],
      note: 'Lino, il nipote di Teresa, dice che nel bosco vive un gigante.',
    },
    { when: { at: ['piazza'] }, text: ['Il gigante è alto come il campanile.', 'Noi non ce l\'abbiamo, il campanile. Ma se l\'avessimo sarebbe così.'] },
    { when: { at: ['stagno'] }, text: ['Le rane stanno zitte quando arriva qualcuno.', 'Adesso stanno zitte per te.'] },
    { when: { at: ['stagno'] }, text: ['Ho trovato un sasso piatto che fa sei salti.', 'Te lo farei vedere, ma l\'ho tirato.'] },
    { when: { weather: ['rain'] }, text: ['Con la pioggia la nonna non mi fa uscire.', 'Il gigante invece esce. Gli piace bagnato.'] },
    { when: { phase: ['evening'] }, text: ['Al buio il bosco diventa più grande. Lo dice Bruna.', 'Io non ho paura. Lo dico io.'] },
    { when: { minFam: 3 }, text: ['Se vai nel bosco e vedi il gigante, non dirgli come mi chiamo.'] },
    { when: { minFam: 4 }, text: ['La mia mamma è in città. Mi scrive quando ha tempo.', 'In città c\'è tanto da fare.'], once: true },
    { when: { playerHas: 'pesce' }, text: ['Hai preso un pesce! Era grosso? Era più grosso prima, vero? Succede sempre così.'] },
    { text: ['Sai fischiare con l\'erba? Io sì. Quasi.'] },
  ],

  ottavio: [
    {
      when: { first: true },
      text: ['Ottavio. Falegname.', '(Ti guarda le mani, poi la faccia.)', 'Se ti si rompe qualcosa, portalo qui. Se si rompe per colpa tua, portalo lo stesso.'],
      sets: ['met_ottavio'],
    },
    { when: { activity: ['work'] }, text: ['Noce. Ci vuole un anno, per seccarlo bene.', 'Chi ha fretta compra il pioppo.'] },
    { when: { activity: ['work'] }, text: ['Elia pialla come se il legno gli avesse fatto un torto.'] },
    { when: { at: ['tavern'] }, text: ['Un bicchiere. Poi un altro. Poi a casa.', 'È così da vent\'anni. Funziona.'] },
    { when: { days: [6], activity: ['rest'] }, text: ['La domenica il legno non lo tocco. Lo guardo.', 'È diverso.'] },
    { when: { weather: ['rain'] }, text: ['Con l\'umido il legno si gonfia, e le porte si lamentano. Anche la mia.'] },
    {
      when: { minFam: 2 },
      text: ['La sedia nella casa di Agnese l\'ho fatta io, quand\'ero apprendista.', 'Traballa. Non dirlo a nessuno.'],
      once: true,
      note: 'La sedia di casa l\'ha fatta Ottavio da apprendista. Traballa: non dirlo a nessuno.',
    },
    { text: ['(Annuisce. Per Ottavio, è una conversazione.)'] },
  ],

  nella: [
    {
      when: { first: true },
      text: ['Oh! Il nuovo vicino.', 'Hai le mani da città. Si sistemano, vedrai.'],
      sets: ['met_nella'],
    },
    { when: { at: ['orti'], activity: ['work'] }, text: ['Sto parlando ai piselli. Non guardarmi così: crescono meglio.'] },
    { when: { at: ['orti'], phase: ['dawn', 'morning'] }, text: ['La terra è fredda la mattina e calda alle undici.', 'Io ci sto dentro tutte e due le volte.'] },
    { when: { season: [0], at: ['orti'] }, text: ['Primavera: semino, copro, aspetto.', 'L\'aspettare è il lavoro più lungo.'] },
    { when: { weather: ['rain'] }, text: ['Piove sugli orti e io sto qui.', 'È il giorno in cui la terra lavora da sola.'] },
    { when: { phase: ['evening'], at: ['rinaldi'] }, text: ['Ottavio è all\'osteria. Io preferisco il fuoco.', 'Non litighiamo: poi ci raccontiamo.'] },
    {
      when: { minFam: 2, season: [0] },
      text: ['Nel bosco, in primavera, sotto i noccioli nascono i prugnoli.', 'Bruna sa dove. Se te lo dice, vuol dire che sei dei nostri.'],
      once: true,
      note: 'Nella: in primavera, sotto i noccioli del bosco, nascono i prugnoli. Bruna sa dove.',
    },
    { text: ['Lo senti, l\'odore della terra? No? Allora non ti sei ancora fermato abbastanza.'] },
  ],

  pietro: [
    {
      when: { first: true },
      text: ['Shh.', '...', 'Ah. Chi sei?', 'La casa di Agnese. Agnese. Faceva le frittelle di mele. O era mia sorella?'],
      sets: ['met_pietro'],
    },
    { when: { activity: ['fish'], phase: ['dawn'] }, text: ['All\'alba lo stagno è liscio come un piatto.', 'Il pesce lo sa, e sta sotto.'] },
    { when: { activity: ['fish'] }, text: ['Non parlare. Il pesce ascolta.'] },
    { when: { activity: ['fish'], phase: ['evening'] }, text: ['La sera salgono le tinche.', 'Le anguille aspettano il buio. Come i ladri, e come le persone oneste.'] },
    {
      when: { minFam: 1 },
      text: ['Guarda.', '(Pietro tira fuori una chiave di ferro, lunga e scura.)', 'Ce l\'ho da sempre. Non so cosa apre.', 'Ogni tanto provo una porta.'],
      once: true,
      sets: ['heard_key'],
      note: 'Pietro ha una chiave di ferro, lunga e scura. Non ricorda cosa apra.',
    },
    { when: { at: ['square_bench1'] }, text: ['Da qui si vede passare tutto il paese.', 'Io lo vedo passare due volte. La seconda me lo racconto.'] },
    { when: { weather: ['rain'] }, text: ['Piove. Si pesca lo stesso.', 'L\'acqua non si accorge della pioggia.'] },
    { when: { minFam: 3 }, text: ['Ti ho mai raccontato del luccio grande? Era lungo così. No: così.', 'L\'ho preso l\'inverno della neve alta. O me l\'hanno raccontato.'] },
    { when: { playerHas: 'pesce' }, text: ['Hai preso qualcosa. Fammi vedere.', '(Lo guarda a lungo.)', 'Buono. La prossima volta lancia vicino alle canne.'] },
    { text: ['Lo stagno non ha fretta. Io nemmeno. Siamo vecchi amici.'] },
  ],

  bruna: [
    {
      when: { first: true },
      text: ['Sei quello nuovo.', 'Il bosco basso è tranquillo. Oltre il fosso, a nord, no.', 'Tienilo a mente.'],
      sets: ['heard_ditch'],
      note: 'Bruna dice che il bosco basso è tranquillo. Oltre il fosso, a nord, no.',
    },
    { when: { at: ['bosco'], activity: ['work'] }, text: ['Taglio solo i rami secchi e gli alberi caduti.', 'Il bosco si pulisce, non si spoglia.'] },
    { when: { at: ['bosco'] }, text: ['Se senti un rumore e non vedi niente, è un capriolo.', 'Quasi sempre.'] },
    { when: { at: ['workshop_door'] }, text: ['Legna per Ottavio. La guarda come se fosse un cavallo da comprare.'] },
    { when: { at: ['tavern'] }, text: ['Una grappa e un tavolo.', 'Elia mi fa domande sul bosco. Gli dico metà delle cose.'] },
    { when: { flag: 'heard_giant', minFam: 1 }, text: ['Il gigante di Lino? Una volta ho visto delle impronte grandi.', 'Erano di un orso, credo.', 'Credo.'], once: true },
    { when: { weather: ['rain'] }, text: ['Con la pioggia resto al margine. Il bosco bagnato non perdona le caviglie.'] },
    { when: { minFam: 3 }, text: ['Da dove vengo non importa. Qui nessuno me l\'ha chiesto due volte.', 'Per questo sono rimasta.'], once: true },
    {
      when: { minFam: 2, season: [0] },
      text: ['Prugnoli? Sotto i noccioli, nella radura a ovest del sentiero.', 'Non dirlo in giro.'],
      once: true,
      sets: ['knows_prugnoli'],
      note: 'Bruna: i prugnoli crescono sotto i noccioli, nella radura a ovest del sentiero nel bosco.',
    },
    { text: ['Mh.'] },
  ],

  elia: [
    {
      when: { first: true },
      text: ['Ciao. Tu vieni da fuori? Com\'è, fuori?', 'No, aspetta, dimmelo un\'altra volta. Sta arrivando Ottavio.'],
      sets: ['met_elia'],
    },
    { when: { activity: ['work'] }, text: ['Piallo. Piallo. Piallo.', 'Un giorno faccio una barca e me ne vado.'] },
    { when: { at: ['square_well'] }, text: ['Qui al pozzo è l\'unico momento in cui nessuno mi dice cosa fare.'] },
    {
      when: { at: ['tavern'] },
      text: ['Bruna dice che oltre il fosso ci sono rovine. Vecchie, di prima del paese.', 'Io ci voglio andare.'],
      sets: ['heard_ruins'],
      note: 'Elia dice che oltre il fosso, a nord, ci sono rovine più vecchie del paese.',
    },
    { when: { at: ['bosco'], days: [6] }, text: ['Non dirlo a mia madre. Sto solo guardando.', 'Guardare non è andare.'] },
    { when: { minFam: 2 }, text: ['Ho disegnato una mappa del bosco basso. Mancano dei pezzi.', 'Mancano quasi tutti i pezzi.'] },
    { when: { weather: ['rain'], activity: ['work'] }, text: ['Con la pioggia in bottega si sente solo il martello, e la pioggia.', 'Ottavio dice che è musica.'] },
    { text: ['Tu ci sei mai stato in una città vera? Con le strade di pietra?'] },
  ],

  clelia: [
    {
      when: { first: true },
      text: ['Buongiorno. Tu sei il nuovo vicino.', 'Se vedi mio figlio fare cose stupide, non incoraggiarlo.'],
      sets: ['met_clelia'],
    },
    { when: { at: ['well_wash'] }, text: ['L\'acqua del pozzo è fredda anche d\'estate.', 'Le mani si lamentano. Il bucato no.'] },
    { when: { at: ['monti_loom'] }, text: ['Questo è il blu del guado. Quest\'altro è il giallo delle ginestre.', 'Il verde lo fa il bosco, quando vuole.'] },
    { when: { phase: ['evening'] }, text: ['Elia è all\'osteria. Lo so senza guardare.', 'Le madri contano i passi.'] },
    {
      when: { minFam: 2 },
      text: [
        'Elia era piccolo quando suo padre è partito, oltre il bosco.',
        'È tornato il mulo. Lui no.',
        'Ecco perché.',
      ],
      once: true,
      note: 'Il padre di Elia è partito oltre il bosco quando Elia era piccolo. È tornato solo il mulo.',
    },
    { when: { minFam: 3, flag: 'heard_ruins' }, text: ['Le rovine. Gliele ha messe in testa Bruna.', 'O le aveva già, e Bruna le ha soltanto chiamate per nome.'], once: true },
    { text: ['(Clelia ti saluta con un cenno, senza smettere di fare quello che sta facendo.)'] },
  ],
};
