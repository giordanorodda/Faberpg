# Un piccolo mondo in cui abitare

*Project bible — working design document*

RPG old-school · roguelike · life simulation · slow fantasy

Documento di visione e specifica iniziale destinato a supportare il prototyping e il vibecoding con Codex o strumenti analoghi. Il documento descrive l’intenzione di design; le scelte tecnologiche definitive dovranno essere validate durante la prima vertical slice.

## 1. Visione

Il progetto è un RPG old-style di piccola scala, con una componente roguelike concentrata sulle spedizioni oltre il territorio conosciuto. Il riferimento strutturale è il CRPG classico, con la densità narrativa e la familiarità di un piccolo mondo persistente. L’ispirazione emotiva è quella dei primi MMORPG: il piacere di stare in un luogo anche quando non c’è una grande impresa da compiere, come pescare sotto le stelle in una radura della Elwynn Forest.

Il gioco non deve puntare sull’ampiezza del mondo, sulla spettacolarità visiva o sulla quantità di contenuti. Il suo valore deve derivare dalla cura percepibile in ogni elemento. L’obiettivo è costruire un piccolo mondo che il giocatore impari a conoscere e al quale possa affezionarsi.

La formula sintetica è: un RPG in cui non devi diventare qualcuno; devi avere una vita.

## 2. Il sentimento che il gioco deve produrre

Il gioco dovrebbe essere un luogo nel quale tornare per una sessione breve o lunga. Il giocatore può giocare mezz’ora, fare una cosa piccola e chiudere il gioco con la sensazione di aver vissuto una giornata in quel mondo.

Il ritmo deve essere rilassato. La quiete non va considerata un difetto di pacing. Una sessione in cui il giocatore pesca, passeggia, sistema la casa e parla con un NPC può essere una sessione riuscita.

Il gioco deve lasciare spazio a una forma di noia buona: il piacere dell’attesa, della ripetizione, dell’osservazione e della permanenza. La noia cattiva nasce dall’assenza di significato; la quiete deve invece avere un senso di luogo.

Il mondo non deve continuamente chiedere attenzione al giocatore. Deve essere possibile ignorare una quest, rimandare un’esplorazione, restare al villaggio, tornare a casa presto.

## 3. I principi di design

Il mondo è piccolo. L’estensione geografica non è un obiettivo.

La cura viene prima della quantità. Ogni elemento introdotto deve avere una ragione.

Il giocatore non deve essere necessariamente l’eroe che salva il mondo.

La vita quotidiana è gameplay.

Il tempo deve essere lento: idealmente un giorno di gioco corrisponde grosso modo a un giorno reale. Il mondo continua quando il giocatore non agisce.

Gli NPC sono persone, non interfacce per quest e negozi.

Nulla deve sembrare generato soltanto per riempire spazio.

Il gioco deve permettere di non fare nulla.

L’avventura deve emergere dalla quotidianità.

La morte deve produrre storia e non cancellare la storia del mondo.

La progressione deve essere anche orizzontale: casa, conoscenze, relazioni, mestieri e familiarità con il territorio contano quanto la forza.

Il gioco non deve avere fretta di mostrare tutto.

Il fallimento deve poter produrre conseguenze interessanti.

Ogni sessione deve poter essere sufficiente.

Il gioco deve essere affezionabile: il giocatore deve ricordare luoghi, persone e oggetti.

## 4. Cosa il gioco non deve diventare

- Un open world enorme e vuoto.
- Un MMORPG offline pieno di icone e checklist.
- Un survival game che obbliga continuamente a raccogliere risorse.
- Un gestionale economico nel quale la simulazione diventa il fine.
- Un life simulator complesso alla maniera di The Sims.
- Un action RPG basato su effetti, loot e combattimento continuo.
- Un gioco nel quale ogni attività esiste soltanto per aumentare una statistica.
- Un sistema procedurale che usa quantità per mascherare la mancanza di contenuto.
- Un gioco che punisce il giocatore perché non gioca abbastanza spesso.

## 5. Scala del mondo

La prima versione completa deve essere deliberatamente piccola. La proposta iniziale è un villaggio di circa 30–40 abitanti, circondato da un territorio relativamente ristretto. Il primo mondo dovrebbe comprendere il villaggio, la campagna immediatamente circostante, un bosco esplorabile, un piccolo corso d’acqua o lago e una o poche aree di rovina o sotterraneo.

Il mondo conosciuto deve essere persistente. Il giocatore deve poter sviluppare una memoria spaziale precisa: sapere dove vive una persona, quale sentiero conduce al mulino, dove si trova il laghetto, quale tratto di bosco diventa fangoso con la pioggia.

La scala narrativa può essere superiore alla scala fisica. Non serve rappresentare chilometri reali per far percepire distanza e isolamento.

## 6. Il villaggio

Il villaggio è il cuore del gioco e, in un certo senso, il suo vero dungeon. Il giocatore vi ritorna continuamente. Qui mangia, dorme, vende, compra, lavora sulla casa, costruisce relazioni e osserva il trascorrere delle generazioni.

Il villaggio deve cambiare nel corso della giornata.

- Mattino presto: strade quasi vuote, alcune case ancora chiuse.
- Mattina: apertura delle botteghe e inizio delle attività lavorative.
- Mezzogiorno: maggiore attività nella piazza e nei luoghi pubblici.
- Sera: ritorno dei lavoratori, taverna più frequentata, cambiamento della luce.
- Notte: poche finestre illuminate, attività limitate, maggiore silenzio.

Il calendario deve essere percepibile senza diventare una lista di eventi da seguire.

## 7. Gli NPC

Il numero limitato di abitanti è una scelta progettuale. Ogni NPC deve essere distinguibile e ricordabile. Non servono migliaia di personaggi generati proceduralmente.

Ogni NPC dovrebbe avere almeno:

- nome e identità visiva;
- età e fase della vita;
- abitazione;
- mestiere o attività principale;
- routine quotidiana;
- relazioni familiari e sociali;
- alcuni tratti caratteriali;
- preferenze e avversioni;
- memoria di eventi significativi;
- possibili sviluppi nel corso degli anni.

Un NPC non deve esistere principalmente per dare una quest. Può avere una quest, ma deve continuare a vivere anche quando il giocatore non interagisce con lui.

Le relazioni devono essere simmetriche: gli abitanti devono avere rapporti tra loro anche in assenza del giocatore. Amicizie, inimicizie, matrimoni, separazioni, rivalità professionali, debiti e piccoli pettegolezzi possono emergere dalla simulazione.

Esempio di principio: una bambina incontrata regolarmente davanti a casa può crescere, diventare

apprendista, cambiare mestiere e infine assumere la bottega di un adulto. Il gioco non deve

necessariamente annunciare questi passaggi con cutscene.

## 8. Tempo reale e ritmo

La scala temporale desiderata è quasi 1:1. Un giorno di gioco dovrebbe corrispondere grosso modo a un giorno reale. Il sistema deve comunque consentire di dormire e saltare alcune ore quando opportuno, senza trasformare il calendario in una risorsa da ottimizzare.

Il tempo deve essere percepito attraverso luce, routine, disponibilità degli NPC, apertura delle botteghe, attività degli animali, temperatura e atmosfera.

La lentezza è una caratteristica centrale. Un personaggio può trascorrere una sera semplicemente

pescando. Può sedersi in una taverna. Può sistemare la propria casa. Queste attività non devono essere subordinate a una quest.

Il gioco deve evitare meccaniche che creino FOMO: timer aggressivi, eventi che richiedono presenza quotidiana, ricompense che decadono rapidamente o sistemi che penalizzano l’assenza.

## 9. Giorno, notte e attività

Le attività devono avere una relazione naturale con l’orario. Il mondo non deve semplicemente cambiare la luminosità dello schermo.

- Alcuni NPC lavorano soltanto in determinate fasce orarie.
- Alcuni luoghi sono più vivi la sera.
- Alcuni animali e creature compaiono in momenti specifici.
- La pesca può cambiare con l’ora.
- Alcune erbe possono essere raccolte in determinati periodi.
- La notte può modificare la percezione e il rischio del bosco.
- Il giocatore può scegliere deliberatamente di restare fuori fino a tardi.

## 10. Stagioni

Le stagioni devono essere lente e significative. Non devono cambiare soltanto la tavolozza cromatica.

- variazione della vegetazione;
- disponibilità di raccolti e risorse;
- fauna e comportamenti animali;
- meteo e condizioni del terreno;
- durata del giorno;
- attività degli abitanti;
- abbigliamento;
- prodotti disponibili al mercato;
- eventi comunitari occasionali;
- cambiamenti nella casa e nel giardino.

Le stagioni devono inoltre dare al giocatore il senso del passaggio degli anni. Il tempo biologico è parte del mondo.

## 11. Nascite, crescita e generazioni

La comunità deve poter generare nuove persone nel corso del tempo. Le nascite non devono essere un evento da quest. Devono essere una conseguenza naturale delle relazioni e della simulazione.

Un bambino deve poter crescere. Un adolescente può iniziare un apprendistato. Un adulto può cambiare mestiere. Gli anziani possono morire. Il villaggio non deve restare congelato nella fotografia iniziale. Il sistema deve essere conservativo: una comunità di 30–40 persone non deve esplodere in migliaia di abitanti. Nascite, morti, partenze e arrivi devono mantenere una popolazione plausibile.

Il giocatore dovrebbe poter riconoscere una persona anni dopo e rendersi conto che è cambiata senza che il gioco glielo spieghi.

## 12. Il personaggio giocante

Il personaggio giocante deve avere un ruolo significativo ma non necessariamente centrale nella storia del mondo.

La progressione dovrebbe includere capacità, equipaggiamento, conoscenze, relazioni e miglioramenti della casa. La forza deve essere importante per l’esplorazione, ma non deve essere l’unica forma di crescita. Una partita può seguire un singolo personaggio per molti anni. Se il personaggio muore, è possibile continuare attraverso un altro abitante o un erede. Questo sistema deve essere progettato come opzione forte, non necessariamente come obbligo in ogni partita.

## 13. Il roguelike: la frontiera

La componente roguelike deve entrare quando il giocatore supera il territorio conosciuto. Non conviene applicarla uniformemente all’intero mondo.

Il modello proposto prevede tre fasce:

- Mondo domestico: villaggio e dintorni immediati. Persistente e fortemente curato.
- Mondo selvaggio: bosco e territorio vicino. Prevalentemente persistente, con variazioni stagionali e piccoli eventi.
- Frontiera: territorio profondo oltre una certa distanza dal villaggio. Generato o ricombinato proceduralmente per la spedizione.

Il passaggio alla frontiera deve essere diegetico. Non deve comparire una scritta come 'Roguelike Mode'. Il sentiero può diventare più selvaggio, la cartografia meno affidabile, la presenza umana più rara. Il giocatore deve capire di essersi allontanato dal mondo conosciuto.

La distanza dal villaggio è quindi un indicatore utile, ma il vero concetto è la transizione dal territorio abitato alla spedizione.

## 14. Spedizioni

La spedizione è la parte del gioco in cui il giocatore accetta rischio e incertezza.

Una spedizione può contenere:

- radure e percorsi alternativi;
- rovine;
- grotte e piccoli dungeon;
- accampamenti;
- creature;
- risorse rare;
- eventi casuali;
- luoghi misteriosi;
- oggetti unici o rari.

La mappa della frontiera può essere generata proceduralmente, ma deve usare una grammatica di luoghi coerente. La proceduralità deve produrre variazione, non caos.

La decisione fondamentale è spesso: continuo oppure torno indietro?

Il rischio può derivare dalla distanza, dalle risorse, dalle ferite, dalla luce, dal peso trasportabile e dall’imprevedibilità degli incontri. Non deve essere ridotto al semplice aumento dei punti vita dei nemici.

## 15. Il ritorno

Tornare al villaggio deve essere una parte significativa della spedizione. Il giocatore deve sentire il costo della distanza.

Una spedizione può iniziare al mattino e proseguire fino alla sera. Il giocatore deve poter accamparsi, rientrare oppure rischiare di continuare.

Il ritorno consegna il bottino e le informazioni alla parte persistente del gioco. Il villaggio può essere cambiato nel frattempo anche in modo minimo: un NPC ha terminato un lavoro, è iniziata una nuova

stagione, è nato un bambino, un negoziante ha modificato la propria disponibilità.

## 16. Morte e memoria

La morte deve essere coerente con la filosofia roguelike, ma senza trasformarsi in una cancellazione del mondo.

Quando un personaggio muore, possono rimanere:

- la casa e i suoi miglioramenti;
- oggetti conservati;
- conoscenze scoperte;
- relazioni e reputazione;
- tracce materiali;
- una lapide o un luogo della memoria;
- eventuali effetti sulla famiglia e sulla comunità.

Il personaggio successivo può incontrare tracce del precedente. Un abitante può ricordarlo. Una lapide può diventare parte del paesaggio.

La morte deve quindi essere una trasformazione della storia, non soltanto una schermata di game over.

## 17. Combattimento

Il combattimento deve essere old-school, leggibile e poco spettacolare. La grafica non deve richiedere effetti complessi.

Una possibile direzione è un sistema a turni con piccolo gruppo, statistiche contenute, ruoli leggibili, equipaggiamento e abilità. La decisione definitiva può essere presa durante il prototyping.

Il combattimento deve avere peso perché è pericoloso e costoso, non perché avviene continuamente.

Un combattimento evitato può essere una scelta corretta. La fuga deve essere una meccanica reale.

## 18. Esplorazione

L’esplorazione del territorio conosciuto deve essere rilassata. Il giocatore deve poter conoscere i luoghi attraverso la ripetizione.

Il bosco vicino può contenere sentieri, punti di pesca, alberi particolari, funghi, piccoli animali, ruderi e incontri. La conoscenza del territorio diventa una forma di progressione.

La frontiera invece deve mantenere il senso di scoperta. La mappa può essere incompleta e la

configurazione delle aree può cambiare tra una spedizione e l’altra.

## 19. Pesca

La pesca è un esempio paradigmatico del tono desiderato.

Il giocatore sceglie un luogo, prepara l’attrezzatura, lancia la lenza e aspetta. Non è necessario trasformarla in un minigioco frenetico.

Può passare mezz’ora reale senza che accada nulla. Questo deve essere accettato dal design.

Durante l’attesa possono emergere piccoli eventi: un NPC che passa, un cambiamento del tempo, un

animale, un rumore, un pesce che abbocca, una conversazione occasionale.

La pesca deve dimostrare che il gioco sa offrire una buona esperienza anche quando non sta premiando continuamente il giocatore.

## 20. Housing

La casa deve essere una forma di progressione personale. Il riferimento è Minecraft soltanto per il piacere di costruire e personalizzare, non per la scala.

La costruzione deve essere lenta e realistica.

- acquisto o miglioramento di una casa;
- stanze aggiuntive;
- mobili;
- cucina;
- laboratorio;
- libreria;
- deposito;
- orto;
- giardino;
- elementi decorativi con significato.

Gli oggetti devono poter avere valore affettivo anche quando non hanno un bonus statistico. Una tazza regalata, un coltello trovato in una rovina o una spada della prima spedizione possono rimanere nella casa per tutta la partita.

## 21. Crafting e risorse

Il crafting deve essere sobrio. Il giocatore non deve passare la maggior parte del tempo a raccogliere materiali per costruire oggetti.

Le risorse devono avere una provenienza credibile e un costo temporale. Un falegname può richiedere legno e tempo per costruire un mobile. Una riparazione può richiedere denaro o materiali.

La produzione degli NPC deve contribuire alla sensazione che le cose vengano realmente fatte nel mondo.

## 22. Economia

L’economia deve essere piccola e leggibile. Pochi negozi, prezzi comprensibili, beni con funzioni concrete. Il giocatore può guadagnare attraverso esplorazione, pesca, raccolta, commercio, mestieri o incarichi. Non deve essere necessario massimizzare una singola fonte di reddito.

Il denaro serve a sostenere la vita del personaggio e a migliorare la casa. Non deve diventare il principale sistema di progressione.

## 23. Narrativa

La narrativa deve essere distribuita nel mondo.

Non tutto deve essere una quest. Una persona può raccontare una storia falsa. Un bambino può sostenere che nel bosco vive un gigante. Un vecchio può possedere una chiave senza ricordare cosa apra. Una casa può avere una stanza chiusa. Un libro trovato casualmente può raccontare un evento accaduto decenni prima.

Il giocatore deve poter pensare: 'Questa cosa cosa significa?' Alcuni misteri possono avere una risposta; altri possono restare marginali o ambigui.

Il gioco deve evitare di trasformare ogni dettaglio in un arco narrativo. Alcune cose esistono semplicemente perché esistono.

## 24. Grafica e direzione artistica

La grafica può essere 2D o 2.5D, con asset open source e una direzione artistica coerente. Non è

necessario creare asset originali complessi per ogni elemento.

La qualità percepita deve derivare da composizione, illuminazione, leggibilità, animazioni semplici, suono e coerenza.

Principio: nessun asset deve essere spettacolare; ogni asset deve essere coerente.

Il valore può stare in dettagli piccoli: una tazza sul tavolo, tre libri diversi, un pavimento consumato davanti a una porta, una finestra illuminata di notte, un attrezzo lasciato in bottega.

## 25. Audio

L’audio dovrebbe contribuire fortemente alla sensazione di luogo. Il progetto può usare librerie audio compatibili con la licenza scelta, purché la direzione sonora sia coerente.

- rumori ambientali del villaggio;
- vento e foglie nel bosco;
- acqua;
- fuoco;
- attività delle botteghe;
- rumori notturni;
- suoni stagionali;
- musica usata con parsimonia.

La musica non deve riempire ogni silenzio. Il silenzio ambientale è parte dell’esperienza.

## 26. Interfaccia

L’interfaccia deve essere leggibile e poco invasiva. Evitare indicatori permanenti, notifiche continue e mappe ricoperte di icone.

Il giocatore deve poter comprendere il mondo osservandolo. La UI deve fornire informazioni quando

servono.

Il diario, se presente, dovrebbe essere più vicino a un taccuino che a un registro di quest.

## 27. Progressione

La progressione deve essere lenta.

Possibili dimensioni:

- abilità del personaggio;
- equipaggiamento;
- conoscenza del territorio;
- relazioni;
- casa;
- mestieri;
- reputazione locale;
- accesso a nuove aree;
- conoscenza di ricette e tecniche.

Il gioco deve evitare una progressione basata esclusivamente sui livelli. Un personaggio può essere forte in combattimento e inesperto socialmente; oppure essere un ottimo pescatore e un mediocre combattente.

## 28. Vertical slice iniziale

La prima vertical slice non deve essere il gioco completo. Deve verificare se il nucleo emotivo funziona. Contenuti proposti:

- un piccolo villaggio;
- una casa del giocatore;
- 10 NPC con routine;
- una taverna;
- una bottega;
- un laghetto;
- una porzione di bosco;
- ciclo giorno/notte;
- meteo semplice;
- pesca;
- raccolta;
- conversazioni;
- un piccolo sistema di inventario;
- possibilità di dormire;
- una prima forma di housing.

Niente combattimento nella primissima versione, se questo accelera il test. Il criterio di successo è: il giocatore vuole restare nel mondo per un po’ anche senza una quest.

## 29. Seconda fase della vertical slice

Dopo aver verificato il nucleo quotidiano, introdurre:

- una zona più profonda del bosco;
- primo combattimento;
- primo piccolo dungeon o rovina;
- equipaggiamento;
- rischio di morte;
- ritorno al villaggio;
- primo sistema di memoria degli NPC.

La domanda diventa: il passaggio dalla vita quotidiana all’avventura è naturale?

## 30. Terza fase: roguelike

Solo dopo aver validato villaggio e spedizione, introdurre la frontiera procedurale.

- generazione controllata della mappa;
- stanze o aree modulari;
- eventi casuali;
- risorse e rischio;
- scelte di prosecuzione o ritorno;
- morte;
- persistenza delle conseguenze.

Il procedural generation deve essere un sistema subordinato al design del mondo. È preferibile avere poche tipologie di area ben progettate e ricombinabili piuttosto che una generazione completamente libera.

## 31. Architettura concettuale suggerita

L’implementazione dovrebbe separare nettamente il mondo persistente dalla simulazione della frontiera.

- World State: calendario, stagione, meteo, edifici, NPC, relazioni, stato delle quest e degli eventi.
- NPC Simulation: routine, relazioni, memoria, età, lavoro, famiglia.
- Player State: statistiche, inventario, casa, relazioni, conoscenze.
- Persistent World: villaggio e territorio conosciuto.
- Expedition State: mappa procedurale, incontri, bottino, posizione, rischio.
- Event System: eventi condizionali, casuali e stagionali.
- Dialogue System: dialoghi contestuali e memoria.
- Save System: stato del mondo persistente separato dallo stato temporaneo della spedizione.

Questa separazione è importante perché permette di cambiare o rigenerare la frontiera senza

compromettere il villaggio.

## 32. Simulazione degli NPC

Non è necessario simulare ogni NPC secondo per secondo. È sufficiente mantenere una rappresentazione temporale plausibile.

Un NPC può avere una schedule composta da attività e luoghi. Quando il gioco deve mostrarlo, il sistema determina dove dovrebbe trovarsi in base all’orario, al giorno della settimana, alla stagione e agli eventi. Gli eventi importanti aggiornano la memoria dell’NPC. La memoria deve essere strutturata, non un semplice testo libero, in modo che possa essere usata dai sistemi di dialogo e comportamento.

L’obiettivo è ottenere l’impressione di continuità senza costruire una simulazione computazionalmente sproporzionata.

## 33. Memoria e conseguenze

La memoria è una delle caratteristiche più importanti del progetto.

Esempi:

- il giocatore ha aiutato un abitante;
- il giocatore ha rubato qualcosa;
- il giocatore ha fallito un incarico;
- il giocatore ha salvato qualcuno nel bosco;
- un NPC è morto;
- una nuova persona è nata;
- il giocatore ha trascorso molto tempo con un NPC;
- un evento ha modificato una famiglia o una bottega.

La memoria non deve produrre sempre una ricompensa. A volte serve soltanto a modificare il modo in cui il mondo reagisce.

## 34. Filosofia del procedural

Il procedural generation deve essere utilizzato dove il giocatore beneficia dell’incertezza: spedizioni, incontri, distribuzione di risorse e configurazione della frontiera.

Non deve essere utilizzato per sostituire la scrittura nei luoghi che il giocatore deve imparare a conoscere. Regola: il giocatore deve sapere che il villaggio è reale e che la frontiera è incerta.

## 35. Sessione ideale

Una sessione ideale potrebbe svolgersi così:

Il giocatore entra la sera. Sono circa le 19. Il personaggio è a casa. Ha passato la giornata precedente nel bosco. Decide di andare alla taverna. Incontra due abitanti. Uno gli racconta che il figlio non è rientrato. Il giocatore non è obbligato a intervenire.

Dopo cena decide di andare a pescare. Cammina verso il lago. È buio. Si ferma. Pesca per venti minuti. Non accade quasi nulla. Poi compare un animale sull’altra riva. Il giocatore torna a casa.

Il giorno successivo decide di esplorare il bosco. Questa volta supera il limite conosciuto. Entra nella frontiera. Trova una rovina. Continua oppure torna indietro. La decisione è sua.

Questo deve essere gameplay sufficiente.

## 36. Esperienza di riferimento

Un riferimento emotivo importante è il primo World of Warcraft, soprattutto nelle situazioni in cui il giocatore si trovava a vivere il mondo senza inseguire una progressione ottimale: pescare sotto le stelle, attraversare un bosco, osservare il paesaggio, incontrare casualmente qualcuno.

Il progetto deve recuperare quella sensazione senza ricreare la scala o le logiche di un MMORPG.

Il mondo deve essere abbastanza piccolo da poter essere conosciuto intimamente.

## 37. Il principio dell’uovo Fabergé

Il progetto deve essere trattato come un piccolo oggetto artigianale. L’ambizione non è costruire il mondo più grande possibile. L’ambizione è fare in modo che, quando il giocatore guarda una piccola parte del mondo, percepisca che qualcuno l’ha pensata.

Un villaggio di 30 persone può essere più memorabile di una capitale con 5000 NPC se quelle 30 persone sono riconoscibili.

Una casa con dieci oggetti può essere più significativa di una casa piena di loot se gli oggetti raccontano qualcosa.

Un bosco piccolo può essere più esplorabile di un continente infinito se il giocatore impara a conoscerlo.

## 38. Criteri di successo

Il progetto non deve essere valutato soltanto in base alla quantità di sistemi implementati.

- Il giocatore ricorda gli NPC per nome.
- Il giocatore riconosce i luoghi senza bisogno della mappa.
- Il giocatore nota il passaggio delle stagioni.
- Il giocatore percepisce che il villaggio continua a vivere.
- Il giocatore torna volentieri a casa.
- Il giocatore può divertirsi senza completare quest.
- Il giocatore sente il rischio quando si allontana dal villaggio.
- La morte produce una storia che il giocatore ricorda.
- Il giocatore vuole tornare nel mondo il giorno successivo.

## 39. Priorità di sviluppo

Prototipo del movimento e del villaggio.

Ciclo giorno/notte e calendario.

Routine degli NPC.

Dialoghi contestuali.

Casa e persistenza.

Pesca e attività tranquille.

Meteo e prima stagione.

Piccolo tratto di bosco.

Combattimento.

Prima spedizione.

Frontiera procedurale.

Morte e memoria.

Generazioni.

Espansione controllata del contenuto.

## 40. Domande tecniche da risolvere durante il prototyping

- Quale engine offre il miglior rapporto tra velocità di prototyping, supporto 2D e facilità di vibecoding?
- Quale struttura dati usare per calendario, routine e relazioni?
- Come separare salvataggio persistente e stato temporaneo delle spedizioni?
- Come rappresentare la memoria degli NPC in modo interrogabile?
- Quale algoritmo usare per la generazione controllata della frontiera?
- Come garantire che la proceduralità produca mappe leggibili?
- Come gestire il passaggio del tempo senza simulare inutilmente ogni agente?
- Come implementare generazioni e invecchiamento mantenendo stabile la popolazione?
- Quale modello di dialogo permette variabilità senza perdere coerenza?
- Quale pipeline di asset open source permette una direzione artistica uniforme?
- Quale sistema di salvataggio consente di mantenere una storia lunga senza corruzione dello stato?

## 41. Primo incarico per Codex

Non implementare l’intero gioco.

Costruire una vertical slice minimale che permetta di verificare il sentimento centrale del progetto. Obiettivo tecnico: un piccolo villaggio navigabile con una casa, un lago, una porzione di bosco, 10 NPC dotati di routine, ciclo giorno/notte, calendario, dialoghi contestuali, pesca, inventario semplice e salvataggio. Il prototipo deve essere giocabile senza combattimento. Deve essere possibile trascorrere una giornata nel mondo, dormire e ricominciare il giorno successivo.

L’implementazione deve essere modulare, con sistemi separati per World State, Time/Calendar, NPC,

Dialogue, Player, Housing, Inventory, Fishing e Save/Load.

Prima di aggiungere contenuti, verificare che il mondo risulti piacevole da abitare.

## 42. Regola finale

Quando una nuova meccanica viene proposta, la domanda principale non deve essere: 'Come rende il gioco più divertente?'

La domanda deve essere: 'Rende questo piccolo mondo più credibile, più interessante da abitare o più memorabile?'

Se la risposta è no, la meccanica probabilmente non serve.

## Appendice — frase guida

Un piccolo mondo nel quale puoi vivere una giornata, andare nel bosco, rischiare la vita, tornare a casa, costruire una libreria, innamorarti di qualcuno, vedere nascere un bambino, pescare sotto le stelle e, se vuoi, non fare assolutamente nulla.

Il mondo continua. Tu puoi semplicemente esserci.
