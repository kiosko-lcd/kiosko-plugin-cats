/**
 * The words painted inside the props (speech bubbles, book covers, the box of
 * the LEGO set...), in the panel's language. The drawings are painted
 * synchronously during the render, so a module-level state that the scene sets
 * before painting is enough. Spanish is the original and the default.
 */
export type PropLang = 'es' | 'en' | 'zh-Hant' | 'zh-Hans';

export interface PropTexts {
  /** Language of this table: part of the key of anything cached with text painted in. */
  id: PropLang;
  // Gesture bubbles.
  bump: string;
  notLikeThat: string;
  clonk: string;
  outOfMemory: string;
  boom: string;
  fail: string;
  conflict: string;
  slam: string;
  meow: string;
  crunch: string;
  you: string;
  yum: string;
  yumYum: string;
  seeQuestion: string;
  eureka: string;
  out: string;
  crack: string;
  buildOk: string;
  click: string;
  ouch: string;
  toProduction: string;
  poof: string;
  fsshh: string;
  oops: string;
  // Book cover and talkative bubbles.
  bookTitle1: string;
  bookTitle2: string;
  bookTitle3: string;
  moreLines: string;
  blah: string;
  andThen: string;
  /** Candles: "3 years!". */
  years: (n: number) => string;
  /** "...on Saturday". */
  weekendIn: (day: string) => string;
  packages: (n: number) => string;
  files: (n: number) => string;
  subagents: (n: number) => string;
  contextCompacted: string;
  // LEGO.
  piece: (n: string, of: string) => string;
  boxPieces: (number: string, pieces: string) => string;
  finishedModel: (name: string, number: string, pieces: string, widthCm: number) => string;
  whichPiece: string;
  finished: string;
  thisWeek: (n: number, rest: number) => string;
}

export const ES: PropTexts = {
  id: 'es',
  bump: '¡choca!',
  notLikeThat: 'así no, joven',
  clonk: '¡clonc!',
  outOfMemory: '¡sin memoria!',
  boom: '¡pum!',
  fail: '¡fallo!',
  conflict: '¡CONFLICT!',
  slam: '¡PAM!',
  meow: '¡miau!',
  crunch: '¡crunch!',
  you: '¡tú!',
  yum: '¡ñam!',
  yumYum: 'ñam… ñam…',
  seeQuestion: '¿ves?',
  eureka: '¡Eureka!',
  out: '¡fuera!',
  crack: '¡crac!',
  buildOk: '¡build OK!',
  click: '¡clic!',
  ouch: '¡AY!',
  toProduction: '¡a producción!',
  poof: '¡PUF!',
  fsshh: '¡FSSSHHH!',
  oops: '¡ups!',
  bookTitle1: 'Cómo ser',
  bookTitle2: 'un gato',
  bookTitle3: 'para dummies',
  moreLines: '+500 líneas…',
  blah: 'bla, bla…',
  andThen: 'y entonces…',
  years: (n) => `¡${n} año${n === 1 ? '' : 's'}!`,
  weekendIn: (day) => `…en ${day}`,
  packages: (n) => `+${n} paquetes`,
  files: (n) => `×${n} ficheros`,
  subagents: (n) => `×${n} subagentes`,
  contextCompacted: 'contexto compactado',
  piece: (n, of) => `pieza ${n} / ${of}`,
  boxPieces: (number, pieces) => `18+   ${number}   ${pieces} pzs`,
  finishedModel: (name, number, pieces, w) => `${name} (${number}) · ${pieces} piezas · ${w} cm`,
  whichPiece: '¿y esta pieza?',
  finished: '¡terminado!',
  thisWeek: (n, rest) => (rest > 0 ? `esta semana: ${n} (+${rest})` : `esta semana: ${n}`),
};

export const EN: PropTexts = {
  id: 'en',
  bump: 'bonk!',
  notLikeThat: 'not like that, young man',
  clonk: 'clonk!',
  outOfMemory: 'out of memory!',
  boom: 'boom!',
  fail: 'fail!',
  conflict: 'CONFLICT!',
  slam: 'WHAM!',
  meow: 'meow!',
  crunch: 'crunch!',
  you: 'you!',
  yum: 'nom!',
  yumYum: 'nom… nom…',
  seeQuestion: 'see?',
  eureka: 'Eureka!',
  out: 'out!',
  crack: 'crack!',
  buildOk: 'build OK!',
  click: 'click!',
  ouch: 'OUCH!',
  toProduction: 'to production!',
  poof: 'POOF!',
  fsshh: 'FSSSHHH!',
  oops: 'oops!',
  bookTitle1: 'How to be',
  bookTitle2: 'a cat',
  bookTitle3: 'for dummies',
  moreLines: '+500 lines…',
  blah: 'blah, blah…',
  andThen: 'and then…',
  years: (n) => `${n} year${n === 1 ? '' : 's'}!`,
  weekendIn: (day) => `…on ${day}`,
  packages: (n) => `+${n} packages`,
  files: (n) => `×${n} files`,
  subagents: (n) => `×${n} subagents`,
  contextCompacted: 'context compacted',
  piece: (n, of) => `piece ${n} / ${of}`,
  boxPieces: (number, pieces) => `18+   ${number}   ${pieces} pcs`,
  finishedModel: (name, number, pieces, w) => `${name} (${number}) · ${pieces} pieces · ${w} cm`,
  whichPiece: 'and this piece?',
  finished: 'done!',
  thisWeek: (n, rest) => (rest > 0 ? `this week: ${n} (+${rest})` : `this week: ${n}`),
};

export const ZH_HANT: PropTexts = {
  id: 'zh-Hant',
  bump: '碰！',
  notLikeThat: '年輕人，不是這樣',
  clonk: '叩！',
  outOfMemory: '記憶體不足！',
  boom: '砰！',
  fail: '失敗！',
  conflict: '衝突！',
  slam: '啪！',
  meow: '喵！',
  crunch: '喀滋！',
  you: '就是你！',
  yum: '好吃！',
  yumYum: '嚼… 嚼…',
  seeQuestion: '看吧？',
  eureka: '找到了！',
  out: '出去！',
  crack: '喀！',
  buildOk: '建置成功！',
  click: '喀嚓！',
  ouch: '好痛！',
  toProduction: '上線！',
  poof: '噗！',
  fsshh: '嘶嘶嘶！',
  oops: '哎呀！',
  bookTitle1: '貓咪',
  bookTitle2: '入門',
  bookTitle3: '傻瓜書',
  moreLines: '+500 行…',
  blah: '巴拉巴拉…',
  andThen: '然後呢…',
  years: (n) => `${n} 歲了！`,
  weekendIn: (day) => `…${day}見`,
  packages: (n) => `+${n} 個套件`,
  files: (n) => `×${n} 個檔案`,
  subagents: (n) => `×${n} 個子代理`,
  contextCompacted: '上下文已壓縮',
  piece: (n, of) => `第 ${n} / ${of} 塊`,
  boxPieces: (number, pieces) => `18+   ${number}   ${pieces} 片`,
  finishedModel: (name, number, pieces, w) => `${name}（${number}）· ${pieces} 片 · ${w} 公分`,
  whichPiece: '這塊放哪？',
  finished: '完成！',
  thisWeek: (n, rest) => (rest > 0 ? `本週：${n}（+${rest}）` : `本週：${n}`),
};

export const ZH_HANS: PropTexts = {
  id: 'zh-Hans',
  bump: '碰！',
  notLikeThat: '年轻人，不是这样',
  clonk: '咚！',
  outOfMemory: '内存不足！',
  boom: '砰！',
  fail: '失败！',
  conflict: '冲突！',
  slam: '啪！',
  meow: '喵！',
  crunch: '咔嚓！',
  you: '就是你！',
  yum: '好吃！',
  yumYum: '吧唧… 吧唧…',
  seeQuestion: '看吧？',
  eureka: '找到了！',
  out: '出去！',
  crack: '咔！',
  buildOk: '构建成功！',
  click: '咔哒！',
  ouch: '好痛！',
  toProduction: '上线！',
  poof: '噗！',
  fsshh: '嘶嘶嘶！',
  oops: '哎呀！',
  bookTitle1: '猫咪',
  bookTitle2: '入门',
  bookTitle3: '傻瓜书',
  moreLines: '+500 行…',
  blah: '巴拉巴拉…',
  andThen: '然后呢…',
  years: (n) => `${n} 岁了！`,
  weekendIn: (day) => `…${day}见`,
  packages: (n) => `+${n} 个包`,
  files: (n) => `×${n} 个文件`,
  subagents: (n) => `×${n} 个子智能体`,
  contextCompacted: '上下文已压缩',
  piece: (n, of) => `第 ${n} / ${of} 块`,
  boxPieces: (number, pieces) => `18+   ${number}   ${pieces} 片`,
  finishedModel: (name, number, pieces, w) => `${name}（${number}）· ${pieces} 片 · ${w} 厘米`,
  whichPiece: '这块放哪？',
  finished: '完成！',
  thisWeek: (n, rest) => (rest > 0 ? `本周：${n}（+${rest}）` : `本周：${n}`),
};

const TABLES: Record<PropLang, PropTexts> = { es: ES, en: EN, 'zh-Hant': ZH_HANT, 'zh-Hans': ZH_HANS };

export function propTextsFor(language: PropLang): PropTexts {
  return TABLES[language] ?? ES;
}

let current: PropTexts = ES;

/** Sets the language of the texts the props paint from now on. */
export function usePropTexts(t: PropTexts): void {
  current = t;
}

/** The texts in use: call it when drawing, never keep it in a module constant. */
export function propTexts(): PropTexts {
  return current;
}
