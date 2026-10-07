/**
 * I libri che si possono leggere in casa. Ogni pagina è una stringa; una riga
 * vuota separa i capoversi. Bozze, come i dialoghi: l'autore le riscriverà.
 * Una regola: nessun libro esiste per dare una quest. Al più, racconta.
 */

export interface Libro {
  id: string;
  titolo: string;
  /** Una riga che compare sotto il titolo, nella scelta. */
  nota: string;
  pagine: string[];
}

export const LIBRI: Libro[] = [
  {
    id: 'almanacco',
    titolo: 'Almanacco della Valle',
    nota: 'vent’anni fa, con le note a margine',
    pagine: [
      'Luna nuova di Vendemmiaio. Si semina l’aglio, non si taglia la legna, non si fanno promesse.\n\nSe la luna ha l’alone, domani piove. Se non ce l’ha, piove dopodomani.\n\n(A margine, a matita: «Non è vero».)',
      'Primo quarto. Buono per travasare il vino, per tagliarsi i capelli, per riconciliarsi coi vicini.\n\nIl vento dai monti porta il freddo; il vento dal mare porta le voci. Chi sente il proprio nome nel vento, non si volti.\n\n(A margine: «Mi sono voltata. Era Ada».)',
      'Luna piena. Le api non escono, i gatti escono troppo. Le donne del mulino dicono che il lago, in queste notti, è più profondo di un palmo.\n\nNessuno l’ha mai misurato due volte.',
      'Ultimo quarto. Si raccolgono le noci, si chiudono le arnie, si rammendano le calze.\n\nProverbio: chi conta le stelle si dimentica la cena.\n\n(A margine, con un’altra calligrafia: «Ne ho contate trecentodue».)',
      'Tavola delle feste.\n\nSan Martino: si apre la botte nuova.\nLa Fiera d’autunno: si vende quel che non serve, si compra quel che non serve.\nLa notte dei fuochi: non si dorme.\n\nIl resto dell’anno, si lavora.',
    ],
  },
  {
    id: 'erbario',
    titolo: 'Erbario dei boschi',
    nota: 'con le figure colorate a mano',
    pagine: [
      'Del tiglio.\n\nAlbero gentile, che fiorisce quando le giornate sono lunghe. I fiori si raccolgono asciutti, a mezzogiorno, e si seccano all’ombra.\n\nL’infuso calma i nervi e i bambini. Ai vecchi fa venire voglia di raccontare.',
      'Della menta.\n\nCresce dove c’è acqua e dove non dovrebbe. Una volta piantata, non se ne va più: è il suo difetto e la sua virtù.\n\nNel tè, con il miele, scalda d’inverno e rinfresca d’estate. Nessuno ha mai capito come faccia.',
      'Della salvia.\n\nPianta dei muri a secco e delle cucine. Le foglie strofinate sui denti li rendono bianchi; quelle bruciate tengono lontane le mosche e i cattivi pensieri.\n\nNon si regala salvia a chi parte: porta la nostalgia.',
      'Del sambuco.\n\nI fiori in frittella, le bacche in sciroppo, il legno per i flauti dei pastori. Le foglie no: sono amare e non perdonano.\n\nSi dice che sotto il sambuco non si debba dormire. Si dice anche il contrario.',
      'Del luppolo selvatico.\n\nSi arrampica sulle siepi lungo il fiume. Nel cuscino, fa dormire; nella birra, fa parlare.\n\n(La pagina dopo è stata strappata, con cura.)',
    ],
  },
  {
    id: 'cronache',
    titolo: 'Cronache di Valle',
    nota: 'manoscritto, rilegato da qualcuno',
    pagine: [
      'Nell’anno della grande neve il mulino si fermò per quaranta giorni. La gente veniva a guardare la ruota ghiacciata come si va a vedere un animale malato.\n\nIl quarantunesimo giorno la ruota ripartì da sola, di notte. Il mugnaio disse che era stato il disgelo. Sua moglie non disse niente.',
      'Quell’estate arrivò in paese un uomo che vendeva mappe. Erano mappe di posti vicini, che tutti conoscevano, ma disegnate in un modo che non si riconoscevano.\n\nNe comprarono tre. Una è ancora appesa alla bottega dei Bassi, con un bosco dove non c’è nessun bosco.',
      'Della casa sulla strada della curva, quella col camino che tira bene, si sa poco.\n\nCi abitò una donna che rideva forte e leggeva la sera. Poi un uomo che non leggeva affatto. Poi nessuno, per molti anni, tranne un gatto che nessuno ricorda di aver portato.',
      'Nell’anno delle api la gente del paese ebbe miele da regalare a tutti. Si regalò miele ai cugini lontani, ai creditori, al prete, ai cani.\n\nL’anno dopo le api se ne andarono. Si disse che avevano lavorato abbastanza.',
    ],
  },
];
