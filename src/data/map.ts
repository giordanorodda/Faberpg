import type { BuildingDef, ForageSpotDef, RegionDef, SpotDef } from '../world/types';

/**
 * Mappa di Acquaferma. Ogni carattere è una casella (tile) di 16×16 pixel.
 *
 * Legenda:
 *   .  erba          ,  erba alta       *  fiori          :  sentiero
 *   ~  acqua         s  riva sabbiosa   r  canne          =  pontile
 *   T  albero        t  cespuglio       f  staccionata    o  terra arata
 *   #  muro          +  porta           _  pavimento      B  letto
 *   C  bancone       h  tavolo          F  focolare       S  scaffale
 *   k  botte/cassa   l  telaio          n  panca          w  pozzo
 *   X  il sentiero prosegue oltre il mondo conosciuto (non attraversabile, per ora)
 *
 * Gli edifici devono avere il muro sul perimetro e la porta sul lato inferiore.
 * I test (npm test) controllano che tutto resti coerente dopo una modifica.
 */
export const MAP_ROWS: string[] = [
  'TTTTTTTtTTTTTTTTTTTTTtT.X.tTTTt.tTTT.TTT.T.TTTTTTTTTTTTT,T..tTTT',
  'TTTTTTTTT.TTTTttTTT.TTTT::.T..TTTTT.T..TTTTTTTtT.TTTTTT.T.TTTTTT',
  'TTTT.TTTTtT.tT..,,.tTTTT::TTTTtTTTTTT.TTT.*...,TTTTTTTTTTTTTTTTT',
  'TTTTTTtTTTTT.,.....,.TTT::tTTTTTTTTTtTTT.,..,.,,,TTTTTTTTTTTTTTT',
  'TTTTTTTTTTt...,,,...,,T.:::::::::::::::::,,**,...T.T.TTttTTTTTTT',
  'TTTTTTTTTTt....,,...,,TT::T.TTtTT.*tTTTT*....,,,*T.TTTTTTTTTTTTT',
  'TTT.TTTTTtT..,.,,::::::::tTTTTT..TTTTTTT.T*,..,TT,T.TTTT.TTT.TTT',
  'TTTTTT.TTTTt,....,,.,tT.:.TTTT.TTTTTTT.TT.TTTTTTtTTTTTT,tTT.TTTT',
  'TTTTTTTTTTTTT......TT..::..TTTt.tTTTTTT.TtTTTTT.TTTT...TT.TTTTTT',
  'TTTTTTTTT..,TTTTTTTTT..::...TTtT.T.TTTtTtTTTTTT.Tt...######TTTTT',
  'TTTTTTTT........T.T.TT,::.....TTTTT...T,..tTTTTTTT.,.#FS_B#,.TTT',
  'TTt.T.T.......TT.TTT...::...TTT.T..,..T.T,TT.TTT....,#_h_k#,.TTT',
  'TTTTT.........,....,....:.....T...T.......T*,.TT.....#S___#..TTT',
  '.T...T#####.............:...................T..T,....##+###..TTT',
  'TT..T.#B_F#...,.......,.:..................,#####......:.......T',
  'TTT,..#___#.....,.......:......,.....,......#B_F#.....*:......TT',
  'TTT.,.#__k#.............:.##########.....,,.#___#..,,..:.....TTT',
  'TTT...##+##.......,...,.:.#B___kS_F#,...,...#___#,.....:.....TTT',
  'TTT.....:...............:.#B_CCC___#....*...##+##....,.:.....TTT',
  'TT,.....:...,...........:.#________#..........::::::::::......TT',
  'TT......:........######.:.#__h___h_#..#######,:...............TT',
  'TTT.....:........#khh_#.:.#________#..#S____#.:..,..,.........TT',
  'TT......:........#____#.:.####+#####..#SCCC_#,:...............TT',
  'TT......:....,...#___k#.:::::::::::::.#____B#.:...............TT',
  'TTT...,.######...##+###..::::::::n:::.#k___B#.:.,sssssss.....T.T',
  'TT,.....#BF_S#,....:.....::::::::::::,###+###.:sss~~~~~sss....TT',
  'TTX:::::#__h_#::::::::::::::::w::::::::::::::::s~~~~~~~~~rs,..TT',
  'TTT..,,.#____#:....,...,.::::::::::::........:s~~~~~~~~~~~r..T.T',
  'TT......##+###:..........::n::::::n::........:~~~~~~~~~~~~~s..TT',
  'TTT,...,..:::::..........::::::::::::....,...:~~~~~~~~~~~~~s..TT',
  '*T.....,......,.######....,...:..............:====~~~~~~~~~s.TTT',
  'TTT#######.....,#BB_F#........:..............s~~~~~~~~~~~~~s.T,T',
  'TT.#SS__F#..*...#___h#........:......,.......s~~~~~~~~~~~~~s..TT',
  'TTT#_hh_B#,,....#____#....######::::::........s~~~~~~~~~~~r...T.',
  'T,.#S___k#......##+###....#B_FB#............,.sr~~~~~~~~~ss..TT.',
  'TTT###+###.......:::::::::#_h__#.....fffffffffffss~~~~~srs.....T',
  'TTT...::::::::::::........#___l#.....fooooooooof,sssssss...,.TTT',
  'TTT.....................,.##+###.....f:::::::::f..............TT',
  'TTT.....*.........*,........::::::::::ooooooooof.............,TT',
  'TT.............,...,..........:......f:::::::::f.*..........,TTT',
  'TT.........................*..:......fooooooooof,.............TT',
  'TT.....,.............,........:....,.fffffffffff.........,.....T',
  'T.T,..,..........,............:.......*.........,......*.....TTT',
  '.T......*....,................:.............,.,......,...,....TT',
  'TT.....................,......:.,.*..........,............*...TT',
  'TTT..T.TT....T..TT.T.TT.TTTTT.:TT....TTTT,T.TT..T...T....,...TTT',
  'TTTTT.TTTTTTTT.T.TTTTTTTT.TTTT:TTTTTTTTTTTTT.TTTTTT,TTTTTTT.TTTT',
  'TTTT..TTTTTTTTTTTTTTTTTT..TTTTXT.TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
];

export const BUILDINGS: BuildingDef[] = [
  { id: 'tavern', name: 'Osteria dell\'Acqua Ferma', x: 26, y: 16, w: 10, h: 7, door: { x: 30, y: 22 }, access: 'hours', hours: [['06:30', '24:00']] },
  { id: 'shop', name: 'Bottega Bassi', x: 38, y: 20, w: 7, h: 6, door: { x: 41, y: 25 }, access: 'hours', hours: [['08:00', '12:30'], ['15:00', '19:00']] },
  { id: 'workshop', name: 'Bottega del falegname', x: 17, y: 20, w: 6, h: 5, door: { x: 19, y: 24 }, access: 'hours', hours: [['07:00', '18:30']] },
  { id: 'rinaldi', name: 'Casa Rinaldi', x: 16, y: 30, w: 6, h: 5, door: { x: 18, y: 34 }, access: 'locked' },
  { id: 'monti', name: 'Casa Monti', x: 26, y: 33, w: 6, h: 5, door: { x: 28, y: 37 }, access: 'locked' },
  { id: 'player', name: 'Casa della vecchia Agnese', x: 8, y: 24, w: 6, h: 5, door: { x: 10, y: 28 }, access: 'always', page: 'casa.html' },
  { id: 'pietro', name: 'Casa di Pietro', x: 44, y: 14, w: 5, h: 5, door: { x: 46, y: 18 }, access: 'locked' },
  { id: 'erbe', name: 'Casa delle Erbe', x: 53, y: 9, w: 6, h: 5, door: { x: 55, y: 13 }, access: 'locked', page: 'erbe.html' },
  { id: 'cartografo', name: 'Casa del Cartografo', x: 3, y: 31, w: 7, h: 5, door: { x: 6, y: 35 }, access: 'locked', page: 'cartografo.html' },
  { id: 'bruna', name: 'Casa di Bruna', x: 6, y: 13, w: 5, h: 5, door: { x: 8, y: 17 }, access: 'locked' },
];

/** Luoghi con un nome, usati dalle routine degli abitanti. */
export const SPOTS: Record<string, SpotDef> = {
  galli_bed1: { x: 27, y: 17 },
  galli_bed2: { x: 27, y: 18 },
  tavern_bar: { x: 30, y: 17 },
  tavern_hearth: { x: 33, y: 17 },
  tavern_seat1: { x: 28, y: 20 },
  tavern_seat2: { x: 30, y: 20 },
  tavern_seat3: { x: 32, y: 20 },
  tavern_seat4: { x: 34, y: 20 },
  tavern_seat5: { x: 33, y: 19 },
  tavern_seat6: { x: 34, y: 18 },
  shop_counter: { x: 41, y: 21 },
  shop_front: { x: 41, y: 23 },
  shop_back: { x: 40, y: 24 },
  bassi_bed1: { x: 43, y: 23 },
  bassi_bed2: { x: 43, y: 24 },
  workshop_bench1: { x: 19, y: 22 },
  workshop_bench2: { x: 20, y: 22 },
  workshop_door: { x: 19, y: 25 },
  rinaldi_bed1: { x: 17, y: 31 },
  rinaldi_bed2: { x: 18, y: 31 },
  rinaldi_table: { x: 19, y: 32 },
  rinaldi_hearth: { x: 20, y: 33 },
  monti_bed1: { x: 27, y: 34 },
  monti_bed2: { x: 30, y: 34 },
  monti_table: { x: 28, y: 36 },
  monti_hearth: { x: 29, y: 35 },
  monti_loom: { x: 29, y: 36 },
  pietro_bed: { x: 45, y: 15 },
  pietro_hearth: { x: 46, y: 16 },
  bruna_bed: { x: 7, y: 14 },
  bruna_home: { x: 8, y: 15 },
  square_well: { x: 31, y: 26 },
  square_play: { x: 28, y: 24 },
  square_bench1: { x: 27, y: 27 },
  square_bench2: { x: 34, y: 27 },
  well_wash: { x: 29, y: 26 },
  pond_shore_lino: { x: 45, y: 33 },
  dock_end: { x: 49, y: 30 },
  pond_shore_pietro: { x: 48, y: 25 },
  field_rows: { x: 42, y: 37 },
  field_rows2: { x: 44, y: 39 },
  forest_clearing: { x: 17, y: 5 },
  forest_edge: { x: 24, y: 13 },
};

/** Zone del mondo: il nome compare discretamente quando le attraversi. */
export const REGIONS: RegionDef[] = [
  { id: 'bosco', name: 'Il Bosco Basso', x: 0, y: 0, w: 64, h: 12 },
  { id: 'stagno', name: 'Lo stagno', x: 44, y: 23, w: 18, h: 15 },
  { id: 'piazza', name: 'La piazza del pozzo', x: 25, y: 23, w: 12, h: 7 },
  { id: 'orti', name: 'Gli orti', x: 37, y: 35, w: 11, h: 7 },
];

/** Punti in cui, a seconda del giorno e della stagione, si può trovare qualcosa. */
export const FORAGE_SPOTS: ForageSpotDef[] = [
  { id: 'bosco_14_10', kind: 'bosco', x: 14, y: 10 },
  { id: 'bosco_15_2', kind: 'bosco', x: 15, y: 2 },
  { id: 'bosco_5_11', kind: 'bosco', x: 5, y: 11 },
  { id: 'bosco_44_5', kind: 'bosco', x: 44, y: 5 },
  { id: 'bosco_45_3', kind: 'bosco', x: 45, y: 3 },
  { id: 'bosco_45_2', kind: 'bosco', x: 45, y: 2 },
  { id: 'bosco_20_5', kind: 'bosco', x: 20, y: 5 },
  { id: 'bosco_18_5', kind: 'bosco', x: 18, y: 5 },
  { id: 'bosco_14_5', kind: 'bosco', x: 14, y: 5 },
  { id: 'prato_17_16', kind: 'prato', x: 17, y: 16 },
  { id: 'prato_13_21', kind: 'prato', x: 13, y: 21 },
  { id: 'prato_2_13', kind: 'prato', x: 2, y: 13 },
  { id: 'prato_19_13', kind: 'prato', x: 19, y: 13 },
  { id: 'prato_53_16', kind: 'prato', x: 53, y: 16 },
  { id: 'prato_56_40', kind: 'prato', x: 56, y: 40 },
  { id: 'prato_7_42', kind: 'prato', x: 7, y: 42 },
  { id: 'prato_52_37', kind: 'prato', x: 52, y: 37 },
  { id: 'prato_59_45', kind: 'prato', x: 59, y: 45 },
  { id: 'prato_58_41', kind: 'prato', x: 58, y: 41 },
  { id: 'riva_45_23', kind: 'riva', x: 45, y: 23 },
  { id: 'riva_58_23', kind: 'riva', x: 58, y: 23 },
  { id: 'riva_58_25', kind: 'riva', x: 58, y: 25 },
];
