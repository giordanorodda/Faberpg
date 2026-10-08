import type { Character } from '../../interni/types';

/**
 * Corvino Lanterna, il Cartografo. Bozze, come tutti i dialoghi.
 * Tono: frasi lunghe e fiorite, parole antiche, digressioni, poi "ma divago";
 * misura tutto in passi e giornate; malinconia che spunta e si nasconde.
 */
export const CORVINO: Character = {
  id: 'corvino',
  name: 'Corvino Lanterna',
  epithet: 'il Cartografo',
  age: 67,
  role: 'cartografo a riposo',
  house: 'cartografo',
  sheet: {
    personality:
      'Chiacchierone, generoso, vanitoso in modo innocuo, curiosissimo. Racconta storie della frontiera gonfiandole un poco, e se lo scoprono ammette con un occhiolino. Gentile con i bambini e con chi ascolta. Sotto l’allegria, una malinconia antica che affiora la sera. Pignolo sui nomi dei luoghi: per lui ogni posto ha un nome vero, e chiamarlo male è un’offesa.',
    voice:
      'Frasi lunghe, parole un po’ antiche ("orbene", "or dunque", "per l’appunto"), digressioni continue che interrompe con "ma divago". Misura le distanze in passi e giornate di cammino, indica i punti cardinali. Dà del tu ma con cerimonia: chiama la persona nuova "giovane vicino" o "vicina mia". Ride di sé.',
    background:
      'Per quarant’anni ha disegnato mappe della frontiera, oltre il fosso, per chiunque le chiedesse e soprattutto per sé. Ha camminato dove nessuno del paese osa. Dieci anni fa ha smesso di andare, all’improvviso, e da allora disegna a casa: mappe vecchie ricopiate, mappe del paese, una grande mappa notturna che non finisce mai. Ripara strumenti (bussole, astrolabi, orologi), insegna le lettere a Lino, beve un bicchiere all’osteria il venerdì. Ha fatto lui il ritratto a carboncino di Agnese.',
    secrets:
      'Nella sua ultima spedizione era con una compagna di viaggio, Isaura, cartografa come lui. Si sono separati in una nebbia, in un punto della frontiera che non è mai riuscito a ritrovare sulla carta: c’è una macchia bianca nella sua grande mappa, ed è lì. Lei non è tornata. Ogni notte ridisegna quel tratto. Inoltre la sua vista cala: non riesce più a tracciare le linee sottili e se ne vergogna; vorrebbe un apprendista e non osa chiederlo. Sa delle uscite notturne di Ysolde oltre il fosso e la copre.',
    likes: ['i nomi veri dei luoghi', 'le mappe ben fatte', 'chi ascolta le sue storie fino in fondo', 'il vino di Martino il venerdì', 'la domenica a tavola con Ysolde', 'le bussole antiche'],
    dislikes: ['chi chiama "là in fondo" un posto che ha un nome', 'le mappe copiate male', 'la nebbia', 'sentirsi vecchio', 'chi tocca i suoi strumenti con le dita unte'],
    relations: {
      'Ysolde Malvarossa (la Malvarossa)': 'la persona più saggia del paese, e la più spinosa. Ogni domenica giocano a tavola e barano entrambi. La copre quando va oltre il fosso. Non le ha mai detto quanto la stima.',
      'la vecchia Agnese': 'cara amica; le ha fatto un ritratto a carboncino quando ancora ci vedeva bene. Rideva alle sue storie anche quando le aveva già sentite.',
      'Lino Bassi': 'il suo allievo di lettere; gli racconta storie; sul gigante non dice né sì né no.',
      'Bruna Ferri': 'conosce i sentieri meglio di lui ormai; le invidia le gambe.',
      'Elia Monti': 'avrebbe la stoffa dell’esploratore. Lui ha paura di incoraggiarlo.',
      'Martino Galli': 'il venerdì sera gli versa il vino e ascolta le stesse storie da vent’anni.',
      'Pietro Sala': 'vecchio amico smemorato: si raccontano le stesse cose, ognuno convinto di raccontarle per la prima volta.',
      'Teresa Bassi': 'gli vende la carta e l’inchiostro, troppo cari.',
    },
    knowledge: [
      'Conosce la frontiera oltre il fosso come pochi: la Valle delle Nebbie Basse, il Guado dei Tre Sassi, la Radura Muta, le rovine che chiama "la Città Coricata". Sono nomi suoi: li ha dati lui.',
      'Sa usare bussola, astrolabio, compasso; sa leggere le stelle per orientarsi.',
      'Sa che nella frontiera le strade a volte non portano dove dovrebbero, e che la nebbia lì è diversa. Non sa perché.',
      'Non conosce città lontane di persona: è sempre andato a est, verso la frontiera, mai a ovest.',
    ],
    limits: ['Non parla di Isaura se non con chi gli è davvero vicino, e anche allora a pezzi.', 'Non incoraggia nessuno ad andare oltre il fosso da solo.'],
  },
  routine: [
    { from: '00:00', to: '07:30', spot: 'letto', doing: 'dormendo, russando appena' },
    { from: '07:30', to: '08:30', spot: 'stufa', doing: 'preparandosi l’orzo caldo' },
    { from: '08:30', to: '12:00', spot: 'mappe', doing: 'disegnando una mappa al tavolo grande' },
    { from: '12:00', to: '13:00', spot: 'tavola', doing: 'mangiando zuppa e leggendo un vecchio taccuino' },
    { from: '13:00', to: '14:00', spot: 'poltrona', doing: 'facendo un pisolino in poltrona' },
    { from: '14:00', to: '16:00', spot: 'banco', doing: 'riparando una bussola al banco degli strumenti' },
    { from: '16:00', to: '17:30', spot: 'fuori', doing: 'in piazza a insegnare le lettere a Lino' },
    { from: '17:30', to: '19:00', spot: 'cannocchiale', doing: 'guardando col cannocchiale verso est' },
    { from: '19:00', to: '20:00', spot: 'tavola', doing: 'cenando' },
    { from: '20:00', to: '23:59', spot: 'mappe', doing: 'lavorando alla grande mappa notturna' },
    // il venerdì sera all'osteria
    { from: '20:00', to: '23:00', spot: 'fuori', doing: 'all’osteria, a raccontare storie', days: [4] },
    // la domenica pomeriggio, a tavola con Ysolde
    { from: '15:00', to: '18:00', spot: 'gioco', doing: 'giocando a tavola con Ysolde', days: [6] },
    // con la pioggia niente piazza: legge in poltrona
    { from: '16:00', to: '17:30', spot: 'poltrona', doing: 'leggendo in poltrona, perché piove', weather: ['rain'] },
  ],
  dialogue: {
    saluto: {
      say: [
        { when: { first: true }, text: ['(Si alza di scatto, rovesciando quasi il calamaio, e ti tende la mano macchiata d’inchiostro.)', 'Ma guarda, guarda! Il nuovo abitante della casa di Agnese, quella sulla curva, ventitré passi dal pozzo, trentuno se si ha fretta! Corvino Lanterna, cartografo. A riposo, dicono. Io dico: in attesa.', 'Entra, entra. Non toccare la mappa grande. Ecco, quella. No, l’altra. Insomma: guarda con gli occhi.'] },
        { when: { doing: ['dormendo'] }, text: '(Dorme della grossa, gli occhiali ancora sul naso. Sul petto, un taccuino aperto che si alza e si abbassa.)' },
        { when: { doing: ['disegnando'], firstToday: true }, text: ['(Non alza la penna dalla carta.) Un momento, un momento… un torrente non si interrompe a metà, sennò dove va l’acqua? Ecco. Dimmi, vicino mio.'] },
        { when: { doing: ['notturna'] }, text: ['(La candela è consumata a metà, la mappa piena di cancellature.) Ah, sei tu. Credevo fosse il vento. Siediti, ma non davanti alla luce.'] },
        { when: { doing: ['bussola'] }, text: ['(Ha una lente all’occhio e una bussola smontata davanti.) Guarda qui: l’ago è stanco. Anche gli aghi si stancano, sai? Come i cartografi. Dimmi.'] },
        { when: { doing: ['cannocchiale'] }, text: ['(Non stacca l’occhio dal cannocchiale.) Est, sempre est. Il fumo sopra la Radura Muta oggi va dritto: niente vento. Che c’è?'] },
        { when: { doing: ['pisolino'] }, text: '(Russa piano, un dito ancora infilato tra le pagine di un libro.) …e il guado era asciutto… (Apre un occhio.) Eh? Chi va là?' },
        { when: { doing: ['orzo'] }, text: 'Buongiorno! Orzo? È solo orzo, ma ci aggiungo un pizzico di cannella che compro da Teresa a prezzo di rapina. Il lusso dei vecchi.' },
        { when: { doing: ['cenando', 'zuppa'] }, text: ['(Si pulisce la barba col tovagliolo.) Arrivi giusto: la zuppa è finita. Ma c’è conversazione, che sfama di più.'] },
        { when: { doing: ['tavola con Ysolde'] }, text: ['Shh! Sto perdendo con dignità. (Abbassa la voce.) È il momento più delicato della settimana: Ysolde sta per barare e io devo fingere di non vedere.'] },
        { when: { doing: ['leggendo'] }, text: 'Piove, e io viaggio con le pagine. È il modo più comodo di bagnarsi i piedi.' },
        { when: { famMin: 40, firstToday: true }, text: ['Eccoti! Ti aspettavo. Cioè, non ti aspettavo, ma ero contento all’idea che passassi. Che è meglio.'] },
        { when: { firstToday: false }, text: 'Di nuovo qui? Bene, bene. Le visite sono come le stelle: due in una notte sono già una costellazione.' },
        { text: 'Orbene! Chi si vede.' },
        { text: '(Alza gli occhiali sulla fronte.) Ah, il mio giovane vicino. Che vento ti porta?' },
        { text: 'Bentornato nella casa delle mappe. Bada al tappeto: si arriccia.' },
      ],
    },
    argomenti: {
      say: [{ text: 'E poi? Ho tempo, il tempo è l’unica cosa che ho in abbondanza.' }, { text: '(Si sistema gli occhiali, in attesa.)' }, { text: 'Or dunque?' }, { text: 'Dimmi, dimmi.' }],
      choices: [
        { text: 'Chi sei? Cosa fa un cartografo?', to: 'chi', once: true },
        { text: 'Su cosa stai lavorando?', to: 'lavoro' },
        { text: 'Raccontami della frontiera.', to: 'frontiera' },
        { text: 'Cos’è quella macchia bianca sulla mappa grande?', to: 'macchia', when: { seen: 'frontiera' } },
        { text: 'Chi era Isaura?', to: 'isaura', when: { seen: 'macchia', famMin: 40 }, once: true },
        { text: 'Mi insegneresti a leggere una mappa?', to: 'lezione' },
        { text: 'Hai fatto tu il ritratto di Agnese?', to: 'agnese', once: true },
        { text: 'Cosa pensi di Ysolde?', to: 'ysolde' },
        { text: 'E gli altri, in paese?', to: 'paese' },
        { text: 'Il gigante di Lino esiste?', to: 'gigante', once: true },
        { text: 'Come vanno gli occhi?', to: 'occhi', when: { famMin: 25 }, once: true },
        { text: 'Potrei aiutarti con le mappe, se vuoi.', to: 'apprendista', when: { seen: 'occhi' }, once: true },
        { text: 'Parliamo liberamente…', to: '__chat' },
        { text: 'Ti lascio alle tue mappe.', to: '__fine' },
      ],
    },
    chi: {
      fam: 3,
      say: [
        {
          text: [
            'Cosa fa un cartografo! (Allarga le braccia, e un foglio vola via.) Dà un nome alle cose perché si possano ritrovare. Senza nomi, il mondo è una stanza buia piena di mobili.',
            'Per quarant’anni ho camminato oltre il fosso, verso est, con la bussola, il quaderno e i piedi. Soprattutto i piedi. Ho dato un nome a tre valli, due guadi, una radura e a una città in rovina che chiamo la Città Coricata, perché sembra addormentata su un fianco.',
            'Adesso disegno qui. A riposo. (Una pausa.) Ma divago.',
          ],
        },
      ],
      choices: [
        { text: 'Perché hai smesso di andare?', to: 'smesso' },
        { text: '(Torna agli altri discorsi.)', to: 'argomenti' },
      ],
    },
    smesso: {
      say: [
        { when: { famMax: 39 }, text: ['(Si gratta la barba, guarda la finestra.) Le ginocchia, sai. E la nebbia. La nebbia di là non è come quella dello stagno.', 'Un giorno te lo racconto meglio. Non oggi. Oggi c’è il sole, sarebbe uno spreco.'] },
        { text: ['Perché un giorno sono tornato da solo, quando eravamo partiti in due. (Lo dice semplice, come si dice il tempo.)', 'Da allora la frontiera la disegno. Camminarla, non ci riesco più.'] },
      ],
      next: 'argomenti',
    },
    lavoro: {
      say: [
        { when: { doing: ['disegnando'] }, text: ['Una mappa del paese per Teresa: vuole appenderla in bottega, "così i forestieri trovano la strada". Quali forestieri, dico io? Ma la faccio. Con il pozzo al centro, che è giusto.', 'Guarda qui: ho messo anche la tua casa. Vedi? Con il fumo che esce dal camino. Un tocco artistico.'] },
        { when: { doing: ['notturna'] }, text: ['La grande mappa. La frontiera intera, come la ricordo. Ogni notte ne correggo un pezzo.', 'È come cercare di ricordare un sogno: più ci pensi, più cambia.'] },
        { when: { doing: ['bussola'] }, text: ['Una bussola di Pietro. L’ha lasciata cadere nello stagno, poi si è dimenticato di averla lasciata cadere, poi si è ricordato di avermela portata. Pietro è un uomo di fede.', 'L’ago ha preso l’acqua. Lo asciugo, lo magnetizzo con la calamita, e torna a puntare a nord. Gli aghi non dimenticano il nord, per fortuna.'] },
        { when: { doing: ['cannocchiale'] }, text: ['Guardo verso est. Di qui si vede la linea degli alberi oltre il fosso, e sopra, quando è limpido, il fumo leggero della Radura Muta.', 'Nessuno sa cosa bruci, laggiù. Io non lo so. E sono quello che ne sa di più. (Ride, ma breve.)'] },
        { text: 'Lavoro, per così dire. Un cartografo non smette mai: anche quando dorme, sogna strade.' },
      ],
      next: 'argomenti',
    },
    frontiera: {
      fam: 2,
      say: [
        {
          text: [
            '(Gli si illuminano gli occhi.) Ah, la frontiera! Oltre il fosso, una giornata a est. Prima la Valle delle Nebbie Basse, dove l’erba è alta fino alla vita e la mattina sembra di camminare nel latte.',
            'Poi il Guado dei Tre Sassi: tre, non quattro, chi dice quattro conta anche la tartaruga. Poi la Radura Muta, dove gli uccelli smettono di cantare, nessuno sa perché. E più in là, la Città Coricata: pietre enormi, scale che non portano da nessuna parte.',
            'E poi… e poi la mappa diventa bianca. Ma divago.',
          ],
        },
      ],
      choices: [
        { text: 'La Città Coricata? Chi l’ha costruita?', to: 'citta' },
        { text: 'Perché gli uccelli smettono di cantare?', to: 'radura' },
        { text: 'Hai mai incontrato qualcuno, di là?', to: 'incontri' },
        { text: '(Torna agli altri discorsi.)', to: 'argomenti' },
      ],
    },
    citta: { fam: 1, say: [{ text: ['Nessuno lo sa. Pietre squadrate grandi come case, coperte di muschio e di segni che non sono lettere. Scale che salgono e si fermano a mezz’aria.', 'Una volta ci ho dormito, sotto un arco. Ho sognato che la città si girava sull’altro fianco. Al mattino la mia bussola puntava a sud. (Si stringe nelle spalle.) Bussola vecchia.'] }], next: 'frontiera' },
    radura: { fam: 1, say: [{ text: ['Non lo so. È la risposta più onesta che un cartografo possa dare, e la più rara.', 'Il silenzio comincia in un punto preciso. L’ho segnato sulla mappa con una linea tratteggiata. Al di qua, merli e cinciallegre. Al di là, niente. Nemmeno il vento fa rumore tra le foglie.'] }], next: 'frontiera' },
    incontri: {
      say: [
        { when: { famMin: 30 }, text: ['Qualche volta. Un vecchio che pescava in un fiume senza pesci, e mi ha offerto il suo pranzo: niente. L’ho mangiato per educazione.', 'E delle luci, la notte. Ysolde le ha viste anche lei, ma se te lo dico mi ammazza, quindi non te l’ho detto.'] },
        { text: 'Animali, soprattutto. Un lupo bianco grande come un carro. (Ti guarda.) Va bene: come un cane grosso. Ma molto bianco.' },
      ],
      next: 'frontiera',
    },
    macchia: {
      fam: 3,
      say: [
        { when: { famMax: 39 }, text: ['(Lo sguardo gli si fa lontano.) Quella. È il punto che non riesco a disegnare. Un tratto di valle, tra la Radura Muta e la Città Coricata. Ci sono passato, lo so. Ma non ricordo com’era.', 'Un cartografo che dimentica un posto. Che vergogna, eh? (Prova a sorridere.) Ma divago.'] },
        { text: ['È il punto dove ci siamo separati, io e Isaura. Una nebbia, la mattina. Lei era cinque passi davanti a me. Poi non c’era più.', 'Ho cercato per tre giorni. Poi sono tornato. Da allora quel tratto resta bianco: ogni volta che provo a disegnarlo, la mano si ferma.'] },
      ],
      next: 'argomenti',
    },
    isaura: {
      fam: 6,
      say: [
        {
          text: [
            '(Si toglie gli occhiali e li pulisce a lungo, molto più a lungo del necessario.)',
            'Isaura Venti. Cartografa, come me, ma più brava: disegnava i fiumi come se scorressero davvero sulla carta. Abbiamo camminato insieme per diciotto anni. Litigavamo sui nomi dei posti: lei voleva nomi belli, io nomi veri.',
            'La Radura Muta l’ha chiamata lei. Io la chiamavo "la radura senza uccelli". Aveva ragione lei: il nome bello era anche quello vero.',
            '(Rimette gli occhiali.) Ecco. Adesso lo sai. Non è una storia da osteria. Tienila per te.',
          ],
        },
      ],
      set: ['sa_isaura'],
      next: 'argomenti',
    },
    lezione: {
      say: [
        { when: { notSeen: 'm_nord' }, text: 'Una mappa si legge come un viso: prima si guarda dove guarda.' },
        { when: { notSeen: 'm_scala' }, text: 'Seconda lezione: le distanze.' },
        { when: { notSeen: 'm_nomi' }, text: 'Terza lezione, la più importante: i nomi.' },
        { text: 'Hai imparato tutto quello che ti posso insegnare stando seduti. Il resto lo insegnano i piedi.' },
      ],
      choices: [
        { text: 'Dove guarda una mappa?', to: 'm_nord', when: { notSeen: 'm_nord' } },
        { text: 'Come si misurano le distanze?', to: 'm_scala', when: { seen: 'm_nord', notSeen: 'm_scala' } },
        { text: 'Perché i nomi sono così importanti?', to: 'm_nomi', when: { seen: 'm_scala', notSeen: 'm_nomi' } },
        { text: '(Torna agli altri discorsi.)', to: 'argomenti' },
      ],
    },
    m_nord: { fam: 2, set: ['mappa_nord'], say: [{ text: ['A nord. Sempre. Il nord sta in alto, e se te ne dimentichi giri la mappa finché il pozzo non è dove lo vedi.', 'Di giorno il sole ti dice dov’è il sud a mezzogiorno. Di notte, la stella fissa sopra il Bosco Basso, quella che non si muove mai. La chiamo la Chiodo. Ci appendo le mappe.'] }], next: 'argomenti' },
    m_scala: { fam: 2, set: ['mappa_scala'], say: [{ text: ['In passi, e in giornate. Un passo mio è un braccio e mezzo. Dal pozzo alla tua porta: ventitré.', 'Una giornata è quanto cammini dall’alba al tramonto senza odiare nessuno. In pianura, trenta mila passi. In salita, meno, e odi tutti.'] }], next: 'argomenti' },
    m_nomi: { fam: 3, set: ['mappa_nomi'], say: [{ text: ['Perché un posto senza nome non lo ritrova nessuno. E un posto con il nome sbagliato ti porta dove non vuoi.', 'Quando dai un nome a un posto, prometti di ricordarlo. È una promessa seria. (Guarda verso la mappa grande, verso la macchia bianca.) Io ne ho mancata una.'] }], next: 'argomenti' },
    agnese: {
      fam: 3,
      say: [
        {
          text: [
            'Sì. Molti anni fa, quando la mano era ancora ferma. Rideva, e io le ho detto "stai ferma", e lei rideva di più. Così l’ho disegnata ridendo. È l’unico ritratto che abbia mai fatto: io disegno valli, non visi.',
            'Era una donna che riempiva le stanze. Adesso la sua è piena di te. (Ti guarda sopra gli occhiali.) Vediamo come te la cavi.',
          ],
        },
      ],
      next: 'argomenti',
    },
    ysolde: {
      fam: 2,
      say: [
        { when: { doing: ['tavola con Ysolde'] }, text: ['(Sottovoce, coprendosi la bocca.) È la persona più saggia del paese e la più spinosa. Un cardo con la laurea.', 'Non dirglielo. Mi toglierebbe la parola per una settimana, e la domenica giocherei da solo.'] },
        {
          text: [
            'Ysolde! (Ride.) Un cardo. Bello, utile, e guai a chi lo prende a mani nude. La domenica viene qui a giocare a tavola e a dirmi che le mie storie sono gonfie.',
            'Lo sono. Ma lei le ascolta tutte fino in fondo. Sai quanto è raro? Quasi quanto un guado asciutto in primavera.',
          ],
        },
      ],
      choices: [
        { text: 'Lei dice che sei un vecchio pallone.', to: 'ysolde_pallone', when: { seen: 'corvino' } },
        { text: '(Torna agli altri discorsi.)', to: 'argomenti' },
      ],
    },
    ysolde_pallone: { fam: 2, say: [{ text: ['(Si gonfia, offeso, poi si sgonfia ridendo.) Un pallone! Ha sempre avuto il dono delle definizioni esatte.', 'Ma sai cosa vuol dire, se Ysolde ti parla di me? Che le sto simpatico. Se non le stessi simpatico, non mi nominerebbe nemmeno. È così che si capisce, con lei.'] }], next: 'argomenti' },
    paese: {
      say: [{ text: 'Il paese! Una mappa di caratteri. Chi vuoi che ti descriva?' }],
      choices: [
        { text: 'Lino, il tuo allievo.', to: 'p_lino' },
        { text: 'Elia, l’apprendista falegname.', to: 'p_elia' },
        { text: 'Bruna, la boscaiola.', to: 'p_bruna' },
        { text: 'Martino, l’oste.', to: 'p_martino' },
        { text: 'Pietro, il pescatore.', to: 'p_pietro' },
        { text: 'Basta così.', to: 'argomenti' },
      ],
    },
    p_lino: { say: [{ text: ['Lino! Il miglior allievo che abbia mai avuto, cioè l’unico. Scrive la erre al contrario e inventa storie migliori delle mie.', 'Mi ha chiesto se il gigante esiste. Gli ho detto: "Sulle mie mappe non c’è." Lui ha risposto: "Allora le tue mappe sono incomplete." Ha ragione, il furfante.'] }], next: 'paese' },
    p_elia: { say: [{ text: ['Elia viene a guardare le mappe quando Ottavio non lo vede. Ha gli occhi di chi partirà. Io conosco quello sguardo: lo vedevo nello specchio.', 'Non gli dico di andare. Non gli dico di restare. Gli insegno a leggere le stelle. Se parte, almeno saprà tornare.'] }], next: 'paese' },
    p_bruna: { say: [{ text: 'Bruna conosce i sentieri del Bosco Basso meglio di me, ormai. Ha le gambe che avevo io. Gliele invidio, e lei lo sa, e non dice niente. È una donna di grande tatto e pochissime parole.' }], next: 'paese' },
    p_martino: { say: [{ text: ['Martino mi versa il vino il venerdì e ascolta le mie storie da vent’anni. Ride sempre negli stessi punti. Un pubblico perfetto.', 'Credo che a un certo punto abbia smesso di ascoltare e abbia cominciato solo a ridere nei punti giusti. È lo stesso, alla mia età.'] }], next: 'paese' },
    p_pietro: { say: [{ text: 'Pietro e io ci raccontiamo le stesse storie, ognuno convinto di raccontarle per la prima volta. È un’amicizia molto riposante.' }], next: 'paese' },
    gigante: {
      fam: 2,
      say: [
        {
          text: [
            '(Si accarezza la barba.) Ah. Il gigante. Sulle mie mappe non c’è. Ma le mie mappe hanno una macchia bianca, quindi non posso giurarci.',
            'Una volta, oltre il guado, ho visto un’impronta nel fango lunga quanto questo tavolo. L’ho disegnata nel taccuino. Poi ha piovuto. (Fa spallucce.) Magari era un sasso con delle ambizioni.',
          ],
        },
      ],
      next: 'argomenti',
    },
    occhi: {
      fam: 4,
      say: [
        {
          text: [
            '(Si toglie gli occhiali, li guarda come fossero un tradimento.) Male. Le linee sottili mi scappano. I fiumi mi vengono tremolanti, come se avessero freddo.',
            'Un cartografo che non vede le linee è come un musicista sordo. Si può ancora fare, ma bisogna ricordare molto bene.',
          ],
        },
      ],
      set: ['sa_occhi_corvino'],
      next: 'argomenti',
    },
    apprendista: {
      fam: 8,
      say: [
        {
          text: [
            '(Ti guarda a lungo. Poi si schiarisce la voce, due volte.)',
            'Tu… tu mi aiuteresti? A tracciare le linee sottili, mentre io ti dico dove vanno?',
            '(Si alza, gira intorno al tavolo, si risiede.) Orbene. Sì. Sì! Vieni quando vuoi. Ti insegnerò a tenere la penna, a non macchiare, a dare i nomi giusti. E un giorno, forse, mi aiuterai a riempire anche quel bianco.',
          ],
        },
      ],
      set: ['apprendista_corvino'],
      next: 'argomenti',
    },
  },
  barks: [
    [['disegnando', 'notturna'], ['Un po’ più a est… no. Sì. Accidenti.', 'Il Guado dei Tre Sassi. Tre. Tre!', 'Questa linea trema. Come me.', 'Inchiostro, inchiostro… chi ha bevuto il mio inchiostro?']],
    [['bussola'], ['Su, piccolo ago, trova il nord.', 'Questa vite è più vecchia di me. Quasi.']],
    [['cannocchiale'], ['Fumo dritto. Niente vento oltre il fosso.', 'Est. Sempre est.']],
    [['orzo'], ['Cannella. Il lusso dei vecchi.', 'Orzo, ma con dignità.']],
    [['leggendo'], ['"Il viaggiatore prudente porta sempre due bussole." E perde entrambe, aggiungo io.']],
    [['tavola con Ysolde'], ['Hai barato. No, non hai barato. Hai… interpretato le regole.', 'Tocca a te, Ysolde. Da un quarto d’ora.']],
  ],
};
