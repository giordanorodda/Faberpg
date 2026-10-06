# Guida per chi lavora sul codice (persone e agenti)

Il progetto è **Un piccolo mondo in cui abitare**: un RPG lento, piccolo, curato. Prima di aggiungere o cambiare qualcosa leggi `docs/design.md`, almeno i §3, §4, §37 e §42.

## La regola che decide tutto (§42)

Davanti a una nuova meccanica, la domanda non è "rende il gioco più divertente?" ma: **rende questo piccolo mondo più credibile, più interessante da abitare o più memorabile?** Se la risposta è no, la meccanica non serve.

In pratica:
- niente timer aggressivi, ricompense che scadono, penalità per l'assenza (§8);
- niente icone, checklist o notifiche continue: l'interfaccia compare solo quando serve (§26);
- il procedurale va usato dove il giocatore trae vantaggio dall'incertezza, mai per sostituire la scrittura dei luoghi da conoscere (§34);
- la cura viene prima della quantità.

## Tecnica

- TypeScript + Vite, Canvas 2D, nessun engine. Il testo dell'interfaccia è HTML sopra il canvas.
- `src/data/` contiene i **contenuti**, scritti in italiano e modificabili a mano. `src/` contiene il codice, in inglese.
- Il resto del codice: `core/` (tempo, meteo, salvataggio, input), `world/` (mappa, percorsi), `npc/` (routine e movimento), `dialogue/`, `activities/` (pesca, raccolta), `render/`, `ui/`, `game.ts` (il ciclo di gioco).
- Le posizioni degli NPC **non si salvano**: si ricavano dall'orologio e dalle routine (`npc/schedule.ts`, §32). Quello che deve persistere va in `core/state.ts`.
- Se cambi la forma di `GameState`, aumenta `STATE_VERSION` e aggiungi una migrazione in `core/save.ts`. Un mondo salvato non deve mai andare perso.
- Il tempo è parametrizzato in `config.ts` (1:1 come da design; `V` lo accelera durante lo sviluppo).

## Prima di consegnare una modifica

```bash
npm run typecheck && npm test
```

Per vedere davvero il risultato: `npm run dev` in un terminale, poi `npm run shot` (screenshot in `screenshots/`). In un ambiente senza Chromium in `/opt/pw-browsers`, imposta `CHROMIUM_PATH`.

Nel browser, la console espone `game` (es. `game.teleport(30, 25)`, `game.advance(60, true)`).

## Testi

Le battute in `src/data/dialogue.ts` sono bozze: l'autore le riscriverà. Se ne aggiungi, segui il tono: frasi brevi, concrete, un po' di ironia, mai spiegare troppo. Nessuna battuta deve esistere solo per dare una quest (§7, §23).
