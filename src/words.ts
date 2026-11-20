/**
 * The few words painted inside the scene (sign boards, speech bubbles, the
 * meeting door, floor tags), in the user's language. Spanish is the original;
 * Chinese comes in Traditional and Simplified; anything else falls back to English.
 */
import { plural, type BaseContext, type PluralForms } from '@kiosko/sdk';
import type { PropLang } from './prop-texts.ts';

/** `{n} …` in `lang`, with its plural rules: for the count texts of a table kept per language. */
const count = (lang: PropLang, forms: PluralForms) => (n: number) => plural(n, { [lang]: forms }, lang);

export interface Words {
  /** Language of the table, for the texts painted inside the props. */
  lang: PropLang;
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
  /** The week number on the plate of the shelf ("wk 46", "第 46 週"). */
  week: (n: number) => string;
  /** The count on that plate: "12 commits". */
  commits: (n: number) => string;
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
  week: (n) => `sem. ${n}`,
  commits: count('es', { one: '{n} commit', other: '{n} commits' }),
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
  uncommittedFiles: (n) => (n === 0 ? 'ningún fichero sin commit' : count('es', { one: 'un fichero sin commit', other: '{n} ficheros sin commit' })(n)),
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
  week: (n) => `wk ${n}`,
  commits: count('en', { one: '{n} commit', other: '{n} commits' }),
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
  uncommittedFiles: (n) => (n === 0 ? 'no uncommitted files' : count('en', { one: 'one uncommitted file', other: '{n} uncommitted files' })(n)),
  onPoints: 'on points',
};

const ZH_HANT: Table = {
  lang: 'zh-Hant',
  mayI: '可以嗎？',
  asksPermission: '請求權限',
  goOn: '繼續？',
  meeting: '開會中',
  now: '現在',
  inTime: (t) => `${t}後`,
  more: '還有',
  week: (n) => `第 ${n} 週`,
  commits: count('zh-Hant', { other: '{n} 次提交' }),
  gameOver: '不——！',
  gameWin: '耶！',
  detachedHead: '分離的 HEAD',
  relief: '呼…',
  whereWas: '剛剛在哪…？',
  server: '伺服器',
  boo: '噓！',
  silent: '（靜音）',
  sunday: '星期日',
  saturday: '星期六',
  thunder: '轟隆！',
  uncommitted: '未提交',
  ready: '就緒',
  waiting: '等待中',
  fragile: '易碎品',
  hiss: '嘶——！',
  notOnFriday: '（星期五不行）',
  duelTitle: '一刻鐘對決',
  versus: (a, b) => `${a}  對  ${b}`,
  wins: (n) => `${n} 獲勝`,
  theBug: 'bug',
  bugHadNoChance: 'bug 毫無勝算',
  uncommittedFiles: (n) => (n === 0 ? '沒有未提交的檔案' : count('zh-Hant', { other: '{n} 個未提交的檔案' })(n)),
  onPoints: '點數獲勝',
};

const ZH_HANS: Table = {
  lang: 'zh-Hans',
  mayI: '可以吗？',
  asksPermission: '请求权限',
  goOn: '继续？',
  meeting: '开会中',
  now: '现在',
  inTime: (t) => `${t}后`,
  more: '还有',
  week: (n) => `第 ${n} 周`,
  commits: count('zh-Hans', { other: '{n} 次提交' }),
  gameOver: '不——！',
  gameWin: '耶！',
  detachedHead: '游离的 HEAD',
  relief: '呼…',
  whereWas: '刚才在哪…？',
  server: '服务器',
  boo: '嘘！',
  silent: '（静音）',
  sunday: '星期日',
  saturday: '星期六',
  thunder: '轰隆！',
  uncommitted: '未提交',
  ready: '就绪',
  waiting: '等待中',
  fragile: '易碎品',
  hiss: '嘶——！',
  notOnFriday: '（周五不行）',
  duelTitle: '一刻钟对决',
  versus: (a, b) => `${a}  对  ${b}`,
  wins: (n) => `${n} 获胜`,
  theBug: 'bug',
  bugHadNoChance: 'bug 毫无胜算',
  uncommittedFiles: (n) => (n === 0 ? '没有未提交的文件' : count('zh-Hans', { other: '{n} 个未提交的文件' })(n)),
  onPoints: '点数获胜',
};

const TABLES: Record<PropLang, Table> = { es: ES, en: EN, 'zh-Hant': ZH_HANT, 'zh-Hans': ZH_HANS };

/**
 * The words in the panel's language, picked with `ctx.pickLanguage` (so a
 * language without a table gets English), with times through `ctx.fmt`.
 */
export function wordsFor(ctx: Pick<BaseContext, 'pickLanguage' | 'fmt'>): Words {
  const table = TABLES[ctx.pickLanguage(Object.keys(TABLES)) as PropLang] ?? EN;
  return {
    ...table,
    elapsed: (ms) => (ms < 60_000 ? table.now : ctx.fmt.duration(ms)),
    countdown: (ms) => ctx.fmt.duration(ms, { round: 'up' }),
  };
}
