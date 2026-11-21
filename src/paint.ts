/**
 * Painting primitives for cat mode: color, deterministic randomness, shapes with
 * a fur edge and the coat drawn strand by strand.
 *
 * Everything is deterministic: the same inputs give the same drawing byte for byte,
 * which is what allows caching the cats already painted (see `render.ts`) and
 * keeps previews reproducible.
 */
import { type RGB, type X, TAU, clamp, css, ellipse, linear, mix, radial, rng } from '@loksly/lcd-canvas-kit';

/** The generic primitives (color, randomness, gradients) come from @loksly/lcd-canvas-kit. */
export { type RGB, type X, TAU, bezierPts, clamp, css, ellipse, hashString, hex, linear, mix, radial, rng, smooth } from '@loksly/lcd-canvas-kit';


/** Five-tone ramp, from the deepest shadow to the highest light. */
export interface Ramp { deep: RGB; dark: RGB; mid: RGB; light: RGB; top: RGB }

/** A cat's coat. Passed explicitly to every drawing call: no global state. */
export interface Coat {
  fur: Ramp;
  /** Stripe color and how visible they are (0 = plain). */
  stripe: RGB;
  stripeK: number;
  /** Chest, muzzle and paws. */
  cream: { dark: RGB; mid: RGB; light: RGB };
  /** Iris gradient stops, from the center to the edge. */
  eye: [number, string][];
}

/** Color on the ramp according to the light (0 = shadow, 1 = light). */
export function ramp(l: number, r: Ramp): RGB {
  const stops = [r.deep, r.dark, r.mid, r.light, r.top];
  const t = clamp(l) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(t));
  return mix(stops[i]!, stops[i + 1]!, t - i);
}

export function creamRamp(c: Coat): Ramp {
  return { deep: c.cream.dark, dark: c.cream.dark, mid: c.cream.mid, light: c.cream.light, top: c.cream.light };
}

/**
 * Superellipse with tufts along the edge. `fluff(θ)` says how far the fur
 * sticks out at that angle; the points alternate long and short so the outline
 * reads as fur and not as a regular saw blade.
 */
export function furryShape(c: X, cx: number, cy: number, rx: number, ry: number, n: number, fluff: (a: number) => number, seed: number): void {
  const r = rng(seed);
  c.beginPath();
  const N = 220;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * TAU;
    const ca = Math.cos(a), sa = Math.sin(a);
    const k = Math.pow(Math.pow(Math.abs(ca), n) + Math.pow(Math.abs(sa), n), -1 / n);
    const f = fluff(a);
    const spike = f > 0 ? f * (i % 2 === 0 ? 1 : 0.15 + r() * 0.3) : 0;
    const x = cx + ca * k * rx * (1 + spike), y = cy + sa * k * ry * (1 + spike);
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
}

/** Light from the top left on a part with sphere volume. */
export const sphereLight = (cx: number, cy: number, rx: number, ry: number) => (x: number, y: number) => {
  const nx = (x - cx) / rx, ny = (y - cy) / ry;
  const nz = Math.sqrt(clamp(1 - nx * nx - ny * ny));
  return clamp(0.25 + (-nx * 0.45 - ny * 0.6 + nz * 0.55) * 0.75);
};

export interface FurOpts {
  seed: number;
  light: (x: number, y: number) => number;
  dir: (x: number, y: number) => number;
  /** 0..1: how much that point falls on a stripe. */
  stripe?: (x: number, y: number) => number;
  /** 0..1: how much of it is cream-colored chest/muzzle. */
  cream?: (x: number, y: number) => number;
  len?: [number, number];
  width?: number;
}

/** A group of strokes of the same tone and width: one `stroke()`. */
interface StrokeGroup {
  color: string;
  width: number;
  /** Segments: [x0, y0, cx, cy, x1, y1] (quadratic) repeated. */
  segs: number[];
}

/**
 * Strokes grouped by tone and width: one `stroke()` per group instead of one per
 * hair. Each drawing call costs native memory in @napi-rs/canvas until the
 * canvas is released, and a cat is tens of thousands of hairs; grouping them
 * brings that count down to a few dozen and is also considerably faster.
 * Quantizing the color to steps of 8 is not noticeable on strokes a pixel and a half wide.
 *
 * Hot path (a cat is ~10,000 hairs): the group is found by a number built
 * from the quantized tone and width, not by a string, and the segment goes
 * in without an intermediate array. Same groups, same order, same values.
 */
class StrokeBatch {
  private groups = new Map<number, StrokeGroup>();
  /** Groups whose tone fell outside 0..255 (never for a coat, but kept exact). */
  private odd = new Map<string, StrokeGroup>();
  /** First-seen order across both maps, which is the painting order. */
  private order: StrokeGroup[] = [];
  private readonly alpha: number;
  constructor(alpha: number) {
    this.alpha = alpha;
  }
  add(r: number, g: number, b: number, width: number, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number): void {
    const qr = Math.min(255, Math.round(r / 8) * 8), qg = Math.min(255, Math.round(g / 8) * 8), qb = Math.min(255, Math.round(b / 8) * 8);
    const w = Math.round(width * 4) / 4;
    let grp: StrokeGroup | undefined;
    if (qr >= 0 && qg >= 0 && qb >= 0 && w >= 0 && w < 256) {
      // 0..255 per channel and a width in quarters below 256: one exact integer.
      const key = ((qr * 256 + qg) * 256 + qb) * 1024 + w * 4;
      grp = this.groups.get(key);
      if (!grp) this.groups.set(key, (grp = this.group(qr, qg, qb, w)));
    } else {
      const key = `${qr},${qg},${qb}|${w}`;
      grp = this.odd.get(key);
      if (!grp) this.odd.set(key, (grp = this.group(qr, qg, qb, w)));
    }
    grp.segs.push(x0, y0, cx, cy, x1, y1);
  }
  private group(r: number, g: number, b: number, width: number): StrokeGroup {
    const grp = { color: css([r, g, b], this.alpha), width, segs: [] };
    this.order.push(grp);
    return grp;
  }
  flush(c: X): void {
    for (const g of this.order) {
      c.strokeStyle = g.color;
      c.lineWidth = g.width;
      c.beginPath();
      const s = g.segs;
      for (let i = 0; i < s.length; i += 6) {
        c.moveTo(s[i]!, s[i + 1]!);
        c.quadraticCurveTo(s[i + 2]!, s[i + 3]!, s[i + 4]!, s[i + 5]!);
      }
      c.stroke();
    }
    this.groups.clear();
    this.odd.clear();
    this.order = [];
  }
}

/** `ramp` without the arrays: the tone of light `l` on `r`, written to `out`. Same arithmetic. */
function rampTo(out: RGB, l: number, r: Ramp): RGB {
  const t = clamp(l) * 4;
  const i = Math.min(3, Math.floor(t));
  const a = i === 0 ? r.deep : i === 1 ? r.dark : i === 2 ? r.mid : r.light;
  const b = i === 0 ? r.dark : i === 1 ? r.mid : i === 2 ? r.light : r.top;
  const u = t - i;
  out[0] = a[0] + (b[0] - a[0]) * u;
  out[1] = a[1] + (b[1] - a[1]) * u;
  out[2] = a[2] + (b[2] - a[2]) * u;
  return out;
}

/** `mix(a, b, t)` written to `out` (which may be `a`). Same arithmetic. */
function mixTo(out: RGB, a: RGB, b: RGB, t: number): RGB {
  const a0 = a[0], a1 = a[1], a2 = a[2];
  out[0] = a0 + (b[0] - a0) * t;
  out[1] = a1 + (b[1] - a1) * t;
  out[2] = a2 + (b[2] - a2) * t;
  return out;
}

/**
 * Coat: thousands of short strokes clipped to the shape. Each stroke's color
 * comes from the light at that point and from whether it falls on a stripe, so the stripes end up
 * frayed like on a real cat instead of being pasted-on patches.
 */
export function fur(c: X, coat: Coat, shape: (c: X) => void, box: [number, number, number, number], n: number, o: FurOpts): void {
  const r = rng(o.seed);
  const cr = creamRamp(coat);
  c.save();
  shape(c);
  c.clip();
  c.lineCap = 'round';
  const [x0, y0, x1, y1] = box;
  const [l0, l1] = o.len ?? [6, 13];
  const batch = new StrokeBatch(0.75);
  const col: RGB = [0, 0, 0], tmp: RGB = [0, 0, 0], tmp2: RGB = [0, 0, 0];
  const { light, dir, cream, stripe } = o;
  const width = o.width ?? 1.6;
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
    const a = dir(x, y) + (r() - 0.5) * 0.5;
    const len = l0 + r() * (l1 - l0);
    const l = clamp(light(x, y) + (r() - 0.5) * 0.28);
    rampTo(col, l, coat.fur);
    const k = cream?.(x, y) ?? 0;
    if (k > 0) mixTo(col, col, rampTo(tmp, clamp(l + 0.1), cr), clamp(k));
    const st = stripe?.(x, y) ?? 0;
    if (st > 0) mixTo(col, col, mixTo(tmp2, coat.stripe, coat.fur.deep, 1 - l), clamp(st) * coat.stripeK);
    const w = width * (0.7 + r() * 0.6);
    const ca = Math.cos(a), sa = Math.sin(a);
    batch.add(col[0], col[1], col[2], w, x, y, x + ca * len * 0.5 + (r() - 0.5) * 2, y + sa * len * 0.5, x + ca * len, y + sa * len);
  }
  batch.flush(c);
  c.restore();
}

/** Tail that follows a polyline, with fur and rings. */
export function tailAlong(c: X, coat: Coat, pts: [number, number][], seed: number, thick = 1): void {
  const L: number[] = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
  const total = L[L.length - 1]! || 1;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = css(coat.fur.dark);
  c.lineWidth = 25 * thick;
  c.stroke();
  const r = rng(seed);
  const batch = new StrokeBatch(0.8);
  const col: RGB = [0, 0, 0];
  const n = Math.round(Math.min(1400, total * 4) * thick);
  for (let i = 0; i < n; i++) {
    const u = r();
    // The point at `u` of the way along the polyline, and its heading.
    const d = u * total;
    let j = 1;
    while (j < L.length - 1 && L[j]! < d) j++;
    const p = pts[j - 1]!, q = pts[j]!;
    const t = (d - L[j - 1]!) / (L[j]! - L[j - 1]! || 1);
    const x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t, a0 = Math.atan2(q[1] - p[1], q[0] - p[0]);
    const a = a0 + (thick > 1 ? (r() - 0.5) * 1.6 : 0);
    const off = (r() - 0.5) * 23 * thick;
    const px = x - Math.sin(a0) * off, py = y + Math.cos(a0) * off;
    const band = Math.sin(u * (total / 7)) > 0.35 ? coat.stripeK : 0;
    const ex = px + Math.cos(a) * 10, ey = py + Math.sin(a) * 10;
    mixTo(col, rampTo(col, clamp(0.58 - off / 30 + (r() - 0.5) * 0.25), coat.fur), coat.stripe, band);
    batch.add(col[0], col[1], col[2], 1.6, px, py, (px + ex) / 2, (py + ey) / 2, ex, ey);
  }
  batch.flush(c);
}

/** Eye with gradient iris, fibers, pupil, eyelid and window reflection. */
export function eye(c: X, iris: [number, string][], ex: number, ey: number, rx: number, ry: number, pupil: number): void {
  c.save();
  c.fillStyle = radial(c, ex, ey, rx * 0.8, rx * 1.6, [[0, 'rgba(70,25,0,0.45)'], [1, 'rgba(70,25,0,0)']]);
  ellipse(c, ex, ey, rx * 1.6, ry * 1.4);
  c.fill();
  ellipse(c, ex, ey, rx + 3.5, ry + 3.5);
  c.fillStyle = '#2A1206';
  c.fill();
  ellipse(c, ex, ey, rx, ry);
  c.clip();
  c.fillStyle = radial(c, ex, ey + ry * 0.25, 2, ry * 1.05, iris);
  c.fillRect(ex - rx, ey - ry, rx * 2, ry * 2);
  const r = rng(Math.round(ex * 7 + ey + 3));
  for (let i = 0; i < 90; i++) {
    const a = r() * TAU, r0 = pupil * 0.6 + r() * 4, r1 = ry * (0.7 + r() * 0.3);
    c.strokeStyle = r() > 0.5 ? 'rgba(255,255,200,0.28)' : 'rgba(30,40,10,0.3)';
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(ex + Math.cos(a) * r0, ey + Math.sin(a) * r0 * 1.2);
    c.lineTo(ex + Math.cos(a) * r1, ey + Math.sin(a) * r1);
    c.stroke();
  }
  c.fillStyle = radial(c, ex, ey + 2, pupil * 0.5, pupil * 1.25, [[0, '#050302'], [0.8, '#0B0704'], [1, 'rgba(11,7,4,0)']]);
  ellipse(c, ex, ey + 2, pupil, ry * 0.78);
  c.fill();
  c.fillStyle = linear(c, 0, ey - ry, 0, ey - ry * 0.2, [[0, 'rgba(20,8,0,0.65)'], [1, 'rgba(20,8,0,0)']]);
  c.fillRect(ex - rx, ey - ry, rx * 2, ry);
  // Reflection of a four-pane window and a secondary highlight
  c.fillStyle = 'rgba(255,255,255,0.92)';
  const wx = ex - rx * 0.52, wy = ey - ry * 0.56, ws = rx * 0.18;
  for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
    c.beginPath();
    c.roundRect(wx + i * (ws + 1.5), wy + j * (ws + 1.5), ws, ws, 1.5);
    c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,0.25)';
  ellipse(c, ex - rx * 0.35, ey - ry * 0.4, rx * 0.45, ry * 0.35);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.92)';
  ellipse(c, ex + rx * 0.38, ey + ry * 0.42, 3.2, 3);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.35)';
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(ex, ey, rx - 3, ry - 3, 0, 0.35 * Math.PI, 0.65 * Math.PI);
  c.stroke();
  c.restore();
}
