/**
 * A drawing in pieces, so a gesture repaints only the piece that moves.
 *
 * A cat is tens of thousands of hairs; a blink, a tail flick, a yawn or an
 * ear change only one small piece of it, but each pose of the gesture used
 * to be a whole new cat. `paintParts` paints the pieces in order and, given
 * a cache, keeps every run of pieces that don't move already rasterised: a
 * frame of the gesture is those layers plus the piece that moves, painted
 * on top in its place in the order.
 *
 * Without a cache it is just the pieces one after another, the same calls
 * as before: the cats at rest are painted like that, pixel for pixel.
 */
import type { Canvas } from '@kiosko/sdk';
import { createCanvas } from './canvas.ts';
import type { X } from './paint.ts';

/** A piece of a drawing, in painting order. */
export interface Part {
  /** What the piece looks like beyond the drawing's own key (its gesture value, say). */
  key: string;
  draw: (c: X) => void;
  /** It moves in this frame: painted every time, never cached. */
  live?: boolean;
  /** Reads what is under it (a `source-atop`): painted every time, on the real canvas. */
  direct?: boolean;
  /** Too little to be worth a layer of its own (a run of only cheap pieces is painted). */
  cheap?: boolean;
}

/** Where `paintParts` keeps its layers: one per sprite being painted. */
export interface LayerCache {
  /** What the sprite looks like apart from the pose (cat, coat, scale, size…). */
  key: string;
  get(key: string, make: () => Layer): Layer;
}

/** A run of pieces already painted, and the context state they leave behind. */
export interface Layer {
  canvas: Canvas;
  state: State;
}

/**
 * The drawing state a piece can leave set for the next one (a tail leaves
 * round caps on, say). A layer is painted on its own context, so it starts
 * from the state of the real one and hands its final state back.
 */
interface State {
  fillStyle: X['fillStyle'];
  strokeStyle: X['strokeStyle'];
  lineWidth: number;
  lineCap: X['lineCap'];
  lineJoin: X['lineJoin'];
  miterLimit: number;
  lineDash: number[];
  lineDashOffset: number;
  globalAlpha: number;
  globalCompositeOperation: X['globalCompositeOperation'];
  font: string;
  textAlign: X['textAlign'];
  textBaseline: X['textBaseline'];
  filter: string;
  transform: ReturnType<X['getTransform']>;
}

function stateOf(c: X): State {
  return {
    fillStyle: c.fillStyle, strokeStyle: c.strokeStyle, lineWidth: c.lineWidth, lineCap: c.lineCap, lineJoin: c.lineJoin, miterLimit: c.miterLimit,
    lineDash: c.getLineDash(), lineDashOffset: c.lineDashOffset, globalAlpha: c.globalAlpha, globalCompositeOperation: c.globalCompositeOperation,
    font: c.font, textAlign: c.textAlign, textBaseline: c.textBaseline, filter: c.filter, transform: c.getTransform(),
  };
}

function setState(c: X, s: State): void {
  c.fillStyle = s.fillStyle;
  c.strokeStyle = s.strokeStyle;
  c.lineWidth = s.lineWidth;
  c.lineCap = s.lineCap;
  c.lineJoin = s.lineJoin;
  c.miterLimit = s.miterLimit;
  c.setLineDash(s.lineDash);
  c.lineDashOffset = s.lineDashOffset;
  c.globalAlpha = s.globalAlpha;
  c.globalCompositeOperation = s.globalCompositeOperation;
  c.font = s.font;
  c.textAlign = s.textAlign;
  c.textBaseline = s.textBaseline;
  c.filter = s.filter;
  c.setTransform(s.transform);
}

/** The state that decides how a run paints, as a key (a gradient counts as one: every piece sets its own). */
function stateKey(s: State): string {
  const t = s.transform;
  const style = (v: unknown) => (typeof v === 'string' ? v : 'g');
  return [style(s.fillStyle), style(s.strokeStyle), s.lineWidth, s.lineCap, s.lineJoin, s.miterLimit, s.lineDash.join(','), s.lineDashOffset, s.globalAlpha, s.globalCompositeOperation, s.font, s.textAlign, s.textBaseline, s.filter, [t.a, t.b, t.c, t.d, t.e, t.f].map((v) => v.toFixed(4)).join(',')].join(';');
}

/**
 * Copies to a clean canvas, to cache pixels only.
 *
 * @napi-rs/canvas doesn't rasterise while drawing: it records every call and
 * replays it when encoding or copying. A freshly painted canvas keeps the
 * whole recording of the fur alive (~260 bytes per call, 900 MB for 30
 * canvases of 100,000 strokes). Copying it with `drawImage` and keeping the
 * copy drops it.
 */
export function flatten(src: Canvas, blurPx = 0): Canvas {
  const out = createCanvas(src.width, src.height);
  const o = out.getContext('2d');
  if (blurPx > 0) o.filter = `blur(${blurPx}px)`;
  o.drawImage(src, 0, 0);
  return out;
}

/**
 * Paints `parts` in order on `c`. With `cache`, each run of pieces that are
 * neither live nor direct is painted once on a layer the size of `c`'s
 * canvas, kept, and composed in its place. `key` names the drawing (a front
 * cat, its mood and collar…) within the sprite.
 */
export function paintParts(c: X, key: string, parts: Part[], cache?: LayerCache): void {
  if (!cache) {
    for (const p of parts) p.draw(c);
    return;
  }
  let i = 0;
  while (i < parts.length) {
    const p = parts[i]!;
    if (p.live || p.direct) {
      p.draw(c);
      i++;
      continue;
    }
    let j = i;
    while (j < parts.length && !parts[j]!.live && !parts[j]!.direct) j++;
    const run = parts.slice(i, j);
    i = j;
    if (run.every((q) => q.cheap)) {
      for (const q of run) q.draw(c);
      continue;
    }
    const before = stateOf(c);
    const { width, height } = c.canvas;
    const layer = cache.get(`${cache.key}|${key}|${run.map((q) => q.key).join('/')}|${width}x${height}|${stateKey(before)}`, () => {
      const canvas = createCanvas(width, height);
      const l = canvas.getContext('2d');
      setState(l, before);
      for (const q of run) q.draw(l);
      return { state: stateOf(l), canvas: flatten(canvas) };
    });
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.filter = 'none';
    c.drawImage(layer.canvas, 0, 0);
    c.restore();
    setState(c, layer.state);
  }
}
