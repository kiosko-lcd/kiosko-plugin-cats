/**
 * The few words painted inside the scene (sign boards, speech bubbles, the
 * meeting door, floor tags), in the user's language. Spanish is the original;
 * anything else falls back to English.
 */
import type { Formatters, Localized } from '@kiosko/sdk';

export interface Words {
  /** Language of the table, for the texts painted inside the props. */
  lang: 'es' | 'en';
  /** Sign board of the cat that asks for permission. */
  mayI: string;
  asksPermission: string;
  /** Bubble of the cat that waits for you. */
  goOn: string;
  meeting: string;
  /** Meeting starting now / in a while. */
  now: string;
  inTime: (t: string) => string;
  /** "+3 more" tag when not every cat fits. */
  more: string;
  /** Abbreviated "week", for the plate of the shelf ("wk 46"). */
  week: string;
  /** Texts of the gestures: the cat's reactions and the little signs they hold. */
  gameOver: string;
  gameWin: string;
  detachedHead: string;
  relief: string;
  whereWas: string;
  server: string;
  boo: string;
  silent: string;
  sunday: string;
  saturday: string;
  thunder: string;
  uncommitted: string;
  ready: string;
  waiting: string;
  /** Printed on the cardboard box. */
  fragile: string;
  hiss: string;
  /** Under the SHIP IT poster of the office. */
  notOnFriday: string;
  /** Elapsed time with minute granularity: seconds on a panel would lie. */
  elapsed: (ms: number) => string;
  /** Time left until a meeting, rounded up: "in 0 min" would be a lie until it starts. */
  countdown: (ms: number) => string;
  // The quarter-hour duel.
  duelTitle: string;
  versus: (a: string, b: string) => string;
  wins: (name: string) => string;
  theBug: string;
  bugHadNoChance: string;
  uncommittedFiles: (n: number) => string;
  onPoints: string;
}

/** The words that don't depend on the time formatters. */
type Table = Omit<Words, 'elapsed' | 'countdown'>;

const ES: Table = {
  lang: 'es',
  mayI: '¿PUEDO?',
  asksPermission: 'pide permiso',
  goOn: '¿sigo?',
  meeting: 'REUNIÓN',
  now: 'ahora',
  inTime: (t) => `en ${t}`,
  more: 'más',
  week: 'sem.',
  gameOver: '¡nooo!',
  gameWin: '¡bien!',
  detachedHead: 'HEAD separado',
  relief: 'haah…',
  whereWas: '¿dónde estaba…?',
  server: 'servidor',
  boo: '¡buu!',
  silent: '(mudo)',
  sunday: 'domingo',
  saturday: 'sábado',
  thunder: '¡BRRUM!',
  uncommitted: 'sin commit',
  ready: 'lista',
  waiting: 'espera',
  fragile: 'FRÁGIL',
  hiss: '¡FFFF!',
  notOnFriday: '(el viernes no)',
  duelTitle: 'DUELO DEL CUARTO DE HORA',
  versus: (a, b) => `${a}  contra  ${b}`,
  wins: (n) => `Gana ${n}`,
  theBug: 'el bug',
  bugHadNoChance: 'el bug no tenía nada que hacer',
  uncommittedFiles: (n) => `${n === 0 ? 'ningún fichero' : n === 1 ? 'un fichero' : `${n} ficheros`} sin commit`,
  onPoints: 'a los puntos',
};

const EN: Table = {
  lang: 'en',
  mayI: 'MAY I?',
  asksPermission: 'asks for permission',
  goOn: 'go on?',
  meeting: 'MEETING',
  now: 'now',
  inTime: (t) => `in ${t}`,
  more: 'more',
  week: 'wk',
  gameOver: 'nooo!',
  gameWin: 'yes!',
  detachedHead: 'detached HEAD',
  relief: 'phew…',
  whereWas: 'where was it…?',
  server: 'server',
  boo: 'boo!',
  silent: '(silent)',
  sunday: 'Sunday',
  saturday: 'Saturday',
  thunder: 'BOOM!',
  uncommitted: 'uncommitted',
  ready: 'ready',
  waiting: 'waiting',
  fragile: 'FRAGILE',
  hiss: 'HSSSS!',
  notOnFriday: '(not on Fridays)',
  duelTitle: 'QUARTER-HOUR DUEL',
  versus: (a, b) => `${a}  vs  ${b}`,
  wins: (n) => `${n} wins`,
  theBug: 'the bug',
  bugHadNoChance: 'the bug never stood a chance',
  uncommittedFiles: (n) => `${n === 0 ? 'no' : n === 1 ? 'one' : n} uncommitted file${n === 1 ? '' : 's'}`,
  onPoints: 'on points',
};

/**
 * The words in the panel's language, picked with `ctx.t` (so a language
 * without a table gets English), with times through `ctx.fmt`.
 */
export function wordsFor(ctx: { t: (text: Localized) => string; fmt: Formatters }): Words {
  const table = ctx.t({ en: 'en', es: 'es' }) === 'es' ? ES : EN;
  return {
    ...table,
    elapsed: (ms) => (ms < 60_000 ? table.now : ctx.fmt.duration(ms)),
    countdown: (ms) => ctx.fmt.duration(ms, { round: 'up' }),
  };
}
