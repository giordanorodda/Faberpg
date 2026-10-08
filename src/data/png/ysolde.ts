import type { Character } from '../../interni/types';

/**
 * Ysolde Malvarossa, l'erbaia. Bozze, come tutti i dialoghi: l'autore le riscriverà.
 * Tono: frasi brevi, asciutte, ironiche; le piante come metro di tutto; tenera solo di sbieco.
 */
export const YSOLDE: Character = {
  id: 'ysolde',
  name: 'Ysolde Malvarossa',
  epithet: 'la Malvarossa',
  age: 54,
  role: 'erbaia',
  house: 'erbe',
  sheet: {
    personality:
      'Lingua tagliente, ironia asciutta, pazienza zero con le sciocchezze e moltissima con le piante. Generosa ma guai a ringraziarla troppo. Osserva tutto e commenta poco. Si arrabbia se la chiamano strega. Sotto la scorza è affettuosa, e lo dimostra con i fatti: una tisana lasciata sulla porta, un unguento regalato.',
    voice:
      'Frasi brevi, spesso senza verbo. Paragoni presi dalle piante e dalle stagioni ("testardo come la gramigna"). Chiama le erbe con i nomi del popolo: malva, tiglio, achillea, ruta, erba dei tagli, piantaggine. Dà del tu a tutti. Chiama la persona nuova "la casa di Agnese", per scherzo, finché non la conosce meglio.',
    background:
      'Arrivata ad Acquaferma trent’anni fa dalle colline, con un sacco di semi e nessuna voglia di spiegare perché. Ha imparato il mestiere da una vecchia che non ha mai voluto dire il suo nome. Cura i dolori del paese, prepara tisane, unguenti, tinture; vende i rimedi anche alla Bottega Bassi. Raccoglie erbe all’alba nel Bosco Basso. Era la migliore amica della vecchia Agnese: passavano le sere a litigare su tutto.',
    secrets:
      'Era al capezzale di Agnese quando è morta, e le ha promesso di "tenere d’occhio la casa e chi ci verrà". Sa che la stanza in fondo alle scale era dove Agnese scriveva e faceva seccare le erbe, e sa della quarta chiave. Una volta al mese, a luna piena, va oltre il fosso a raccogliere l’erba lunaria, che cresce solo di là: lo fa da vent’anni e non l’ha mai detto a nessuno tranne Corvino. Di là ha visto luci che camminavano. Non ne parla.',
    likes: ['l’alba nel bosco', 'il tiglio in fiore', 'chi ascolta senza interrompere', 'le domeniche a giocare a tavola da Corvino', 'il silenzio'],
    dislikes: ['essere chiamata strega', 'chi strappa le piante con le radici', 'i complimenti', 'chi si lamenta e non si cura', 'Teresa che tira sul prezzo'],
    relations: {
      'Corvino Lanterna (il Cartografo)': 'vecchio amico; litigano su tutto, la domenica giocano a tavola; lui racconta storie gonfie, lei le sgonfia. Gli vuole bene e non glielo dirà mai.',
      'la vecchia Agnese': 'la sua amica più cara, morta l’inverno scorso. Le manca. Non lo ammette.',
      'Teresa Bassi': 'vende i suoi rimedi in bottega; tirano sul prezzo da vent’anni, con soddisfazione di entrambe.',
      'Bruna Ferri': 'la boscaiola; le porta cortecce e radici; la stima, due donne di poche parole.',
      'Ada Galli': 'usa le sue erbe in cucina; la rispetta.',
      'Martino Galli': 'le deve un rimedio per la gotta da tre inverni, e lo sa.',
      'Lino Bassi': 'il bambino; ha paura di lei e torna sempre a guardare dalla finestra. Lei gli lascia una mela sul davanzale.',
      'Pietro Sala': 'il vecchio pescatore; gli cura le giunture, lui si dimentica di pagare, lei fa finta di niente.',
      'Elia Monti': 'irrequieto, se ne andrà; lei lo capisce più di quanto dica.',
      'Clelia Monti': 'le dà la robbia e il guado per tingere.',
    },
    knowledge: [
      'Conosce ogni pianta del Bosco Basso e a cosa serve, e quali sono velenose (la belladonna sotto il fosso, la cicuta lungo lo stagno).',
      'Sa curare tagli, febbri, mal di pancia, insonnia, tosse, geloni. Non fa miracoli e lo dice.',
      'Sa che il gatto rosso della casa di Agnese si chiama Brace, come lo chiamava Agnese.',
      'Non sa niente di città lontane, re, guerre. Della frontiera sa solo quello che ha visto di notte, e non lo racconta.',
    ],
    limits: ['Non fa magie, non predice il futuro, non vende veleni.', 'Non dice mai di voler bene a qualcuno; al massimo "non sei del tutto inutile".'],
  },
  routine: [
    { from: '00:00', to: '06:00', spot: 'letto', doing: 'dormendo' },
    { from: '06:00', to: '07:00', spot: 'focolare', doing: 'scaldando l’acqua per la prima tisana' },
    { from: '07:00', to: '09:30', spot: 'fuori', doing: 'a raccogliere erbe nel bosco' },
    { from: '09:30', to: '12:30', spot: 'banco', doing: 'pestando erbe nel mortaio al banco' },
    { from: '12:30', to: '13:30', spot: 'tavola', doing: 'mangiando pane e formaggio' },
    { from: '13:30', to: '15:00', spot: 'poltrona', doing: 'riposando in poltrona, gli occhi chiusi ma sveglia' },
    { from: '15:00', to: '18:30', spot: 'essiccatoio', doing: 'legando i mazzi d’erbe da seccare' },
    { from: '18:30', to: '19:30', spot: 'focolare', doing: 'mescolando la zuppa sul fuoco' },
    { from: '19:30', to: '22:30', spot: 'lettura', doing: 'leggendo il suo erbario accanto al fuoco' },
    { from: '22:30', to: '23:00', spot: 'finestra', doing: 'guardando fuori dalla finestra, verso il bosco' },
    { from: '23:00', to: '24:00', spot: 'letto', doing: 'dormendo' },
    // con la pioggia non si va per erbe: si mettono in ordine i barattoli
    { from: '07:00', to: '09:30', spot: 'banco', doing: 'riordinando i barattoli, perché piove', weather: ['rain'] },
    // la domenica pomeriggio è da Corvino, a giocare a tavola
    { from: '15:00', to: '18:00', spot: 'cartografo:ospite', doing: 'giocando a tavola con Corvino', days: [6] },
  ],
  dialogue: {
    saluto: {
      say: [
        { when: { first: true }, text: ['(Alza gli occhi dal lavoro e ti squadra da capo a piedi, senza fretta.)', 'Ah. La casa di Agnese. Ti aspettavo prima, sai. Tutti passano da me, prima o poi: per un taglio, una tosse, un dolore che non vogliono raccontare al medico perché il medico non c’è.', 'Io sono Ysolde. Malvarossa, se vuoi il nome intero. Non sono una strega, prima che te lo dicano gli altri.'] },
        { when: { doing: ['dormendo'] }, text: '(Dorme. Respira piano, una mano sotto la guancia. Sul comodino, un mazzetto di lavanda.)' },
        { when: { doing: ['mortaio'], firstToday: true }, text: ['(Il pestello non si ferma.) Parla pure. Le erbe non si offendono se le pesto mentre ascolto.'] },
        { when: { doing: ['mazzi'] }, text: ['(Ha le mani piene di spago e salvia.) Tieni questo capo. No, così lo strozzi. Ecco. Che vuoi?'] },
        { when: { doing: ['zuppa'] }, text: ['(Mescola senza guardarti.) Se sei venuto a cena, c’è zuppa di ortiche. Se sei venuto a chiacchierare, c’è zuppa di ortiche lo stesso.'] },
        { when: { doing: ['leggendo'] }, text: ['(Chiude il libro tenendo il segno con un dito.) A quest’ora? Spero sia un dolore vero.'] },
        { when: { doing: ['riposando'] }, text: ['(Non apre gli occhi.) Non dormo. Penso con gli occhi chiusi. È diverso.'] },
        { when: { doing: ['finestra'] }, text: ['(Non si volta.) Le volpi stasera sono inquiete. Anche tu, mi pare.'] },
        { when: { doing: ['tisana'] }, text: ['(L’acqua comincia a fremere.) Presto, eh. Le persone sane a quest’ora dormono. Le erbaie no.'] },
        { when: { doing: ['barattoli'] }, text: ['Piove, e il bosco oggi se lo tiene per sé. Mi tocca mettere ordine. Odio mettere ordine.'] },
        { when: { weather: ['rain'], firstToday: true }, text: 'Entra, entra, gocciola dove vuoi tranne che sulle erbe.' },
        { when: { famMin: 40, firstToday: true }, text: ['(Fa un cenno col mento verso lo sgabello.) Siediti. Non toccare niente. Bene, così.'] },
        { when: { firstToday: false }, text: 'Ancora tu. Hai dimenticato qualcosa o ti mancavo?' },
        { text: 'Mh. Buongiorno, se lo è.' },
        { text: '(Ti guarda sopra gli occhiali che non ha.) Dimmi.' },
        { text: 'La casa di Agnese. Cosa ti serve?' },
      ],
    },
    argomenti: {
      say: [{ text: 'Altro?' }, { text: '(Aspetta che tu dica qualcosa, senza smettere di lavorare.)' }, { text: 'Mh. E poi?' }, { text: 'Dimmi, che le erbe non aspettano.' }],
      choices: [
        { text: 'Chi sei, esattamente?', to: 'chi', once: true },
        { text: 'Cosa stai facendo?', to: 'lavoro' },
        { text: 'Mi serve un rimedio.', to: 'rimedi' },
        { text: 'Conoscevi Agnese?', to: 'agnese', when: { notSeen: 'agnese' } },
        { text: 'Raccontami ancora di Agnese.', to: 'agnese2', when: { seen: 'agnese', famMin: 20 }, once: true },
        { text: 'La stanza in fondo alle scale…', to: 'stanza', when: { seen: 'agnese2' }, once: true },
        { text: 'Cosa pensi degli altri, in paese?', to: 'paese' },
        { text: 'E Corvino?', to: 'corvino' },
        { text: 'Il bosco, la frontiera: cosa c’è di là?', to: 'bosco' },
        { text: 'Il gatto di Agnese è rimasto con me.', to: 'gatto', once: true },
        { text: 'Perché ti chiamano strega?', to: 'strega', once: true, when: { seen: 'chi' } },
        { text: 'Insegnami qualcosa sulle erbe.', to: 'lezione' },
        { text: 'Dove vai, di notte, con la luna piena?', to: 'luna', when: { famMin: 45, notSeen: 'luna' } },
        { text: 'Parliamo liberamente…', to: '__chat' },
        { text: 'Ti lascio lavorare.', to: '__fine' },
      ],
    },
    chi: {
      fam: 3,
      say: [
        {
          text: [
            'Chi sono. (Posa il pestello.) Una che sa a cosa servono le erbe e a cosa servono le persone, e sbaglia più con le seconde.',
            'Sono arrivata trent’anni fa dalle colline, con un sacco di semi e nessuna voglia di spiegare perché. Il paese ha fatto finta di non chiedere. È la cosa più gentile che abbia mai fatto.',
          ],
        },
      ],
      choices: [
        { text: 'Perché sei andata via dalle colline?', to: 'colline' },
        { text: 'Chi ti ha insegnato il mestiere?', to: 'maestra' },
        { text: '(Torna agli altri discorsi.)', to: 'argomenti' },
      ],
    },
    colline: {
      say: [
        { when: { famMax: 30 }, text: '(Ti guarda a lungo.) Ci sono domande che si fanno al terzo inverno, non al terzo giorno. Torna a chiedermelo fra un po’.' },
        { text: ['Perché lassù crescevano solo pietre e opinioni. E perché c’era una persona che non volevo più incontrare per strada.', 'Basta così. Le radici non si tirano fuori per vedere se stanno crescendo.'] },
      ],
      next: 'argomenti',
    },
    maestra: {
      fam: 2,
      say: [
        {
          text: [
            'Una vecchia senza nome. Davvero: non me l’ha mai detto. Diceva che i nomi servono a farsi chiamare, e lei non voleva essere chiamata.',
            'Mi ha insegnato tre cose: guarda la pianta prima di toccarla, non promettere guarigioni, e lava sempre il mortaio. La terza è la più importante, credimi.',
          ],
        },
      ],
      next: 'argomenti',
    },
    lavoro: {
      say: [
        { when: { doing: ['mortaio'] }, text: ['Achillea, piantaggine e un po’ di resina. Unguento per i tagli. In autunno la gente si taglia di più: legna, falci, coltelli, cattivo umore.', 'Vuoi provare a pestare? (Ti porge il pestello, poi se lo riprende.) No. Non ancora.'] },
        { when: { doing: ['mazzi'] }, text: ['Salvia, timo, menta, iperico. Si legano a testa in giù, così la forza scende nelle foglie. Così diceva la mia maestra. Forse è vero, forse è solo più comodo.'] },
        { when: { doing: ['zuppa'] }, text: 'Zuppa di ortiche, patate e un pugno d’orzo. Le ortiche pungono finché non le cuoci. Come certe persone.' },
        { when: { doing: ['leggendo'] }, text: ['Il mio erbario. L’ho scritto io, in trent’anni. Ogni pianta, dove cresce, quando si coglie, cosa fa e cosa non fa.', 'La colonna "cosa non fa" è la più lunga. Nessuno la legge mai.'] },
        { when: { doing: ['barattoli'] }, text: 'Metto in ordine. Cioè sposto le cose da dove le trovavo a dove non le troverò più.' },
        { when: { doing: ['finestra'] }, text: 'Niente. Guardo il bosco. Il bosco guarda me. Siamo vecchi conoscenti.' },
        { text: 'Lavoro. Quello che fanno le persone che non vengono a chiedere agli altri cosa stanno facendo.' },
      ],
      next: 'argomenti',
    },
    rimedi: {
      say: [{ text: 'Dimmi dove fa male. E non dire "dappertutto", che lo dicono tutti.' }],
      choices: [
        { text: 'Non dormo bene.', to: 'r_sonno' },
        { text: 'Mi sono tagliato lavorando.', to: 'r_taglio' },
        { text: 'Ho la tosse.', to: 'r_tosse' },
        { text: 'Mi fa male il cuore.', to: 'r_cuore' },
        { text: 'Niente, era per sapere.', to: 'argomenti' },
      ],
    },
    r_sonno: {
      fam: 1,
      say: [
        { text: ['Tiglio e un pizzico di luppolo, la sera, non troppo caldo. Niente vino, che il vino addormenta e poi sveglia alle tre a contare le travi.', 'E non leggere fino a tardi alla candela. Sì, lo so che lo fai. Si vede dagli occhi.'] },
      ],
      set: ['ysolde_rimedio_sonno'],
      next: 'argomenti',
    },
    r_taglio: {
      say: [{ text: ['Fammi vedere. (Ti prende la mano, la gira verso la luce.) Niente. Un graffio con ambizioni.', 'Lava con acqua bollita e mettici questo. (Un vasetto di unguento verde.) Prendilo. No, non mi devi niente. Me lo devi, ma non adesso.'] }],
      set: ['ysolde_unguento'],
      next: 'argomenti',
    },
    r_tosse: {
      say: [{ text: 'Timo, miele e una buccia di limone se Teresa ne ha. Se non ne ha, timo, miele e pazienza. Tre giorni. Se al quarto tossisci ancora, torna, e allora ci preoccupiamo in due.' }],
      next: 'argomenti',
    },
    r_cuore: {
      say: [
        { when: { famMin: 30 }, text: ['(Ti guarda in un modo diverso.) Quello non si cura con le erbe. Si cura con il tempo, le persone giuste e il lavoro con le mani.', 'Però una tazza di melissa non fa male a nessuno. Siediti. Te la faccio io.'] },
        { text: ['(Alza un sopracciglio.) Il cuore che batte storto o quello dei poeti?', 'Per il primo, biancospino e meno sale. Per il secondo, vai all’osteria a parlarne con Martino, che ci campa.'] },
      ],
      next: 'argomenti',
    },
    agnese: {
      fam: 4,
      say: [
        {
          text: [
            '(Il pestello si ferma.) Agnese. Sì. La conoscevo.',
            'Trent’anni di sere a litigare su tutto: il tempo, il prezzo del sale, se il tiglio va colto prima o dopo la pioggia. Aveva torto quasi sempre. Mi manca come manca un dente: ci passi la lingua sopra di continuo.',
            '(Riprende a pestare, più forte.) Tratta bene la casa. E il gatto.',
          ],
        },
      ],
      next: 'argomenti',
    },
    agnese2: {
      fam: 5,
      say: [
        {
          text: [
            'Ero con lei, alla fine. Fuori nevicava, il gatto le dormiva sui piedi. Mi ha chiesto di tenere d’occhio la casa, e chi ci sarebbe venuto.',
            'Ecco perché ti guardo così, se te lo chiedevi. Non sei tu. È la promessa.',
            'Aveva un modo di ridere che faceva voltare tutta l’osteria. Nel ritratto sulla mensola si vede appena. Lo ha fatto Corvino, quando ci vedeva ancora bene.',
          ],
        },
      ],
      next: 'argomenti',
    },
    stanza: {
      fam: 5,
      say: [
        {
          when: { flag: 'stanza_aperta' },
          text: ['Allora l’hai aperta. (Un mezzo sorriso, il primo.) Ci faceva seccare le erbe e ci scriveva. Lettere, credo, a qualcuno che non rispondeva.', 'Qualunque cosa tu ne faccia, fanne qualcosa. Una stanza chiusa è una stanza che aspetta. Ad Agnese l’attesa non è mai piaciuta.'],
        },
        {
          text: [
            'Ah. Quella. (Si asciuga le mani lentamente.) Era la stanza di Agnese. Ci faceva seccare le erbe, ci scriveva. Ci stava quando non voleva vedere nessuno, cioè spesso.',
            'C’è una chiave. Più vecchia delle altre. Agnese la teneva con le altre, appesa vicino al camino, perché diceva che il modo migliore di nascondere una cosa è lasciarla in vista.',
            'Non ti dico di aprirla. Non ti dico di non aprirla. È casa tua.',
          ],
        },
      ],
      next: 'argomenti',
    },
    paese: {
      say: [{ text: 'Su chi vuoi il mio parere? Avverto: è gratis, quindi vale quanto costa.' }],
      choices: [
        { text: 'Teresa, la bottegaia.', to: 'p_teresa' },
        { text: 'Martino e Ada, all’osteria.', to: 'p_osteria' },
        { text: 'Bruna, la boscaiola.', to: 'p_bruna' },
        { text: 'Il piccolo Lino.', to: 'p_lino' },
        { text: 'Elia, l’apprendista.', to: 'p_elia' },
        { text: 'Pietro, il pescatore.', to: 'p_pietro' },
        { text: 'Basta pettegolezzi.', to: 'argomenti' },
      ],
    },
    p_teresa: { say: [{ text: ['Teresa vende i miei unguenti al doppio di quanto me li paga e mi guarda come se fossi io a derubarla. Siamo grandi amiche.', 'Scherzo. Più o meno. È la persona più onesta del paese: tiene un registro anche dei suoi peccati.'] }], next: 'paese' },
    p_osteria: { say: [{ text: ['Ada cucina con le mie erbe e non lo dice a nessuno, così tutti pensano che il suo stufato sia magia. Lasciamoglielo credere.', 'Martino mi deve un rimedio per la gotta da tre inverni. Ogni volta mi offre un bicchiere invece di pagare. Ogni volta lo accetto. È un sistema.'] }], next: 'paese' },
    p_bruna: { say: [{ text: 'Bruna. Mi porta cortecce e radici, io le do unguento per le mani. Parliamo poco e ci capiamo molto. È arrivata da fuori, come me. Non le ho mai chiesto da dove. Lei non l’ha mai chiesto a me.' }], next: 'paese' },
    p_lino: { say: [{ text: ['Lino viene a guardarmi dalla finestra, poi scappa. Pensa che io sia una strega. Gli lascio una mela sul davanzale.', 'Quest’estate l’ha presa. Al prossimo inverno forse entra. Così si fa con i caprioli, e con i bambini.'] }], set: ['sa_mela_lino'], next: 'paese' },
    p_elia: { say: [{ text: 'Elia ha le mani di un falegname e gli occhi di uno che se ne andrà. Clelia lo sa e fa finta di no. Io non dico niente: chi vuole partire va lasciato partire, e chi resta va lasciato restare.' }], next: 'paese' },
    p_pietro: { say: [{ text: 'Pietro dimentica tutto tranne dove abboccano le tinche. Gli curo le ginocchia; lui si dimentica di pagare; io mi dimentico di ricordarglielo. Siamo due smemorati che si fanno compagnia.' }], next: 'paese' },
    corvino: {
      fam: 2,
      say: [
        { when: { doing: ['tavola'] }, text: ['(Indica il tavolo da gioco.) Ce l’hai davanti. Sta perdendo, e quando perde racconta storie per distrarmi.', 'Non funziona. Quasi mai.'] },
        {
          text: [
            'Corvino. (Sbuffa, ma gli angoli della bocca tradiscono.) Quel vecchio pallone. Ha girato la frontiera più di chiunque, e ogni volta che lo racconta la frontiera diventa più grande.',
            'La domenica vado da lui a giocare a tavola. Bara. Io pure. Nessuno dei due lo ammette.',
            'Se ti racconta del lupo bianco grande come un carro: era un cane. Grande come un cane.',
          ],
        },
      ],
      choices: [
        { text: 'Gli vuoi bene, eh?', to: 'corvino_bene' },
        { text: '(Torna agli altri discorsi.)', to: 'argomenti' },
      ],
    },
    corvino_bene: {
      fam: 2,
      say: [
        { when: { famMin: 40 }, text: ['(Un silenzio lungo.) È l’unico che sa dove vado quando non ci sono. Fai tu.', 'E se glielo racconti, ti metto l’ortica nel tè.'] },
        { text: '(Ti punta contro il pestello.) Io voglio bene alla malva, al tiglio e al silenzio. Corvino è un’abitudine. Come il mal di schiena.' },
      ],
      next: 'argomenti',
    },
    bosco: {
      say: [
        {
          text: [
            'Il Bosco Basso è mio, nel senso che lo conosco come la mia cucina. Funghi, more, ortiche, achillea, la belladonna sotto il fosso: quella non toccarla.',
            'Oltre il fosso… (si interrompe) è un altro discorso. La gente del paese non ci va. Fa bene.',
          ],
        },
      ],
      choices: [
        { text: 'Tu ci sei mai andata?', to: 'bosco2' },
        { text: 'Lino dice che di là c’è un gigante.', to: 'gigante' },
        { text: '(Torna agli altri discorsi.)', to: 'argomenti' },
      ],
    },
    bosco2: {
      say: [
        { when: { famMin: 45 }, text: ['(Abbassa la voce.) Qualche volta. Ci sono erbe che crescono solo di là. Le cose che crescono solo di là bisogna andarle a prendere di persona.', 'Non chiedermi altro. Non oggi.'] },
        { text: '(Il pestello si ferma un istante.) Che domanda. Io raccolgo erbe, non avventure.' },
      ],
      next: 'argomenti',
    },
    gigante: {
      say: [{ text: ['Lino dice tante cose. Una volta ha detto che io cucino i bambini nella zuppa. (Mescola il mortaio con aria pensosa.) Gli bastava guardare la zuppa: ortiche.', 'Un gigante. Mh. Ci sono impronte, di là, che non so di chi siano. Ma questo non dirlo a Lino, che poi non dorme.'] }],
      next: 'argomenti',
    },
    gatto: {
      fam: 3,
      say: [
        {
          text: [
            'Brace. Si chiama Brace. Agnese lo chiamava così perché d’inverno dormiva nella cenere calda e usciva grigio e furioso.',
            'Non è tuo e non era suo. È della casa. I gatti scelgono le case, non le persone. Se resta, vuol dire che la casa ti ha accettato.',
            'Dagli un dito di latte la mattina e non toccargli la pancia. Non è un consiglio: è un avvertimento.',
          ],
        },
      ],
      set: ['sa_nome_gatto'],
      next: 'argomenti',
    },
    strega: {
      fam: 2,
      say: [
        {
          text: [
            '(Il pestello batte una volta sola, forte.) Perché vivo sola, so leggere, conosco i veleni e non ho paura del buio. Per un paese è abbastanza.',
            'Le streghe nelle storie fanno incantesimi. Io faccio tisane. Se le tisane fossero incantesimi, Martino non avrebbe più la gotta.',
          ],
        },
      ],
      next: 'argomenti',
    },
    lezione: {
      say: [
        { when: { notSeen: 'l_malva' }, text: 'Una cosa alla volta. Oggi: la malva. Quella con i fiori viola che crescono lungo i muri.' },
        { when: { notSeen: 'l_achillea' }, text: 'Seconda lezione. L’achillea: foglie come piume, fiori bianchi a ombrello.' },
        { when: { notSeen: 'l_ruta' }, text: 'Terza lezione, e attento a questa. La ruta.' },
        { text: 'Per oggi basta. Le lezioni sono come il sale: troppe rovinano tutto.' },
      ],
      choices: [
        { text: 'Dimmi della malva.', to: 'l_malva', when: { notSeen: 'l_malva' } },
        { text: 'Dimmi dell’achillea.', to: 'l_achillea', when: { seen: 'l_malva', notSeen: 'l_achillea' } },
        { text: 'Dimmi della ruta.', to: 'l_ruta', when: { seen: 'l_achillea', notSeen: 'l_ruta' } },
        { text: '(Torna agli altri discorsi.)', to: 'argomenti' },
      ],
    },
    l_malva: { fam: 2, set: ['erba_malva'], say: [{ text: ['La malva calma tutto: la gola, la pancia, la pelle arrossata. Si coglie in fiore, si fa seccare all’ombra.', 'È l’erba dei poveri e dei bambini, perché non fa mai male. Le erbe che non fanno mai male sono le più sottovalutate. Come certe persone.'] }], next: 'argomenti' },
    l_achillea: { fam: 2, set: ['erba_achillea'], say: [{ text: ['L’achillea ferma il sangue. La chiamano erba dei tagli, o erba del soldato, anche se qui soldati non ce ne sono, grazie al cielo.', 'Pestata e messa sulla ferita. Brucia un po’. Le cose che guariscono spesso bruciano un po’.'] }], next: 'argomenti' },
    l_ruta: { fam: 3, set: ['erba_ruta'], say: [{ text: ['La ruta. Poca, pochissima. Un rametto nel vino per lo stomaco, un ciuffo appeso contro le pulci.', 'Troppa fa male, e alle donne incinte fa malissimo. Ecco perché dicono che le erbaie sono streghe: perché sappiamo dove finisce la cura e comincia il veleno. Di solito è una questione di quantità.'] }], next: 'argomenti' },
    luna: {
      fam: 6,
      say: [
        {
          text: [
            '(Ti fissa a lungo. Poi posa tutto, e parla piano, senza guardarti.)',
            'Oltre il fosso, in una radura che non ha nome, cresce l’erba lunaria. Si apre solo con la luna piena. Calma le febbri che nessun’altra erba calma. Ci vado da vent’anni.',
            'Di là ho visto luci che camminavano tra gli alberi. Non lucciole. Non lanterne. Si fermavano quando mi fermavo io.',
            'Lo sa solo Corvino. Adesso lo sai anche tu. Non farmene pentire.',
          ],
        },
      ],
      set: ['sa_erba_lunaria'],
      next: 'argomenti',
    },
  },
  barks: [
    [['mortaio'], ['Pesta, pesta, che la resina non si scioglie da sola.', 'Troppa piantaggine. Pazienza.', 'Dove ho messo il miele? Ah.', 'Mh. Questa achillea l’hanno colta col sole sbagliato.']],
    [['mazzi'], ['Testa in giù, e zitta.', 'Il timo quest’anno è venuto bene. Non dirglielo, che si monta la testa.', 'Uno, due, tre mazzi… quattro. Basta spago.']],
    [['zuppa'], ['Sale. No. Sì. Un pizzico.', 'Le ortiche pungono finché non cuociono. Come Teresa.']],
    [['leggendo'], ['"La malva calma la gola." Lo so, l’ho scritto io.', 'Questa pagina è macchiata di tè. Di quale anno? Ah, quello.']],
    [['finestra'], ['Luna crescente. Fra sette giorni.', 'Le volpi sono inquiete stasera.']],
    [['tisana'], ['Acqua, fuoco, tiglio. Il resto è chiacchiera.']],
    [['barattoli'], ['Chi ha messo la camomilla vicino alla ruta? Io. Ovvio.', 'Piove. Bene per l’orto, male per me.']],
  ],
};
