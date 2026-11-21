import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { registerFonts } from '@kiosko/core';
import { createBaseContext } from '@kiosko/sdk';
import { useCanvas } from './canvas.ts';
import { COATS, backCat, frontCat } from './cat.ts';
import { DURATION } from './anim.ts';
import { demoSessions, demoWeather, sunFor } from './index.ts';
import { type Layer, type LayerCache } from './layers.ts';
import type { X } from './paint.ts';
import { type SceneInput, cacheStats, canPaintOn, paintScene, renderScene, sceneLayout, useLayers } from './scene.ts';
import { wordsFor } from './words.ts';

registerFonts();
useCanvas({ createCanvas, loadImage });

const MIN = 60_000;
const T0 = Date.parse('2026-11-05T10:42:00');
const words = wordsFor(createBaseContext({ now: 0, locale: 'es' }));
// Long-waiting sessions, so the sitting cat may yawn too.
const sessions = demoSessions(T0).map((s) => ({ ...s, since: T0 - 90 * MIN }));
const input = (extra: Partial<SceneInput> = {}): SceneInput => ({
  sessions, now: T0, width: 1920, height: 462, options: { room: 'estudio', column: 'none', swapSidesMs: 0, zombieMs: 15 * MIN },
  words, weather: demoWeather(T0), sun: sunFor(T0, demoWeather(T0), undefined), ...extra,
});

const pixels = (c: { getContext(t: '2d'): X; width: number; height: number }) => Buffer.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data.buffer);

/** Largest difference of a channel, and how many pixels differ at all. */
function diff(a: Buffer, b: Buffer): { max: number; pixels: number } {
  let max = 0, n = 0;
  for (let i = 0; i < a.length; i += 4) {
    let d = 0;
    for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(a[i + k]! - b[i + k]!));
    if (d) n++;
    max = Math.max(max, d);
  }
  return { max, pixels: n };
}

test('cache: a frame of a blink, a tail, the ears or a yawn, from the layers kept, looks like the frame painted whole', () => {
  const actors = sceneLayout(input()).actors.filter((a) => a.pose === 'cartel' || a.pose === 'sentado' || a.pose === 'portatil');
  assert.equal(actors.length, 3);
  for (const a of actors) {
    for (const kind of ['parpadeo', 'cola', 'orejas', 'bostezo'] as const) {
      const frames = Math.round(DURATION[kind] * 12) + 1;
      let made = -1;
      for (const i of [1, Math.floor(frames / 2), frames - 2]) {
        const frame = input({ anim: { id: a.records[0]!.session_id, kind, t: i / (frames - 1) } });
        const cached = pixels(renderScene(frame));
        // The first frame makes the cat's layers; the rest of the gesture only uses them.
        if (made < 0) made = cacheStats().layerPaints;
        else assert.equal(cacheStats().layerPaints, made, `${a.pose} ${kind}: no new layers`);
        // Painted again: the same pixels.
        assert.ok(pixels(renderScene(frame)).equals(cached));
        useLayers(false);
        const whole = pixels(renderScene(frame));
        useLayers(true);
        // Composing the layers rounds a little differently from painting on top: a few levels, along some edges of the cat.
        const d = diff(cached, whole);
        assert.ok(d.max <= 16 && d.pixels < 1500, `${a.pose} ${kind} frame ${i}: ${JSON.stringify(d)}`);
      }
    }
  }
});

test('cache: painted straight on the panel, the scene is its own canvas drawn there', () => {
  const id = sceneLayout(input()).actors.find((a) => a.pose === 'sentado')!.records[0]!.session_id;
  for (const extra of [{}, { anim: { id, kind: 'cola' as const, t: 0.4 } }, { anim: { id, kind: 'cafe' as const, t: 0.5 } }]) {
    // `shift`: where the compositor has moved the tile to (its own canvas: none).
    const panel = (direct: boolean, shift: number) => {
      const c = createCanvas(2000, 520);
      const g = c.getContext('2d');
      g.fillStyle = '#123';
      g.fillRect(0, 0, 2000, 520);
      // What the compositor may leave set: a whole-pixel shift and some state.
      g.translate(shift - 20, shift ? 3 : -10);
      g.font = 'bold 30px serif';
      g.strokeStyle = 'red';
      g.lineWidth = 9;
      g.textAlign = 'center';
      g.lineCap = 'round';
      assert.ok(canPaintOn(g, 20, 10));
      if (direct) paintScene(g, 20, 10, input(extra));
      else g.drawImage(renderScene(input(extra)), 20, 10);
      // The panel's state is as it was.
      assert.equal(g.lineWidth, 9);
      assert.equal(g.getTransform().e, shift - 20);
      return pixels(c);
    };
    // At the corner of its own canvas (a tile the compositor keeps), the same pixels.
    assert.ok(panel(true, 0).equals(panel(false, 0)), JSON.stringify(extra));
    // Elsewhere the gradients' dithering falls on other pixels: a level here and there.
    const d = diff(panel(true, 27), panel(false, 27));
    assert.ok(d.max <= 8 && d.pixels < 2000 * 520 * 0.05, `${JSON.stringify(extra)}: ${JSON.stringify(d)}`);
  }
  const g = createCanvas(10, 10).getContext('2d');
  assert.ok(!canPaintOn(g, 0.5, 0));
  g.scale(1.5, 1.5);
  assert.ok(!canPaintOn(g, 0, 0));
});

test('layers: a pose painted over the still pieces of the cat, already rasterised, looks like the one painted whole', () => {
  const kept = new Map<string, Layer>();
  const cache: LayerCache = { key: 'test', get: (k, make) => kept.get(k) ?? (kept.set(k, make()), kept.get(k)!) };
  const paint = (draw: (c: X, layers?: LayerCache) => void, layers?: LayerCache) => {
    const c = createCanvas(700, 520);
    const o = c.getContext('2d');
    o.translate(330, 440);
    o.scale(1.1, 1.1);
    draw(o, layers);
    return pixels(c);
  };
  const coat = COATS.humo!;
  const poses: [string, (c: X, layers?: LayerCache) => void][] = [
    ['front, tail', (c, layers) => frontCat(c, coat, { mood: 'open', collar: '#C8303F', pose: { swing: 0.5 }, layers })],
    ['front, ears', (c, layers) => frontCat(c, coat, { mood: 'wide', collar: '#C8303F', pose: { ear: 1 }, layers })],
    ['front, blink', (c, layers) => frontCat(c, coat, { mood: 'open', collar: '#C8303F', pose: { lid: 0.5 }, layers })],
    ['front, yawn', (c, layers) => frontCat(c, coat, { mood: 'open', collar: '#C8303F', pose: { yawn: 0.75 }, layers })],
    ['back, tail', (c, layers) => backCat(c, coat, 77, { pose: { swing: -0.75 }, layers })],
    ['back, ears', (c, layers) => backCat(c, coat, 77, { pose: { ear: 0.5 }, layers })],
  ];
  for (const [name, draw] of poses) {
    const whole = paint(draw);
    const layered = paint(draw, cache);
    const d = diff(whole, layered);
    // Composing a layer rounds a little differently from painting on top: a few levels, along some edges.
    assert.ok(d.max <= 16, `${name}: max difference ${d.max}`);
    assert.ok(d.pixels < (700 * 520) / 200, `${name}: ${d.pixels} pixels differ`);
    // Painted again, from the layers already kept: the same, without making any.
    const size = kept.size;
    assert.ok(paint(draw, cache).equals(layered), name);
    assert.equal(kept.size, size);
  }
  // Without a cache, the pieces are painted one after another: what the cats at rest always were.
  assert.ok(paint(poses[0]![1]).equals(paint(poses[0]![1])));
});
