import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { registerFonts } from '@kiosko/core';
import { createBaseContext, DEFAULT_WORKDAY } from '@kiosko/sdk';
import { useCanvas } from './canvas.ts';
import { DURATION, FORCED_KINDS } from './anim.ts';
import { animationOf, demoSessions, demoWeather, room } from './index.ts';
import { renderScene } from './scene.ts';
import type { SessionView } from './types.ts';
import { wordsFor } from './words.ts';

registerFonts();
useCanvas({ createCanvas, loadImage });

const MIN = 60_000;
const T0 = Date.parse('2026-11-05T10:42:00');
const options = { room: 'estudio', rooms: [], projects: [], column: 'none', swapSidesMs: 3_600_000, shelf: false } as const;
const box = { x: 0, y: 0, w: 1920, h: 462 };

/** What the runtime gives `animation`: the state of the widget and why it is asked. */
function ask(trigger: 'idle' | 'data', sessions: SessionView[], extra: Record<string, unknown> = {}, rnd = () => 0) {
  return room.animation!({
    trigger, box, rnd, options: { ...options } as never, data: undefined,
    sources: { 'agents/sessions': { sessions, zombieMs: 15 * MIN }, 'weather/current': demoWeather(T0) },
    now: T0, working: true, workday: DEFAULT_WORKDAY, ...extra,
  } as never);
}

// Long-waiting sessions so that more than the blinks are candidates.
const sessions = demoSessions(T0).map((s) => ({ ...s, since: T0 - 90 * MIN }));

test('animation: an idle question picks a gesture among the candidates, with a plan the runtime can play', () => {
  const plan = ask('idle', sessions)!;
  assert.ok(plan, 'a gesture');
  const params = plan.params as { id: string; kind: keyof typeof DURATION };
  assert.ok(params.kind in DURATION);
  assert.equal(plan.fps, 12);
  assert.equal(plan.frames, Math.round(DURATION[params.kind] * 12) + 1);
  assert.ok(plan.frames >= 3);
  // Only the forced ones can't be cut short.
  assert.equal(plan.interruptible, !FORCED_KINDS.includes(params.kind as never));
});

test('animation: the choice follows rnd, and the console and the fireman are never asked for', () => {
  const kinds = new Set<string>();
  for (let i = 0; i < 40; i++) kinds.add((ask('idle', sessions, {}, () => i / 40)!.params as { kind: string }).kind);
  assert.ok(kinds.size > 2, `several kinds (${[...kinds]})`);
  assert.ok(!kinds.has('consola') && !kinds.has('espuma'));
});

test('animation: no sessions, nothing to animate', () => {
  assert.equal(ask('idle', []), null);
});

test('animation: a cat that changes spot walks, with the previous places in the plan', () => {
  const [a, b, c, d] = sessions as [SessionView, SessionView, SessionView, SessionView];
  const before = [a, b, c, d];
  const after = [{ ...b, state: 'active' as const }, a, c, d];
  const plan = ask('data', after, { prev: { data: undefined, sources: { 'agents/sessions': { sessions: before, zombieMs: 15 * MIN } } } })!;
  assert.ok(plan, 'a walk');
  assert.equal(plan.id, 'walk');
  assert.equal((plan.params as { kind: string }).kind, 'walk');
  assert.ok(Object.keys((plan.params as { from: object }).from).length > 0);
  // Nothing changed: no walk. And without a previous state there is nothing to compare.
  assert.equal(ask('data', before, { prev: { data: undefined, sources: { 'agents/sessions': { sessions: before, zombieMs: 15 * MIN } } } }), null);
  assert.equal(ask('data', after), null);
});

test('animation: a frame of the plan becomes the scene gesture, and the ends are the still picture', () => {
  const plan = ask('idle', sessions, {}, () => 0)!;
  const mid = animationOf({ plan, i: Math.floor(plan.frames / 2), t: 0.5 });
  assert.equal(mid.anim?.t, 0.5);
  assert.equal(mid.anim?.kind, (plan.params as { kind: string }).kind);
  assert.deepEqual(animationOf(undefined), {});
  const walk = animationOf({ plan: { id: 'walk', frames: 15, fps: 12, params: { kind: 'walk', from: { x: { x: 1, floorY: 2, scale: 1, z: 0, pose: 'sentado' } } } }, i: 3, t: 0.2 });
  assert.equal(walk.move?.t, 0.2);
  assert.ok(walk.move?.from.x);
});

test('animation: rendering a gesture differs from the still picture mid-gesture and matches it at the ends', () => {
  const base = { sessions, now: T0, width: 960, height: 231, options: { room: 'estudio', column: 'none' as const, swapSidesMs: 0, zombieMs: 15 * MIN }, words: wordsFor(createBaseContext({ now: T0, locale: 'es' })), weather: demoWeather(T0) };
  const still = renderScene(base).toBuffer('image/png');
  // The cat at the laptop types: its keys show mid-gesture.
  const g = { id: sessions[2]!.session_id, kind: 'teclea' as const, t: 0.5 };
  const mid = renderScene({ ...base, anim: g }).toBuffer('image/png');
  assert.notDeepEqual(mid, still);
  assert.deepEqual(renderScene({ ...base, anim: { ...g, t: 0 } }).toBuffer('image/png'), still);
  assert.deepEqual(renderScene({ ...base, anim: { ...g, t: 1 } }).toBuffer('image/png'), still);
});

test('animation: a set built to the end becomes a trophy, one cut short or another gesture does not', async () => {
  const { mkdtempSync, readFileSync, existsSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'cats-'));
  const base = { sessions, now: T0, width: 1920, height: 462, options: { room: 'estudio', column: 'none' as const, swapSidesMs: 0, zombieMs: 15 * MIN }, words: wordsFor(createBaseContext({ now: T0, locale: 'es' })), weather: demoWeather(T0) };
  // Painting the assembly is what decides which set it is.
  renderScene({ ...base, anim: { id: sessions[1]!.session_id, kind: 'montaje', t: 0.5 } });
  const ended = (kind: string, completed: boolean) =>
    room.animationEnded!({ plan: { id: kind, frames: 10, fps: 12, params: { kind } }, completed, dataDir: dir, log: () => undefined, options: {}, now: T0 } as never);
  ended('montaje', false);
  ended('cola', true);
  assert.equal(existsSync(join(dir, 'trophies.json')), false);
  ended('montaje', true);
  const list = JSON.parse(readFileSync(join(dir, 'trophies.json'), 'utf8')) as { id: string }[];
  assert.equal(list.length, 1);
  assert.ok(list[0]!.id.length > 0);
});
