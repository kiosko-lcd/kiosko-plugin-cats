/**
 * The cats room: every AI agent session is a cat in a room with a real sky,
 * and what needs you comes forward (a sign board for a permission, a cat
 * staring at you when it waits, a sleeper in a box when it's done, a cat at
 * its laptop, back turned, while it works). Ported from aimonitor's
 * "modo gatos".
 *
 * Plus an interlude: the quarter-hour laser-sword duel between two sessions.
 */
import { join } from 'node:path';
import { definePlugin, defineInterlude, defineWidget, t, type AnimationFrame, type Location, type Localized } from '@kiosko/sdk';
import { sunTimes, type SunTimes, type Weather } from '@loksly/weather-astro';
import { useCanvas } from './canvas.ts';
import { DUEL_FPS, planDuel, prerenderDuel } from './duel-egg.ts';
import { ROOMS, type RoomName } from './room.ts';
import { FORCED_KINDS, MOVE_SECONDS, candidates, gestureAt, placements, planGesture, significantMove, type GestureKind, type Placement } from './anim.ts';
import { canPaintOn, lastBuiltSet, paintScene, renderScene, sceneLayout, surroundings, type SceneInput, type SceneOptions } from './scene.ts';
import { readShelf, type ShelfView } from './shelf.ts';
import { addTrophy, loadTrophies, thisWeek } from './trophies.ts';
import { filterProjects, sessionsOf, zombieMsOf, type SessionView } from './types.ts';
import { wordsFor } from './words.ts';

const ROOM_LABELS: Record<'rotate' | RoomName, Localized> = {
  rotate: { en: 'A different one every day', es: 'Una distinta cada día', de: 'Jeden Tag ein anderes', 'zh-Hant': '每天換一個', 'zh-Hans': '每天换一个' },
  estudio: { en: 'Study', es: 'Estudio', de: 'Arbeitszimmer', 'zh-Hant': '書房', 'zh-Hans': '书房' },
  cocina: { en: 'Kitchen', es: 'Cocina', de: 'Küche', 'zh-Hant': '廚房', 'zh-Hans': '厨房' },
  cabana: { en: 'Log cabin', es: 'Cabaña', de: 'Blockhütte', 'zh-Hant': '小木屋', 'zh-Hans': '小木屋' },
  atico: { en: 'Attic', es: 'Ático', de: 'Dachboden', 'zh-Hant': '閣樓', 'zh-Hans': '阁楼' },
  oficina: { en: 'Office', es: 'Oficina', de: 'Büro', 'zh-Hant': '辦公室', 'zh-Hans': '办公室' },
  japonesa: { en: 'Japanese room', es: 'Habitación japonesa', de: 'Japanisches Zimmer', 'zh-Hant': '和室', 'zh-Hans': '和室' },
  acuario: { en: 'Aquarium', es: 'Acuario', de: 'Aquarium', 'zh-Hant': '水族館', 'zh-Hans': '水族馆' },
  arcade: { en: 'Arcade', es: 'Recreativos', de: 'Spielhalle', 'zh-Hant': '遊樂場', 'zh-Hans': '游戏厅' },
  ventanal: { en: 'Picture window', es: 'Ventanal', de: 'Panoramafenster', 'zh-Hant': '落地窗', 'zh-Hans': '落地窗' },
  playa: { en: 'Beach', es: 'Playa', de: 'Strand', 'zh-Hant': '海灘', 'zh-Hans': '海滩' },
  espacio: { en: 'Outer space', es: 'Espacio', de: 'Weltraum', 'zh-Hant': '外太空', 'zh-Hans': '外太空' },
  antartida: { en: 'Antarctica', es: 'Antártida', de: 'Antarktis', 'zh-Hant': '南極', 'zh-Hans': '南极' },
  desierto: { en: 'Desert', es: 'Desierto', de: 'Wüste', 'zh-Hant': '沙漠', 'zh-Hans': '沙漠' },
  bosque: { en: 'Forest', es: 'Bosque', de: 'Wald', 'zh-Hant': '森林', 'zh-Hans': '森林' },
};

/** Frames per second of the gestures: what the panel takes without dropping them. */
const ANIM_FPS = 12;

/**
 * Gestures that need more than the room has: the console game (the platformer
 * of the agents plugin) and the fireman (the heat tower is another tile).
 */
const UNSUPPORTED = new Set<GestureKind>(['consola', 'espuma']);

const COLUMN = { none: 'none', right: 'derecha', left: 'izquierda', alternate: 'alternar' } as const;

const roomOptions = t.object({
  room: t.enum(['rotate', ...ROOMS] as const, {
    label: { en: 'Room', es: 'Habitación', de: 'Zimmer', 'zh-Hant': '房間', 'zh-Hans': '房间' },
    help: { en: 'Indoors or out, each with its own window, lamp and floor.', es: 'Dentro o fuera, cada una con su ventana, su lámpara y su suelo.', de: 'Drinnen oder draußen, jedes mit eigenem Fenster, eigener Lampe und eigenem Boden.', 'zh-Hant': '室內或戶外，各有自己的窗戶、燈和地板。', 'zh-Hans': '室内或户外，各有自己的窗户、灯和地板。' },
    labels: ROOM_LABELS,
  }),
  rooms: t.list(t.enum(ROOMS, { labels: ROOM_LABELS }), {
    label: { en: 'Rooms to rotate through', es: 'Habitaciones por las que rotar', de: 'Zimmer im Wechsel', 'zh-Hant': '輪流使用的房間', 'zh-Hans': '轮换的房间' },
    help: { en: 'With "A different one every day". Empty: all of them.', es: 'Con «Una distinta cada día». Vacío: todas.', de: 'Mit „Jeden Tag ein anderes“. Leer: alle.', 'zh-Hant': '搭配「每天換一個」使用。留空：全部。', 'zh-Hans': '配合“每天换一个”使用。留空：全部。' },
  }),
  projects: t.filter({
    label: { en: 'Projects', es: 'Proyectos', de: 'Projekte', 'zh-Hant': '專案', 'zh-Hans': '项目' },
    help: {
      en: 'Which sessions get a cat. Empty: all. Project, repository or folder names or patterns, comma-separated: * matches anything, a leading ! leaves out (web-app, acme-*, !scratch).',
      es: 'Qué sesiones tienen gato. Vacío: todas. Nombres o patrones de proyecto, repositorio o carpeta, separados por comas: * vale por cualquier cosa y un ! delante excluye (web-app, acme-*, !pruebas).',
      de: 'Welche Sitzungen eine Katze bekommen. Leer: alle. Namen oder Muster von Projekten, Repositorys oder Ordnern, durch Kommas getrennt: * passt auf alles, ein ! davor schließt aus (web-app, acme-*, !test).',
      'zh-Hant': '哪些工作階段會有貓。留空：全部。填入專案、儲存庫或資料夾的名稱或模式，以逗號分隔：* 代表任意字元，開頭加 ! 則排除（web-app, acme-*, !scratch）。',
      'zh-Hans': '哪些会话会有猫。留空：全部。填写项目、仓库或文件夹的名称或模式，用逗号分隔：* 匹配任意内容，开头加 ! 表示排除（web-app, acme-*, !scratch）。',
    },
  }),
  column: t.enum(['none', 'right', 'left', 'alternate'] as const, {
    label: { en: 'Strip without cats', es: 'Franja sin gatos', de: 'Streifen ohne Katzen', 'zh-Hant': '無貓區', 'zh-Hans': '无猫区' },
    help: {
      en: 'Keeps a strip of the floor free, like the old card column. "Alternate" swaps sides now and then, against burn-in.',
      es: 'Deja libre una franja del suelo, como la antigua columna de tarjetas. «Alternar» cambia de lado cada cierto tiempo, contra el quemado.',
      de: 'Hält einen Streifen des Bodens frei, wie die alte Kartenspalte. „Abwechselnd“ wechselt ab und zu die Seite, gegen Einbrennen.',
      'zh-Hant': '在地板上留出一條空白區，就像以前的卡片欄。「交替」會不時換邊，防止烙印。',
      'zh-Hans': '在地板上留出一条空白带，就像以前的卡片栏。“交替”会不时换边，防止烧屏。',
    },
    labels: {
      none: { en: 'None', es: 'Ninguna', de: 'Keiner', 'zh-Hant': '無', 'zh-Hans': '无' },
      right: { en: 'Right', es: 'Derecha', de: 'Rechts', 'zh-Hant': '右側', 'zh-Hans': '右侧' },
      left: { en: 'Left', es: 'Izquierda', de: 'Links', 'zh-Hant': '左側', 'zh-Hans': '左侧' },
      alternate: { en: 'Alternate', es: 'Alternar', de: 'Abwechselnd', 'zh-Hant': '交替', 'zh-Hans': '交替' },
    },
  }),
  shelf: t.boolean({
    default: true,
    label: { en: 'Week shelf', es: 'Estantería de la semana', de: 'Wochenregal', 'zh-Hant': '本週書架', 'zh-Hans': '本周书架' },
    help: {
      en: 'A cabinet at the back with a book per commit of yours this week and a binder per merged MR/PR. Read with git in the repos your sessions have been in.',
      es: 'Un mueble al fondo con un libro por cada commit tuyo de esta semana y un archivador por MR/PR fusionada. Se lee con git en los repos donde han estado tus sesiones.',
      de: 'Ein Schrank im Hintergrund mit einem Buch pro Commit von dir in dieser Woche und einem Ordner pro gemergtem MR/PR. Gelesen mit git in den Repos, in denen deine Sitzungen waren.',
      'zh-Hant': '後方的書櫃：本週你的每個提交是一本書，每個已合併的 MR/PR 是一個資料夾。透過 git 讀取你的工作階段待過的儲存庫。',
      'zh-Hans': '后方的书柜：本周你的每个提交是一本书，每个已合并的 MR/PR 是一个文件夹。通过 git 读取你的会话待过的仓库。',
    },
  }),
  swapSidesMs: t.duration({ default: 60 * 60_000, min: 60_000, label: { en: 'Swap sides every', es: 'Cambiar de lado cada', de: 'Seite wechseln alle', 'zh-Hant': '換邊間隔', 'zh-Hans': '换边间隔' }, advanced: true }),
});

type RoomOptions = (typeof roomOptions)['default'];

/**
 * The scene's settings. The zombie threshold is the `agents/sessions`
 * source's (`zombieMs`): a working session silent for half of it turns into
 * Schrödinger's box, and at all of it the source drops it.
 */
function sceneOptions(o: RoomOptions, zombieMs: number): SceneOptions {
  return { room: o.room, rooms: o.rooms, column: COLUMN[o.column], swapSidesMs: o.swapSidesMs, zombieMs };
}

/** Sunrise and sunset for the sky: the user's place, or the weather reading's if none is set. */
export function sunFor(now: number, weather: Weather | undefined, location: Location | undefined): SunTimes | null {
  const lat = location?.latitude ?? weather?.latitude;
  const lon = location?.longitude ?? weather?.longitude;
  return lat === undefined || lon === undefined ? null : sunTimes(new Date(now), lat, lon);
}

// ---------- Demo ----------
const MIN = 60_000;

function demoSession(now: number, id: string, project: string, state: SessionView['state'], sinceMin: number, extra: Partial<SessionView> = {}): SessionView {
  return {
    schemaVersion: 1,
    session_id: id,
    provider: 'claude',
    state,
    detail: '',
    project,
    cwd: `/home/dev/src/${project}`,
    repo: `/home/dev/src/${project}`,
    since: now - sinceMin * MIN,
    started: now - (sinceMin + 30) * MIN,
    updated: now - Math.min(sinceMin * MIN, 20_000),
    event: 'PreToolUse',
    ...extra,
  };
}

export function demoSessions(now: number): SessionView[] {
  return [
    demoSession(now, 'demo-api-7f3a', 'api', 'permission', 2, { detail: 'Bash: npm publish', event: 'PermissionRequest' }),
    demoSession(now, 'demo-web-1c9e', 'web-app', 'waiting', 6, { event: 'Stop' }),
    demoSession(now, 'demo-infra-8c07', 'infra', 'active', 18, { detail: 'Edit: modules/network/main.tf', duck: true }),
    demoSession(now, 'demo-docs-9d11', 'docs', 'ready', 9, { event: 'Stop' }),
  ];
}

export function demoWeather(now: number): Weather {
  return {
    place: 'Madrid', latitude: 40.4168, longitude: -3.7038, temp: 17, feels: 16, code: 2, humidity: 58, wind: 12, night: false,
    days: [{ date: new Date(now).toISOString().slice(0, 10), code: 2, min: 9, max: 19, rain: 10 }],
    hours: [], fetched: now - 5 * MIN,
  };
}

/** The scene's gesture or walk for a frame of the animation (see `animation`). */
export function animationOf(a: AnimationFrame | undefined): Pick<SceneInput, 'anim' | 'move'> {
  if (!a) return {};
  const p = a.plan.params as { kind: string; id?: string; from?: Record<string, Placement> };
  if (p.kind === 'walk') return { move: { from: p.from ?? {}, t: a.t } };
  return { anim: gestureAt({ id: p.id ?? '', kind: p.kind as GestureKind }, a.i, a.plan.frames) };
}

export const room = defineWidget({
  id: 'room',
  name: { en: 'Cats room', es: 'Habitación de gatos', de: 'Katzenzimmer', 'zh-Hant': '貓咪房間', 'zh-Hans': '猫咪房间' },
  description: {
    en: 'Each AI agent session is a cat in a room with the real sky outside: the ones that need you come forward, the ones working sit at their laptops in the back.',
    es: 'Cada sesión de un agente IA es un gato en una habitación con el cielo de verdad: los que te necesitan se acercan y los que trabajan se quedan al fondo con su portátil.',
    de: 'Jede Sitzung eines KI-Agenten ist eine Katze in einem Zimmer mit dem echten Himmel draußen: Wer dich braucht, kommt nach vorn; wer arbeitet, sitzt hinten am Laptop.',
    'zh-Hant': '每個 AI 代理工作階段都是一隻貓，待在窗外是真實天空的房間裡：需要你的貓會走到前面，正在工作的則坐在後面對著筆電。',
    'zh-Hans': '每个 AI 智能体会话都是一只猫，待在窗外是真实天空的房间里：需要你的猫会走到前面，正在工作的则坐在后面对着笔记本电脑。',
  },
  icon: 'cat',
  category: 'scene',
  tags: ['agents', 'claude', 'gemini', 'illustration'],
  chrome: 'bare',
  size: { min: { w: 960, h: 300 }, preferred: { w: 1920, h: 462 } },
  options: roomOptions,
  sources: ['agents/sessions', 'weather/current'],
  // The wall clock moves every minute.
  redraw: 'minute',
  // The week's git log: a few minutes are plenty, a commit shows on the next read.
  intervalMs: 3 * MIN,
  async fetch({ options, sources, now, dataDir, cacheDir, signal }): Promise<{ shelf: ShelfView | null; trophies: string[] }> {
    // The week's LEGO sets, noted when each build ends (see `animationEnded`).
    const trophies = thisWeek(loadTrophies(join(dataDir, 'trophies.json')), now);
    if (!options.shelf) return { shelf: null, trophies };
    const repos = filterProjects(sessionsOf(sources), options.projects).map((s) => s.repo);
    return { shelf: await readShelf(join(cacheDir || dataDir, 'shelf.json'), repos, now, signal), trophies };
  },
  animationEnded({ plan, completed, now, dataDir, log }) {
    // A set that got built to the end is a trophy for the week.
    if (!completed || (plan.params as { kind?: string } | undefined)?.kind !== 'montaje') return;
    const id = lastBuiltSet();
    if (!id) return;
    try {
      addTrophy(join(dataDir, 'trophies.json'), id, Date.now());
    } catch (err) {
      log(`could not note the trophy: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
  idle: ({ sources, options }) => !filterProjects(sessionsOf(sources), options.projects).some((s) => s.startsAt === undefined),
  // A gesture now and then (a blink, a tail, a yawn…) and a walk when a cat changes spot.
  animationGap: { minMs: 15_000, maxMs: 40_000 },
  animationCooldownMs: 10_000,
  animation({ trigger, box, options, sources, now, location, prev, rnd }) {
    const width = Math.max(1, Math.round(box.w)), height = Math.max(1, Math.round(box.h));
    const weather = sources['weather/current'] as Weather | undefined;
    const scene = { sessions: filterProjects(sessionsOf(sources), options.projects), now, width, height, options: sceneOptions(options, zombieMsOf(sources)) };
    const actors = sceneLayout(scene).actors;
    if (trigger === 'data') {
      // Someone moved (a session started, finished or changed what it does): the cats walk to their new spots.
      if (!prev) return null;
      const before = sceneLayout({ ...scene, sessions: filterProjects(sessionsOf(prev.sources), options.projects) }).actors;
      const from = placements(before);
      if (!significantMove(from, placements(actors))) return null;
      return { id: 'walk', frames: Math.round(MOVE_SECONDS * ANIM_FPS) + 1, fps: ANIM_FPS, params: { kind: 'walk', from: Object.fromEntries(from) } };
    }
    const around = surroundings({ ...scene, weather: weather ?? null, sun: sunFor(now, weather, location) });
    const list = candidates(actors, now, false, around).filter((c) => !UNSUPPORTED.has(c.kind));
    const pick = list[Math.floor(rnd() * list.length)];
    if (!pick) return null;
    const plan = planGesture(pick, ANIM_FPS, FORCED_KINDS.includes(pick.kind));
    // The plan says the frame to hold at; the SDK wants it as a fraction of the animation.
    return { id: plan.id, frames: plan.frames, fps: plan.fps, params: plan.params, interruptible: plan.interruptible, ...(plan.hold ? { hold: { at: plan.hold.at / (plan.frames - 1), ms: plan.hold.ms } } : {}) };
  },
  render(g, ctx) {
    const { box, now, options, sources } = ctx;
    useCanvas(ctx.canvas);
    const weather = sources['weather/current'] as Weather | undefined;
    const width = Math.max(1, Math.round(box.w)), height = Math.max(1, Math.round(box.h));
    const input: SceneInput = {
      sessions: filterProjects(sessionsOf(sources), options.projects),
      now,
      width,
      height,
      options: sceneOptions(options, zombieMsOf(sources)),
      words: wordsFor(ctx),
      weather: weather ?? null,
      sun: sunFor(now, weather, ctx.location),
      shelf: options.shelf ? ctx.data?.shelf ?? null : null,
      trophies: ctx.data?.trophies ?? [],
      ...animationOf(ctx.anim),
    };
    // Straight on the panel when it comes out the same (a whole-pixel box), else on a canvas of its own.
    if (width === box.w && height === box.h && canPaintOn(g, box.x, box.y)) paintScene(g, box.x, box.y, input);
    else g.drawImage(renderScene(input), box.x, box.y, box.w, box.h);
  },
  demo: ({ now }) => ({ sources: { 'agents/sessions': { sessions: demoSessions(now), zombieMs: 15 * MIN }, 'weather/current': demoWeather(now) } }),
});

export const duel = defineInterlude({
  id: 'duel',
  name: { en: 'Quarter-hour duel', es: 'Duelo del cuarto de hora', de: 'Viertelstunden-Duell', 'zh-Hant': '一刻鐘決鬥', 'zh-Hans': '一刻钟决斗' },
  description: {
    en: 'Two of your sessions fight it out with laser swords in the cats room. The one with fewer uncommitted files wins. With a single session, it fights the bug.',
    es: 'Dos de tus sesiones se baten con espadas láser en la habitación de los gatos. Gana la que tiene menos ficheros sin commit. Con una sola, se bate con el bug.',
    de: 'Zwei deiner Sitzungen kämpfen im Katzenzimmer mit Laserschwertern. Wer weniger nicht committete Dateien hat, gewinnt. Mit nur einer Sitzung kämpft sie gegen den Bug.',
    'zh-Hant': '你的兩個工作階段在貓咪房間裡用光劍一決高下，未提交檔案較少的一方獲勝。只有一個工作階段時，就跟 bug 決鬥。',
    'zh-Hans': '你的两个会话在猫咪房间里用光剑一决高下，未提交文件较少的一方获胜。只有一个会话时，就跟 bug 决斗。',
  },
  icon: 'swords',
  options: t.object({ room: roomOptions.props.room, rooms: roomOptions.props.rooms, projects: roomOptions.props.projects }),
  sources: ['agents/sessions', 'weather/current'],
  fps: DUEL_FPS,
  async prepare(ctx) {
    useCanvas(ctx.canvas);
    const weather = ctx.sources['weather/current'] as Weather | undefined;
    const words = wordsFor(ctx);
    const plan = planDuel(filterProjects(sessionsOf(ctx.sources), ctx.options.projects), ctx.now, words, zombieMsOf(ctx.sources));
    if (!plan) return null;
    const input = { plan, width: ctx.width, height: ctx.height, now: ctx.now, room: ctx.options.room, rooms: ctx.options.rooms, words, weather: weather ?? null, sun: sunFor(ctx.now, weather, ctx.location) };
    return prerenderDuel(input, ctx.canvas);
  },
  // Not over something that needs you: a permission or a session waiting.
  skip: ({ sources, options }) => filterProjects(sessionsOf(sources), options.projects).some((s) => s.state === 'permission' || s.state === 'waiting'),
});

export default definePlugin({
  id: 'cats',
  name: { en: 'Cats room', es: 'Habitación de gatos', de: 'Katzenzimmer', 'zh-Hant': '貓咪房間', 'zh-Hans': '猫咪房间' },
  version: '0.2.1',
  languages: ['en', 'es', 'de', 'zh-Hant', 'zh-Hans'],
  sdk: '^0.2.0',
  permissions: { exec: ['git'] },
  requires: ['agents/sessions'],
  optional: ['weather/current'],
  description: {
    en: 'Your AI agent sessions as cats in a room: what needs you comes forward. From aimonitor.',
    es: 'Tus sesiones de agentes IA como gatos en una habitación: lo que te reclama se acerca. De aimonitor.',
    de: 'Deine KI-Agenten-Sitzungen als Katzen in einem Zimmer: Was dich braucht, kommt nach vorn. Aus aimonitor.',
    'zh-Hant': '把你的 AI 代理工作階段變成房間裡的貓：需要你的會走到前面。來自 aimonitor。',
    'zh-Hans': '把你的 AI 智能体会话变成房间里的猫：需要你的会走到前面。来自 aimonitor。',
  },
  author: 'Kiosko',
  license: 'MIT',
  icon: 'cat',
  widgets: [room],
  interludes: [duel],
  templates: [
    {
      id: 'room',
      name: { en: 'Cats room', es: 'Habitación de gatos', de: 'Katzenzimmer', 'zh-Hant': '貓咪房間', 'zh-Hans': '猫咪房间' },
      icon: 'cat',
      wide: [
        { x: 0, y: 0, w: 7 / 10, h: 1, widgets: ['room'], chrome: 'bare' },
        { x: 7 / 10, y: 0, w: 3 / 10, h: 1, widgets: ['weather/forecast', 'mirror/countdown', 'mirror/onthisday', 'usage/rail'] },
      ],
      square: [
        { x: 0, y: 0, w: 1, h: 1, widgets: ['room'], chrome: 'bare' },
      ],
    },
  ],
});
