# Un piccolo mondo in cui abitare

RPG old-school · roguelike · life simulation · slow fantasy.

> Un RPG in cui non devi diventare qualcuno; devi avere una vita.

Il documento di design completo è in [`docs/design.md`](docs/design.md). Ogni scelta del codice parte da lì.

## Stato: prima vertical slice (§28, §41)

Acquaferma: un villaggio navigabile, senza combattimento, in cui si può passare una giornata, dormire e ricominciare.

- **Il villaggio**: osteria, bottega, falegname, cinque case, gli orti, lo stagno con il pontile, il Bosco Basso a nord.
- **Il tempo**: scorre come quello vero, 1:1 (§8). Calendario con giorni della settimana, quattro stagioni da 28 giorni, alba e tramonto che cambiano nel corso dell'anno. Il mondo va avanti anche a gioco chiuso, senza penalità.
- **Dieci abitanti** con casa, mestiere, routine giornaliera, eccezioni per la pioggia e la domenica. Dormono nel loro letto, vanno al lavoro, la sera si ritrovano all'osteria.
- **Dialoghi contestuali**: ogni abitante dice cose diverse secondo ora, tempo, luogo, stagione e confidenza con te, che cresce di giorno in giorno. Alcune cose le dicono una volta sola.
- **Il taccuino**: annota da solo quello che il paese ti racconta (il gigante di Lino, la chiave di Pietro...).
- **La pesca** come la vuole il §19: lanci, aspetti, intanto il mondo succede.
- **La raccolta**: funghi, erbe e frutti diversi secondo il giorno e la stagione.
- **Il meteo**: sereno, nuvoloso, pioggia, nebbia al mattino. La luce cambia, le finestre si accendono la sera.
- **Il salvataggio** automatico, con una copia di riserva e le versioni dello schema per non perdere mai un mondo.

Tutta la grafica è disegnata dal codice (pixel art essenziale, una sola tavolozza): è un segnaposto coerente, in attesa di scegliere un set di asset.

## Giocare

Serve [Node.js](https://nodejs.org/) (versione 20 o successiva).

```bash
npm install
npm run dev
```

Poi apri l'indirizzo che compare (di solito http://localhost:5173).

| Tasto | Azione |
| --- | --- |
| WASD / frecce | cammina |
| E / Spazio | parla, guarda, raccogli, pesca, dormi |
| I | quello che porti con te |
| N | taccuino |
| T | mostra o nascondi l'ora |
| H | aiuto |
| V | (sviluppo) accelera il tempo: ×1, ×10, ×60, ×600 |

Parametri utili nell'indirizzo: `?nuovo` ricomincia da capo, `?ora=19:30` porta il mondo a quell'ora.

## Prova 3D in prima persona: la Bottega Bassi

Un esperimento separato, per valutare l'aspetto grafico di un gioco in 3D con visuale libera: solo l'interno della bottega di Teresa, esplorabile in prima persona. Con `npm run dev` acceso, apri http://localhost:5173/bottega.html.

- WASD per camminare, mouse per guardare, E per osservare le cose (il registro, il cartello, la bilancia...).
- Tasti 1–5: alba, mattina, pomeriggio, tramonto, notte. La luce del sole entra dalle finestre e dalla porta; la sera si accendono la lucerna e la candela.
- Lo stile è "slow fantasy": muri a graticcio su zoccolo di pietra, vetri a losanghe, un lampadario di ferro battuto, tinture d'erbe che al buio brillano appena, un barattolo di lucciole, la mappa del bosco bianca oltre il fosso.
- Tutto è costruito dal codice (Three.js): geometrie semplici e materiali procedurali, senza file di immagini. Con asset veri (texture fotografiche, modelli) il dettaglio salirebbe molto.

Il codice è in `src/bottega/`, i testi da osservare in `src/data/bottega.ts`. Gli screenshot automatici: `npx tsx scripts/bottega-shot.ts`.

## Modificare il mondo

I contenuti stanno in `src/data/`, separati dal codice, e si modificano come testo:

| File | Contiene |
| --- | --- |
| `map.ts` | la mappa disegnata a caratteri, gli edifici, i luoghi con un nome, le zone |
| `npcs.ts` | gli abitanti: chi sono, dove vivono, le loro routine |
| `dialogue.ts` | le battute (sono **bozze**, da riscrivere) e le condizioni in cui vengono dette |
| `items.ts` | oggetti, pesci, cose da raccogliere |
| `ambient.ts` | le piccole cose che succedono mentre peschi, e le descrizioni degli oggetti |

Dopo ogni modifica, `npm test` controlla che il mondo sia ancora coerente: che ogni abitante sappia sempre dove stare e possa arrivarci, che nessuno dorma in due nello stesso letto, che le battute citino luoghi e oggetti che esistono.

## Comandi

```bash
npm run dev        # il gioco, con ricarica automatica
npm test           # i test
npm run typecheck  # il controllo dei tipi
npm run build      # la versione da pubblicare, in dist/
npm run shot       # screenshot automatici (con npm run dev acceso)
```

## Prossimi passi (§39)

1. Giocare la vertical slice e verificare il criterio del §28: *si ha voglia di restare anche senza una quest?*
2. Scegliere la direzione artistica: un set di asset open source coerente, al posto della grafica disegnata dal codice.
3. Audio ambientale (§25): vento, acqua, pioggia, l'osteria la sera.
4. Una prima forma di housing (§20): oggetti da sistemare in casa, con valore affettivo.
5. Riscrivere i dialoghi e approfondire gli abitanti; il primo sistema di memoria degli NPC (§33).
6. Seconda fase (§29): il bosco profondo oltre il fosso, il primo combattimento, la prima rovina.

### Asset fotografati (prova realistica)

Modelli, texture e panorami vengono da [Poly Haven](https://polyhaven.com) e sono CC0 (pubblico dominio). Stanno in `public/assets/ph/`; per riscaricarli o aggiungerne: `python3 scripts/fetch-polyhaven.py`.
