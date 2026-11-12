/**
 * The cats room, at rest: every agent session is a cat, and how close it sits
 * says how much it needs you (see layout.ts). Ported from aimonitor's
 * `scene/render.ts` without the gestures, the walking between spots and the
 * card column (in Kiosko that column is just other tiles beside the scene).
 *
 * Fur is tens of thousands of strokes: a detailed cat costs ~100 ms. So cats
 * and the room are cached already painted, and each frame only composes them
 * and writes what changes: tags, sign boards and the wall clock.
 *
 * Everything is designed at 462 units high (`DESIGN_H`) and scaled to the
 * canvas; the width in design units follows the canvas aspect.
 */
import type { Canvas } from '@kiosko/sdk';
import { moonPhase, type SunTimes, type Weather } from '@loksly/weather-astro';
import { createCanvas } from './canvas.ts';
import { COATS, EXTENT, type Pose, backCat, boxGhost, boxSleeper, collarFor, frontCat, hiss, knead, laptop, pairHeart, schrodinger, sleepCat } from './cat.ts';
import { drawCabinet, SHELF_W } from './cabinet.ts';
import { DURATION, LONG_MEETING_MS, WINDY_KMH, branchOf, ease, isRain, isSnow, isStorm, poseAt, redraws, releaseTag, repoBirthday, sshHost, type Gesture, type Placement, type Surroundings } from './anim.ts';
import { drawBuildBehind, drawBuildFront, planBuild } from './lego.ts';
import { propTextsFor, usePropTexts } from './prop-texts.ts';
import { COND, MONO, MONO_BOLD } from './fonts.ts';
import { type Actor, DESIGN_H, MARGIN, RIGHT_ZONE, type ColumnSide, type LayoutConfig, type SceneLayout, SILL, floorAt, heightOf, layoutScene, placeTags, tagText } from './layout.ts';
import { ABANDONED_MS, nightOwl, partyTime, spookyDay } from './moments.ts';
import { type X, ellipse, hashString, linear, radial, rng } from './paint.ts';
import { type Beat, drawDuel, duration, runningCat, shortDuel } from './duel.ts';
import { type Spot, birthdayCake, blueprint, boxPile, boxWall, branchHat, butterfly, cards, catBook, catapult, cherryPick, chemistry, cobweb, cocoa, coffee, confetti, crane, crown, deployDrone, delivery, deskDuck, devilHorns, droneShow, droneSwarm, fallingBox, fallingLeaves, fish, hardHat, highFive, juggling, kittens, labGoggles, lampGrip, legoMerge, legoTower, lgtmStamp, magnifier, meetingDoor, mugPush, paperPress, papers, partyHat, pilotDrone, piggy, pointAtYou, popcorn, portal, postIts, remoteDesk, royalty, rubberDuck, sageGlasses, slipper, spaghetti, speedLines, steamroller, strawHat, tangle, tie, typing, wand, weekendBreak, windPapers, windowDrops, wizardHat, woolHat, yarn } from './props.ts';
import { type RoomName, type Sky, WINDOW, beachWave, clockPos, daylight, lampX, paintRoom, penguinCrossing, resolveRoom, skyKey, spaceHelmet, squirrelRun, tumbleweed, wallClock } from './room.ts';
import type { ShelfView } from './shelf.ts';
import type { SessionView } from './types.ts';
import type { Words } from './words.ts';

/** aimonitor's art direction: the room keeps it whatever the panel theme. */
export const BG = '#090C10';
export const STATE_COLOR: Record<SessionView['state'], string> = {
  permission: '#F5453D',
  waiting: '#FFB020',
  ready: '#4DA3FF',
  active: '#2E8A82',
  idle: '#2E8A82',
};

export interface SceneOptions {
  /** `rotate` (a different room every day) or a room name (see `ROOMS`). */
  room: string;
  /** With `rotate`, the rooms to go through; empty or absent: all of them. */
  rooms?: readonly string[];
  /** Strip kept free of cats, as the old card column did; `none` uses the whole floor. */
  column: 'none' | ColumnSide | 'alternar';
  swapSidesMs: number;
  /** An active session silent for half of this is drawn as Schrödinger's box. */
  zombieMs: number;
}

export interface SceneInput {
  sessions: SessionView[];
  now: number;
  /** Size of the canvas to paint, in pixels. */
  width: number;
  height: number;
  options: SceneOptions;
  words: Words;
  /** Latest weather reading; null = clear sky following the clock. */
  weather?: Weather | null;
  /** Today's sunrise and sunset; without them, fixed hours. */
  sun?: SunTimes | null;
  /** Nobody in front of the panel: the cats that wait for you doze. */
  away?: boolean;
  /** The week's commits and merged MRs, as books on the cabinet; without it, no cabinet. */
  shelf?: ShelfView | null;
  /** The gesture being painted: which cat, which one, and how far along (a frame of an animation, see anim.ts). */
  anim?: Gesture | null;
  /** The walk to the new spots: where each cat was and how far along (0..1). */
  move?: { from: Record<string, Placement>; t: number } | null;
  /** The LEGO sets built this week, in order, for the cabinet (see trophies.ts). */
  trophies?: string[];
  /** What goes on around the cats that the room can't tell by itself (quota, RAM, network). */
  extra?: Pick<Surroundings, 'usageHigh' | 'offline' | 'memLevel'>;
  /** The usage of the busiest window, 0..1 (the piggy bank gesture). */
  usagePct?: number;
}

/** Design width of the card column, when one is kept free. */
export const COLUMN_W = RIGHT_ZONE;

/** Id of the last LEGO set the assembling cat built, for the tests. */
let lastBuilt = '';
export const lastBuiltSet = () => lastBuilt;

/** Height of the lab goggles, from the top of the head. */
const GOGGLES_Y = 95;
const TAU_R = Math.PI * 2;
const sc0 = (s: number) => Math.max(s, 0.5);

/** Is the pose at rest? Then the cat of the static cache will do. */
const atRest = (p: Pose | undefined) => !p || !(p.lid || p.swing || p.yawn || p.ear);

/** Where the desk duck sits, relative to the cat at the laptop. */
const DUCK_AT = { x: 178, y: -80, s: 0.6 };

// ---------- Cache ----------
/** Tiny LRU: a Map keeps insertion order. */
class Lru<V> {
  private map = new Map<string, V>();
  private readonly max: number;
  /** Times the value had to be made: the cache misses. */
  misses = 0;
  constructor(max: number) {
    this.max = max;
  }
  get(key: string, make: () => V): V {
    const hit = this.map.get(key);
    if (hit !== undefined) {
      this.map.delete(key);
      this.map.set(key, hit);
      return hit;
    }
    this.misses++;
    const v = make();
    this.map.set(key, v);
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value!);
    return v;
  }
  get size() {
    return this.map.size;
  }
}

interface Sprite {
  canvas: Canvas;
  ox: number;
  oy: number;
}

const SHORT_DUEL: Beat[] = shortDuel();

const sprites = new Lru<Sprite>(32);
// The poses and variants of the gestures have their own cache: they must not push out the still cats.
const gestureSprites = new Lru<Sprite>(24);
const rooms = new Lru<Canvas>(4);
const vignettes = new Lru<Canvas>(4);

/** For tests and diagnostics: cats and rooms painted from scratch. */
export function cacheStats(): { sprites: number; rooms: number; paints: number; roomPaints: number; gesturePaints: number } {
  return { sprites: sprites.size, rooms: rooms.size, paints: sprites.misses, roomPaints: rooms.misses, gesturePaints: gestureSprites.misses };
}

function vignette(w: number, h: number): Canvas {
  return vignettes.get(`${w}x${h}`, () => {
    const v = createCanvas(w, h);
    const c = v.getContext('2d');
    c.translate(w / 2, h / 2);
    c.scale(1, h / w);
    c.fillStyle = radial(c, 0, 0, w * 0.32, w * 0.62, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.38)']]);
    c.fillRect(-w, -w, 2 * w, 2 * w);
    return v;
  });
}

const TOP = 400; // the highest a pose rises above the floor, with margin
const BOTTOM = 90; // how low it goes: shadows and the tails' heart
const PAD = 45;

const seedOf = (r: SessionView) => hashString(r.session_id) & 0xffff;

/**
 * Copies to a clean canvas, to cache pixels only.
 *
 * @napi-rs/canvas doesn't rasterise while drawing: it records every call and
 * replays it when encoding or copying. A freshly painted canvas keeps the
 * whole recording of the fur alive (~260 bytes per call, 900 MB for 30
 * canvases of 100,000 strokes). Copying it with `drawImage` and keeping the
 * copy drops it.
 */
function flatten(src: Canvas, blurPx = 0): Canvas {
  const out = createCanvas(src.width, src.height);
  const o = out.getContext('2d');
  if (blurPx > 0) o.filter = `blur(${blurPx}px)`;
  o.drawImage(src, 0, 0);
  return out;
}

/**
 * Room light on a cat. Three levels and two sides, so the cache is renewed
 * only a couple of times a day and not whenever someone moves.
 */
export interface Light {
  /** 0 night (the lamp rules), 1 dusk, 2 day (the window rules). */
  level: 0 | 1 | 2;
  /** Which side of the cat the light comes from: -1 left, 1 right. */
  side: -1 | 1;
}

export function lightLevel(sky: Sky): Light['level'] {
  const dl = daylight(sky.hour, sky.rise, sky.set);
  return dl > 0.66 ? 2 : dl > 0.2 ? 1 : 0;
}

/** Where the light comes from: the lamp at night, the window by day. */
const lightX = (level: Light['level'], W: number) => (level === 0 ? lampX(W) : WINDOW.x + WINDOW.w / 2);

/** Tints the painted cat with the room's light (only where there is cat). */
function grade(o: X, w: number, h: number, light: Light): void {
  o.save();
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.globalCompositeOperation = 'source-atop';
  const [amb, key] = light.level === 0
    ? ['rgba(16,20,44,0.20)', 'rgba(255,176,104,0.26)']
    : light.level === 1
      ? ['rgba(60,30,40,0.08)', 'rgba(255,150,90,0.18)']
      : ['rgba(200,220,255,0.04)', 'rgba(225,238,255,0.16)'];
  o.fillStyle = amb;
  o.fillRect(0, 0, w, h);
  // The side facing the light, brighter and in its colour.
  o.fillStyle = linear(o, light.side > 0 ? w : 0, 0, light.side > 0 ? w * 0.35 : w * 0.65, 0, [[0, key], [1, key.replace(/[\d.]+\)$/, '0)')]]);
  o.fillRect(0, 0, w, h);
  o.restore();
}

/** Depth of field: only the background, and just a little (panel pixels). */
const blurFor = (a: Actor) => (a.sill ? 0 : a.z < 0.6 ? 0 : Math.round((a.z - 0.55) * 4) / 2);
const coat = (name: string) => COATS[name] ?? COATS.canela!;

/**
 * Paints one pose. `variant`: drawings of a gesture (the cat without its
 * laptop, the laptop without its cat, the ghost half out). `flavor`: what
 * changes with the hour or the day and lasts hours (wide pupils after
 * midnight, the Halloween ghost); that one goes in the static cache.
 */
function paintPose(c: X, a: Actor, pose: Pose, flavor: string, words: Words, variant = ''): void {
  const [r0, r1] = a.records;
  const c0 = coat(a.coats[0]!);
  const c1 = coat(a.coats[1] ?? a.coats[0]!);
  const box = `bold 26px ${MONO_BOLD}`;
  switch (a.pose) {
    case 'cartel': frontCat(c, c0, { mood: 'wide', collar: collarFor(r0!.provider), pose, dilate: flavor.includes('n') }); break;
    case 'sentado': frontCat(c, c0, { mood: 'open', collar: collarFor(r0!.provider), pose, dilate: flavor.includes('n') }); break;
    case 'portatil':
      if (variant === 'soloPortatil') laptop(c, 165);
      else backCat(c, c0, seedOf(r0!), { pose, laptop: variant !== 'sinPortatil' });
      break;
    case 'dormido': sleepCat(c, c0, seedOf(r0!)); break;
    case 'caja': {
      const buu = /^buu:(-?[\d.]+):(-?[\d.]+)$/.exec(variant);
      if (buu) boxGhost(c, box, Number(buu[1]), Number(buu[2]), words.fragile);
      else if (flavor.includes('f')) boxGhost(c, box, 0, 0, words.fragile);
      else boxSleeper(c, c0, seedOf(r0!), box, words.fragile);
      break;
    }
    case 'schrodinger': schrodinger(c, `bold 64px ${MONO_BOLD}`, pose.lid ?? 0); break;
    case 'corazon': pairHeart(c, c0, c1); break;
    case 'amasa': knead(c, c0, c1, collarFor(r1!.provider), pose); break;
    case 'bufido': hiss(c, c0, c1, [collarFor(r0!.provider), collarFor(r1!.provider)]); break;
  }
}

/** The cat already painted at its scale and with its haze, ready to compose. */
function sprite(a: Actor, k: number, pose: Pose | undefined, light: Light, flavor: string, words: Words, variant = ''): Sprite {
  const fog = a.sill ? 0.2 : Math.round(a.z * 20) / 20 * 0.38;
  const s = a.scale * k;
  const blur = blurFor(a);
  const rest = atRest(pose);
  const key = [a.pose, a.coats.join(','), a.records.map((r) => `${r.provider}:${seedOf(r)}`).join(','), s.toFixed(3), fog.toFixed(3), `${light.level}${light.side}`, blur, variant, flavor, words.fragile, rest ? '' : JSON.stringify(pose)].join('|');
  return (rest && !variant ? sprites : gestureSprites).get(key, () => {
    const [L, R] = EXTENT[a.pose]!;
    const w = Math.ceil((R - L + PAD * 2) * s), h = Math.ceil((TOP + BOTTOM) * s);
    const canvas = createCanvas(Math.max(1, w), Math.max(1, h));
    const o = canvas.getContext('2d');
    const ox = (PAD - L) * s, oy = TOP * s;
    o.translate(ox, oy);
    o.scale(s, s);
    paintPose(o, a, rest ? {} : pose!, flavor, words, variant);
    grade(o, w, h, light);
    if (fog > 0) {
      // Aerial perspective: what is far melts into the room.
      o.setTransform(1, 0, 0, 1, 0, 0);
      o.globalCompositeOperation = 'source-atop';
      o.fillStyle = `rgba(42,49,68,${fog})`;
      o.fillRect(0, 0, w, h);
    }
    return { canvas: flatten(canvas, blur), ox, oy };
  });
}

/** The cat of the mad dash, at the scale of its spot: two drawings (stretched and gathered). */
function runnerSprite(a: Actor, k: number, scale: number, stretch: number, light: Light): Sprite {
  const s = Math.round(scale * 20) / 20 * k;
  const r0 = a.records[0]!;
  const key = ['carrera', a.coats[0], seedOf(r0), r0.provider, s.toFixed(3), stretch, `${light.level}${light.side}`].join('|');
  return gestureSprites.get(key, () => {
    const L = -300, R = 230;
    const w = Math.ceil((R - L + PAD * 2) * s), h = Math.ceil((TOP + BOTTOM) * s);
    const canvas = createCanvas(Math.max(1, w), Math.max(1, h));
    const o = canvas.getContext('2d');
    const ox = (PAD - L) * s, oy = TOP * s;
    o.translate(ox, oy);
    o.scale(s, s);
    runningCat(o, coat(a.coats[0]!), seedOf(r0), collarFor(r0.provider), stretch);
    grade(o, w, h, light);
    return { canvas: flatten(canvas), ox, oy };
  });
}

// ---------- Live text and boards ----------
function text(c: X, t: string, x: number, y: number, font: string, color: string, align: 'left' | 'center' | 'right' = 'left'): number {
  c.font = font;
  c.fillStyle = color;
  c.textAlign = align;
  c.fillText(t, x, y);
  const w = c.measureText(t).width;
  c.textAlign = 'left';
  return w;
}

/** Trims with an ellipsis until it fits. */
function fit(c: X, t: string, font: string, max: number): string {
  c.font = font;
  if (c.measureText(t).width <= max) return t;
  let s = t;
  while (s.length > 1 && c.measureText(`${s}…`).width > max) s = s.slice(0, -1);
  return `${s}…`;
}

function toneColor(a: Actor): string {
  if (a.pose === 'bufido') return STATE_COLOR.permission;
  if (a.tone === 'zombi') return '#8A96A6';
  if (a.tone === 'active' || a.tone === 'idle') return '#4FC3B8';
  return STATE_COLOR[a.tone];
}

/** Width a tag asks for with all its text, and the height of its row. */
function tagSize(c: X, name: string, time: string, size: number): { w: number; h: number } {
  c.font = `bold ${size}px ${MONO_BOLD}`;
  const t1 = c.measureText(name).width;
  c.font = `${size}px ${MONO}`;
  const t2 = c.measureText(time).width;
  return { w: size * 1.6 + t1 + size * 0.6 + t2 + size * 0.8, h: size * 1.6 };
}

/**
 * Text of a tag for a given width. Whole if it fits; otherwise the time is
 * trimmed first (down to a minimum) and then the name.
 */
export function fitTagText(c: X, name: string, time: string, size: number, maxW: number): { name: string; time: string } {
  const bold = `bold ${size}px ${MONO_BOLD}`, reg = `${size}px ${MONO}`;
  const inner = maxW - size * 3;
  c.font = bold;
  const n0 = c.measureText(name).width;
  c.font = reg;
  const t0 = c.measureText(time).width;
  if (n0 + t0 <= inner + 0.5) return { name, time };
  const tt = fit(c, time, reg, Math.max(size * 3, inner - n0));
  c.font = reg;
  const t2 = c.measureText(tt).width;
  return { name: fit(c, name, bold, Math.max(size * 2, inner - t2)), time: tt };
}

function tag(c: X, x: number, y: number, name: string, time: string, col: string, size: number, alpha: number, maxW: number): void {
  c.save();
  c.globalAlpha = alpha;
  const bold = `bold ${size}px ${MONO_BOLD}`, reg = `${size}px ${MONO}`;
  const { name: n, time: tt } = fitTagText(c, name, time, size, maxW);
  c.font = reg;
  const t2 = c.measureText(tt).width;
  c.font = bold;
  const t1 = c.measureText(n).width;
  const w = size * 1.6 + t1 + size * 0.6 + t2 + size * 0.8, h = size * 1.6;
  c.fillStyle = 'rgba(9,12,18,0.8)';
  c.beginPath();
  c.roundRect(x - w / 2, y, w, h, h / 2);
  c.fill();
  c.fillStyle = col;
  ellipse(c, x - w / 2 + size * 0.85, y + h / 2, size * 0.32, size * 0.32);
  c.fill();
  text(c, n, x - w / 2 + size * 1.5, y + size * 1.15, bold, '#E6EDF5');
  text(c, tt, x - w / 2 + size * 1.5 + t1 + size * 0.6, y + size * 1.15, reg, '#9AA7B6');
  c.restore();
}

function bubble(c: X, x: number, y: number, t: string, size: number): void {
  const font = `bold ${size}px ${MONO_BOLD}`;
  c.font = font;
  const w = c.measureText(t).width + size * 1.2, h = size * 1.7;
  c.fillStyle = 'rgba(255,255,255,0.95)';
  c.beginPath();
  c.roundRect(x, y, w, h, h / 2);
  c.fill();
  c.beginPath();
  c.moveTo(x + w * 0.25, y + h - 2);
  c.lineTo(x + w * 0.18, y + h + size * 0.6);
  c.lineTo(x + w * 0.38, y + h - 2);
  c.fill();
  text(c, t, x + size * 0.6, y + size * 1.22, font, '#1E2230');
}

function outlined(c: X, t: string, x: number, y: number, size: number, color: string): void {
  c.font = `bold ${size}px ${MONO_BOLD}`;
  c.lineWidth = Math.max(2, size / 7);
  c.strokeStyle = 'rgba(10,12,18,0.85)';
  c.strokeText(t, x, y);
  c.fillStyle = color;
  c.fillText(t, x, y);
}

/** Wooden sign board planted next to the cat that asks for permission. Cat-local coordinates. */
function signBoard(c: X, r: SessionView, now: number, words: Words): void {
  const x = 150, y = -330, w = 276, h = 204;
  c.fillStyle = '#5E3F22';
  c.fillRect(x + w / 2 - 7, y + h - 4, 14, -y - h + 4);
  c.fillStyle = 'rgba(0,0,0,0.4)';
  c.beginPath();
  c.roundRect(x + 6, y + 8, w, h, 10);
  c.fill();
  c.fillStyle = linear(c, x, y, x, y + h, [[0, '#B9864E'], [1, '#8C5E30']]);
  c.beginPath();
  c.roundRect(x, y, w, h, 10);
  c.fill();
  c.fillStyle = linear(c, x, y, x, y + h, [[0, '#FFF8EA'], [1, '#EFE2C6']]);
  c.beginPath();
  c.roundRect(x + 10, y + 10, w - 20, h - 20, 6);
  c.fill();
  c.fillStyle = '#6B6B6B';
  ellipse(c, x + 20, y + 20, 3, 3);
  c.fill();
  ellipse(c, x + w - 20, y + 20, 3, 3);
  c.fill();
  const inner = w - 36;
  const lines: [string, number, string, string][] = [
    [words.mayI, 44, `bold 44px ${MONO_BOLD}`, '#C62A22'],
    [r.project, 30, `bold 30px ${COND}`, '#2A1A10'],
    [r.detail || words.asksPermission, 19, `19px ${MONO}`, '#5A4A3A'],
    [words.elapsed(now - r.since), 34, `bold 34px ${MONO_BOLD}`, '#2A1A10'],
  ];
  let yy = y + 20;
  for (const [t, size, font, col] of lines) {
    yy += size * 1.12;
    text(c, fit(c, t, font, inner), x + w / 2, yy, font, col, 'center');
  }
}

const MEETING_SOON_MS = 10 * 60_000;

/** The meeting door, on the wall between the plant and the window. */
const DOOR_X = 460;

/**
 * Heads of each pose, in cat units: where a hat goes (`top`) and, for the
 * ones facing you, where the tie hangs (`chest`).
 */
function heads(a: Actor): { dx: number; top: number; chest?: number }[] {
  switch (a.pose) {
    case 'sentado': case 'cartel': return [{ dx: 0, top: -258, chest: -122 }];
    case 'portatil': return [{ dx: 0, top: -258 }];
    case 'corazon': return [{ dx: -98, top: -258 }, { dx: 98, top: -258 }];
    case 'amasa': return [{ dx: 0, top: -258 }, { dx: 190, top: -258, chest: -122 }];
    case 'bufido': return [{ dx: -150, top: -258, chest: -122 }, { dx: 150, top: -258, chest: -122 }];
    default: return [];
  }
}

/** The paw that points at nothing in particular (the detached HEAD cat). */
function pointAtYouless(c: X, x: number, y: number, s: number): void {
  c.save();
  c.fillStyle = '#F3E3CF';
  ellipse(c, x + 60 * s, y, 22 * s, 18 * s, -0.4);
  c.fill();
  c.restore();
}

const HAT_COLORS = ['#FF5C8A', '#4DA3FF', '#FFD34D', '#39D98A', '#C58BFF'];

type TagSpot = { name: string; time: string; size: number; y: number; x: number; w: number; h: number };

function computeTags(ctx: X, L: SceneLayout, now: number, words: Words): Map<Actor, TagSpot> {
  const wants = L.actors
    .filter((a) => a.pose !== 'cartel')
    .sort((a, b) => a.z - b.z)
    .map((a) => {
      const { name, time } = tagText(a, now, words);
      const size = Math.max(14, Math.round(20 * (1 - a.z * 0.3)));
      const below = a.pose === 'corazon' ? 64 * a.scale : 4;
      const y = a.sill ? a.floorY + 6 : Math.min(DESIGN_H - size * 1.7, a.floorY + below);
      const { w, h } = tagSize(ctx, name, time, size);
      return { a, name, time, size, box: { x: a.x, y, h, w, minW: Math.min(w, size * 6) } };
    });
  const spots = placeTags(wants.map((t) => t.box), L.zone.lo + MARGIN, L.zone.hi - MARGIN);
  const out = new Map<Actor, TagSpot>();
  wants.forEach((t, i) => out.set(t.a, { name: t.name, time: t.time, size: t.size, y: t.box.y, h: t.box.h, x: spots[i]!.x, w: spots[i]!.w }));
  return out;
}

/** Layout settings from the widget options. */
export function layoutConfig(o: SceneOptions): LayoutConfig {
  return { zombieMs: o.zombieMs, side: o.column === 'none' ? 'derecha' : o.column, swapSidesMs: o.swapSidesMs };
}

/** Design width of the strip kept free of cats. */
export const columnWidth = (o: SceneOptions) => (o.column === 'none' ? 0 : COLUMN_W);

/**
 * The room was drawn for aimonitor's 1920×462 panel: the window, the
 * picture and the shelf sit at fixed spots, while the lamp and the wall clock
 * hang at a fraction of the width. Below this width they would collide with
 * the window, so a narrower tile shows a crop of a room this wide.
 */
export const MIN_ROOM_W = 1800;

export interface RoomView {
  /** Pixels per design unit. */
  k: number;
  /** Visible width, in design units. */
  W: number;
  /** Width of the painted room, in design units (≥ W). */
  RW: number;
  /** Where the visible part starts in the room, in design units. */
  x0: number;
}

export function roomView(width: number, height: number): RoomView {
  const k = height / DESIGN_H;
  const W = width / k;
  const RW = Math.max(W, MIN_ROOM_W);
  if (RW <= W) return { k, W, RW, x0: 0 };
  // A crop keeps the wall clock whole (it tells the time) and the window sill
  // (a cat sleeps there); what goes first is the shelf on the left.
  const clockRight = clockPos(RW).x + 70;
  const x0 = Math.max(0, Math.min(clockRight - W, RW - W, SILL.x - 80));
  return { k, W, RW, x0 };
}

/** What goes on around the cats and decides some gestures (see anim.ts). */
export function surroundings(input: Pick<SceneInput, 'sessions' | 'now' | 'weather' | 'sun' | 'away' | 'options' | 'extra'>): Surroundings {
  const now = input.now;
  const code = input.weather?.code ?? 0;
  const d = new Date(now);
  return {
    ...input.extra,
    meetingSoon: input.sessions.some((r) => r.startsAt !== undefined && r.startsAt - now <= MEETING_SOON_MS),
    rain: isRain(code),
    storm: isStorm(code),
    snow: isSnow(code),
    windy: (input.weather?.wind ?? 0) >= WINDY_KMH,
    fullMoon: moonPhase(now).illumination >= 0.97 && lightLevel(skyOf(now, input.weather, input.sun)) === 0,
    room: resolveRoom(input.options.room, now, input.options.rooms),
    ...(input.away !== undefined ? { away: input.away } : {}),
    longMeeting: input.sessions.some((r) => r.startsAt !== undefined && r.endsAt !== undefined && r.startsAt <= now && now < r.endsAt && r.endsAt - r.startsAt >= LONG_MEETING_MS),
  };
}

/** The cast of the scene, without painting (tests, the duel). */
export function sceneLayout(input: Pick<SceneInput, 'sessions' | 'now' | 'width' | 'height' | 'options'>): SceneLayout {
  const v = roomView(input.width, input.height);
  return layoutScene(input.sessions, input.now, layoutConfig(input.options), v.W, columnWidth(input.options), v.x0);
}

/** Where the tags land, for the tests: rectangles in design units. */
export function sceneTagRects(input: SceneInput): { x0: number; x1: number; y0: number; y1: number; name: string; fits: boolean }[] {
  const L = sceneLayout(input);
  const ctx = createCanvas(1, 1).getContext('2d');
  return [...computeTags(ctx, L, input.now, input.words).values()].map((t) => ({
    x0: t.x - t.w / 2, x1: t.x + t.w / 2, y0: t.y, y1: t.y + t.h, name: t.name,
    fits: tagSize(ctx, t.name, t.time, t.size).w <= t.w + 0.5,
  }));
}

/** The sky outside the window right now. */
export function skyOf(now: number, weather: Weather | null | undefined, sun: SunTimes | null | undefined): Sky {
  const d = new Date(now);
  return { hour: d.getHours() + d.getMinutes() / 60, code: weather?.code ?? 0, now, rise: sun?.rise, set: sun?.set };
}

/** The whole room painted for a `v` view, cached while the sky doesn't change. */
export function roomCanvas(v: RoomView, height: number, sky: Sky, room: RoomName, words: Words): Canvas {
  const width = Math.ceil(v.RW * v.k);
  return rooms.get(`${width}x${height}|${room}|${skyKey(sky)}|${words.notOnFriday}`, () => {
    const rc = createCanvas(width, height);
    const r = rc.getContext('2d');
    r.scale(v.k, v.k);
    paintRoom(r, v.RW, DESIGN_H, sky, room, words.notOnFriday);
    return flatten(rc);
  });
}

/** Paints the room of view `v` on `ctx`, cropped to the visible part. */
export function drawRoom(ctx: X, v: RoomView, height: number, sky: Sky, room: RoomName, words: Words): void {
  ctx.drawImage(roomCanvas(v, height, sky, room, words), Math.round(-v.x0 * v.k), 0);
}

// ---------- Frame ----------
export function renderScene(input: SceneInput): Canvas {
  const { width, height, now, words, options } = input;
  // The little texts painted by the props speak the panel's language.
  usePropTexts(propTextsFor(words.lang));
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  const v = roomView(width, height);
  const { k, RW } = v;
  // Design units → canvas pixels, and the same for x alone (sprites are drawn unscaled).
  const toDesign = () => ctx.setTransform(k, 0, 0, k, -v.x0 * k, 0);
  const px = (x: number) => (x - v.x0) * k;

  const d = new Date(now);
  const weather = input.weather ?? null;
  const sky = skyOf(now, weather, input.sun);
  const theme = resolveRoom(options.room, now, options.rooms);
  const inSpace = theme === 'espacio';
  drawRoom(ctx, v, height, sky, theme, words);

  toDesign();
  const cp = clockPos(RW);
  wallClock(ctx, cp.x, cp.y, cp.r, d);
  if (weather) {
    // The temperature outside, stuck on the window frame.
    ctx.fillStyle = 'rgba(8,11,17,0.75)';
    ctx.beginPath();
    ctx.roundRect(796, 46, 64, 24, 6);
    ctx.fill();
    text(ctx, `${Math.round(weather.temp)}°`, 828, 64, `bold 17px ${MONO_BOLD}`, '#FFD08A', 'center');
  }
  const L = layoutScene(input.sessions, now, layoutConfig(options), v.W, columnWidth(options), v.x0);
  // The cabinet stands behind everyone, far from the clock, and moves aside if the strip reaches it.
  drawCabinet(ctx, Math.min(RW - RIGHT_ZONE - SHELF_W - 230, L.zone.hi - SHELF_W - 30), floorAt(1), input.shelf ?? null, lightLevel(sky) === 0, words.week, input.trophies ?? []);
  const party = partyTime(now);
  const spooky = spookyDay(now);
  const flavor = `${nightOwl(now) ? 'n' : ''}${spooky ? 'f' : ''}`;
  const soon = L.meetings.filter((m) => m.startsAt !== undefined && m.startsAt - now <= MEETING_SOON_MS).sort((x, y) => x.startsAt! - y.startsAt!);
  const meetingSoon = soon.length > 0;
  if (meetingSoon) {
    const left = soon[0]!.startsAt! - now;
    meetingDoor(ctx, DOOR_X, 110, 272, words.meeting, left <= 0 ? words.now : words.inTime(words.countdown(left)));
  }

  const around = surroundings(input);
  // RAM llena: cajas contra la pared del fondo, detrás de todos.
  const mem = around.memLevel ?? 0;
  if (mem > 0) boxPile(ctx, L.zone.lo + MARGIN + 330, L.zone.hi - 60, floorAt(0.97), mem);
  // Con la RAM al límite, el gato más cercano queda emparedado.
  const walled = mem >= 3 ? [...L.actors].filter((x) => x.pose !== 'cartel' && !x.sill).sort((p, q) => q.scale - p.scale)[0] : undefined;
  // Dónde queda cada sesión (su cabeza, si es una pareja), para los gestos entre dos.
  const spots = new Map<string, Spot & { a: Actor; i: number }>();

  // Placas: se reparten antes de pintar nada, de la más cercana a la más
  // lejana, para que no se pisen (ver placeTags).
  const tagInfo = computeTags(ctx, L, now, words);

  // Gatos, de atrás adelante, con su placa en el suelo y sus textos encima.
  const anim = input.anim ?? null;
  // Fuera de 0 < t < 1 el gesto está en reposo: nada cambia respecto al estático.
  const live = anim && anim.t > 0 && anim.t < 1 ? anim : null;
  const level = lightLevel(sky);
  const lx = lightX(level, RW);
  // Paseo en curso: cada gato que ya estaba va de donde estaba a donde toca.
  const mv = input.move && input.move.t > 0 && input.move.t < 1 ? input.move : null;
  // Durante un duelo la habitación se apaga un poco: la luz la ponen las espadas.
  let duelFlash = 0;
  if (live?.kind === 'duelo') {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(8,10,20,${0.32 * Math.min(1, Math.sin(Math.PI * live.t) * 3)})`;
    ctx.fillRect(0, 0, width, height);
    toDesign();
  }
  // Reunión larga: todos al centro, en corro alrededor de un plano, y vuelta.
  const corroF = live?.kind === 'corro' ? (live.t < 0.15 ? ease(live.t / 0.15) : live.t > 0.85 ? 1 - ease((live.t - 0.85) / 0.15) : 1) : 0;
  const floorActors = L.actors.filter((x) => !x.sill);
  const corroC = { x: (L.zone.lo + MARGIN + L.zone.hi) / 2, y: floorAt(0.3) };
  const corroAt = (a: Actor) => {
    const i = floorActors.indexOf(a), n = Math.max(1, floorActors.length);
    const ang = Math.PI / 2 + (i / n) * TAU_R + 0.3;
    return { x: corroC.x + Math.cos(ang) * 300, y: corroC.y - 30 + Math.sin(ang) * 40 };
  };
  if (live?.kind === 'ola') beachWave(ctx, RW, live.t);
  if (live?.kind === 'pinguino') penguinCrossing(ctx, RW, live.t);
  if (live?.kind === 'rodadora') tumbleweed(ctx, RW, live.t);
  if (live?.kind === 'ardilla') squirrelRun(ctx, RW, live.t);
  if (corroF > 0) blueprint(ctx, corroC.x, corroC.y - 20, corroF);
  for (const a of L.actors) {
    const g = live && live.id === a.records[0]!.session_id ? live : null;
    const from = mv?.from[a.records[0]!.session_id];
    const e = mv ? ease(mv.t) : 1;
    const vs = from ? from.scale + (a.scale - from.scale) * e : a.scale;
    // Pasitos: si cambia de profundidad, bota un poco al andar.
    const hop = from && mv && Math.abs(from.z - a.z) >= 0.05 ? Math.abs(Math.sin(Math.PI * mv.t * 4)) * 10 * vs : 0;
    // Con reunión encima, el que se arregla la corbata se acerca a la puerta y vuelve.
    const toDoor = g?.kind === 'corbata' ? Math.sin(Math.PI * g.t) * (DOOR_X - a.x) * 0.75 : 0;
    // Sobredosis de café: un desfase de 2 px a izquierda y derecha, frame a frame.
    const jitter = g?.kind === 'temblor' ? (Math.round(g.t * DURATION.temblor * 6) % 2 ? 2 : -2) / k : 0;
    const vx = (from ? from.x + (a.x - from.x) * e : a.x) + toDoor + jitter + (corroF > 0 && !a.sill ? (corroAt(a).x - a.x) * corroF : 0);
    // Trueno: todos dan un saltito a la vez.
    const jump = live?.kind === 'trueno' ? Math.sin(Math.PI * Math.max(0, Math.min(1, (live.t - 0.1) / 0.6))) * 26 * vs
      // Y el que pisa una pieza de Lego en un merge con conflicto.
      : g?.kind === 'encaje' && a.records[0]!.lastFailed && g.t > 0.62 && g.t < 0.92 ? Math.sin(Math.PI * (g.t - 0.62) / 0.3) * 40 * vs : 0;
    const vy0 = from ? from.floorY + (a.floorY - from.floorY) * e - hop : a.floorY;
    // En el espacio flotan: cada uno a su altura y un poco ladeado, y en la
    // ingravidez suben y bajan todos a la vez.
    const seedA = seedOf(a.records[0]!);
    const drift = live?.kind === 'ingravidez' ? Math.sin(TAU_R * live.t) : 0;
    const lift = inSpace && !a.sill ? (40 + (seedA % 60) + drift * 18) * vs : 0;
    const tilt = inSpace && !a.sill ? ((seedA >> 3) % 11 - 5) * 0.012 + drift * 0.04 : 0;
    const vy = vy0 - jump - lift + (corroF > 0 && !a.sill ? (corroAt(a).y - a.floorY) * corroF : 0);
    const side: Light['side'] = lx >= a.x ? 1 : -1;
    // Sombra en el suelo, alargada hacia el lado contrario de la luz.
    if (!a.sill && !inSpace) {
      toDesign();
      ctx.save();
      ctx.translate(vx - side * 60 * vs, vy + hop + 3);
      ctx.scale(1, 0.12);
      ctx.fillStyle = radial(ctx, 0, 0, 0, 160 * vs, [[0, `rgba(0,0,0,${level === 0 ? 0.3 : 0.2})`], [1, 'rgba(0,0,0,0)']]);
      ellipse(ctx, 0, 0, 170 * vs, 170 * vs);
      ctx.fill();
      ctx.restore();
    }
    if (g?.kind === 'duelo' && a.pose === 'bufido') {
      // Los dos que se pisan, de perfil y a espada; la placa sigue debajo.
      toDesign();
      const [r0, r1] = a.records;
      duelFlash = drawDuel(ctx, SHORT_DUEL, g.t * duration(SHORT_DUEL), vx, vy, vs * 0.62, {
        coats: [coat(a.coats[0]!), coat(a.coats[1] ?? a.coats[0]!)], collars: [collarFor(r0!.provider), collarFor(r1!.provider)],
      }, seedOf(r0!));
      const t = tagInfo.get(a)!;
      tag(ctx, t.x, t.y, t.name, t.time, toneColor(a), t.size, 1, t.w);
      continue;
    }
    if (g?.kind === 'montaje' && a.pose === 'sentado') {
      // Saca la caja y monta el set mirando el manual, de frente y sin dejar
      // de preguntar «¿sigo?»: sigue ocioso y tiene que verse. Ver lego.ts.
      toDesign();
      // El suelo libre a cada lado llega hasta el primer gato que está tan
      // cerca o más que él: ésos taparían la maqueta. Los del fondo no.
      let lo = L.zone.lo + MARGIN, hi = L.zone.hi;
      for (const o of L.actors) {
        if (o === a || o.sill || o.z > a.z + 0.02) continue;
        const [l, r] = EXTENT[o.pose]!;
        if (o.x < vx) lo = Math.max(lo, o.x + r * o.scale);
        else hi = Math.min(hi, o.x + l * o.scale);
      }
      // Un set distinto en cada montaje: la escena de un gesto tiene su `now`
      // fijo, así que el minuto vale de semilla y los frames salen iguales.
      const pickSeed = Math.imul(seedOf(a.records[0]!) ^ Math.floor(now / 60_000), 2654435761) >>> 8;
      const plan = { ...planBuild(vx, vy, vs, pickSeed, lo, hi), night: level === 0 };
      lastBuilt = plan.set.id;
      drawBuildBehind(ctx, plan, g.t);
      const body = sprite(a, k, undefined, { level, side }, flavor, words);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(body.canvas, Math.round(px(vx) - body.ox), Math.round(vy * k - body.oy));
      toDesign();
      const t = tagInfo.get(a)!;
      tag(ctx, t.x, t.y, t.name, t.time, toneColor(a), t.size, 1 - a.z * 0.25, t.w);
      drawBuildFront(ctx, plan, g.t);
      const top = vy - (heightOf(a) / a.scale) * vs;
      bubble(ctx, vx + 70 * vs, top - 40 * vs, words.goOn, Math.round(26 * vs + 6));
      continue;
    }
    if (g?.kind === 'carrera' && a.pose === 'portatil') {
      // La carrera loca: el portátil se queda solo y el gato cruza la
      // habitación en tres frames, de punta a punta, y vuelve como si nada.
      const desk = sprite(a, k, undefined, { level, side }, '', words, 'soloPortatil');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(desk.canvas, Math.round(px(vx) - desk.ox), Math.round(vy * k - desk.oy));
      toDesign();
      const u = Math.max(0, Math.min(1, (g.t - 0.25) / 0.5));
      const left = L.zone.lo + MARGIN + 160 * vs, right = L.zone.hi - 200 * vs;
      const rx = left + (right - left) * u;
      const stretch = Math.round(u * 2) % 2 === 0 ? 1 : 0;
      const run = runnerSprite(a, k, vs, stretch, { level, side });
      speedLines(ctx, rx, vy, vs, 1, 11 + Math.round(u * 4));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // Estela: dos copias tenues detrás, como una foto movida.
      for (const [dx, alpha] of [[-150, 0.18], [-80, 0.35], [0, 1]] as const) {
        ctx.globalAlpha = alpha;
        ctx.drawImage(run.canvas, Math.round(px((rx + dx * vs)) - run.ox), Math.round(vy * k - run.oy));
      }
      ctx.globalAlpha = 1;
      toDesign();
      const t = tagInfo.get(a)!;
      tag(ctx, t.x, t.y, t.name, t.time, toneColor(a), t.size, 1 - a.z * 0.25, t.w);
      continue;
    }
    const lead = a.records[0]!;
    const abandoned = a.pose === 'portatil' && lead.lastCommit !== undefined && now - lead.lastCommit >= ABANDONED_MS;
    if (g && a.pose === 'portatil' && (['voltereta', 'lupa', 'lgtm', 'cabeza', 'sacude', 'rebusca', 'portal', 'viento'] as string[]).includes(g.kind)) {
      // Gestos que mueven al gato entero: se pinta el portátil solo y el gato
      // aparte (sin portátil), girado, desplazado o partido por el cuello.
      const light = { level, side };
      const desk = sprite(a, k, undefined, light, '', words, 'soloPortatil');
      const body = sprite(a, k, undefined, light, '', words, 'sinPortatil');
      const py = (y: number) => y * k;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const put = (sp: typeof body, x: number, y: number) => ctx.drawImage(sp.canvas, Math.round(px(x) - sp.ox), Math.round(py(y) - sp.oy));
      const u = g.t;
      const sc = vs;
      let hatAt: { x: number; y: number } | null = null;
      if (g.kind === 'voltereta') {
        // Salto mortal hacia atrás: sube, gira 360° y cae sentado.
        put(desk, vx, vy);
        const f = Math.max(0, Math.min(1, (u - 0.1) / 0.55));
        const cy = vy - 150 * sc - Math.sin(Math.PI * f) * 140 * sc;
        ctx.save();
        ctx.translate(px(vx), py(cy));
        ctx.rotate(-TAU_R * ease(f));
        ctx.drawImage(body.canvas, Math.round(-body.ox), Math.round(-body.oy + 150 * sc * k));
        ctx.restore();
        if (u >= 0.65) hatAt = { x: vx, y: vy - 258 * sc };
      } else if (g.kind === 'lupa') {
        put(desk, vx, vy);
        if (u > 0.42 && u < 0.86) {
          // Se gira hacia ti: el mismo gato, de frente, y te señala.
          const front = sprite({ ...a, pose: 'sentado' }, k, undefined, light, flavor, words);
          put(front, vx, vy);
          toDesign();
          pointAtYou(ctx, vx + 40 * sc, vy - 120 * sc, Math.max(sc, 0.55), Math.sin(Math.PI * (u - 0.42) / 0.44));
        } else {
          put(body, vx, vy);
          toDesign();
          const sweep = Math.sin(u * TAU_R * 1.2);
          magnifier(ctx, vx + sweep * 90 * sc, vy - 200 * sc, Math.max(sc, 0.55));
        }
      } else if (g.kind === 'lgtm') {
        put(desk, vx, vy);
        // Sale disparado hacia la lámpara, se queda colgado y vuelve.
        const lx = lampX(RW), ly = 64;
        const hang = { x: lx, y: ly + 250 * sc };
        const f = u < 0.32 ? 0 : u < 0.42 ? (u - 0.32) / 0.1 : u < 0.78 ? 1 : u < 0.9 ? 1 - (u - 0.78) / 0.12 : 0;
        const bx = vx + (hang.x - vx) * f, by = vy + (hang.y - vy) * f - Math.sin(Math.PI * f) * 40 * sc;
        put(body, bx, by);
        toDesign();
        if (u >= 0.42 && u < 0.78) lampGrip(ctx, lx, ly, sc);
        lgtmStamp(ctx, { x: vx, y: vy, s: Math.max(sc, 0.55) }, u);
      } else if (g.kind === 'cabeza') {
        // HEAD separado: la cabeza flota sobre el cuello; la recoloca y suspira.
        put(desk, vx, vy);
        const lift = (u < 0.45 ? ease(u / 0.45) : u < 0.7 ? 1 - ease((u - 0.45) / 0.25) : 0) * 70 * sc * k + (u < 0.45 ? Math.sin(u * 30) * 2 : 0);
        const neck = Math.round(body.oy - 128 * sc * k);
        const bx0 = Math.round(px(vx) - body.ox), by0 = Math.round(py(vy) - body.oy);
        const w = body.canvas.width, h = body.canvas.height;
        ctx.drawImage(body.canvas, 0, neck, w, h - neck, bx0, by0 + neck, w, h - neck);
        ctx.drawImage(body.canvas, 0, 0, w, neck, bx0, Math.round(by0 - lift), w, neck);
        toDesign();
        if (u < 0.45) outlined(ctx, words.detachedHead, vx, vy - 330 * sc, Math.round(18 * sc + 8), '#FFD08A');
        if (u >= 0.45 && u < 0.72) pointAtYouless(ctx, vx, vy - 290 * sc - lift / k, sc);
        if (u >= 0.7) outlined(ctx, words.relief, vx + 120 * sc, vy - 300 * sc, Math.round(22 * sc + 8), '#E6EDF5');
      } else if (g.kind === 'viento') {
        // La corriente saca los folios por la habitación y el gato corre tras ellos.
        put(desk, vx, vy);
        const right = L.zone.hi - 160 * sc;
        toDesign();
        windPapers(ctx, WINDOW.x + WINDOW.w, WINDOW.y + WINDOW.h * 0.5, right + 80, vy - 20, u);
        if (u > 0.25 && u < 0.85) {
          const f = (u - 0.25) / 0.6;
          const rx = vx + (right - vx) * Math.sin(Math.PI * f);
          const run = runnerSprite(a, k, vs, Math.round(f * 8) % 2, light);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          if (f > 0.5) {
            // A la vuelta, mirando hacia la izquierda.
            ctx.save();
            ctx.translate(Math.round(px(rx)), Math.round(py(vy)));
            ctx.scale(-1, 1);
            ctx.drawImage(run.canvas, -run.ox, -run.oy);
            ctx.restore();
          } else {
            put(run, rx, vy);
          }
        } else {
          put(body, vx, vy);
        }
      } else if (g.kind === 'rebusca') {
        // Mete la cabeza en la pantalla: se ve el cuerpo, echado hacia
        // delante, y los papeles que salen volando del portátil.
        put(desk, vx, vy);
        const lean = Math.sin(Math.PI * u) * 14 * sc * k;
        const neck = Math.round(body.oy - 128 * sc * k);
        const bx0 = Math.round(px(vx) - body.ox), by0 = Math.round(py(vy) - body.oy);
        const w = body.canvas.width, h = body.canvas.height;
        if (u > 0.15 && u < 0.85) ctx.drawImage(body.canvas, 0, neck, w, h - neck, bx0, Math.round(by0 + neck - lean), w, h - neck);
        else put(body, vx, vy);
        toDesign();
        const ps = Math.max(sc, 0.55);
        for (const [dx, dt] of [[-60, 0], [40, 0.15], [110, 0.3]] as const) papers(ctx, vx + dx * ps, vy - 150 * ps, ps, Math.max(0, Math.min(1, u * 1.2 - dt)));
        if (u > 0.2 && u < 0.8) outlined(ctx, words.whereWas, vx, vy - 320 * sc, Math.round(18 * sc + 8), '#FFFFFF');
      } else if (g.kind === 'portal') {
        // ssh: entra por un portal, trabaja en el escritorio del fondo y vuelve.
        put(desk, vx, vy);
        const gx = vx - 210 * sc, gy = vy - 150 * sc;
        const far = { x: L.zone.hi - 120, y: floorAt(0.97), s: 0.3 };
        const open = u < 0.3 ? Math.min(1, u / 0.12) : u > 0.75 ? Math.min(1, (1 - u) / 0.12) : u < 0.4 ? 1 - (u - 0.3) / 0.1 : u > 0.65 ? (u - 0.65) / 0.1 : 0;
        toDesign();
        portal(ctx, gx, gy, sc, open);
        remoteDesk(ctx, far.x, far.y, 0.9, sshHost(lead.detail ?? '') || words.server);
        portal(ctx, far.x - 90, far.y - 60, far.s, u > 0.3 && u < 0.75 ? Math.min(1, Math.min(u - 0.3, 0.75 - u) / 0.08) : 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const scaled = (x: number, y: number, r: number) => ctx.drawImage(body.canvas, Math.round(px(x) - body.ox * r), Math.round(py(y) - body.oy * r), Math.round(body.canvas.width * r), Math.round(body.canvas.height * r));
        if (u < 0.3) {
          const f = ease(Math.max(0, (u - 0.1) / 0.2));
          scaled(vx + (gx - vx) * f, vy, 1 - f * 0.9);
        } else if (u < 0.75) {
          scaled(far.x, far.y + 10, far.s / sc);
        } else {
          const f = ease(Math.min(1, (u - 0.75) / 0.2));
          scaled(gx + (vx - gx) * f, vy, 0.1 + f * 0.9);
        }
      } else {
        // Rama abandonada: se sacude y caen hojitas.
        put(desk, vx, vy);
        const dx = Math.sin(u * 40) * 8 * sc * (1 - u);
        put(body, vx + dx, vy);
        toDesign();
        cobweb(ctx, vx + dx, vy, sc);
        fallingLeaves(ctx, vx, vy, sc, u);
      }
      toDesign();
      if (hatAt) branchHat(ctx, hatAt.x, hatAt.y, sc, branchOf(lead.detail ?? ''));
      const t = tagInfo.get(a)!;
      tag(ctx, t.x, t.y, t.name, t.time, toneColor(a), t.size, 1 - a.z * 0.25, t.w);
      a.records.forEach((r, i) => spots.set(r.session_id, { x: vx + (heads(a)[i]?.dx ?? 0) * sc, y: vy, s: sc, a, i }));
      continue;
    }
    const buu = g?.kind === 'buu' && a.pose === 'caja' ? Math.sin(Math.PI * g.t) : 0;
    const variant = buu ? `buu:${(Math.round(buu * 4) / 4).toFixed(2)}:${(Math.round(Math.sin(2 * Math.PI * g!.t) * 4) / 4).toFixed(2)}` : '';
    // Luna llena: el del alféizar se incorpora, aúlla (sin sonido) y vuelve a dormir.
    const howl = g?.kind === 'aullido' && g.t > 0.15 && g.t < 0.85;
    const who = howl ? { ...a, pose: 'sentado' as const } : a;
    const howlPose = howl ? { yawn: Math.round(Math.min(1, Math.sin(Math.PI * (g!.t - 0.15) / 0.7) * 1.5) * 4) / 4 } : undefined;
    // En el corro, el portátil se queda en su sitio.
    const away = corroF > 0 && a.pose === 'portatil';
    if (away) {
      const desk = sprite(a, k, undefined, { level, side }, '', words, 'soloPortatil');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(desk.canvas, Math.round(px(a.x) - desk.ox), Math.round(a.floorY * k - desk.oy));
    }
    toDesign();
    if (g?.kind === 'gotas') windowDrops(ctx, WINDOW, { x: vx, y: vy, s: sc0(vs) }, g.t);
    // Sin nadie delante, los que te esperan dormitan con los ojos cerrados,
    // sin cambiar de pose: siguen diciendo que esperan.
    const dozing = input.away === true && (a.pose === 'sentado' || a.pose === 'cartel');
    const sp = sprite(who, k, howlPose ?? (dozing ? { lid: 1 } : g && redraws(g.kind) ? poseAt(g.kind, g.t) : undefined), { level, side }, howl ? '' : flavor, words, away ? 'sinPortatil' : variant);
    // Lo que va detrás del gato: el contenedor de la grúa y el manto del rey.
    toDesign();
    if (g?.kind === 'contenedor') crane(ctx, { x: vx, y: vy, s: Math.max(vs, 0.55) }, g.t);
    if (g?.kind === 'corona') royalty(ctx, vx, vy, vs);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Durante el paseo se reescala el gato de destino: pintar uno por tamaño
    // sería repintar el pelo en cada frame.
    const r = vs / a.scale;
    // Respirar o estirarse con el café: el gato crece un poco desde el suelo.
    const breath = g?.kind === 'respira' ? 0.035 * Math.sin(Math.PI * g.t) : g?.kind === 'cafe' ? 0.07 * Math.sin(Math.PI * g.t) : 0;
    const w = sp.canvas.width * r, h = sp.canvas.height * r * (1 + breath);
    if (tilt) {
      ctx.save();
      ctx.translate(px(vx), vy * k);
      ctx.rotate(tilt);
      ctx.drawImage(sp.canvas, -sp.ox * r, -sp.oy * r * (1 + breath), w, h);
      ctx.restore();
    } else if (r === 1 && !breath) {
      ctx.drawImage(sp.canvas, Math.round(px(vx) - sp.ox), Math.round(vy * k - sp.oy));
    } else {
      ctx.drawImage(sp.canvas, Math.round(px(vx) - sp.ox * r), Math.round(vy * k - sp.oy * r * (1 + breath)), Math.round(w), Math.round(h));
    }
    toDesign();
    const sc = vs;
    if (a.pose === 'cartel') {
      ctx.save();
      ctx.translate(vx, vy);
      ctx.scale(sc, sc);
      signBoard(ctx, a.records[0]!, now, words);
      ctx.restore();
    } else {
      const t = tagInfo.get(a)!;
      tag(ctx, t.x + (vx - a.x), t.y + (vy + hop - a.floorY), t.name, t.time, toneColor(a), t.size, 1 - a.z * 0.25, t.w);
    }
    if (inSpace) {
      // Casco de burbuja, girado con el gato.
      ctx.save();
      ctx.translate(vx, vy);
      ctx.rotate(tilt);
      ctx.scale(sc, sc);
      for (const h of heads(a)) spaceHelmet(ctx, h.dx, -200, 132);
      if (a.pose === 'dormido') spaceHelmet(ctx, -100, -48, 62, false);
      if (a.pose === 'caja') spaceHelmet(ctx, -80, -140, 56, false);
      ctx.restore();
    }
    a.records.forEach((r, i) => spots.set(r.session_id, { x: vx + (heads(a)[i]?.dx ?? 0) * sc, y: vy, s: sc, a, i }));
    if (a === walled) boxWall(ctx, vx, vy, sc);
    if (abandoned) cobweb(ctx, vx, vy, sc);
    const top = vy - (heightOf(a) / a.scale) * vs;
    if (a.pose === 'sentado') bubble(ctx, vx + 70 * sc, top - 40 * sc, words.goOn, Math.round(26 * sc + 6));
    if (a.pose === 'caja' && spooky) {
      if (buu > 0.3) outlined(ctx, words.boo, vx + 90 * sc, top - 40 * sc - buu * 40 * sc, Math.round(40 * sc + 6), '#E8F0FF');
    } else if (a.pose === 'caja') {
      // Las zetas suben y se desvanecen un poco durante el gesto.
      const up = g?.kind === 'zetas' ? Math.sin(Math.PI * g.t) * 26 * sc : 0;
      ctx.save();
      ctx.globalAlpha = 1 - (up / (26 * sc || 1)) * 0.35;
      outlined(ctx, 'Z', vx - 150 * sc, top - 20 * sc - up, Math.round(40 * sc), '#CFE0FF');
      outlined(ctx, 'z', vx - 112 * sc - up * 0.3, top + 12 * sc - up * 1.4, Math.round(30 * sc), '#CFE0FF');
      ctx.restore();
    }
    if (dozing) {
      for (const h of heads(a)) {
        outlined(ctx, 'z', vx + (h.dx + 70) * sc, vy + (h.top + 10) * sc, Math.round(22 * sc + 6), '#CFE0FF');
        outlined(ctx, 'z', vx + (h.dx + 95) * sc, vy + (h.top - 20) * sc, Math.round(16 * sc + 5), '#CFE0FF');
      }
    }
    if (a.pose === 'amasa') outlined(ctx, 'prrr', vx + 250 * sc, top - 10 * sc, Math.round(28 * sc + 4), '#FFFFFF');
    // Corbatas con reunión encima; gorritos el viernes por la tarde.
    for (const [i, h] of heads(a).entries()) {
      if (around.meetingSoon && h.chest !== undefined) tie(ctx, vx + h.dx * sc, vy + h.chest * sc, sc);
      if (spooky) devilHorns(ctx, vx + h.dx * sc, vy + h.top * sc, sc);
      else if (party) partyHat(ctx, vx + h.dx * sc, vy + h.top * sc, sc, HAT_COLORS[(i + a.records[0]!.session_id.length) % HAT_COLORS.length]!, i % 2 ? 0.15 : -0.15);
    }
    // El patito de goma que se quedó de mascota, junto al portátil.
    if (a.pose === 'portatil' && a.records[0]!.duck && g?.kind !== 'patito') deskDuck(ctx, vx + DUCK_AT.x * sc, vy + DUCK_AT.y * sc, sc * DUCK_AT.s);
    // Accesorios del gesto de la herramienta en curso, encima del gato.
    if (g) {
      // Los accesorios de al lado, con un tamaño mínimo: en un gato del fondo,
      // a su escala, una taza o una hucha no se distinguirían.
      const ps = Math.max(sc, 0.55);
      if (g.kind === 'cafe') coffee(ctx, vx, vy, ps, g.t);
      if (g.kind === 'hucha') piggy(ctx, vx, vy, ps, g.t, (input.usagePct ?? 0) * 100);
      if (g.kind === 'catapulta') catapult(ctx, vx, vy, ps, g.t);
      if (g.kind === 'enredo') tangle(ctx, vx, vy, sc, g.t);
      if (g.kind === 'teclea') typing(ctx, vx, vy, sc, g.t);
      if (g.kind === 'ovillo') yarn(ctx, vx, vy, sc, g.t);
      if (g.kind === 'peces') fish(ctx, vx, vy, sc, g.t);
      if (g.kind === 'gatitos') kittens(ctx, coat(a.coats[0]!), vx, vy, sc, g.t);
      if (g.kind === 'folios') papers(ctx, vx, vy, sc, g.t);
      if (g.kind === 'cartas') cards(ctx, { x: vx, y: vy, s: ps }, g.t, lead.lastFailed === true);
      if (g.kind === 'apisonadora') {
        hardHat(ctx, vx, vy - 258 * sc, sc);
        steamroller(ctx, { x: vx, y: vy, s: ps }, g.t);
      }
      if (g.kind === 'cereza') {
        const other = L.actors.filter((o) => o !== a && o.pose === 'portatil').sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x))[0];
        cherryPick(ctx, { x: vx, y: vy, s: ps }, other ? { x: other.x, y: other.floorY - 200 * other.scale } : { x: vx - 90 * sc, y: vy - 230 * sc }, g.t);
      }
      if (g.kind === 'reparto') delivery(ctx, { x: vx, y: vy, s: ps }, g.t, L.zone.hi);
      if (g.kind === 'chancla') slipper(ctx, { x: vx, y: vy, s: ps }, g.t, L.zone.hi);
      if (g.kind === 'corona') crown(ctx, vx, vy - 258 * sc, sc);
      if (g.kind === 'palomitas') popcorn(ctx, { x: vx, y: vy, s: ps }, g.t);
      if (g.kind === 'chocolate') {
        const h = heads(a)[0];
        if (h) woolHat(ctx, vx + h.dx * sc, vy + h.top * sc, sc);
        cocoa(ctx, { x: vx, y: vy, s: ps }, g.t);
      }
      if (g.kind === 'aullido' && howl) {
        // Ondas de un aullido que no suena: punteadas y tenues.
        ctx.save();
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = 'rgba(220,230,255,0.6)';
        ctx.lineWidth = 2;
        for (const r of [30, 50, 70]) {
          ctx.beginPath();
          ctx.arc(vx, vy - 200 * sc, r * Math.max(sc, 0.5) * 2, -Math.PI * 0.8, -Math.PI * 0.2);
          ctx.stroke();
        }
        ctx.restore();
        outlined(ctx, words.silent, vx + 90 * Math.max(sc, 0.5), vy - 320 * sc, 16, '#CFE0FF');
      }
      if (g.kind === 'libro') catBook(ctx, { x: vx, y: vy, s: ps }, g.t);
      if (g.kind === 'espagueti') spaghetti(ctx, { x: vx, y: vy, s: ps }, g.t);
      if (g.kind === 'patito') rubberDuck(ctx, { x: vx, y: vy, s: ps }, g.t);
      if (g.kind === 'postits') postIts(ctx, { x: vx, y: vy, s: ps }, g.t, lead.todos ?? 0);
      if (g.kind === 'lego') legoTower(ctx, { x: vx, y: vy, s: ps }, g.t, lead.lastFailed === true);
      if (g.kind === 'encaje') legoMerge(ctx, { x: vx, y: vy + jump, s: ps }, g.t, lead.lastFailed === true);
      if (g.kind === 'dron') deployDrone(ctx, { x: vx, y: vy, s: ps }, g.t, L.zone.hi);
      if (g.kind === 'enjambre') droneSwarm(ctx, { x: vx, y: vy, s: sc }, g.t, L.zone.hi);
      if (g.kind === 'piloto') pilotDrone(ctx, { x: vx, y: vy, s: ps }, g.t, L.zone.hi);
      if (g.kind === 'compacta') paperPress(ctx, { x: vx, y: vy, s: ps }, g.t);
      if (g.kind === 'tarta') birthdayCake(ctx, { x: vx, y: vy, s: ps }, g.t, repoBirthday(lead.repoBorn, now));
      if (g.kind === 'fuegos') droneShow(ctx, { x: vx, y: vy, s: sc }, g.t, releaseTag(lead.detail ?? ''), L.zone.hi);
      if (g.kind === 'malabares') juggling(ctx, { x: vx, y: vy, s: ps }, g.t, lead.lastFailed === true);
      if (g.kind === 'finde') {
        for (const h of heads(a)) strawHat(ctx, vx + h.dx * sc, vy + h.top * sc, sc);
        weekendBreak(ctx, { x: vx, y: vy, s: ps }, g.t, new Date(now).getDay() === 0 ? words.sunday : words.saturday);
      }
      if (g.kind === 'quimica') {
        chemistry(ctx, { x: vx, y: vy, s: ps }, g.t, lead.lastFailed === true && a.pose !== 'sentado');
        // Gafas de laboratorio, si mira de frente.
        if (a.pose === 'sentado' && g.t > 0.05 && g.t < 0.95) for (const h of heads(a)) labGoggles(ctx, vx + h.dx * sc, vy + (h.top + GOGGLES_Y) * sc, sc);
      }
      if (g.kind === 'mariposa') butterfly(ctx, { x: vx, y: vy, s: Math.max(sc, 0.5) }, g.t);
    }
    if (a.pose === 'bufido') {
      outlined(ctx, words.hiss, vx - 330 * sc, vy - 300 * sc, Math.round(34 * sc + 4), '#FFFFFF');
      outlined(ctx, words.hiss, vx + 200 * sc, vy - 300 * sc, Math.round(34 * sc + 4), '#FFFFFF');
    }
  }
  if (live?.kind === 'confeti') confetti(ctx, RW, DESIGN_H, live.t);
  if (live?.kind === 'trueno' && live.t < 0.4) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(235,240,255,${0.55 * (1 - live.t / 0.4)})`;
    ctx.fillRect(0, 0, width, height);
    toDesign();
    outlined(ctx, words.thunder, WINDOW.x + WINDOW.w / 2, WINDOW.y - 10, 40, '#FFFFFF');
  }
  // Gestos entre dos gatos: el id lleva las dos sesiones.
  const [pa, pb] = live ? live.id.split(/[+>]/).map((id) => spots.get(id)) : [];
  if (live && pa && pb) {
    if (live.kind === 'chocala') highFive(ctx, pa, pb, live.t);
    if (live.kind === 'distrae') mugPush(ctx, { ...pa, s: Math.max(pa.s, 0.45) }, { ...pb, s: Math.max(pb.s, 0.45) }, pa.a.sill ? floorAt(0.9) - pa.y : 0, live.t);
    if (live.kind === 'sabio') {
      const h = heads(pa.a)[pa.i];
      const top = pa.y + (h?.top ?? -258) * pa.s;
      if (h?.chest !== undefined) sageGlasses(ctx, pa.x, pa.y - 198 * pa.s, pa.s);
      wizardHat(ctx, pa.x, top, pa.s);
      const dir = pb.x >= pa.x ? 1 : -1;
      wand(ctx, { x: pa.x + dir * 110 * pa.s, y: pa.y - 150 * pa.s }, { x: pb.x, y: pb.y - 210 * pb.s }, pa.s, live.t);
    }
  }
  if (live?.kind === 'cajas') fallingBox(ctx, L.zone.lo + MARGIN + 330 + ((now / 60_000) % 7) / 7 * (L.zone.hi - L.zone.lo - 390 - MARGIN), floorAt(0.97), 0.8, live.t);
  if (duelFlash > 0) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(235,240,255,${duelFlash * 0.4})`;
    ctx.fillRect(0, 0, width, height);
    toDesign();
  }
  if (L.overflow.length) {
    tag(ctx, L.floor.right - 50, floorAt(0.7) + 4, `+${L.overflow.length}`, words.more, '#8A96A6', 16, 0.9, 110);
  }

  // Vignette: slightly darker corners keep the eye on the scene.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(vignette(width, height), 0, 0);
  return canvas;
}
