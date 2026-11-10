import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { composeWidget, normalize, registerFonts, Registry } from '@kiosko/core';
import { DEFAULT_THEME, DEFAULT_WORKDAY } from '@kiosko/sdk';
import { useCanvas } from './canvas.ts';
import plugin, { demoSessions, demoWeather, sunFor } from './index.ts';
import { ROOMS, resolveRoom, roomFor } from './room.ts';
import { MIN_ROOM_W, type SceneInput, cacheStats, renderScene, roomView, sceneTagRects } from './scene.ts';
import { filterProjects, zombieMsOf, type SessionView } from './types.ts';
import { createBaseContext } from '@kiosko/sdk';
import { wordsFor } from './words.ts';

const wordsIn = (locale: string) => wordsFor(createBaseContext({ now: 0, locale }));

registerFonts();
useCanvas({ createCanvas, loadImage });

const MIN = 60_000;
const T0 = Date.parse('2026-11-05T10:42:00');
const OPTS = { room: 'estudio', column: 'none' as const, swapSidesMs: 0, zombieMs: 15 * MIN };
const input = (sessions: SessionView[], extra: Partial<SceneInput> = {}): SceneInput => ({
  sessions, now: T0, width: 1920, height: 462, options: OPTS, words: wordsIn('es'), weather: demoWeather(T0), ...extra,
});
const rec = (id: string, state: SessionView['state'], ago: number, extra: Partial<SessionView> = {}): SessionView => ({
  schemaVersion: 1, session_id: id, provider: 'claude', state, detail: '', project: id, cwd: `/r/${id}`,
  since: T0 - ago, updated: T0 - Math.min(ago, 5_000), event: 'x', ...extra,
});

test('rooms: one per day, and a cycle shows them all', () => {
  const start = new Date(2026, 9, 1, 12, 0).getTime();
  const seen = new Set(Array.from({ length: ROOMS.length }, (_, i) => roomFor(start + i * 86_400_000)));
  assert.equal(seen.size, ROOMS.length);
  // It changes at midnight, not at noon.
  assert.equal(roomFor(new Date(2026, 9, 1, 0, 5).getTime()), roomFor(new Date(2026, 9, 1, 23, 55).getTime()));
  assert.notEqual(roomFor(new Date(2026, 9, 1, 23, 55).getTime()), roomFor(new Date(2026, 9, 2, 0, 5).getTime()));
  assert.equal(resolveRoom('cocina', T0), 'cocina');
  assert.equal(resolveRoom('rotate', T0), roomFor(T0));
  assert.equal(resolveRoom('ballroom', T0), roomFor(T0));
});

test('rooms: every room paints by day and by night, each one different', () => {
  const frames = new Set<string>();
  for (const hour of [12, 23]) {
    const now = new Date(2026, 8, 20, hour, 30).getTime();
    for (const room of ROOMS) {
      const c = renderScene(input([rec('a', 'active', MIN)], { now, options: { ...OPTS, room }, width: 960, height: 231 }));
      frames.add(c.toBuffer('image/png').toString('base64'));
    }
  }
  assert.equal(frames.size, ROOMS.length * 2);
});

test('scene: paints at any size, with or without data', () => {
  for (const [w, h] of [[1920, 462], [1200, 462], [960, 300], [600, 440]] as const) {
    const c = renderScene(input(demoSessions(T0), { width: w, height: h }));
    assert.equal(c.width, w);
    assert.equal(c.height, h);
  }
  renderScene(input([], { weather: null }));
  renderScene(input(demoSessions(T0), { weather: null, sun: { rise: 8, set: 18 }, away: true, words: wordsIn('en') }));
});

test('scene: a narrow tile shows a crop of a room wide enough for its lamp and clock', () => {
  const wide = roomView(1920, 462);
  assert.equal(wide.x0, 0);
  assert.equal(wide.RW, 1920);
  const narrow = roomView(1000, 462);
  assert.equal(narrow.RW, MIN_ROOM_W);
  assert.ok(narrow.x0 > 0 && narrow.x0 + narrow.W <= narrow.RW);
});

test('scene: the same frame is identical and reuses the cache', () => {
  const a = renderScene(input(demoSessions(T0))).toBuffer('image/png');
  const before = cacheStats().paints;
  const b = renderScene(input(demoSessions(T0))).toBuffer('image/png');
  assert.equal(cacheStats().paints, before, 'no cat is painted again');
  assert.ok(a.equals(b), 'and it is deterministic');
  // The wall clock moves every minute (the widget redraws each minute).
  const e0 = renderScene(input([])).toBuffer('image/png');
  const e1 = renderScene(input([], { now: T0 + 60_000 })).toBuffer('image/png');
  assert.ok(!e0.equals(e1));
});

test('tags: never overlap, in any scenario or tile size', () => {
  const scenarios = [demoSessions(T0), Array.from({ length: 8 }, (_, i) => rec(`s${i}`, (['active', 'ready', 'waiting', 'idle'] as const)[i % 4]!, (i + 1) * MIN))];
  for (const [w, h] of [[1920, 462], [1200, 462], [960, 300]] as const) {
    for (const sessions of scenarios) {
      const r = sceneTagRects(input(sessions, { width: w, height: h }));
      for (let i = 0; i < r.length; i++) {
        for (let j = i + 1; j < r.length; j++) {
          const a = r[i]!, b = r[j]!;
          assert.ok(!(a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0), `${w}x${h}: «${a.name}» overlaps «${b.name}»`);
        }
      }
    }
  }
});

test('tags: a long tag is not cut to the width of a small cat', () => {
  const r = sceneTagRects(input([rec('long-project-name', 'active', 9 * MIN)]));
  const g = r.find((t) => t.name === 'long-project-name')!;
  assert.ok(g.fits);
  assert.ok(g.x1 - g.x0 > 200, `the tag is ${Math.round(g.x1 - g.x0)} wide`);
});

test('widget: idle without sessions; demo data renders', () => {
  const room = plugin.widgets!.find((w) => w.id === 'room')!;
  const state = (sessions: SessionView[]) => ({ options: {}, data: undefined, sources: { 'agents/sessions': { sessions } }, now: T0, working: true, workday: DEFAULT_WORKDAY });
  assert.equal(room.idle!(state([])), true);
  assert.equal(room.idle!(state([rec('m', 'waiting', MIN, { startsAt: T0 + MIN })])), true, 'a meeting alone is no cat');
  assert.equal(room.idle!(state(demoSessions(T0))), false);
  const demo = room.demo!({ options: {}, now: T0, locale: "en" });
  assert.ok((demo.sources?.['agents/sessions'] as { sessions: SessionView[] }).sessions.length >= 2);
});

test('rooms: "rotate" can go through only some rooms', () => {
  const start = new Date(2026, 9, 1, 12, 0).getTime();
  const among = ['playa', 'bosque', 'not-a-room'];
  const seen = new Set(Array.from({ length: 6 }, (_, i) => roomFor(start + i * 86_400_000, among)));
  assert.deepEqual([...seen].sort(), ['bosque', 'playa']);
  assert.equal(resolveRoom('rotate', T0, ['cocina']), 'cocina');
  assert.equal(resolveRoom('espacio', T0, ['cocina']), 'espacio', 'a chosen room wins');
  assert.equal(roomFor(T0, ['nothing']), roomFor(T0), 'no known room: all of them');
});

test('widget: projects decide which sessions get a cat', () => {
  const all = demoSessions(T0);
  assert.deepEqual(filterProjects(all, ['web-*', 'infra']).map((s) => s.project), ['web-app', 'infra']);
  assert.deepEqual(filterProjects(all, ['!api']).map((s) => s.project), ['web-app', 'infra', 'docs']);
  assert.deepEqual(filterProjects(all, ['/home/dev/src/doc*']).map((s) => s.project), ['docs'], 'by folder');
  const room = plugin.widgets!.find((w) => w.id === 'room')!;
  const state = (projects: string[]) => ({ options: { projects }, data: undefined, sources: { 'agents/sessions': { sessions: all } }, now: T0, working: true, workday: DEFAULT_WORKDAY });
  assert.equal(room.idle!(state(['nothing-*'])), true);
  assert.equal(room.idle!(state(['api'])), false);
});

test('widget: the zombie threshold is the source\'s', () => {
  assert.equal(zombieMsOf({}), 15 * MIN);
  assert.equal(zombieMsOf({ 'agents/sessions': { sessions: [], zombieMs: 40 * MIN } }), 40 * MIN);
  const reg = new Registry();
  reg.add(plugin);
  // Working, silent for 10 min: past half of 15 min (Schrödinger's box), not of 60.
  const quiet = [rec('quiet', 'active', 20 * MIN, { updated: T0 - 10 * MIN })];
  const paint = (zombieMs: number) =>
    composeWidget({ cfg: normalize({}), registry: reg, theme: DEFAULT_THEME, type: 'cats/room', width: 960, height: 300, now: T0, options: { room: 'estudio' }, sources: { 'agents/sessions': { sessions: quiet, zombieMs }, 'weather/current': demoWeather(T0) } }).canvas.toBuffer('image/png');
  assert.ok(!paint(15 * MIN).equals(paint(60 * MIN)));
  assert.ok(paint(60 * MIN).equals(paint(45 * MIN)), 'both well short of half');
});

test('sky: the user\'s place first, the weather reading\'s when none is set', () => {
  const madrid = sunFor(T0, demoWeather(T0), undefined)!;
  const oslo = sunFor(T0, demoWeather(T0), { latitude: 59.91, longitude: 10.75 })!;
  assert.ok(oslo.set - oslo.rise < madrid.set - madrid.rise, 'a November day is shorter in Oslo');
  assert.equal(sunFor(T0, undefined, undefined), null);
});

test('words: the panel language through ctx.t, times through ctx.fmt', () => {
  assert.equal(wordsIn('fr').mayI, 'MAY I?', 'a language without a table gets English');
  assert.equal(wordsIn('es-MX').mayI, '¿PUEDO?');
  assert.equal(wordsIn('es').elapsed(30_000), 'ahora');
  assert.equal(wordsIn('en').elapsed(65 * MIN), '1 h 05');
  assert.equal(wordsIn('es').inTime(wordsIn('es').countdown(4 * MIN + 1_000)), 'en 5 min');
});
