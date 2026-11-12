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
import { lastBuiltSet, renderScene, sceneLayout, surroundings, type SceneInput, type SceneOptions } from './scene.ts';
import { readShelf, type ShelfView } from './shelf.ts';
import { addTrophy, loadTrophies, thisWeek } from './trophies.ts';
import { filterProjects, sessionsOf, zombieMsOf, type SessionView } from './types.ts';
import { wordsFor } from './words.ts';

const ROOM_LABELS: Record<'rotate' | RoomName, Localized> = {
  rotate: { en: 'A different one every day', es: 'Una distinta cada día' },
  estudio: { en: 'Study', es: 'Estudio' },
  cocina: { en: 'Kitchen', es: 'Cocina' },
  cabana: { en: 'Log cabin', es: 'Cabaña' },
  atico: { en: 'Attic', es: 'Ático' },
  oficina: { en: 'Office', es: 'Oficina' },
  japonesa: { en: 'Japanese room', es: 'Habitación japonesa' },
  acuario: { en: 'Aquarium', es: 'Acuario' },
  arcade: { en: 'Arcade', es: 'Recreativos' },
  ventanal: { en: 'Picture window', es: 'Ventanal' },
  playa: { en: 'Beach', es: 'Playa' },
  espacio: { en: 'Outer space', es: 'Espacio' },
  antartida: { en: 'Antarctica', es: 'Antártida' },
  desierto: { en: 'Desert', es: 'Desierto' },
  bosque: { en: 'Forest', es: 'Bosque' },
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
    label: { en: 'Room', es: 'Habitación' },
    help: { en: 'Indoors or out, each with its own window, lamp and floor.', es: 'Dentro o fuera, cada una con su ventana, su lámpara y su suelo.' },
    labels: ROOM_LABELS,
  }),
  rooms: t.list(t.enum(ROOMS, { labels: ROOM_LABELS }), {
    label: { en: 'Rooms to rotate through', es: 'Habitaciones por las que rotar' },
    help: { en: 'With "A different one every day". Empty: all of them.', es: 'Con «Una distinta cada día». Vacío: todas.' },
  }),
  projects: t.filter({
    label: { en: 'Projects', es: 'Proyectos' },
    help: {
      en: 'Which sessions get a cat. Empty: all. Project, repository or folder names or patterns, comma-separated: * matches anything, a leading ! leaves out (web-app, acme-*, !scratch).',
      es: 'Qué sesiones tienen gato. Vacío: todas. Nombres o patrones de proyecto, repositorio o carpeta, separados por comas: * vale por cualquier cosa y un ! delante excluye (web-app, acme-*, !pruebas).',
    },
  }),
  column: t.enum(['none', 'right', 'left', 'alternate'] as const, {
    label: { en: 'Strip without cats', es: 'Franja sin gatos' },
    help: {
      en: 'Keeps a strip of the floor free, like the old card column. "Alternate" swaps sides now and then, against burn-in.',
      es: 'Deja libre una franja del suelo, como la antigua columna de tarjetas. «Alternar» cambia de lado cada cierto tiempo, contra el quemado.',
    },
    labels: {
      none: { en: 'None', es: 'Ninguna' },
      right: { en: 'Right', es: 'Derecha' },
      left: { en: 'Left', es: 'Izquierda' },
      alternate: { en: 'Alternate', es: 'Alternar' },
    },
  }),
  shelf: t.boolean({
    default: true,
    label: { en: 'Week shelf', es: 'Estantería de la semana' },
    help: {
      en: 'A cabinet at the back with a book per commit of yours this week and a binder per merged MR/PR. Read with git in the repos your sessions have been in.',
      es: 'Un mueble al fondo con un libro por cada commit tuyo de esta semana y un archivador por MR/PR fusionada. Se lee con git en los repos donde han estado tus sesiones.',
    },
  }),
  swapSidesMs: t.duration({ default: 60 * 60_000, min: 60_000, label: { en: 'Swap sides every', es: 'Cambiar de lado cada' }, advanced: true }),
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
  name: { en: 'Cats room', es: 'Habitación de gatos' },
  description: {
    en: 'Each AI agent session is a cat in a room with the real sky outside: the ones that need you come forward, the ones working sit at their laptops in the back.',
    es: 'Cada sesión de un agente IA es un gato en una habitación con el cielo de verdad: los que te necesitan se acercan y los que trabajan se quedan al fondo con su portátil.',
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
    const frame = renderScene({
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
    });
    g.drawImage(frame, box.x, box.y, box.w, box.h);
  },
  demo: ({ now }) => ({ sources: { 'agents/sessions': { sessions: demoSessions(now), zombieMs: 15 * MIN }, 'weather/current': demoWeather(now) } }),
});

export const duel = defineInterlude({
  id: 'duel',
  name: { en: 'Quarter-hour duel', es: 'Duelo del cuarto de hora' },
  description: {
    en: 'Two of your sessions fight it out with laser swords in the cats room. The one with fewer uncommitted files wins. With a single session, it fights the bug.',
    es: 'Dos de tus sesiones se baten con espadas láser en la habitación de los gatos. Gana la que tiene menos ficheros sin commit. Con una sola, se bate con el bug.',
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
  name: { en: 'Cats room', es: 'Habitación de gatos' },
  version: '0.2.0',
  description: {
    en: 'Your AI agent sessions as cats in a room: what needs you comes forward. From aimonitor.',
    es: 'Tus sesiones de agentes IA como gatos en una habitación: lo que te reclama se acerca. De aimonitor.',
  },
  author: 'Kiosko',
  license: 'MIT',
  icon: 'cat',
  widgets: [room],
  interludes: [duel],
});
