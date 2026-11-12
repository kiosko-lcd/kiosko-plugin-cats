/**
 * The build: the cat that has waited a long time for you opens the box of a huge
 * LEGO set, turns around and assembles it looking at the manual, step by step,
 * at cat scale.
 *
 * The scale is real: a sitting cat is about 30 cm tall up to the ears and in the
 * drawing takes 312 units (`HEIGHT` in cat.ts), so a stud (0.8 cm) is 8.3 units
 * and a brick (0.96 cm) is 10. That is why the Titanic (135 cm) only fits next to
 * a cat in the background. The Eiffel Tower (149 cm tall), the Death Star (70 cm)
 * and Barad-dur (83 cm) do not fit in height in the panel next to a waiting cat
 * (always in the foreground): they are not included.
 *
 * The cat builds facing you and with its "keep going?": the panel is looked at to
 * find out who is idle, and from behind it would look like one working.
 *
 * Each set is a side view on a grid of studs by bricks, chopped into staggered
 * pieces and assembled in manual order (by sections, bottom to top). The finished
 * model is painted once into a cache; each frame crops from it what is already
 * assembled and hand-paints only the row in progress.
 */
import type { Canvas } from '@kiosko/sdk';
import { createCanvas } from './canvas.ts';
import { COND, COND_REGULAR } from './fonts.ts';
import { type X, radial, rng } from './paint.ts';
import { propTexts } from './prop-texts.ts';
import { outlined, pawPad, starBurst } from './props.ts';

/** Drawing units per centimeter, at scale 1 (see above). */
export const UNITS_PER_CM = 312 / 30;
const STUD_CM = 0.8;
/** Height of a brick, in studs. */
const BH = 0.96 / STUD_CM;

export interface LegoSet {
  id: string;
  name: string;
  number: string;
  pieces: number;
  /** Dimensions of the assembled model, from the set's datasheet. */
  widthCm: number;
  heightCm: number;
  cols: number;
  rows: number;
  /** Color of each cell (stud column, brick row from the bottom), or null. */
  cell: (c: number, r: number) => string | null;
  /** Column where each section of the manual starts. */
  sections: number[];
  /** Colors that light up at night, and the color they glow. */
  lights: string[];
  glow?: string;
}

const cols = (cm: number) => Math.round(cm / STUD_CM);
const rows = (cm: number) => Math.round(cm / 0.96);

// ---------- Titanic (10294): 9,090 pieces, 135 x 44 cm ----------
const RED = '#A8231C', BLACK = '#1E1F24', WHITE = '#EEEDE8', BUFF = '#D39A3A', TAN = '#C9A46A', LIT = '#F2D88A', WIN = '#6F7986';
function titanic(c: number, r: number): string | null {
  // Hull: the stern with its overhang on the left, the bow thrown forward on the right.
  if (r <= 10) {
    const x0 = r < 3 ? 12 - r * 2 : Math.max(2, 6 - (r - 3)), x1 = Math.min(168, 160 + Math.round(r * 0.8));
    if (c < x0 || c > x1) return null;
    if (r <= 3) return RED;
    if ((r === 6 || r === 8) && c % 4 === 0 && c > x0 + 3 && c < x1 - 4) return LIT;
    return BLACK;
  }
  if (r === 11) {
    if ((c >= 6 && c < 22) || (c >= 140 && c <= 166)) return BLACK;
    if (c >= 22 && c < 140) return WHITE;
    return null;
  }
  if (r <= 16) {
    if (c < 24 || c > 138) return null;
    return (r === 12 || r === 14) && c % 3 === 1 ? WIN : WHITE;
  }
  // Boat deck, with the lifeboats and the bridge in front.
  if (r === 17) return c >= 30 && c <= 136 ? WHITE : null;
  // Four funnels leaning towards the stern, with the black top.
  for (const fx of [50, 72, 94, 116]) {
    const off = r >= 25 ? 1 : 0;
    if (r <= 31 && c >= fx - 3 - off && c <= fx + 3 - off) return r >= 28 ? BLACK : BUFF;
  }
  if (r === 18 && ((c >= 32 && c <= 42) || (c >= 56 && c <= 64) || (c >= 78 && c <= 86) || (c >= 100 && c <= 108) || (c >= 120 && c <= 132))) return WHITE;
  if (r === 19 && c >= 122 && c <= 132) return WHITE;
  // Masts, with the crow's nest on the forward one.
  if ((c === 20 && r <= 42) || (c === 150 && r <= 45)) return TAN;
  if (r === 33 && c >= 149 && c <= 151) return TAN;
  return null;
}

// ---------- Colosseum (10276): 9,036 pieces, 52 x 27 cm ----------
const STONE = '#D2B98B', INNER = '#B59C70', DARK = '#5E4B3A', CORNICE = '#E6D3AA', BASE = '#8A8D91';
const colosseumTop = (() => {
  // Ruined profile: whole on the left, jagged towards the right.
  const r = rng(276);
  const W = cols(52), H = rows(27);
  return Array.from({ length: W }, (_, c) => (c < 34 ? H : c < 45 ? Math.round(H - ((c - 34) / 11) * 12 - r() * 3) : 16));
})();
function colosseum(c: number, r: number): string | null {
  if (r === 0) return BASE;
  if (r >= colosseumTop[c]!) return null;
  const inner = c >= 45;
  const wall = inner ? INNER : STONE;
  if (r >= 22) {
    // Attic: wall with small windows every other bay.
    const bay = Math.floor(c / 5);
    return (r === 24 || r === 25) && bay % 2 === 0 && c % 5 === 3 ? DARK : wall;
  }
  const tierStart = r <= 7 ? 1 : r <= 14 ? 8 : 15;
  const k = r - tierStart;
  if (k === 6) return CORNICE;
  // Arches: two studs of pillar and three of opening, with the keystone on top.
  const m = c % 5;
  if (k >= 1 && k <= 4 && m >= 2) return DARK;
  if (k === 5 && m === 3) return DARK;
  return wall;
}

// ---------- Taj Mahal (10256): 5,923 pieces, 51 x 43 cm ----------
const MARBLE = '#EDE8DF', SHADE = '#CFC6B8', RECESS = '#B3AA9C', GOLD = '#D4AF37';
const DOME = [10, 11, 12, 12.5, 13, 13, 12.5, 12, 11, 10, 8.5, 7, 5.5, 4, 3, 2, 1];
const CHHATRI = [2.5, 2.5, 2, 1.5, 1, 0.5];
function tajMahal(c: number, r: number): string | null {
  const W = cols(51), mid = (W - 1) / 2, d = Math.abs(c - mid);
  if (r <= 3) return r >= 1 && r <= 2 && c % 4 === 2 ? SHADE : MARBLE;
  // Minarets at the corners, with balconies and a little dome.
  const mx = Math.min(c, W - 1 - c);
  if (mx >= 1 && mx <= 3 && r <= 40) return [14, 26, 37].includes(r) ? SHADE : MARBLE;
  if (mx >= 0 && mx <= 4 && [14, 26, 37].includes(r)) return SHADE;
  if (r >= 41 && r <= 43 && mx === 2) return r === 43 ? GOLD : MARBLE;
  // Main body with the great iwan in the center and niches at the sides.
  if (r <= 19 && d <= 21.5) {
    const half = r <= 14 ? 6 : r === 15 ? 5 : r === 16 ? 3 : r === 17 ? 1 : -1;
    if (r >= 5 && d <= half) return RECESS;
    const nd = Math.abs(d - 14.5);
    const niche = (lo: number) => r >= lo && r <= lo + 4 && nd <= (r === lo + 4 ? 1.5 : 2.5);
    if (niche(5) || niche(12)) return RECESS;
    return r === 19 ? SHADE : MARBLE;
  }
  // Roof kiosks.
  for (const cx of [mid - 15, mid + 15]) {
    const k = r - 20;
    if (k >= 0 && k < CHHATRI.length && Math.abs(c - cx) <= CHHATRI[k]!) return MARBLE;
    if (k === CHHATRI.length && Math.abs(c - cx) < 0.6) return GOLD;
  }
  if (r >= 20 && r <= 23 && d <= 10) return r === 23 ? SHADE : MARBLE;
  // The bulb dome and the golden finial.
  const k = r - 24;
  if (k >= 0 && k < DOME.length && d <= DOME[k]!) return MARBLE;
  if (r >= 41 && r <= 44 && d < 0.6) return GOLD;
  return null;
}

// ---------- Millennium Falcon (75192): 7,541 pieces, 84 x 21 cm ----------
const HULL = '#C9CCCF', PANEL = '#9A9FA6', RUST = '#9B4A3A', GLOW = '#7FD3FF', GLASS = '#2C3440', GUN = '#55595F';
function falcon(c: number, r: number): string | null {
  // Landing gear legs.
  if (r <= 3) return [22, 42, 62].includes(c) ? GUN : null;
  // The saucer, thicker in the center.
  if (c <= 80) {
    const dx = Math.abs(c - 40) / 41;
    const top = Math.round(14 - 6 * dx * dx), bot = Math.round(4 + 2 * dx * dx);
    if (r >= bot && r <= top) {
      // Lit engine nozzles at the stern, dark edge and loose panels.
      if (c <= 2 && r >= 6 && r <= 11) return GLOW;
      if (r === bot || r === top || r === 9) return PANEL;
      if ((c * 7 + r * 3) % 31 === 0) return RUST;
      return (c * 5 + r * 11) % 9 === 0 ? PANEL : HULL;
    }
  }
  // The mandibles, flat, and the cockpit in its tube on one side.
  if (c > 80 && c <= 104 && r >= 7 && r <= 9) return (c + r) % 6 === 0 ? PANEL : HULL;
  if (c >= 62 && c <= 97 && r >= 11 && r <= 13) return c >= 94 && r === 12 ? GLASS : c % 5 === 0 ? PANEL : HULL;
  if (c >= 98 && c <= 100 && r === 12) return HULL;
  // The top cannon and the dish antenna.
  if (r >= 15 && r <= 16 && c >= 38 && c <= 42) return GUN;
  if (r === 15 && c >= 55 && c <= 57) return GUN;
  if (r >= 16 && r <= 18 && c >= 51 && c <= 61 && Math.abs(c - 56) <= 2 + (r - 16) * 2) return HULL;
  return null;
}

// ---------- Rivendell (10316): 6,167 pieces, 75 x 39 cm ----------
const ROCK = '#7E7F78', GRASS = '#5E8C3A', FALLS = '#BFE3F5', ELF = '#E8DCC0', ARCH = '#6E7B5A', ROOF = '#5C7A55', TRIM = '#C8A23C', LEAF = '#D9822B', LEAF2 = '#E3B23C';
function rivendell(c: number, r: number): string | null {
  // The cliff on the left, with the waterfall, and the slope.
  const ground = c < 10 ? 32 : c < 30 ? Math.max(8, 32 - (c - 10)) : 8 - Math.round(Math.sin(c * 0.4) * 1.5);
  if (r < ground) {
    if (c >= 10 && c <= 13 && r >= 4) return FALLS;
    return r >= ground - 2 ? GRASS : ROCK;
  }
  if (c >= 9 && c <= 13 && r >= ground && r <= 32 && c - 9 < (32 - r) / 3) return FALLS;
  // Autumn trees.
  for (const [tx, ty, rad] of [[22, 22, 4.5], [27, 14, 3.5], [91, 13, 3]] as const) {
    const d = Math.hypot(c - tx, (r - ty) * 1.2);
    if (d <= rad) return (c + r) % 3 ? LEAF : LEAF2;
    if (c === tx && r >= ground && r < ty - rad) return '#6B4A2B';
  }
  // The big house: walls with arches, golden cornice and green roof.
  if (c >= 32 && c <= 70 && r >= 9 && r <= 21) {
    const bay = (c - 32) % 6;
    if (r >= 11 && r <= 17 && bay >= 2 && bay <= 4 && !(r === 17 && bay !== 3)) return ARCH;
    return r === 21 ? TRIM : ELF;
  }
  if (r >= 22 && r <= 25 && c >= 32 + (r - 22) * 2 && c <= 70 - (r - 22) * 2) return ROOF;
  // The tower, with its pointed roof.
  if (c >= 46 && c <= 52 && r >= 26 && r <= 33) return r === 30 && c === 49 ? ARCH : ELF;
  if (r >= 34 && r <= 39 && Math.abs(c - 49) <= 3 - Math.floor((r - 34) / 2)) return ROOF;
  if (r === 40 && c === 49) return TRIM;
  // The kiosk on the right: columns and dome.
  if (c >= 74 && c <= 88 && r >= 9 && r <= 18) return r === 9 || r === 18 ? ELF : (c - 74) % 4 === 0 ? ELF : null;
  if (r >= 19 && r <= 24 && Math.abs(c - 81) <= [8, 7.5, 7, 6, 4.5, 2.5][r - 19]!) return r === 19 ? TRIM : ROOF;
  return null;
}

// ---------- The Shire (10354): 2,017 pieces, 45 x 20 cm ----------
const HILL = '#5C9B3A', HILL2 = '#4E8A31', DOOR = '#2E6B3A', FRAME = '#8B5A2B', SOIL = '#6B5B3A', CHIM = '#9B4A3A';
function shire(c: number, r: number): string | null {
  const W = cols(45), mid = (W - 1) / 2;
  if (r === 0) return SOIL;
  // Flowers and fence in front of the hobbit hole.
  if (r === 1 && c % 3 === 0) return ['#E04A4A', '#F2C21B', '#E78AC3'][c % 9 / 3]!;
  if (r <= 3 && c <= 8 && (c % 3 === 0 || r === 2)) return FRAME;
  // The round door with its knob, and the lit round windows.
  const door = Math.hypot(c - mid, (r - 6) * 1.2);
  if (door <= 1) return '#D4AF37';
  if (door <= 4) return DOOR;
  if (door <= 5) return FRAME;
  for (const wx of [mid - 13, mid + 13]) {
    const d = Math.hypot(c - wx, (r - 7) * 1.2);
    if (d <= 1.6) return LIT;
    if (d <= 2.6) return FRAME;
  }
  // The chimney and the hill.
  if (c >= mid + 8 && c <= mid + 9 && r >= 15 && r <= 20) return CHIM;
  const h = 20 * (1 - ((c - mid) / (W / 2 + 4)) ** 2);
  if (r <= h) return (c * 3 + r) % 5 === 0 ? HILL2 : HILL;
  return null;
}

export const SETS: LegoSet[] = [
  { id: 'titanic', name: 'Titanic', number: '10294', pieces: 9090, widthCm: 135, heightCm: 44, cols: cols(135), rows: rows(44), cell: titanic, sections: [0, 56, 113], lights: [LIT] },
  { id: 'coliseo', name: 'Coliseo', number: '10276', pieces: 9036, widthCm: 52, heightCm: 27, cols: cols(52), rows: rows(27), cell: colosseum, sections: [0, 22, 44], lights: [DARK] },
  { id: 'taj', name: 'Taj Mahal', number: '10256', pieces: 5923, widthCm: 51, heightCm: 43, cols: cols(51), rows: rows(43), cell: tajMahal, sections: [0], lights: [RECESS] },
  { id: 'halcon', name: 'Halcón Milenario', number: '75192', pieces: 7541, widthCm: 84, heightCm: 21, cols: cols(84), rows: rows(21), cell: falcon, sections: [0, 35, 70], lights: [GLOW, GLASS], glow: '#9FE6FF' },
  { id: 'rivendel', name: 'Rivendel', number: '10316', pieces: 6167, widthCm: 75, heightCm: 39, cols: cols(75), rows: rows(39), cell: rivendell, sections: [0, 31, 62], lights: [ARCH] },
  { id: 'comarca', name: 'La Comarca', number: '10354', pieces: 2017, widthCm: 45, heightCm: 20, cols: cols(45), rows: rows(20), cell: shire, sections: [0], lights: [LIT] },
];

// ---------- Pieces and cache ----------
interface Brick { c: number; r: number; len: number; color: string; sec: number }
interface Built { set: LegoSet; bricks: Brick[]; rowStart: Map<string, number>; canvas: Canvas; P: number }
/** The same model at night: its pieces in the night color and its own cache. */
interface Night extends Built { day: Built }

/** At night: everything dims towards the blue of the room, except the lights, which turn on. */
const NIGHT_INK = [20, 26, 46];
function nightColor(set: LegoSet, color: string): string {
  if (set.lights.includes(color)) return set.glow ?? '#FFD27A';
  const v = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  return `#${v.map((x, i) => Math.round(x * 0.5 + NIGHT_INK[i]! * 0.5).toString(16).padStart(2, '0')).join('')}`;
}

const LENGTHS = [4, 2, 3, 4, 6, 2, 1, 3];
/** Studs per cache pixel: plenty for the size at which it is seen. */
const CACHE_PX = 8;
const built = new Map<string, Built>();

/** Chops each run of one color into pieces, staggered, in manual order. */
export function bricksOf(set: LegoSet): Brick[] {
  const r0 = rng([...set.id].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7));
  const out: Brick[] = [];
  const bounds = [...set.sections, set.cols];
  for (let sec = 0; sec < set.sections.length; sec++) {
    const lo = bounds[sec]!, hi = bounds[sec + 1]!;
    for (let r = 0; r < set.rows; r++) {
      let c = lo;
      while (c < hi) {
        const color = set.cell(c, r);
        if (!color) { c++; continue; }
        let e = c;
        while (e < hi && set.cell(e, r) === color) e++;
        let x = c, first = true;
        while (x < e) {
          const len = Math.min(e - x, first && r % 2 ? 2 : LENGTHS[Math.floor(r0() * LENGTHS.length)]!);
          out.push({ c: x, r, len, color, sec });
          x += len;
          first = false;
        }
        c = e;
      }
    }
  }
  return out;
}

/** A brick from the side, in studs; y = 0 is the floor and grows upwards in negative. */
function brick(c: X, b: Brick, studs: boolean, body = true): void {
  const y = -(b.r + 1) * BH;
  c.fillStyle = b.color;
  if (body) c.fillRect(b.c, y, b.len, BH);
  if (studs) for (let i = 0; i < b.len; i++) c.fillRect(b.c + i + 0.2, y - 0.22, 0.6, 0.24);
  c.fillStyle = 'rgba(255,255,255,0.25)';
  if (body) c.fillRect(b.c, y, b.len, 0.18);
  if (studs) for (let i = 0; i < b.len; i++) c.fillRect(b.c + i + 0.22, y - 0.22, 0.16, 0.22);
  if (!body) return;
  c.fillStyle = 'rgba(0,0,0,0.22)';
  c.fillRect(b.c, y + BH - 0.16, b.len, 0.16);
  c.strokeStyle = 'rgba(0,0,0,0.32)';
  c.lineWidth = 0.07;
  c.strokeRect(b.c + 0.035, y + 0.035, b.len - 0.07, BH - 0.07);
}

function paintCache(set: LegoSet, bricks: Brick[], glow?: string): Canvas {
  const P = CACHE_PX;
  const canvas = createCanvas(Math.ceil(set.cols * P), Math.ceil((set.rows * BH + 0.3) * P));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(P, 0, 0, P, 0, canvas.height);
  // Bottom to top: each row covers the studs of the one below.
  for (let r = 0; r < set.rows; r++) for (const b of bricks) if (b.r === r) brick(ctx, b, true);
  if (glow) {
    // The lit lights, with their halo.
    ctx.shadowColor = glow;
    ctx.shadowBlur = 10;
    ctx.fillStyle = glow;
    for (const b of bricks) if (b.color === glow) ctx.fillRect(b.c + 0.15, -(b.r + 1) * BH + 0.2, b.len - 0.3, BH - 0.4);
  }
  return canvas;
}

function prepare(set: LegoSet): Built;
function prepare(set: LegoSet, night: boolean): Built;
function prepare(set: LegoSet, night = false): Built {
  const key = night ? `${set.id}:noche` : set.id;
  const hit = built.get(key);
  if (hit) return hit;
  if (night) {
    const day = prepare(set);
    const bricks = day.bricks.map((b) => ({ ...b, color: nightColor(set, b.color) }));
    const out: Night = { ...day, bricks, canvas: paintCache(set, bricks, set.glow ?? '#FFD27A'), day };
    built.set(key, out);
    return out;
  }
  const bricks = bricksOf(set);
  const rowStart = new Map<string, number>();
  bricks.forEach((b, i) => { if (!rowStart.has(`${b.sec}:${b.r}`)) rowStart.set(`${b.sec}:${b.r}`, i); });
  const out = { set, bricks, rowStart, canvas: paintCache(set, bricks), P: CACHE_PX };
  built.set(key, out);
  return out;
}

/** A piece of the cache: columns [c0, c1) and rows [0, r1); with `top`, also the studs on top. */
function fromCache(c: X, B: Built, c0: number, c1: number, r1: number, top: boolean): void {
  if (c1 <= c0 || r1 <= 0) return;
  const extra = top ? 0.3 : 0;
  const h = r1 * BH + extra;
  c.drawImage(B.canvas, c0 * B.P, B.canvas.height - h * B.P, (c1 - c0) * B.P, h * B.P, c0, -h, c1 - c0, h);
}

/** The model with `n` pieces in place, with the floor at (x, y), `px` units per stud and towards `dir`. */
function drawModel(c: X, B: Built, n: number, x: number, y: number, px: number, dir: 1 | -1): void {
  const { set, bricks } = B;
  c.save();
  c.translate(x, y);
  c.scale(dir * px, px);
  const bounds = [...set.sections, set.cols];
  if (n >= bricks.length) {
    fromCache(c, B, 0, set.cols, set.rows, true);
  } else if (n > 0) {
    const next = bricks[n]!;
    for (let s = 0; s < next.sec; s++) fromCache(c, B, bounds[s]!, bounds[s + 1]!, set.rows, true);
    fromCache(c, B, bounds[next.sec]!, bounds[next.sec + 1]!, next.r, false);
    // The studs of the row below stay visible until they are covered.
    const below = B.rowStart.get(`${next.sec}:${next.r - 1}`);
    if (below !== undefined) for (let i = below; i < bricks.length && bricks[i]!.r === next.r - 1 && bricks[i]!.sec === next.sec; i++) brick(c, bricks[i]!, true, false);
    const from = B.rowStart.get(`${next.sec}:${next.r}`)!;
    for (let i = from; i < n; i++) brick(c, bricks[i]!, true);
  }
  c.restore();
}

// ---------- The gesture ----------
/** How many manual steps are shown: two frames each at 6 fps (read and place). */
export const STEPS = 22;
const IN = 0.1, BUILD0 = 0.14, BUILD1 = 0.82, OUT = 0.92;

export interface BuildPlan { set: LegoSet; dir: 1 | -1; x: number; y: number; s: number; px: number; seed: number; minX: number; maxX: number; night?: boolean }

/**
 * Which set and which way: towards the side with more free floor, and among those
 * that fit at its scale, in width and height (with room for the label); if none
 * fits, the smallest. `seed` changes with every build: at random.
 */
export function planBuild(x: number, y: number, s: number, seed: number, minX: number, maxX: number): BuildPlan {
  const gap = MODEL_GAP * s;
  const right = maxX - (x + gap), left = x - gap - minX;
  const dir = right >= left ? 1 : -1;
  const span = Math.max(right, left);
  const fits = SETS.filter((z) => z.widthCm * UNITS_PER_CM * s <= span && z.heightCm * UNITS_PER_CM * s <= y - 40);
  const pool = fits.length ? fits : [SETS.reduce((a, b) => (a.widthCm * a.heightCm <= b.widthCm * b.heightCm ? a : b))];
  return { set: pool[seed % pool.length]!, dir, x, y, s, px: STUD_CM * UNITS_PER_CM * s, seed, minX, maxX };
}

/** At which point the build is at instant `t`. */
export function stageAt(t: number): { show: number; built: number; reading: boolean; step: number; sub: number } {
  const show = t <= 0 || t >= 1 ? 0 : t < IN ? t / IN : t > OUT ? (1 - t) / (1 - OUT) : 1;
  if (t < BUILD0) return { show, built: 0, reading: true, step: 0, sub: 0 };
  if (t > BUILD1) return { show, built: 1, reading: false, step: STEPS, sub: 0 };
  const u = ((t - BUILD0) / (BUILD1 - BUILD0)) * STEPS;
  const step = Math.min(STEPS - 1, Math.floor(u)), sub = u - step;
  const reading = sub < 0.5;
  return { show, built: (step + (reading ? 0 : 1)) / STEPS, reading, step, sub };
}

const thousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
/**
 * [box and manual][cat][model]: the manual standing on the other side of the cat,
 * with the box behind it, so the model has all the free floor on its side.
 */
const MANUAL_W = 230, MANUAL_H = 150, MANUAL_AT = 140, MODEL_GAP = 165;
const modelX = (p: BuildPlan) => p.x + p.dir * MODEL_GAP * p.s;
const manualAt = (p: BuildPlan) => ({ w: MANUAL_W * p.s, h: MANUAL_H * p.s, cx: p.x - p.dir * (MANUAL_AT + MANUAL_W / 2) * p.s, top: p.y - (MANUAL_H + 6) * p.s });

/** What goes behind the cat: the open box and the model. */
export function drawBuildBehind(c: X, p: BuildPlan, t: number): void {
  const st = stageAt(t);
  if (st.show <= 0) return;
  const B = prepare(p.set);
  const { s, dir } = p;
  c.save();
  c.globalAlpha = st.show;
  // The box, in the back and behind the manual: black, with the photo of the model.
  // It is almost 60 cm long; in the background it looks smaller.
  const bw = 58 * UNITS_PER_CM * s * 0.5, bh = 46 * UNITS_PER_CM * s * 0.5;
  const bx = manualAt(p).cx - dir * 40 * s - bw / 2, by = p.y - 60 * s - bh + (t < IN ? (1 - t / IN) * 60 * s : 0);
  c.fillStyle = '#121317';
  c.fillRect(bx, by, bw, bh);
  c.fillStyle = '#25272E';
  c.beginPath();
  c.moveTo(bx, by);
  c.lineTo(bx + bw * 0.12, by - bh * 0.18);
  c.lineTo(bx + bw * 1.02, by - bh * 0.18);
  c.lineTo(bx + bw, by);
  c.closePath();
  c.fill();
  const art = Math.min((bw * 0.86) / p.set.cols, (bh * 0.55) / (p.set.rows * BH));
  drawModel(c, B, B.bricks.length, bx + bw / 2 - (p.set.cols * art) / 2, by + bh * 0.78, art, 1);
  c.fillStyle = '#FFFFFF';
  c.font = `bold ${Math.max(9, Math.round(bh * 0.09))}px ${COND}`;
  c.textAlign = 'left';
  c.fillText(p.set.name, bx + bw * 0.05, by + bh * 0.14);
  c.font = `${Math.max(7, Math.round(bh * 0.06))}px ${COND_REGULAR}`;
  c.fillText(propTexts().boxPieces(p.set.number, thousands(p.set.pieces)), bx + bw * 0.05, by + bh * 0.93);
  drawManual(c, p, t, B);
  // The model, at cat scale.
  const n = Math.round(st.built * B.bricks.length);
  const mx = modelX(p);
  drawModel(c, p.night ? prepare(p.set, true) : B, n, mx, p.y, p.px, dir);
  const w = p.set.cols * p.px, top = p.y - p.set.rows * BH * p.px;
  const fs = Math.round(14 + 12 * s);
  const label = Math.max(fs + 4, top - 14 * s);
  if (t >= BUILD0 && t <= BUILD1) {
    outlined(c, propTexts().piece(thousands(Math.round(st.built * p.set.pieces)), thousands(p.set.pieces)), mx + (dir * w) / 2, label, fs, '#FFFFFF');
  } else if (t > BUILD1) {
    for (let i = 0; i < 4; i++) {
      const k = rng(p.seed + i)();
      starBurst(c, mx + dir * w * (0.15 + 0.7 * k), top + p.set.rows * BH * p.px * 0.25 * ((i * 7) % 3), (10 + 8 * ((i + Math.round(t * 30)) % 2)) * Math.max(s, 0.5), '#FFF6B0');
    }
    outlined(c, propTexts().finishedModel(p.set.name, p.set.number, thousands(p.set.pieces), p.set.widthCm), mx + (dir * w) / 2, label, fs, '#FFE58A');
  }
  c.restore();
}

/** The manual, open and standing between the cat and the model, and the bags at its feet. */
function drawManual(c: X, p: BuildPlan, t: number, B: Built): void {
  const st = stageAt(t);
  const { s } = p;
  const { w: mw, h: mh, cx: mcx, top: mtop } = manualAt(p);
  c.fillStyle = '#3A3F4A';
  c.fillRect(mcx - mw / 2 - 4 * s, mtop - 4 * s, mw + 8 * s, mh + 8 * s);
  for (const side of [-1, 1]) {
    c.fillStyle = side < 0 ? '#DCE9F5' : '#AFC6DD';
    c.fillRect(side < 0 ? mcx - mw / 2 : mcx + 2 * s, mtop, mw / 2 - 2 * s, mh);
  }
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.fillRect(mcx - 2 * s, mtop, 4 * s, mh);
  const per = B.bricks.length / STEPS;
  const n0 = Math.round(st.step * per), n1 = Math.min(B.bricks.length, Math.round((st.step + 1) * per));
  if (t >= BUILD0 && t <= BUILD1) {
    // Left page: the step number and the box of pieces.
    const lx = mcx - mw / 2 + 12 * s;
    c.fillStyle = '#1B2430';
    c.font = `bold ${Math.round(26 * s + 4)}px ${COND}`;
    c.textAlign = 'left';
    c.fillText(String(st.step + 1), lx, mtop + 30 * s);
    c.fillStyle = '#FFFFFF';
    c.strokeStyle = '#7DA6CF';
    c.lineWidth = Math.max(1, 2 * s);
    c.fillRect(lx, mtop + 40 * s, mw / 2 - 30 * s, mh - 52 * s);
    c.strokeRect(lx, mtop + 40 * s, mw / 2 - 30 * s, mh - 52 * s);
    const picks = [B.bricks[n0], B.bricks[Math.floor((n0 + n1) / 2)], B.bricks[Math.max(n0, n1 - 1)]].filter(Boolean) as Brick[];
    picks.forEach((b, i) => {
      const bx = lx + 8 * s, by = mtop + 50 * s + i * 30 * s;
      c.save();
      c.translate(bx, by + 18 * s);
      c.scale(9 * s, 9 * s);
      brick(c, { ...b, c: 0, r: 0, len: Math.min(b.len, 4) }, true);
      c.restore();
      c.fillStyle = '#1B2430';
      c.font = `bold ${Math.round(14 * s + 3)}px ${COND}`;
      c.fillText(`${1 + ((b.c + b.r) % 4)}x`, bx + 46 * s, by + 14 * s);
    });
    // Right page: how it looks after this step, with the new part boxed.
    const area = { x: mcx + 12 * s, y: mtop + 14 * s, w: mw / 2 - 24 * s, h: mh - 28 * s };
    const k = Math.min(area.w / p.set.cols, area.h / (p.set.rows * BH + 0.3));
    const ox = area.x + area.w / 2 - (p.set.cols * k) / 2, oy = area.y + area.h - 4 * s;
    drawModel(c, B, n1, ox, oy, k, 1);
    const fresh = B.bricks.slice(n0, n1);
    if (fresh.length) {
      const c0 = Math.min(...fresh.map((b) => b.c)), c1 = Math.max(...fresh.map((b) => b.c + b.len));
      const r0 = Math.min(...fresh.map((b) => b.r)), r1 = Math.max(...fresh.map((b) => b.r)) + 1;
      c.strokeStyle = '#F2C21B';
      c.lineWidth = Math.max(1.5, 3 * s);
      c.strokeRect(ox + c0 * k - 2, oy - r1 * BH * k - 2, (c1 - c0) * k + 4, (r1 - r0) * BH * k + 4);
    }
    // The page turns at the start of each step.
    if (st.reading && st.sub < 0.25) {
      c.fillStyle = 'rgba(245,248,252,0.95)';
      c.beginPath();
      c.moveTo(mcx, mtop);
      c.lineTo(mcx + mw * 0.22, mtop - 16 * s);
      c.lineTo(mcx + mw * 0.22, mtop + mh - 10 * s);
      c.lineTo(mcx, mtop + mh);
      c.closePath();
      c.fill();
    }
  } else {
    c.fillStyle = '#1B2430';
    c.font = `bold ${Math.round(14 * s + 4)}px ${COND}`;
    c.textAlign = 'center';
    c.fillText(p.set.name, mcx - mw / 4, mtop + mh / 2);
    c.fillText(p.set.number, mcx + mw / 4, mtop + mh / 2);
  }
  // Numbered bags at the foot of the manual, which get used up.
  const left = Math.max(0, Math.ceil((1 - st.built) * 5));
  for (let i = 0; i < left; i++) {
    const bx = mcx - mw / 2 + 4 * s + i * 46 * s, by = p.y + 4 * s;
    c.fillStyle = 'rgba(235,240,248,0.85)';
    c.beginPath();
    c.roundRect(bx, by - 30 * s, 40 * s, 30 * s, 6 * s);
    c.fill();
    c.fillStyle = '#1B2430';
    c.font = `bold ${Math.round(14 * s + 3)}px ${COND}`;
    c.textAlign = 'center';
    c.fillText(String(Math.floor(st.built * 5) + i + 1), bx + 20 * s, by - 9 * s);
  }
}

/** What goes in front of the cat: the paw and, at the end, the left-over piece. */
export function drawBuildFront(c: X, p: BuildPlan, t: number): void {
  const st = stageAt(t);
  if (st.show <= 0) return;
  const B = prepare(p.set);
  const { s, dir } = p;
  const { w: mw, h: mh, cx: mcx, top: mtop } = manualAt(p);
  c.save();
  c.globalAlpha = st.show;
  // The paw: on the manual while reading, on the model while placing the piece.
  if (t >= BUILD0 && t <= BUILD1) {
    if (st.reading) pawPad(c, mcx + dir * mw * 0.36, mtop + mh * 0.82, s * 1.3, -dir * 0.4);
    else {
      const at = lastPiece(B, Math.round(st.built * B.bricks.length), modelX(p), p.y, p.px, dir);
      if (at) pawPad(c, at.x, at.y - 8 * s, s * 1.3, dir * 0.5);
    }
  }
  // Finished, above the manual (above the cat is its "keep going?"). Sometimes,
  // as in real life, a piece is left over.
  if (t > BUILD1 && t < OUT) {
    if (p.seed % 3 === 0) {
      c.save();
      c.translate(mcx - 14 * s, mtop - 12 * s);
      c.scale(14 * s, 14 * s);
      brick(c, { c: 0, r: 0, len: 2, color: B.bricks[B.bricks.length >> 1]!.color, sec: 0 }, true);
      c.restore();
      pawPad(c, mcx + dir * 30 * s, mtop - 6 * s, s * 1.3);
      outlined(c, propTexts().whichPiece, mcx, mtop - 50 * s, Math.round(18 + 14 * s), '#FFFFFF');
    } else {
      outlined(c, propTexts().finished, mcx, mtop - 30 * s, Math.round(18 + 14 * s), '#B8F5C8');
    }
  }
  c.restore();
}

/** Where the last placed piece is. */
function lastPiece(B: Built, n: number, x: number, y: number, px: number, dir: 1 | -1): { x: number; y: number } | null {
  const last = n > 0 ? B.bricks[Math.min(n, B.bricks.length) - 1]! : null;
  return last ? { x: x + dir * (last.c + last.len / 2) * px, y: y - (last.r + 1) * BH * px } : null;
}

// ---------- The trophy shelf ----------
/** Width of the shelf, in drawing units (the same value as `SHELF_W` in cabinet.ts). */
const SHELF_W = 300;

/**
 * The sets assembled this week, in miniature on a low shelf at the back of the
 * room, all at the same scale (you can see which one is larger); (x, y) is the
 * left corner of the shelf floor. If they do not all fit, the most recent ones
 * and a "+N". Returns how many it painted.
 */
export function drawTrophies(c: X, ids: string[], x: number, y: number, night: boolean): number {
  const sets = ids.map((id) => SETS.find((z) => z.id === id)).filter(Boolean) as LegoSet[];
  if (!sets.length) return 0;
  const legs = 30, top = y - legs;
  // The shelf: board, legs and a sign. At night, with its spotlight above.
  c.save();
  if (night) {
    c.fillStyle = radial(c, x + SHELF_W / 2, top - 10, 0, SHELF_W * 0.6, [[0, 'rgba(255,214,140,0.30)'], [1, 'rgba(255,214,140,0)']]);
    c.fillRect(x - SHELF_W * 0.1, top - SHELF_W * 0.5, SHELF_W * 1.2, SHELF_W * 0.5 + legs);
  }
  c.fillStyle = night ? '#3B2E26' : '#6B4A32';
  c.fillRect(x, top, SHELF_W, 7);
  c.fillStyle = night ? '#2A211B' : '#4E3524';
  c.fillRect(x + 6, top + 7, 6, legs - 7);
  c.fillRect(x + SHELF_W - 12, top + 7, 6, legs - 7);
  c.fillStyle = 'rgba(0,0,0,0.22)';
  c.fillRect(x + 4, y - 2, SHELF_W - 8, 3);
  const shown = trophyMinis(c, ids, x, top, night);
  const rest = sets.length - shown;
  c.font = `bold 12px ${COND}`;
  c.textAlign = 'center';
  c.fillStyle = night ? '#C9B98F' : '#F3E3B5';
  c.fillText(propTexts().thisWeek(sets.length, rest), x + SHELF_W / 2, top + 22);
  c.restore();
  return shown;
}

/**
 * The miniatures of the assembled sets, at the same scale and resting on `top`
 * (from x to x + SHELF_W): the most recent ones, from right to left, until they
 * no longer fit. Returns how many it painted.
 */
export function trophyMinis(c: X, ids: string[], x: number, top: number, night: boolean): number {
  const sets = ids.map((id) => SETS.find((z) => z.id === id)).filter(Boolean) as LegoSet[];
  const k = 0.9;
  const items: { set: LegoSet; w: number }[] = [];
  let used = 0;
  for (const set of [...sets].reverse()) {
    const w = set.cols * k;
    if (used + w + (items.length ? 8 : 0) > SHELF_W - 16) break;
    items.unshift({ set, w });
    used += w + (items.length > 1 ? 8 : 0);
  }
  let cx = x + 8 + (SHELF_W - 16 - used) / 2;
  for (const it of items) {
    drawModel(c, prepare(it.set, night), prepare(it.set).bricks.length, cx, top, k, 1);
    cx += it.w + 8;
  }
  return items.length;
}
