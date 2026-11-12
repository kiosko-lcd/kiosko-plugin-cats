/**
 * The gesture props, one per tool: jumping keys, a ball of yarn, fish,
 * kittens, sheets of paper. They are drawn live over the cat (they do not
 * change its fur, so it need not be repainted) and only while the gesture
 * lasts: at t = 0 and t = 1 there is nothing, and the frame is the static one.
 *
 * Coordinates: (x, y) is the cat's origin on the floor and `s` its scale.
 */
import { COND, COND_REGULAR, MONO, MONO_BOLD } from './fonts.ts';
import { createCanvas } from './canvas.ts';
import { propTexts } from './prop-texts.ts';
import { type Coat, type X, TAU, css, ellipse, linear, radial, rng } from './paint.ts';

/** A tie, for the cats with a meeting coming up. */
export function tie(c: X, x: number, y: number, s: number, color = '#C8303F'): void {
  // (x, y): just below the collar of a cat facing you.
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x - 7 * s, y);
  c.lineTo(x + 7 * s, y);
  c.lineTo(x + 4 * s, y + 10 * s);
  c.lineTo(x - 4 * s, y + 10 * s);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(x - 4 * s, y + 10 * s);
  c.lineTo(x + 4 * s, y + 10 * s);
  c.lineTo(x + 10 * s, y + 62 * s);
  c.lineTo(x, y + 74 * s);
  c.lineTo(x - 10 * s, y + 62 * s);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.3)';
  c.lineWidth = 2 * s;
  for (const k of [24, 42]) {
    c.beginPath();
    c.moveTo(x - 7 * s, y + k * s);
    c.lineTo(x + 7 * s, y + (k + 8) * s);
    c.stroke();
  }
}

/** The meeting door, with its sign: `title` on top (MEETING) and `label` (in 5m) below. */
export function meetingDoor(c: X, x: number, top: number, bottom: number, title: string, label: string): void {
  const w = 108;
  c.fillStyle = '#4A3420';
  c.fillRect(x - w / 2 - 8, top - 8, w + 16, bottom - top + 8);
  c.fillStyle = linear(c, x - w / 2, 0, x + w / 2, 0, [[0, '#8C6440'], [1, '#6E4A2B']]);
  c.fillRect(x - w / 2, top, w, bottom - top);
  c.strokeStyle = 'rgba(0,0,0,0.25)';
  c.lineWidth = 2;
  c.strokeRect(x - w / 2 + 12, top + 14, w - 24, (bottom - top) * 0.4);
  c.strokeRect(x - w / 2 + 12, top + 24 + (bottom - top) * 0.4, w - 24, (bottom - top) * 0.45);
  c.fillStyle = '#E8C45A';
  ellipse(c, x + w / 2 - 16, (top + bottom) / 2 + 10, 5, 5);
  c.fill();
  c.fillStyle = '#F6EEDC';
  c.fillRect(x - 46, top + 26, 92, 30);
  c.fillStyle = '#C62A22';
  c.font = `bold 13px ${COND}`;
  c.textAlign = 'center';
  c.fillText(title, x, top + 39);
  c.fillStyle = '#2A1A10';
  c.fillText(label, x, top + 53);
  c.textAlign = 'left';
}

/** Party hat (Friday afternoon). */
export function partyHat(c: X, x: number, y: number, s: number, color: string, tilt = -0.15): void {
  // (x, y): top of the head, between the ears.
  c.save();
  c.translate(x, y);
  c.rotate(tilt);
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(-22 * s, 0);
  c.lineTo(22 * s, 0);
  c.lineTo(0, -64 * s);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.85)';
  c.lineWidth = 4 * s;
  for (const k of [0.3, 0.6]) {
    c.beginPath();
    c.moveTo(-22 * s * (1 - k), -64 * s * k);
    c.lineTo(22 * s * (1 - k), -64 * s * k + 6 * s);
    c.stroke();
  }
  c.fillStyle = '#FFE14D';
  ellipse(c, 0, -66 * s, 8 * s, 8 * s);
  c.fill();
  c.restore();
}

/** Devil horns (Halloween, Tuesday the 13th). */
export function devilHorns(c: X, x: number, y: number, s: number): void {
  for (const k of [-1, 1]) {
    c.save();
    c.translate(x + k * 30 * s, y + 14 * s);
    c.scale(k * s, s);
    c.beginPath();
    c.moveTo(-12, 4);
    c.quadraticCurveTo(-8, -26, 18, -44);
    c.quadraticCurveTo(6, -20, 12, 4);
    c.closePath();
    c.fillStyle = linear(c, -12, 4, 18, -44, [[0, '#8E0F16'], [0.6, '#D7262E'], [1, '#FF6A5A']]);
    c.fill();
    c.strokeStyle = 'rgba(60,0,0,0.6)';
    c.lineWidth = 1.5;
    c.stroke();
    c.restore();
  }
}

/** Cobwebs on a cat whose branch has had no commits for a month. */
export function cobweb(c: X, x: number, y: number, s: number): void {
  c.save();
  c.strokeStyle = 'rgba(235,240,250,0.6)';
  c.lineWidth = 1.3;
  for (const [cx, cy, k] of [[-90, -250, 1], [100, -140, -1]] as const) {
    const ox = x + cx * s, oy = y + cy * s;
    for (let i = 0; i < 6; i++) {
      const a = (k > 0 ? 0 : Math.PI / 2) + (i / 5) * (Math.PI / 2);
      c.beginPath();
      c.moveTo(ox, oy);
      c.lineTo(ox + Math.cos(a) * 70 * s * k, oy + Math.sin(a) * 70 * s);
      c.stroke();
    }
    for (const r of [22, 42, 62]) {
      c.beginPath();
      for (let i = 0; i <= 5; i++) {
        const a = (k > 0 ? 0 : Math.PI / 2) + (i / 5) * (Math.PI / 2);
        const px = ox + Math.cos(a) * r * s * k, py = oy + Math.sin(a) * r * s;
        if (i) c.quadraticCurveTo(ox + Math.cos(a - 0.15) * r * 0.85 * s * k, oy + Math.sin(a - 0.15) * r * 0.85 * s, px, py);
        else c.moveTo(px, py);
      }
      c.stroke();
    }
  }
  c.restore();
}

/** The rubber duck that stays on the desk once the session talked to it. */
export function deskDuck(c: X, x: number, y: number, s: number): void {
  duck(c, x, y, s);
}

function duck(c: X, x: number, y: number, s: number): void {
  c.save();
  c.fillStyle = '#FFD53D';
  ellipse(c, x, y - 22 * s, 34 * s, 22 * s);
  c.fill();
  ellipse(c, x - 18 * s, y - 52 * s, 18 * s, 17 * s);
  c.fill();
  c.fillStyle = '#FF8A2A';
  ellipse(c, x - 36 * s, y - 48 * s, 11 * s, 5 * s);
  c.fill();
  c.fillStyle = '#1A1A22';
  ellipse(c, x - 22 * s, y - 56 * s, 3 * s + 0.5, 3 * s + 0.5);
  c.fill();
  c.fillStyle = '#F0B820';
  ellipse(c, x + 8 * s, y - 26 * s, 16 * s, 9 * s, -0.4);
  c.fill();
  c.restore();
}

/** Fades in, holds and fades out: 0 at both ends, 1 in the middle. */
const envelope = (t: number) => Math.min(1, Math.sin(Math.PI * t) * 1.6);

export function typing(c: X, x: number, y: number, s: number, t: number): void {
  const r = rng(7);
  const keys = 'asdfjklñ{}();=';
  c.save();
  c.font = `bold ${Math.round(20 * s + 6)}px ${COND}`;
  for (let i = 0; i < 7; i++) {
    const start = r() * 0.5, life = 0.4 + r() * 0.1;
    const u = (t - start) / life;
    if (u <= 0 || u >= 1) continue;
    // They jump above the head, against the wall: in front of the back they would not show.
    const kx = x + (r() - 0.5) * 240 * s, ky = y - 300 * s - u * 90 * s;
    const sz = 30 * s;
    c.globalAlpha = Math.sin(Math.PI * u);
    c.fillStyle = '#E8EDF2';
    c.beginPath();
    c.roundRect(kx - sz / 2, ky - sz / 2, sz, sz, 4 * s);
    c.fill();
    c.fillStyle = '#2A3240';
    c.fillText(keys[Math.floor(r() * keys.length)]!, kx - sz * 0.25, ky + sz * 0.3);
  }
  c.restore();
}

export function yarn(c: X, x: number, y: number, s: number, t: number): void {
  // Rolls along the floor in front of the cat and leaves the thread behind.
  const R = 27 * s;
  const bx = x + (150 - 320 * t) * s, by = y + 8 * s - R;
  c.save();
  c.globalAlpha = envelope(t);
  c.strokeStyle = '#D9435C';
  c.lineWidth = 2.5 * s;
  c.beginPath();
  c.moveTo(x + 150 * s, y);
  c.bezierCurveTo(x + 100 * s, y + 14 * s, bx + 60 * s, by + R, bx, by + R * 0.6);
  c.stroke();
  c.fillStyle = '#E8566E';
  ellipse(c, bx, by, R, R);
  c.fill();
  c.strokeStyle = '#A82B42';
  c.lineWidth = 2 * s;
  const rot = -t * 9;
  for (let k = 0; k < 4; k++) {
    c.beginPath();
    c.ellipse(bx, by, R * 0.95, R * 0.35, rot + (k * Math.PI) / 4, 0, TAU);
    c.stroke();
  }
  c.restore();
}

export function fish(c: X, x: number, y: number, s: number, t: number): void {
  // They swim over the laptop screen: the web, as seen by a cat.
  c.save();
  c.globalAlpha = envelope(t);
  for (const [k, col] of [[0, '#FF9A3D'], [1, '#4DA3FF'], [2, '#FFD34D']] as const) {
    const u = (t * 1.3 + k * 0.28) % 1;
    const fx = x + (-160 + 320 * u) * s, fy = y - (285 + k * 22) * s + Math.sin(u * TAU * 2) * 6 * s;
    const L = 22 * s;
    c.fillStyle = col;
    ellipse(c, fx, fy, L, L * 0.5);
    c.fill();
    c.beginPath();
    c.moveTo(fx - L * 0.8, fy);
    c.lineTo(fx - L * 1.5, fy - L * 0.5);
    c.lineTo(fx - L * 1.5, fy + L * 0.5);
    c.closePath();
    c.fill();
    c.fillStyle = '#10141C';
    ellipse(c, fx + L * 0.5, fy - L * 0.1, 2.2 * s, 2.2 * s);
    c.fill();
  }
  c.restore();
}

/** Schematic kitten: at this size no fur is needed. */
function kitten(c: X, coat: Coat, x: number, y: number, s: number): void {
  c.fillStyle = css(coat.fur.mid);
  ellipse(c, x, y - 14 * s, 13 * s, 12 * s);
  c.fill();
  ellipse(c, x, y - 34 * s, 12 * s, 11 * s);
  c.fill();
  for (const sg of [-1, 1]) {
    c.beginPath();
    c.moveTo(x + sg * 11 * s, y - 38 * s);
    c.lineTo(x + sg * 9 * s, y - 52 * s);
    c.lineTo(x + sg * 2 * s, y - 43 * s);
    c.fill();
  }
  c.strokeStyle = css(coat.fur.dark);
  c.lineWidth = 4 * s;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x + 10 * s, y - 8 * s);
  c.quadraticCurveTo(x + 26 * s, y - 16 * s, x + 22 * s, y - 32 * s);
  c.stroke();
  c.fillStyle = '#15171E';
  for (const sg of [-1, 1]) {
    ellipse(c, x + sg * 4.5 * s, y - 35 * s, 2.2 * s, 2.8 * s);
    c.fill();
  }
}

export function kittens(c: X, coat: Coat, x: number, y: number, s: number, t: number): void {
  // One subagent per kitten: they peek out next to the cat and run away.
  c.save();
  for (let k = 0; k < 3; k++) {
    const u = Math.max(0, Math.min(1, (t - k * 0.12) / 0.7));
    if (u <= 0 || u >= 1) continue;
    const side = k % 2 ? 1 : -1;
    const kx = x + side * (110 + u * 180 + k * 20) * s, ky = y + 6 * s;
    c.globalAlpha = Math.sin(Math.PI * u);
    kitten(c, coat, kx, ky - Math.abs(Math.sin(u * TAU * 2)) * 10 * s, s * 1.4);
  }
  c.restore();
}

export function papers(c: X, x: number, y: number, s: number, t: number): void {
  const r = rng(11);
  c.save();
  for (let i = 0; i < 4; i++) {
    const start = r() * 0.4, u = (t - start) / 0.6;
    if (u <= 0 || u >= 1) continue;
    const px = x + (r() - 0.5) * 160 * s + u * 60 * s, py = y - 120 * s - u * 150 * s;
    c.globalAlpha = Math.sin(Math.PI * u);
    c.save();
    c.translate(px, py);
    c.rotate((r() - 0.5) * 1.5 + u * 2);
    c.fillStyle = '#F4F0E6';
    c.fillRect(-16 * s, -20 * s, 32 * s, 40 * s);
    c.fillStyle = '#9AA3AE';
    for (let k = 0; k < 4; k++) c.fillRect(-11 * s, (-13 + k * 8) * s, (18 - (k % 2) * 6) * s, 2.5 * s);
    c.restore();
  }
  c.restore();
}

// ---------- The TV and the console ----------
/**
 * Standing TV with the screen on (or off), behind the cat, and the console
 * on the floor with the cable to the gamepad. `screen` is what is shown:
 * any canvas, scaled to the opening. Coordinates: (x, y) is the floor under
 * the cat; the TV sits a little further back, peeking over it.
 */
export function tv(c: X, x: number, y: number, s: number, screen: { canvas: CanvasImageLike; on: boolean } | null, pad: boolean): void {
  const w = 340 * s, h = 180 * s;
  const sx = x - w / 2, sy = y - 420 * s;
  // Stand and base
  c.fillStyle = '#20242E';
  c.fillRect(x - 10 * s, sy + h, 20 * s, 150 * s);
  c.fillStyle = '#2A2F3B';
  c.beginPath();
  c.roundRect(x - 70 * s, y - 50 * s, 140 * s, 14 * s, 6 * s);
  c.fill();
  // Frame
  c.fillStyle = '#12151C';
  c.beginPath();
  c.roundRect(sx - 10 * s, sy - 10 * s, w + 20 * s, h + 20 * s, 10 * s);
  c.fill();
  if (screen?.on) {
    c.drawImage(screen.canvas as never, sx, sy, w, h);
    // The screen lights what is in front of it
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = radial(c, x, sy + h / 2, 10, w * 0.9, [[0, 'rgba(120,170,255,0.18)'], [1, 'rgba(120,170,255,0)']]);
    ellipse(c, x, sy + h / 2 + 60 * s, w * 0.9, h * 1.2);
    c.fill();
    c.restore();
  } else {
    c.fillStyle = linear(c, sx, sy, sx + w, sy + h, [[0, '#1C2230'], [1, '#0A0D14']]);
    c.fillRect(sx, sy, w, h);
  }
  c.fillStyle = 'rgba(255,255,255,0.06)';
  c.beginPath();
  c.moveTo(sx, sy);
  c.lineTo(sx + w * 0.3, sy);
  c.lineTo(sx, sy + h * 0.5);
  c.fill();
  c.fillStyle = screen?.on ? '#39D98A' : '#E0474C';
  ellipse(c, sx + w - 6 * s, sy + h + 5 * s, 2.5 * s, 2.5 * s);
  c.fill();
  // The console on the floor, with its light
  const cx = x + 170 * s, cy = y - 4 * s;
  c.fillStyle = linear(c, cx, cy - 26 * s, cx, cy, [[0, '#EDEFF3'], [1, '#B9BEC8']]);
  c.beginPath();
  c.roundRect(cx - 40 * s, cy - 26 * s, 80 * s, 26 * s, 6 * s);
  c.fill();
  c.fillStyle = '#4DA3FF';
  c.fillRect(cx - 30 * s, cy - 14 * s, 18 * s, 3 * s);
  if (pad) {
    // Cable to the gamepad, which the cat holds at one side of the body
    const px = x + 78 * s, py = y - 120 * s;
    c.strokeStyle = '#1C1F27';
    c.lineWidth = 3 * s;
    c.beginPath();
    c.moveTo(cx - 36 * s, cy - 8 * s);
    c.bezierCurveTo(cx - 70 * s, cy + 6 * s, px + 30 * s, py + 90 * s, px + 6 * s, py + 10 * s);
    c.stroke();
    c.fillStyle = '#2B2F38';
    c.beginPath();
    c.roundRect(px - 18 * s, py - 10 * s, 38 * s, 22 * s, 10 * s);
    c.fill();
    c.fillStyle = '#E0474C';
    ellipse(c, px + 10 * s, py - 1 * s, 3 * s, 3 * s);
    c.fill();
    c.fillStyle = '#FFD34D';
    ellipse(c, px + 16 * s, py + 4 * s, 3 * s, 3 * s);
    c.fill();
  }
}
type CanvasImageLike = { width: number; height: number };

// ---------- Coffee, piggy bank, catapult, tangle ----------
const env = (t: number) => Math.min(1, Math.sin(Math.PI * t) * 2.2);

export function coffee(c: X, x: number, y: number, s: number, t: number): void {
  // Steaming cup on the floor, beside the cat; the stretch is done by the render.
  const a = env(t);
  const mx = x + 130 * s, my = y - 4 * s;
  c.save();
  c.globalAlpha = a;
  c.fillStyle = 'rgba(0,0,0,0.35)';
  ellipse(c, mx, my + 2 * s, 30 * s, 6 * s);
  c.fill();
  c.fillStyle = linear(c, mx - 22 * s, 0, mx + 22 * s, 0, [[0, '#FFFFFF'], [1, '#C9C4BA']]);
  c.beginPath();
  c.moveTo(mx - 22 * s, my - 48 * s);
  c.lineTo(mx + 22 * s, my - 48 * s);
  c.lineTo(mx + 19 * s, my);
  c.lineTo(mx - 19 * s, my);
  c.closePath();
  c.fill();
  c.strokeStyle = '#D6D0C4';
  c.lineWidth = 6 * s;
  c.beginPath();
  c.arc(mx + 24 * s, my - 26 * s, 11 * s, -1.3, 1.3);
  c.stroke();
  c.fillStyle = '#5A3418';
  ellipse(c, mx, my - 48 * s, 21 * s, 5 * s);
  c.fill();
  c.strokeStyle = 'rgba(235,240,245,0.7)';
  c.lineWidth = 3 * s;
  c.lineCap = 'round';
  for (const k of [0, 1, 2]) {
    const ph = t * 6 + k * 2;
    c.beginPath();
    c.moveTo(mx - 10 * s + k * 10 * s, my - 58 * s);
    c.bezierCurveTo(mx - 20 * s + k * 10 * s + Math.sin(ph) * 8 * s, my - 78 * s, mx + k * 10 * s - Math.sin(ph) * 8 * s, my - 96 * s, mx - 8 * s + k * 10 * s, my - 116 * s);
    c.stroke();
  }
  c.restore();
}

export function piggy(c: X, x: number, y: number, s: number, t: number, pct: number): void {
  const a = env(t);
  const px = x + 140 * s, py = y - 40 * s;
  c.save();
  c.globalAlpha = a;
  c.translate(px, py);
  c.rotate(Math.sin(t * 38) * 0.35 * a);
  c.fillStyle = radial(c, -8 * s, -10 * s, 2, 50 * s, [[0, '#FFC4D2'], [1, '#E07A96']]);
  ellipse(c, 0, 0, 44 * s, 32 * s);
  c.fill();
  c.fillStyle = '#E88AA2';
  ellipse(c, 40 * s, 2 * s, 12 * s, 10 * s);
  c.fill();
  c.fillStyle = '#B8506C';
  for (const d of [-3, 3]) {
    ellipse(c, 44 * s, (2 + d) * s, 2 * s, 2.5 * s);
    c.fill();
  }
  for (const lx of [-24, -8, 12, 26]) c.fillRect(lx * s, 26 * s, 8 * s, 12 * s);
  c.fillStyle = '#7A2A40';
  c.fillRect(-10 * s, -32 * s, 20 * s, 4 * s);
  ellipse(c, 22 * s, -12 * s, 3 * s, 3 * s);
  c.fill();
  c.restore();
  // The last coin falls and bounces
  if (t > 0.35 && t < 0.9) {
    const u = (t - 0.35) / 0.55;
    const cy = py + 40 * s + Math.min(1, u * 2) * 20 * s - Math.abs(Math.sin(u * Math.PI * 3)) * 18 * s * (1 - u);
    c.fillStyle = radial(c, px - 30 * s, cy, 1, 10 * s, [[0, '#FFF3A0'], [1, '#C79A1E']]);
    ellipse(c, px - 30 * s - u * 30 * s, cy, 9 * s, 9 * s);
    c.fill();
  }
  c.save();
  c.globalAlpha = a;
  c.font = `bold ${Math.round(22 * s + 6)}px ${COND}`;
  c.lineWidth = 4;
  c.strokeStyle = 'rgba(10,12,18,0.85)';
  const label = `${Math.round(pct)} %`;
  c.strokeText(label, px - 26 * s, py - 50 * s);
  c.fillStyle = '#FFB0C0';
  c.fillText(label, px - 26 * s, py - 50 * s);
  c.restore();
}

export function catapult(c: X, x: number, y: number, s: number, t: number): void {
  const a = env(t);
  const bx = x + 150 * s, by = y - 6 * s;
  c.save();
  c.globalAlpha = a;
  c.fillStyle = '#6E4A2B';
  c.fillRect(bx - 50 * s, by - 16 * s, 100 * s, 16 * s);
  for (const wx of [-36, 36]) {
    c.fillStyle = '#3A2A1A';
    ellipse(c, bx + wx * s, by, 12 * s, 12 * s);
    c.fill();
  }
  c.fillStyle = '#8A5E36';
  c.fillRect(bx - 6 * s, by - 60 * s, 12 * s, 46 * s);
  // The arm: back and loaded, until it fires (t ~ 0.3)
  const fire = Math.min(1, Math.max(0, (t - 0.25) / 0.1));
  const ang = -2.4 + fire * 1.9;
  const tip: [number, number] = [bx + Math.cos(ang) * 80 * s, by - 56 * s + Math.sin(ang) * 80 * s];
  c.strokeStyle = '#A0703F';
  c.lineWidth = 8 * s;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(bx, by - 56 * s);
  c.lineTo(tip[0], tip[1]);
  c.stroke();
  c.restore();
  // The package: in the cup until the shot; then it flies up and away
  const box = (px: number, py: number, rotation: number) => {
    c.save();
    c.translate(px, py);
    c.rotate(rotation);
    c.fillStyle = '#C99A5B';
    c.fillRect(-16 * s, -12 * s, 32 * s, 24 * s);
    c.fillStyle = 'rgba(210,190,140,0.95)';
    c.fillRect(-3 * s, -12 * s, 6 * s, 24 * s);
    c.restore();
  };
  if (t < 0.3) box(tip[0], tip[1] - 10 * s, 0);
  else {
    const u = (t - 0.3) / 0.7;
    const px = tip[0] + u * 700 * s, py = tip[1] - u * 520 * s + u * u * 320 * s;
    box(px, py, u * 9);
    c.strokeStyle = `rgba(255,255,255,${0.5 * (1 - u)})`;
    c.lineWidth = 2;
    for (const k of [0, 1, 2]) {
      c.beginPath();
      c.moveTo(px - (30 + k * 12) * s, py + (6 + k * 8) * s);
      c.lineTo(px - (60 + k * 16) * s, py + (18 + k * 12) * s);
      c.stroke();
    }
  }
  c.save();
  c.globalAlpha = a;
  c.font = `bold ${Math.round(18 * s + 6)}px ${MONO_BOLD}`;
  c.lineWidth = 4;
  c.strokeStyle = 'rgba(10,12,18,0.85)';
  c.strokeText('git push', bx - 40 * s, by - 90 * s);
  c.fillStyle = '#B6F5B0';
  c.fillText('git push', bx - 40 * s, by - 90 * s);
  c.restore();
}

export function tangle(c: X, x: number, y: number, s: number, t: number): void {
  // Red strands that wrap the cat, more and more, and the ball of yarn at its feet.
  const a = env(t);
  const r = rng(23);
  c.save();
  c.globalAlpha = a;
  c.strokeStyle = '#E8566E';
  c.lineWidth = 3 * s;
  const n = Math.round(4 + t * 10);
  for (let i = 0; i < n; i++) {
    const cy = y - (60 + r() * 220) * s, rx = (70 + r() * 40) * s, ry = (12 + r() * 20) * s;
    c.beginPath();
    c.ellipse(x + (r() - 0.5) * 20 * s, cy, rx, ry, (r() - 0.5) * 0.8, 0, Math.PI * 2);
    c.stroke();
  }
  c.fillStyle = '#E8566E';
  ellipse(c, x + 90 * s, y - 20 * s, 22 * s, 22 * s);
  c.fill();
  c.font = `bold ${Math.round(20 * s + 6)}px ${MONO_BOLD}`;
  c.lineWidth = 4;
  c.strokeStyle = 'rgba(10,12,18,0.85)';
  c.strokeText('✖ tests', x - 50 * s, y - 330 * s);
  c.fillStyle = '#FFB0B0';
  c.fillText('✖ tests', x - 50 * s, y - 330 * s);
  c.restore();
}

// ---------- Meeting and party ----------
export function confetti(c: X, W: number, H: number, t: number): void {
  const r = rng(99);
  const cols = ['#FF5C8A', '#FFD34D', '#39D98A', '#4DA3FF', '#C58BFF', '#FF9A3D'];
  c.save();
  c.globalAlpha = Math.min(1, Math.sin(Math.PI * t) * 3);
  for (let i = 0; i < 140; i++) {
    const x0 = r() * W, speed = 0.6 + r() * 0.8, sway = r() * 30;
    const y = -20 + (t * speed * (H + 60) + r() * 60) % (H + 40);
    const x = x0 + Math.sin(t * 12 + i) * sway;
    c.save();
    c.translate(x, y);
    c.rotate(t * 10 * speed + i);
    c.fillStyle = cols[i % cols.length]!;
    c.fillRect(-5, -2.5, 10, 5);
    c.restore();
  }
  c.restore();
}

/** Speed lines and dust behind the runner. (x, y): its origin; `dir` 1 is right. */
export function speedLines(c: X, x: number, y: number, s: number, dir: 1 | -1, seed: number): void {
  const r = rng(seed);
  c.save();
  c.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const yy = y - (40 + r() * 190) * s, len = (120 + r() * 220) * s, x0 = x - dir * (150 + r() * 60) * s;
    c.strokeStyle = `rgba(230,236,250,${0.25 + r() * 0.35})`;
    c.lineWidth = (2 + r() * 3) * s;
    c.beginPath();
    c.moveTo(x0, yy);
    c.lineTo(x0 - dir * len, yy);
    c.stroke();
  }
  for (let i = 0; i < 6; i++) {
    c.fillStyle = `rgba(190,170,150,${0.25 + r() * 0.25})`;
    ellipse(c, x - dir * (120 + r() * 200) * s, y - r() * 20 * s, (14 + r() * 22) * s, (8 + r() * 10) * s);
    c.fill();
  }
  c.restore();
}

/** A spot of the scene: the origin of a cat on the floor and its scale. */
export interface Spot { x: number; y: number; s: number }

/** Little paw with pads, seen from the front. `ang` tilts the paw. */
export function pawPad(c: X, x: number, y: number, s: number, ang = 0, color = '#F3E3CF'): void {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.fillStyle = color;
  ellipse(c, 0, 0, 20 * s, 24 * s);
  c.fill();
  c.fillStyle = '#E9A0AE';
  ellipse(c, 0, 6 * s, 9 * s, 7 * s);
  c.fill();
  for (const k of [-1, 0, 1]) {
    ellipse(c, k * 9 * s, -10 * s - (k ? 0 : 3 * s), 4.5 * s, 5.5 * s);
    c.fill();
  }
  c.restore();
}

/**
 * High five: each cat raises a paw towards the other, "high five!" in the
 * middle with a flash, and then the keys jump twice as fast.
 */
export function highFive(c: X, a: Spot, b: Spot, t: number): void {
  const up = Math.sin(Math.PI * Math.min(1, t / 0.7));
  const dir = b.x > a.x ? 1 : -1;
  const pa = { x: a.x + dir * 120 * a.s, y: a.y - (200 + up * 120) * a.s };
  const pb = { x: b.x - dir * 120 * b.s, y: b.y - (200 + up * 120) * b.s };
  if (up > 0.05) {
    pawPad(c, pa.x, pa.y, a.s * 1.3, dir * 0.4);
    pawPad(c, pb.x, pb.y, b.s * 1.3, -dir * 0.4);
    // A dotted arc joins the two paws: visible from afar, but they look at each other.
    c.save();
    c.setLineDash([6, 8]);
    c.strokeStyle = `rgba(255,236,160,${0.7 * up})`;
    c.lineWidth = 3;
    const mx = (pa.x + pb.x) / 2, my = Math.min(pa.y, pb.y) - 80;
    c.beginPath();
    c.moveTo(pa.x, pa.y);
    c.quadraticCurveTo(mx, my, pb.x, pb.y);
    c.stroke();
    c.restore();
    if (t > 0.3 && t < 0.75) {
      const k = Math.sin(Math.PI * (t - 0.3) / 0.45);
      starBurst(c, mx, my + 30, 34 * k + 10, '#FFE14D');
      outlined(c, propTexts().bump, mx, my - 10, Math.round(26 + 8 * k), '#FFFFFF');
    }
  }
  if (t > 0.6) {
    const u = Math.min(1, (t - 0.6) / 0.4);
    typing(c, a.x, a.y, a.s, u);
    typing(c, b.x, b.y, b.s, u);
    typing(c, a.x, a.y, a.s, Math.max(0, u - 0.15));
    typing(c, b.x, b.y, b.s, Math.max(0, u - 0.15));
  }
}

export function starBurst(c: X, x: number, y: number, r: number, color: string): void {
  c.save();
  c.fillStyle = color;
  c.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU, rr = i % 2 ? r * 0.45 : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
  c.restore();
}

/** Text with a dark outline, readable over any background. */
export function outlined(c: X, t: string, x: number, y: number, px: number, color: string): void {
  c.save();
  c.font = `bold ${px}px ${COND}`;
  c.textAlign = 'center';
  c.lineWidth = Math.max(3, px / 6);
  c.strokeStyle = 'rgba(10,12,18,0.9)';
  c.strokeText(t, x, y);
  c.fillStyle = color;
  c.fillText(t, x, y);
  c.restore();
}

/** Wizard hat with stars. (x, y): top of the head. */
export function wizardHat(c: X, x: number, y: number, s: number): void {
  c.save();
  c.translate(x, y + 10 * s);
  c.fillStyle = '#2C3E8F';
  ellipse(c, 0, 0, 70 * s, 14 * s);
  c.fill();
  c.beginPath();
  c.moveTo(-42 * s, -2 * s);
  c.quadraticCurveTo(-10 * s, -60 * s, 10 * s, -120 * s);
  c.quadraticCurveTo(30 * s, -110 * s, 44 * s, -96 * s);
  c.quadraticCurveTo(22 * s, -60 * s, 42 * s, -2 * s);
  c.closePath();
  c.fill();
  c.fillStyle = '#FFD34D';
  for (const [sx, sy, r] of [[-12, -30, 7], [14, -60, 5], [22, -18, 4]] as const) starBurst(c, sx * s, sy * s, r * s * 1.6, '#FFD34D');
  c.restore();
}

/** Round sage glasses, on cats facing you. (x, y): between the eyes. */
export function sageGlasses(c: X, x: number, y: number, s: number): void {
  c.save();
  c.strokeStyle = '#3A2A1A';
  c.lineWidth = 5 * s;
  for (const k of [-1, 1]) {
    ellipse(c, x + k * 38 * s, y, 32 * s, 32 * s);
    c.stroke();
  }
  c.beginPath();
  c.moveTo(x - 6 * s, y - 4 * s);
  c.lineTo(x + 6 * s, y - 4 * s);
  c.stroke();
  c.restore();
}

/**
 * The sage's wand: it comes out of his paw and points at the apprentice's laptop,
 * with sparks travelling through the air. `from` and `to` in scene coordinates.
 */
export function wand(c: X, from: { x: number; y: number }, to: { x: number; y: number }, s: number, t: number): void {
  const e = envelope(t);
  if (e <= 0) return;
  const ang = Math.atan2(to.y - from.y, to.x - from.x) + Math.sin(t * TAU * 3) * 0.08;
  const len = 130 * s * e;
  const tip = { x: from.x + Math.cos(ang) * len, y: from.y + Math.sin(ang) * len };
  pawPad(c, from.x, from.y, s * 1.1, ang + Math.PI / 2);
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = '#7A4E24';
  c.lineWidth = 7 * s;
  c.beginPath();
  c.moveTo(from.x, from.y);
  c.lineTo(tip.x, tip.y);
  c.stroke();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = radial(c, tip.x, tip.y, 1, 22 * s + 6, [[0, 'rgba(255,240,170,0.95)'], [1, 'rgba(255,200,80,0)']]);
  ellipse(c, tip.x, tip.y, 22 * s + 6, 22 * s + 6);
  c.fill();
  const r = rng(31);
  for (let i = 0; i < 10; i++) {
    const u = (t * 2 + i / 10) % 1;
    const px = tip.x + (to.x - tip.x) * u + (r() - 0.5) * 30, py = tip.y + (to.y - tip.y) * u - Math.sin(Math.PI * u) * 40 + (r() - 0.5) * 20;
    c.fillStyle = `rgba(255,230,140,${0.8 * (1 - u) * e})`;
    ellipse(c, px, py, 3 + r() * 3, 3 + r() * 3);
    c.fill();
  }
  c.restore();
  if (t > 0.35 && t < 0.9) outlined(c, propTexts().notLikeThat, to.x, to.y - 30, Math.round(16 + 14 * s), '#FFF3C4');
}

/** A small mug, with the handle on the right. */
function mug(c: X, x: number, y: number, s: number, ang = 0): void {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.fillStyle = '#E8ECF2';
  c.beginPath();
  c.roundRect(-16 * s, -34 * s, 32 * s, 34 * s, 5 * s);
  c.fill();
  c.strokeStyle = '#E8ECF2';
  c.lineWidth = 5 * s;
  c.beginPath();
  c.arc(18 * s, -18 * s, 9 * s, -Math.PI / 2, Math.PI / 2);
  c.stroke();
  c.fillStyle = '#C0392B';
  c.fillRect(-16 * s, -24 * s, 32 * s, 7 * s);
  c.fillStyle = '#5A3A22';
  ellipse(c, 0, -33 * s, 14 * s, 3 * s);
  c.fill();
  c.restore();
}

/**
 * The sleeping cat puts out a paw and pushes the mug towards the edge, with little
 * taps; it falls with a "clonk!" and the one working turns around, unamused.
 * `sleeper` is the sleeping one, `worker` the working one; `drop` is how far the mug falls.
 */
export function mugPush(c: X, sleeper: Spot, worker: Spot, drop: number, t: number): void {
  const e = envelope(t);
  const dir = worker.x > sleeper.x ? 1 : -1;
  const edge = sleeper.x + dir * 190 * sleeper.s;
  // Three little taps: with each one the mug moves a bit closer to the edge.
  const pokes = Math.min(3, t / 0.2);
  const step = Math.floor(pokes);
  const inPoke = pokes - step;
  const falling = t > 0.62 ? Math.min(1, (t - 0.62) / 0.14) : 0;
  const mx = sleeper.x + dir * (110 + step * 26 + (falling ? 30 : 0)) * sleeper.s + dir * falling * 40 * sleeper.s;
  const my = sleeper.y - 4 * sleeper.s + falling * falling * drop;
  if (t < 0.97) mug(c, mx, my, sleeper.s * 1.2, dir * falling * 1.9);
  if (t < 0.62 && e > 0) {
    const reach = Math.sin(Math.PI * inPoke);
    pawPad(c, sleeper.x + dir * (80 + reach * 24) * sleeper.s, sleeper.y - 30 * sleeper.s, sleeper.s * 1.1, dir * Math.PI / 2);
  }
  if (falling >= 1 && t < 0.85) outlined(c, propTexts().clonk, edge + dir * 50 * sleeper.s, sleeper.y + drop - 20, Math.round(20 + 16 * sleeper.s), '#FFFFFF');
  if (t > 0.72) {
    // The killer look of the one working: peeks sideways and the anger vein pops.
    const u = Math.min(1, (t - 0.72) / 0.1);
    const hx = worker.x - dir * 40 * worker.s, hy = worker.y - 280 * worker.s;
    angerMark(c, hx, hy, (22 + 10 * u) * worker.s + 4);
    outlined(c, '¬¬', hx - dir * 60 * worker.s, hy + 20 * worker.s, Math.round(28 * worker.s + 12), '#FFB0B0');
  }
}

/** The manga anger vein: four red strokes in a cross. */
function angerMark(c: X, x: number, y: number, r: number): void {
  c.save();
  c.strokeStyle = '#E8333A';
  c.lineWidth = Math.max(2, r * 0.22);
  c.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const cx = x + Math.cos(a) * r * 0.55, cy = y + Math.sin(a) * r * 0.55;
    c.beginPath();
    c.arc(cx, cy, r * 0.4, a + Math.PI * 0.75, a + Math.PI * 1.25);
    c.stroke();
  }
  c.restore();
}

/** A loose cardboard box. (x, y): the center of the box's floor. */
export function cardboard(c: X, x: number, y: number, w: number, h: number, seed: number): void {
  const r = rng(seed);
  c.save();
  c.fillStyle = 'rgba(0,0,0,0.25)';
  ellipse(c, x, y + 2, w * 0.55, 6);
  c.fill();
  c.fillStyle = linear(c, x - w / 2, y - h, x + w / 2, y, [[0, '#D8A966'], [1, '#A87838']]);
  c.fillRect(x - w / 2, y - h, w, h);
  c.fillStyle = 'rgba(0,0,0,0.13)';
  c.fillRect(x + w * 0.28, y - h, w * 0.22, h);
  c.fillStyle = '#E4C08A';
  c.fillRect(x - w * 0.08, y - h, w * 0.16, h * 0.35);
  if (r() < 0.5) {
    c.fillStyle = 'rgba(110,50,15,0.6)';
    c.font = `bold ${Math.round(h * 0.18)}px ${COND}`;
    c.textAlign = 'center';
    c.fillText(r() < 0.5 ? 'RAM' : 'SWAP', x, y - h * 0.35);
  }
  c.restore();
}

/**
 * Full RAM: piles of boxes against the wall, more the higher the level. They go
 * behind the cats; level 3 adds a wall in front (see `boxWall`).
 */
export function boxPile(c: X, x0: number, x1: number, floorY: number, level: number): void {
  if (level <= 0) return;
  const r = rng(97);
  const n = level * 5;
  for (let i = 0; i < n; i++) {
    const w = 50 + r() * 34, h = 36 + r() * 22;
    const x = x0 + r() * (x1 - x0);
    const stack = Math.floor(r() * level);
    for (let k = 0; k <= stack; k++) cardboard(c, x + (r() - 0.5) * 10, floorY - k * h * 0.96, w, h, i * 7 + k);
  }
}

/** Level 3: a wall of boxes in front of the cat until only ears and eyes show. */
export function boxWall(c: X, x: number, y: number, s: number): void {
  const r = rng(53);
  const rows = 3;
  for (let row = 0; row < rows; row++) {
    for (let i = -2; i <= 2; i++) {
      const w = 92 * s, h = 62 * s;
      cardboard(c, x + i * w * 0.92 + (row % 2) * w * 0.4 + (r() - 0.5) * 8 * s, y - row * h * 0.95 + 4 * s, w, h, row * 11 + i + 40);
    }
  }
  outlined(c, propTexts().outOfMemory, x - 210 * s, y - 150 * s, Math.round(18 + 14 * s), '#FFD0A0');
}

/** The box that falls from the ceiling in the `cajas` gesture, and the dust on landing. */
export function fallingBox(c: X, x: number, y: number, s: number, t: number): void {
  const land = 0.55;
  const u = Math.min(1, t / land);
  const by = -60 + (y + 60) * u * u;
  if (t < 0.97) cardboard(c, x, by, 80 * s, 58 * s, 5);
  if (t > land && t < 0.95) {
    const k = (t - land) / (1 - land);
    for (let i = 0; i < 6; i++) {
      c.fillStyle = `rgba(200,180,150,${0.5 * (1 - k)})`;
      ellipse(c, x + (i - 2.5) * 22 * s * (1 + k), y - 6 * s - k * 12 * s, 14 * s * (1 + k), 8 * s);
      c.fill();
    }
    outlined(c, propTexts().boom, x + 60 * s, y - 70 * s, Math.round(20 + 12 * s), '#FFFFFF');
  }
}

/**
 * No network: a fluorescent butterfly (the lost ping) flutters in front of the
 * screen; the cat follows it, swipes at the screen and misses.
 */
export function butterfly(c: X, cat: Spot, t: number): void {
  const e = envelope(t);
  if (e <= 0) return;
  const { x, y, s } = cat;
  // Lying figure eight around the screen, higher than the head.
  const a = t * TAU * 1.5;
  const bx = x + Math.sin(a) * 210 * s, by = y - 330 * s + Math.sin(2 * a) * 50 * s;
  const flap = Math.abs(Math.sin(t * TAU * 7));
  c.save();
  c.globalAlpha = e;
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = radial(c, bx, by, 1, 50 * s + 10, [[0, 'rgba(120,255,220,0.55)'], [1, 'rgba(120,255,220,0)']]);
  ellipse(c, bx, by, 50 * s + 10, 50 * s + 10);
  c.fill();
  c.globalCompositeOperation = 'source-over';
  for (const k of [-1, 1]) {
    c.fillStyle = 'rgba(90,255,200,0.95)';
    ellipse(c, bx + k * 14 * s * (0.4 + flap), by - 6 * s, 16 * s * (0.4 + flap), 20 * s, k * 0.5);
    c.fill();
    c.fillStyle = 'rgba(200,120,255,0.9)';
    ellipse(c, bx + k * 10 * s * (0.4 + flap), by + 12 * s, 10 * s * (0.4 + flap), 12 * s, -k * 0.4);
    c.fill();
  }
  c.fillStyle = '#1A1A22';
  ellipse(c, bx, by, 3 * s + 1, 14 * s);
  c.fill();
  c.restore();
  if (t > 0.1 && t < 0.4) outlined(c, 'ping…', bx, by - 30 * s, Math.round(14 + 10 * s), '#B8FFE8');
  // Swipe at the screen, where the butterfly was a moment ago.
  if (t > 0.5 && t < 0.72) {
    const k = Math.sin(Math.PI * (t - 0.5) / 0.22);
    pawPad(c, x + 60 * s, y - (200 + 110 * k) * s, s * 1.3, -0.5);
    c.save();
    c.strokeStyle = `rgba(255,255,255,${0.7 * k})`;
    c.lineWidth = 3;
    for (const d of [-14, 0, 14]) {
      c.beginPath();
      c.moveTo(x + (40 + d) * s, y - 170 * s);
      c.lineTo(x + (90 + d) * s, y - 300 * s);
      c.stroke();
    }
    c.restore();
  }
  if (t > 0.7 && t < 0.95) outlined(c, propTexts().fail, x - 90 * s, y - 300 * s, Math.round(18 + 14 * s), '#FFFFFF');
}

// ---------- Git ----------

/** A poker card; in the corner, a short hash (each card is a commit). */
function card(c: X, x: number, y: number, s: number, ang: number, i: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.fillStyle = '#FBFBF7';
  c.strokeStyle = 'rgba(60,60,80,0.5)';
  c.lineWidth = 1;
  c.beginPath();
  c.roundRect(-16 * s, -22 * s, 32 * s, 44 * s, 4 * s);
  c.fill();
  c.stroke();
  const red = i % 2 === 0;
  c.fillStyle = red ? '#D7262E' : '#1A1A22';
  c.font = `bold ${Math.round(18 * s + 2)}px ${COND}`;
  c.textAlign = 'center';
  c.fillText(['♥', '♠', '♦', '♣'][i % 4]!, 0, 7 * s);
  c.font = `${Math.round(6 * s + 3)}px ${MONO}`;
  c.fillText(((i * 2654435761) >>> 0).toString(16).slice(0, 5), 0, -12 * s);
  c.restore();
}

/**
 * `git rebase`: shuffles in a hurry, cards flying from paw to paw. If the rebase
 * failed, halfway through the deck drops and the cat squashes it with both paws.
 */
export function cards(c: X, cat: Spot, t: number, failed: boolean): void {
  const e = envelope(t);
  if (e <= 0) return;
  const { x, s } = cat;
  const y = cat.y - 190 * s;
  const L = { x: x - 120 * s, y }, R = { x: x + 120 * s, y };
  const drop = failed ? 0.45 : 2;
  if (t < drop) {
    pawPad(c, L.x, L.y + 20 * s, s * 1.2, 0.5);
    pawPad(c, R.x, R.y + 20 * s, s * 1.2, -0.5);
    for (let i = 0; i < 9; i++) {
      const u = (t * 5 + i / 9) % 1;
      const px = L.x + (R.x - L.x) * u, py = y - Math.sin(Math.PI * u) * 90 * s;
      card(c, px, py, s * 1.1, (u - 0.5) * 1.4, i);
    }
    if (!failed) outlined(c, `rebase ×${3 + Math.floor(t * 8)}`, x, y - 120 * s, Math.round(16 + 12 * s), '#FFFFFF');
    return;
  }
  // Deck all over the floor and the paws squashing it, alternating.
  const u = (t - drop) / (1 - drop);
  const r = rng(71);
  const floor = cat.y + 6 * s;
  for (let i = 0; i < 12; i++) {
    const fx = x + (r() - 0.5) * 360 * s, fall = Math.min(1, u * 3 + r() * 0.3);
    card(c, fx, y + (floor - y) * fall, s * 1.1, r() * 6, i);
  }
  const stomp = Math.floor(u * 8) % 2;
  pawPad(c, x - 70 * s, floor - (stomp ? 40 : 6) * s, s * 1.4);
  pawPad(c, x + 70 * s, floor - (stomp ? 6 : 40) * s, s * 1.4);
  outlined(c, propTexts().conflict, x, y - 110 * s, Math.round(18 + 14 * s), '#FF8080');
}

/** The green "LGTM" stamp: it falls on the desk and leaves its mark. */
export function lgtmStamp(c: X, cat: Spot, t: number): void {
  const land = 0.3;
  const { x, s } = cat;
  const desk = cat.y - 80 * s;
  const sx = x + 150 * s;
  if (t < land) {
    const u = t / land;
    stamp(c, sx, -80 + (desk + 80) * u * u, s);
    return;
  }
  // Mark on the desk, and the stamp going back up.
  c.save();
  c.translate(sx, desk - 10 * s);
  c.rotate(-0.12);
  c.strokeStyle = '#1FA85A';
  c.lineWidth = 5 * s;
  c.strokeRect(-70 * s, -28 * s, 140 * s, 56 * s);
  c.fillStyle = '#1FA85A';
  c.font = `bold ${Math.round(40 * s)}px ${COND}`;
  c.textAlign = 'center';
  c.fillText('LGTM', 0, 14 * s);
  c.restore();
  if (t < 0.5) {
    const k = (t - land) / 0.2;
    stamp(c, sx, desk - k * 180 * s, s);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      c.strokeStyle = `rgba(255,255,255,${0.8 * (1 - k)})`;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(sx + Math.cos(a) * 90 * s, desk + Math.sin(a) * 30 * s);
      c.lineTo(sx + Math.cos(a) * (120 + 40 * k) * s, desk + Math.sin(a) * (40 + 16 * k) * s);
      c.stroke();
    }
    outlined(c, propTexts().slam, sx, desk - 120 * s, Math.round(26 + 14 * s), '#B6F5B0');
  }
}

function stamp(c: X, x: number, bottom: number, s: number): void {
  c.save();
  c.fillStyle = '#6B4A2B';
  c.beginPath();
  c.roundRect(x - 22 * s, bottom - 150 * s, 44 * s, 80 * s, 10 * s);
  c.fill();
  ellipse(c, x, bottom - 150 * s, 32 * s, 22 * s);
  c.fill();
  c.fillStyle = '#1FA85A';
  c.fillRect(x - 80 * s, bottom - 70 * s, 160 * s, 60 * s);
  c.fillStyle = '#157A40';
  c.fillRect(x - 80 * s, bottom - 16 * s, 160 * s, 16 * s);
  c.restore();
}

/** Paws gripping the wall lamp. */
export function lampGrip(c: X, lx: number, ly: number, s: number): void {
  pawPad(c, lx - 18, ly + 4, Math.max(0.5, s * 0.9), Math.PI);
  pawPad(c, lx + 18, ly + 4, Math.max(0.5, s * 0.9), Math.PI);
  outlined(c, propTexts().meow, lx + 90, ly + 30, 26, '#FFFFFF');
}

/** Yellow construction helmet. (x, y): top of the head. */
export function hardHat(c: X, x: number, y: number, s: number): void {
  c.save();
  c.translate(x, y + 18 * s);
  c.fillStyle = '#F5C400';
  c.beginPath();
  c.ellipse(0, 0, 70 * s, 50 * s, 0, Math.PI, 0);
  c.fill();
  c.fillRect(-86 * s, -4 * s, 172 * s, 10 * s);
  c.fillStyle = '#D9A800';
  c.fillRect(-8 * s, -50 * s, 16 * s, 48 * s);
  c.restore();
}

/**
 * `git push --force`: a tiny steamroller rolls over the laptop lid; at the end the
 * cat cleans its paws.
 */
export function steamroller(c: X, cat: Spot, t: number): void {
  const { x, s } = cat;
  const lid = cat.y - 252 * s;
  if (t < 0.75) {
    const u = Math.min(1, t / 0.7);
    const rx = x - 260 * s + u * 520 * s;
    c.save();
    c.translate(rx, lid);
    // Roller in front, cab behind.
    c.fillStyle = '#5A5F6A';
    ellipse(c, 34 * s, -20 * s, 22 * s, 22 * s);
    c.fill();
    c.fillStyle = '#F5C400';
    c.fillRect(-40 * s, -46 * s, 62 * s, 30 * s);
    c.fillRect(-30 * s, -70 * s, 30 * s, 26 * s);
    c.fillStyle = '#9FD6FF';
    c.fillRect(-26 * s, -66 * s, 22 * s, 14 * s);
    c.fillStyle = '#222';
    ellipse(c, -24 * s, -14 * s, 13 * s, 13 * s);
    c.fill();
    c.restore();
    outlined(c, '--force', rx, lid - 90 * s, Math.round(16 + 10 * s), '#FFD34D');
    if (u > 0.2) outlined(c, propTexts().crunch, rx - 110 * s, lid - 30 * s, Math.round(16 + 10 * s), '#FFFFFF');
  } else {
    // Shakes the dust off its paws.
    const k = Math.sin((t - 0.75) * 40);
    pawPad(c, x - 30 * s + k * 12 * s, cat.y - 170 * s, s * 1.2, 0.3);
    pawPad(c, x + 30 * s - k * 12 * s, cat.y - 170 * s, s * 1.2, -0.3);
    for (let i = 0; i < 5; i++) {
      c.fillStyle = 'rgba(200,190,170,0.5)';
      ellipse(c, x + (i - 2) * 16 * s, cat.y - (130 - i * 8) * s, 6 * s, 5 * s);
      c.fill();
    }
  }
}

/** `git blame`: a huge magnifier in front of the screen, going from side to side. */
export function magnifier(c: X, x: number, y: number, s: number): void {
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = '#6B4A2B';
  c.lineWidth = 14 * s;
  c.beginPath();
  c.moveTo(x + 50 * s, y + 50 * s);
  c.lineTo(x + 120 * s, y + 130 * s);
  c.stroke();
  c.fillStyle = 'rgba(190,230,255,0.35)';
  ellipse(c, x, y, 62 * s, 62 * s);
  c.fill();
  c.strokeStyle = '#C9A24A';
  c.lineWidth = 9 * s;
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.5)';
  ellipse(c, x - 22 * s, y - 22 * s, 14 * s, 8 * s, -0.7);
  c.fill();
  c.restore();
}

/** Paw pointing at you: big, frontal, as if coming out of the panel. */
export function pointAtYou(c: X, x: number, y: number, s: number, k: number): void {
  pawPad(c, x, y, s * (1.3 + k * 0.9));
  outlined(c, propTexts().you, x + 80 * s, y - 60 * s, Math.round(26 + 18 * s), '#FFB0B0');
}

/** Hat according to the branch it jumps to: miner for feature, firefighter for hotfix... */
export function branchHat(c: X, x: number, y: number, s: number, branch: string): void {
  const b = branch.toLowerCase();
  c.save();
  c.translate(x, y + 16 * s);
  if (/^(feat|feature)/.test(b)) {
    // Miner helmet with its lamp.
    c.fillStyle = '#E8B21A';
    c.beginPath();
    c.ellipse(0, 0, 66 * s, 48 * s, 0, Math.PI, 0);
    c.fill();
    c.fillRect(-80 * s, -4 * s, 160 * s, 10 * s);
    c.fillStyle = '#FFF6C0';
    ellipse(c, 0, -26 * s, 14 * s, 12 * s);
    c.fill();
    c.fillStyle = 'rgba(255,246,190,0.35)';
    c.beginPath();
    c.moveTo(0, -26 * s);
    c.lineTo(-60 * s, -140 * s);
    c.lineTo(60 * s, -140 * s);
    c.closePath();
    c.fill();
  } else if (/^(hotfix|fix|bugfix)/.test(b)) {
    // Firefighter cap, red with a badge.
    c.fillStyle = '#C8303F';
    c.beginPath();
    c.ellipse(0, 0, 64 * s, 50 * s, 0, Math.PI, 0);
    c.fill();
    c.fillRect(-60 * s, -4 * s, 130 * s, 12 * s);
    c.fillStyle = '#FFD34D';
    ellipse(c, 0, -26 * s, 13 * s, 15 * s);
    c.fill();
  } else if (/^(release|rel)/.test(b)) {
    c.fillStyle = '#FFD34D';
    c.beginPath();
    c.moveTo(-50 * s, 0);
    for (let i = 0; i <= 4; i++) c.lineTo(-50 * s + i * 25 * s, i % 2 ? -26 * s : -56 * s);
    c.lineTo(50 * s, 0);
    c.closePath();
    c.fill();
  } else if (/^(main|master|develop|dev|trunk)$/.test(b)) {
    // Beret.
    c.fillStyle = '#2A2A36';
    ellipse(c, 0, -10 * s, 62 * s, 22 * s, -0.1);
    c.fill();
    c.fillRect(-3 * s, -40 * s, 6 * s, 12 * s);
  } else {
    // Peaked cap.
    c.fillStyle = '#3F7FE0';
    c.beginPath();
    c.ellipse(0, 0, 58 * s, 42 * s, 0, Math.PI, 0);
    c.fill();
    c.fillRect(0, -6 * s, 90 * s, 10 * s);
  }
  c.restore();
  if (branch) outlined(c, branch.length > 22 ? `${branch.slice(0, 21)}…` : branch, x, y - 70 * s, Math.round(14 + 10 * s), '#FFFFFF');
}

/** `git cherry-pick`: tongs reach the neighbor's screen, a cherry and yum. */
export function cherryPick(c: X, cat: Spot, target: { x: number; y: number }, t: number): void {
  const e = envelope(t);
  if (e <= 0) return;
  const { x, s } = cat;
  const from = { x: x + 90 * s, y: cat.y - 180 * s };
  // They go, grab the cherry (0.4) and come back to the mouth (0.75).
  const out = t < 0.4 ? t / 0.4 : t < 0.75 ? 1 - (t - 0.4) / 0.35 : 0;
  const tip = { x: from.x + (target.x - from.x) * out, y: from.y + (target.y - from.y) * out - Math.sin(Math.PI * out) * 60 };
  if (t < 0.75) {
    c.save();
    c.strokeStyle = '#B8C0CC';
    c.lineWidth = 5;
    c.lineCap = 'round';
    for (const k of [-1, 1]) {
      c.beginPath();
      c.moveTo(from.x, from.y + k * 5);
      c.lineTo(tip.x, tip.y + k * (out > 0.95 ? 4 : 10));
      c.stroke();
    }
    c.restore();
    pawPad(c, from.x, from.y, s * 1.1, -0.8);
  }
  const has = t > 0.4 && t < 0.78;
  const cx = has ? tip.x : target.x, cy = has ? tip.y + 12 : target.y;
  if (t < 0.78) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = radial(c, cx, cy, 1, 26, [[0, 'rgba(255,90,110,0.7)'], [1, 'rgba(255,90,110,0)']]);
    ellipse(c, cx, cy, 26, 26);
    c.fill();
    c.restore();
    c.fillStyle = '#D11A2E';
    ellipse(c, cx, cy, 10, 10);
    c.fill();
    c.strokeStyle = '#3A7A2A';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(cx, cy - 8);
    c.quadraticCurveTo(cx + 6, cy - 22, cx + 12, cy - 26);
    c.stroke();
  } else {
    outlined(c, propTexts().yum, x + 40 * s, cat.y - 300 * s, Math.round(20 + 14 * s), '#FFFFFF');
  }
}

/** Little leaves that fall when it shakes itself. */
export function fallingLeaves(c: X, x: number, y: number, s: number, t: number): void {
  const r = rng(29);
  for (let i = 0; i < 10; i++) {
    const x0 = x + (r() - 0.5) * 240 * s, y0 = y - (150 + r() * 120) * s;
    const u = Math.min(1, t * 1.4 + r() * 0.2);
    const px = x0 + Math.sin(u * 8 + i) * 20 * s, py = y0 + (y - y0) * u;
    c.save();
    c.translate(px, py);
    c.rotate(u * 6 + i);
    c.fillStyle = i % 3 ? '#8A9A3A' : '#B87A2A';
    ellipse(c, 0, 0, 9 * s + 1, 4 * s + 1);
    c.fill();
    c.restore();
  }
}

// ---------- Console ----------

/**
 * `docker run`/`compose up`: a crane lowers a blue container behind the cat; once
 * it lands, a whale tail peeks out above it.
 */
export function crane(c: X, cat: Spot, t: number): void {
  const e = envelope(t);
  if (e <= 0) return;
  const { s } = cat;
  const cx = cat.x - 230 * s, ground = cat.y - 20 * s;
  const land = 0.5;
  const u = Math.min(1, t / land);
  const boxH = 110 * s, boxW = 230 * s;
  const top = -40 + (ground - boxH + 40) * u;
  // Cable from above, the hook and the container.
  c.save();
  c.globalAlpha = e;
  c.strokeStyle = '#3A3F4A';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(cx, 0);
  c.lineTo(cx, top - 20 * s);
  c.stroke();
  c.fillStyle = '#F5C400';
  c.fillRect(cx - 12 * s, top - 26 * s, 24 * s, 12 * s);
  for (const k of [-1, 1]) {
    c.beginPath();
    c.moveTo(cx, top - 20 * s);
    c.lineTo(cx + k * boxW * 0.4, top);
    c.stroke();
  }
  c.fillStyle = linear(c, cx - boxW / 2, top, cx + boxW / 2, top + boxH, [[0, '#2F6FD8'], [1, '#1D4A9A']]);
  c.fillRect(cx - boxW / 2, top, boxW, boxH);
  c.strokeStyle = 'rgba(255,255,255,0.18)';
  c.lineWidth = 3 * s;
  for (let i = 1; i < 10; i++) {
    c.beginPath();
    c.moveTo(cx - boxW / 2 + (i * boxW) / 10, top + 6 * s);
    c.lineTo(cx - boxW / 2 + (i * boxW) / 10, top + boxH - 6 * s);
    c.stroke();
  }
  c.fillStyle = '#FFFFFF';
  c.font = `bold ${Math.round(22 * s + 4)}px ${COND}`;
  c.textAlign = 'center';
  c.fillText('docker', cx, top + boxH * 0.6);
  if (t > land) {
    // Whale tail that peeks out and waves.
    const k = Math.min(1, (t - land) / 0.15);
    const wave = Math.sin((t - land) * 18) * 0.25;
    c.save();
    c.translate(cx + 40 * s, top + 4);
    c.rotate(wave);
    c.scale(2, 2);
    c.fillStyle = '#4A90E2';
    c.beginPath();
    c.moveTo(-8 * s, 0);
    c.lineTo(-6 * s, -40 * s * k);
    c.quadraticCurveTo(-40 * s, -60 * s * k, -46 * s, -46 * s * k);
    c.quadraticCurveTo(-20 * s, -52 * s * k, 0, -44 * s * k);
    c.quadraticCurveTo(20 * s, -52 * s * k, 46 * s, -46 * s * k);
    c.quadraticCurveTo(40 * s, -60 * s * k, 6 * s, -40 * s * k);
    c.lineTo(8 * s, 0);
    c.closePath();
    c.fill();
    c.restore();
  }
  c.restore();
}

/**
 * `npm install`/`cargo build`: a delivery truck unloads boxes next to the cat until
 * a tower is raised.
 */
export function delivery(c: X, cat: Spot, t: number, W: number): void {
  const e = envelope(t);
  if (e <= 0) return;
  const { s } = cat;
  const stackX = cat.x + 210 * s, floor = cat.y;
  // The truck enters from the right, stops and leaves.
  const tx = t < 0.2 ? W + 200 - (W + 200 - (stackX + 200 * s)) * (t / 0.2) : t < 0.8 ? stackX + 200 * s : stackX + 200 * s + ((t - 0.8) / 0.2) * (W - stackX);
  c.save();
  c.translate(tx, floor);
  c.fillStyle = '#E8ECF2';
  c.fillRect(0, -120 * s, 170 * s, 100 * s);
  c.fillStyle = '#C0392B';
  c.fillRect(0, -60 * s, 170 * s, 12 * s);
  c.fillStyle = '#C0392B';
  c.font = `bold ${Math.round(18 * s + 3)}px ${COND}`;
  c.fillText('npm', 60 * s, -80 * s);
  c.fillStyle = '#3A6FB0';
  c.fillRect(170 * s, -84 * s, 60 * s, 64 * s);
  c.fillStyle = '#9FD6FF';
  c.fillRect(190 * s, -78 * s, 32 * s, 24 * s);
  c.fillStyle = '#1A1A22';
  for (const wx of [40, 190]) {
    ellipse(c, wx * s, -18 * s, 18 * s, 18 * s);
    c.fill();
  }
  c.restore();
  // The tower grows while the truck is stopped.
  const n = Math.max(0, Math.min(9, Math.floor(((t - 0.2) / 0.6) * 10)));
  for (let i = 0; i < n; i++) {
    const w = 80 * s, h = 52 * s;
    cardboard(c, stackX + ((i * 37) % 3 - 1) * 6 * s, floor - i * h * 0.95, w, h, 300 + i);
  }
  if (n > 0) outlined(c, propTexts().packages(n * 137), stackX, floor - n * 50 * s - 16 * s, Math.round(14 + 10 * s), '#FFFFFF');
}

/** `kill -9`: a flip-flop flying in from outside hits the laptop, and smoke. */
export function slipper(c: X, cat: Spot, t: number, W: number): void {
  const { s } = cat;
  const target = { x: cat.x + 60 * s, y: cat.y - 230 * s };
  const hit = 0.4;
  if (t < hit) {
    const u = t / hit;
    const px = W + 60 - (W + 60 - target.x) * u, py = 40 + (target.y - 40) * u - Math.sin(Math.PI * u) * 80;
    c.save();
    c.translate(px, py);
    c.rotate(u * 12);
    c.fillStyle = '#2F80ED';
    ellipse(c, 0, 0, 44 * s + 6, 20 * s + 3);
    c.fill();
    c.strokeStyle = '#F2F2F2';
    c.lineWidth = 5 * s + 1;
    c.beginPath();
    c.moveTo(-10 * s, -14 * s);
    c.lineTo(10 * s, 0);
    c.lineTo(-10 * s, 14 * s);
    c.stroke();
    c.restore();
    return;
  }
  const u = (t - hit) / (1 - hit);
  const e = Math.sin(Math.PI * Math.min(1, u * 1.1));
  if (e <= 0) return;
  for (let i = 0; i < 6; i++) {
    c.fillStyle = `rgba(150,155,165,${0.55 * e})`;
    ellipse(c, target.x + (i - 2.5) * 22 * s, target.y - u * 60 * s - (i % 2) * 18 * s, (26 + u * 20) * s, (20 + u * 14) * s);
    c.fill();
  }
  if (u < 0.2) starBurst(c, target.x, target.y, 40 * s + 10, '#FFE14D');
  outlined(c, '[Killed]', target.x, target.y - 80 * s - u * 30 * s, Math.round(18 + 14 * s), '#FF8080');
}

/** `sudo`: silver crown and red cape. (x, y): the cat's origin. */
export function royalty(c: X, x: number, y: number, s: number): void {
  c.save();
  // Cape behind the shoulders, falling to the floor.
  c.fillStyle = '#B3122A';
  c.beginPath();
  c.moveTo(x - 90 * s, y - 150 * s);
  c.quadraticCurveTo(x, y - 175 * s, x + 90 * s, y - 150 * s);
  c.lineTo(x + 150 * s, y);
  c.lineTo(x - 150 * s, y);
  c.closePath();
  c.fill();
  c.fillStyle = '#F4F0E6';
  c.fillRect(x - 150 * s, y - 16 * s, 300 * s, 16 * s);
  c.fillStyle = '#1A1A22';
  for (let i = 0; i < 9; i++) {
    ellipse(c, x - 136 * s + i * 34 * s, y - 8 * s, 3 * s + 0.5, 4 * s + 0.5);
    c.fill();
  }
  c.restore();
}

export function crown(c: X, x: number, y: number, s: number): void {
  c.save();
  c.fillStyle = linear(c, x - 50 * s, y - 60 * s, x + 50 * s, y, [[0, '#F4F6FA'], [1, '#9AA3AE']]);
  c.beginPath();
  c.moveTo(x - 50 * s, y + 6 * s);
  for (let i = 0; i <= 4; i++) c.lineTo(x - 50 * s + i * 25 * s, y - (i % 2 ? 26 : 56) * s);
  c.lineTo(x + 50 * s, y + 6 * s);
  c.closePath();
  c.fill();
  for (const [dx, col] of [[-25, '#D7262E'], [0, '#2F80ED'], [25, '#1FA85A']] as const) {
    c.fillStyle = col;
    ellipse(c, x + dx * s, y - 8 * s, 6 * s, 6 * s);
    c.fill();
  }
  c.restore();
}

/** `ssh`: a circular portal opening next to the cat. */
export function portal(c: X, x: number, y: number, s: number, k: number): void {
  if (k <= 0) return;
  c.save();
  c.translate(x, y);
  c.scale(1, 1.25);
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = radial(c, 0, 0, 10 * s, 130 * s * k, [[0, 'rgba(90,200,255,0.9)'], [0.6, 'rgba(60,120,255,0.5)'], [1, 'rgba(60,120,255,0)']]);
  ellipse(c, 0, 0, 130 * s * k, 130 * s * k);
  c.fill();
  c.globalCompositeOperation = 'source-over';
  c.strokeStyle = '#8A96A6';
  c.lineWidth = 14 * s;
  ellipse(c, 0, 0, 110 * s * k, 110 * s * k);
  c.stroke();
  c.fillStyle = '#FFB020';
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU;
    ellipse(c, Math.cos(a) * 110 * s * k, Math.sin(a) * 110 * s * k, 6 * s, 6 * s);
    c.fill();
  }
  c.restore();
}

/** The remote desk in the background, where the cat arrives through ssh. */
export function remoteDesk(c: X, x: number, y: number, s: number, host: string): void {
  c.save();
  c.fillStyle = '#4A3A2A';
  c.fillRect(x - 80 * s, y - 60 * s, 160 * s, 10 * s);
  c.fillRect(x - 70 * s, y - 50 * s, 8 * s, 50 * s);
  c.fillRect(x + 62 * s, y - 50 * s, 8 * s, 50 * s);
  c.fillStyle = '#1A1F2A';
  c.fillRect(x - 40 * s, y - 120 * s, 80 * s, 56 * s);
  c.fillStyle = '#39D98A';
  c.font = `${Math.round(12 * s + 5)}px ${MONO}`;
  c.fillText('$ _', x - 32 * s, y - 88 * s);
  c.restore();
  outlined(c, host, x, y - 140 * s, Math.round(12 + 8 * s), '#B8FFE8');
}

/** `tail -f`: bowl of popcorn; every so often one goes to the mouth. */
export function popcorn(c: X, cat: Spot, t: number): void {
  const e = envelope(t);
  if (e <= 0) return;
  const { x, s } = cat;
  const bx = x + 150 * s, by = cat.y - 20 * s;
  c.save();
  c.globalAlpha = Math.min(1, e * 1.5);
  const r = rng(13);
  for (let i = 0; i < 14; i++) {
    c.fillStyle = i % 3 ? '#FFF6D8' : '#FFE08A';
    ellipse(c, bx + (r() - 0.5) * 80 * s, by - 50 * s - r() * 22 * s, 11 * s, 9 * s);
    c.fill();
  }
  c.fillStyle = '#E8ECF2';
  c.beginPath();
  c.moveTo(bx - 52 * s, by - 50 * s);
  c.lineTo(bx + 52 * s, by - 50 * s);
  c.lineTo(bx + 36 * s, by);
  c.lineTo(bx - 36 * s, by);
  c.closePath();
  c.fill();
  c.fillStyle = '#D7262E';
  for (let i = -2; i <= 2; i++) c.fillRect(bx + i * 18 * s - 4 * s, by - 48 * s, 8 * s, 46 * s);
  // A kernel goes from the bowl to the mouth, again and again.
  const u = (t * 4) % 1;
  const px = bx + (x + 20 * s - bx) * u, py = by - 60 * s + (cat.y - 200 * s - (by - 60 * s)) * u - Math.sin(Math.PI * u) * 40 * s;
  pawPad(c, px, py + 14 * s, s);
  c.fillStyle = '#FFF6D8';
  ellipse(c, px, py, 10 * s, 8 * s);
  c.fill();
  c.restore();
  if (t > 0.2 && t < 0.9) outlined(c, propTexts().yumYum, x - 120 * s, cat.y - 300 * s, Math.round(16 + 10 * s), '#FFFFFF');
}

// ---------- The trade ----------

/** Inexplicable error: opens "How to be a cat" and reads it very attentively. */
export function catBook(c: X, cat: Spot, t: number): void {
  const e = envelope(t * 1.4 - 0.2 < 0 ? 0 : Math.min(1, t));
  if (e <= 0) return;
  const { x, s } = cat;
  const y = cat.y - 190 * s;
  // Opens at the start and closes at the end.
  const open = Math.min(1, Math.min(t, 1 - t) / 0.12);
  const w = 120 * s, h = 150 * s;
  c.save();
  c.translate(x, y);
  // Back cover (the one we see): blue, with the title.
  c.fillStyle = '#2C5AA0';
  c.beginPath();
  c.roundRect(-w * (0.5 + open * 0.5), -h / 2, w * (1 + open), h, 6 * s);
  c.fill();
  c.fillStyle = '#F4F0E6';
  c.fillRect(-w * (0.5 + open * 0.5) + 6 * s, h / 2 - 8 * s, w * (1 + open) - 12 * s, 5 * s);
  c.fillStyle = '#FFFFFF';
  c.textAlign = 'center';
  c.font = `bold ${Math.round(18 * s + 3)}px ${COND}`;
  c.fillText(propTexts().bookTitle1, 0, -24 * s);
  c.fillText(propTexts().bookTitle2, 0, 0);
  c.font = `${Math.round(12 * s + 2)}px ${COND_REGULAR}`;
  c.fillText(propTexts().bookTitle3, 0, 26 * s);
  c.restore();
  pawPad(c, x - w * (0.5 + open * 0.5), y + 20 * s, s * 1.1, 0.4);
  pawPad(c, x + w * (0.5 + open * 0.5), y + 20 * s, s * 1.1, -0.4);
  if (t > 0.3 && t < 0.85) outlined(c, 'mmm…', x + 150 * s, y - 90 * s, Math.round(16 + 12 * s), '#FFFFFF');
}

/** Spaghetti code: plate of spaghetti, spinning fork and a drop of sweat. */
export function spaghetti(c: X, cat: Spot, t: number): void {
  const e = envelope(t);
  if (e <= 0) return;
  const { x, s } = cat;
  const px = x + 170 * s, py = cat.y - 30 * s;
  c.save();
  c.globalAlpha = Math.min(1, e * 1.5);
  c.fillStyle = '#F4F6FA';
  ellipse(c, px, py, 70 * s, 18 * s);
  c.fill();
  c.strokeStyle = '#E8C45A';
  c.lineWidth = 3 * s + 0.5;
  const r = rng(61);
  for (let i = 0; i < 22; i++) {
    c.beginPath();
    const x0 = px + (r() - 0.5) * 90 * s, y0 = py - 6 * s - r() * 16 * s;
    c.moveTo(x0, y0);
    c.bezierCurveTo(x0 + 30 * s * (r() - 0.5), y0 - 20 * s, x0 + 40 * s * (r() - 0.5), y0 + 10 * s, x0 + 30 * s * (r() - 0.5), y0 - 6 * s);
    c.stroke();
  }
  c.fillStyle = '#C0392B';
  for (let i = 0; i < 3; i++) {
    ellipse(c, px + (i - 1) * 22 * s, py - 16 * s, 7 * s, 6 * s);
    c.fill();
  }
  // The fork, spinning and rising with the noodles wound on it.
  const a = t * TAU * 3;
  const fx = px + Math.cos(a) * 8 * s, fy = py - 20 * s - Math.sin(Math.PI * t) * 60 * s;
  c.strokeStyle = '#B8C0CC';
  c.lineWidth = 4 * s;
  c.beginPath();
  c.moveTo(fx, fy);
  c.lineTo(fx - 40 * s, fy - 60 * s);
  c.stroke();
  c.strokeStyle = '#E8C45A';
  c.lineWidth = 6 * s;
  ellipse(c, fx, fy, 12 * s, 9 * s, a);
  c.stroke();
  pawPad(c, fx - 44 * s, fy - 66 * s, s, 0.6);
  c.restore();
  // Drop of sweat on the head: worried.
  c.fillStyle = 'rgba(140,200,255,0.9)';
  c.beginPath();
  const dx = x + 70 * s, dy = cat.y - 250 * s + ((t * 3) % 1) * 20 * s;
  c.moveTo(dx, dy - 16 * s);
  c.quadraticCurveTo(dx + 10 * s, dy, dx, dy + 6 * s);
  c.quadraticCurveTo(dx - 10 * s, dy, dx, dy - 16 * s);
  c.fill();
  if (t > 0.25 && t < 0.85) outlined(c, propTexts().moreLines, x - 110 * s, cat.y - 300 * s, Math.round(14 + 10 * s), '#FFE0A0');
}

/**
 * Rubber duck: appears next to the cat, explains the problem with gesticulation
 * ("blah, blah") and, suddenly, "Eureka!" with a light bulb.
 */
export function rubberDuck(c: X, cat: Spot, t: number): void {
  const e = envelope(t);
  if (e <= 0) return;
  const { x, s } = cat;
  const dx = x + 190 * s, dy = cat.y - 6 * s;
  duck(c, dx, dy, s * 1.3 * Math.min(1, e * 1.5));
  if (t < 0.65) {
    // Gesticulating: two paws going up and down out of sync.
    const k = Math.sin(t * 30);
    pawPad(c, x - 90 * s, cat.y - (200 + k * 40) * s, s * 1.1, -0.4);
    pawPad(c, x + 90 * s, cat.y - (200 - k * 40) * s, s * 1.1, 0.4);
    if (t > 0.1) outlined(c, [propTexts().blah, propTexts().andThen, propTexts().seeQuestion][Math.floor(t * 6) % 3]!, x + 160 * s, cat.y - 280 * s, Math.round(16 + 10 * s), '#FFFFFF');
  } else if (t < 0.95) {
    // Light bulb and Eureka!
    const bx = x, by = cat.y - 330 * s;
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = radial(c, bx, by, 2, 60 * s + 10, [[0, 'rgba(255,240,150,0.9)'], [1, 'rgba(255,240,150,0)']]);
    ellipse(c, bx, by, 60 * s + 10, 60 * s + 10);
    c.fill();
    c.restore();
    c.fillStyle = '#FFE680';
    ellipse(c, bx, by, 20 * s + 3, 22 * s + 3);
    c.fill();
    c.fillStyle = '#9AA3AE';
    c.fillRect(bx - 9 * s, by + 18 * s, 18 * s, 14 * s);
    outlined(c, propTexts().eureka, bx + 120 * s, by + 10 * s, Math.round(22 + 14 * s), '#FFE680');
  }
}

/** Accumulated TODOs: post-its that fall on the screen and a swipe at the end. */
export function postIts(c: X, cat: Spot, t: number, todos: number): void {
  const { x, s } = cat;
  const swipe = 0.8;
  if (t >= 0.97) return;
  const n = Math.min(8, Math.floor(t / 0.09));
  const r = rng(83);
  for (let i = 0; i < n; i++) {
    const px = x + (r() - 0.5) * 280 * s, py = cat.y - (170 + r() * 70) * s, ang = (r() - 0.5) * 0.5;
    const land = Math.min(1, (t - i * 0.09) / 0.06);
    const off = t > swipe ? ((t - swipe) / (1 - swipe)) * 500 * s : 0;
    c.save();
    c.translate(px + off, py - (1 - land) * 120 * s);
    c.rotate(ang + (t > swipe ? (t - swipe) * 6 : 0));
    c.fillStyle = i % 3 === 2 ? '#FF9ECF' : '#FFE14D';
    c.fillRect(-26 * s, -26 * s, 52 * s, 52 * s);
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.fillRect(-26 * s, 18 * s, 52 * s, 8 * s);
    c.fillStyle = '#5A4A2A';
    c.font = `bold ${Math.round(11 * s + 3)}px ${COND}`;
    c.textAlign = 'center';
    c.fillText('TODO', 0, 0);
    c.restore();
  }
  if (t > swipe) {
    const k = (t - swipe) / (1 - swipe);
    pawPad(c, x - 150 * s + k * 400 * s, cat.y - 200 * s, s * 1.4, Math.PI / 2);
    outlined(c, propTexts().out, x, cat.y - 320 * s, Math.round(20 + 12 * s), '#FFFFFF');
  } else if (n > 2) {
    outlined(c, `${todos} TODO`, x, cat.y - 320 * s, Math.round(16 + 10 * s), '#FFE14D');
  }
}

// ---------- Weather and calendar ----------

/**
 * Rain on the glass: drops that slide down the window and a paw that follows one
 * of them. `win` is the window opening, in scene coordinates.
 */
export function windowDrops(c: X, win: { x: number; y: number; w: number; h: number }, cat: Spot, t: number): void {
  const r = rng(19);
  c.save();
  c.beginPath();
  c.rect(win.x + 12, win.y + 12, win.w - 24, win.h - 26);
  c.clip();
  let follow = { x: 0, y: 0 };
  for (let i = 0; i < 14; i++) {
    const x = win.x + 20 + r() * (win.w - 40), speed = 0.6 + r() * 0.8, y0 = win.y + r() * win.h * 0.5;
    const y = y0 + ((t * speed * win.h) % (win.h - (y0 - win.y)));
    c.strokeStyle = 'rgba(200,225,255,0.45)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(x, y - 18);
    c.lineTo(x, y);
    c.stroke();
    c.fillStyle = 'rgba(220,235,255,0.8)';
    ellipse(c, x, y, 3, 4);
    c.fill();
    if (i === 3) follow = { x, y };
  }
  c.restore();
  const e = envelope(t);
  if (e > 0.1) pawPad(c, follow.x, follow.y + 8, Math.max(0.5, cat.s * 1.2), Math.PI);
}

/** Wool hat with a pompom. (x, y): top of the head. */
export function woolHat(c: X, x: number, y: number, s: number): void {
  c.save();
  c.translate(x, y + 20 * s);
  c.fillStyle = '#C8303F';
  c.beginPath();
  c.ellipse(0, 0, 68 * s, 56 * s, 0, Math.PI, 0);
  c.fill();
  c.fillStyle = '#F4F0E6';
  c.fillRect(-72 * s, -6 * s, 144 * s, 16 * s);
  c.strokeStyle = 'rgba(255,255,255,0.35)';
  c.lineWidth = 3 * s;
  for (let i = -3; i <= 3; i++) {
    c.beginPath();
    c.moveTo(i * 16 * s, -6 * s);
    c.lineTo(i * 12 * s, -50 * s);
    c.stroke();
  }
  c.fillStyle = '#F4F0E6';
  ellipse(c, 0, -58 * s, 16 * s, 16 * s);
  c.fill();
  c.restore();
}

/** Hot chocolate whose steam draws "[OK]". */
export function cocoa(c: X, cat: Spot, t: number): void {
  const e = envelope(t);
  if (e <= 0) return;
  const { x, s } = cat;
  const mx = x + 150 * s, my = cat.y - 14 * s;
  c.save();
  c.fillStyle = '#E8ECF2';
  c.beginPath();
  c.roundRect(mx - 26 * s, my - 56 * s, 52 * s, 56 * s, 8 * s);
  c.fill();
  c.strokeStyle = '#E8ECF2';
  c.lineWidth = 7 * s;
  c.beginPath();
  c.arc(mx + 28 * s, my - 28 * s, 13 * s, -Math.PI / 2, Math.PI / 2);
  c.stroke();
  c.fillStyle = '#5A3220';
  ellipse(c, mx, my - 54 * s, 22 * s, 5 * s);
  c.fill();
  c.fillStyle = '#FFFFFF';
  ellipse(c, mx - 6 * s, my - 57 * s, 6 * s, 4 * s);
  c.fill();
  // Steam that rises and arranges itself into "[OK]".
  const k = Math.min(1, t * 1.6);
  c.globalAlpha = 0.85 * e;
  c.fillStyle = '#FFFFFF';
  c.font = `bold ${Math.round(22 * s + 8)}px ${MONO_BOLD}`;
  c.textAlign = 'center';
  const wobble = Math.sin(t * 20) * 3 * (1 - k);
  c.fillText('[OK]', mx + wobble, my - 70 * s - k * 50 * s);
  c.strokeStyle = 'rgba(255,255,255,0.5)';
  c.lineWidth = 3 * s;
  for (const d of [-10, 0, 10]) {
    c.beginPath();
    c.moveTo(mx + d * s, my - 60 * s);
    c.quadraticCurveTo(mx + d * s + Math.sin(t * 12 + d) * 8 * s, my - 72 * s, mx + d * s, my - 84 * s - k * 20 * s);
    c.stroke();
  }
  c.restore();
}

/** Sheets of paper that the draft blows out of the window to the right. */
export function windPapers(c: X, fromX: number, fromY: number, toX: number, floorY: number, t: number): void {
  const r = rng(47);
  for (let i = 0; i < 7; i++) {
    const delay = r() * 0.25, u = Math.max(0, Math.min(1, (t - delay) / 0.6));
    if (u <= 0 || t > 0.97) continue;
    const x = fromX + (toX - fromX) * u + Math.sin(u * 9 + i) * 30;
    const y = fromY + (floorY - fromY) * u * u - Math.sin(Math.PI * u) * 60 + r() * 30;
    c.save();
    c.translate(x, y);
    c.rotate(u * 8 + i);
    c.fillStyle = '#F4F0E6';
    c.fillRect(-14, -18, 28, 36);
    c.fillStyle = '#9AA3AE';
    for (let k = 0; k < 4; k++) c.fillRect(-10, -12 + k * 7, 18 - (k % 2) * 6, 2);
    c.restore();
  }
  // Streaks of the draft coming in through the window.
  c.save();
  c.strokeStyle = `rgba(220,235,255,${0.4 * envelope(t)})`;
  c.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const y = fromY - 40 + i * 22, off = ((t * 3 + i * 0.2) % 1) * 300;
    c.beginPath();
    c.moveTo(fromX + off, y);
    c.quadraticCurveTo(fromX + off + 60, y - 14, fromX + off + 140, y);
    c.stroke();
  }
  c.restore();
}

/** The imaginary blueprint on the floor, in the center of the circle. */
export function blueprint(c: X, x: number, y: number, k: number): void {
  if (k <= 0) return;
  c.save();
  c.globalAlpha = k;
  c.translate(x, y);
  c.scale(1, 0.32);
  c.fillStyle = '#1F4E8C';
  c.fillRect(-150, -110, 300, 220);
  c.strokeStyle = 'rgba(220,235,255,0.8)';
  c.lineWidth = 3;
  c.strokeRect(-130, -90, 260, 180);
  c.beginPath();
  c.moveTo(-130, 0);
  c.lineTo(40, 0);
  c.lineTo(40, -90);
  c.moveTo(40, 30);
  c.lineTo(130, 30);
  c.stroke();
  c.fillStyle = 'rgba(220,235,255,0.8)';
  c.font = `bold 30px ${MONO_BOLD}`;
  c.textAlign = 'center';
  c.fillText('Q4', -50, 60);
  c.restore();
}

// ---------- Lego and drones ----------

const LEGO = ['#D93A2B', '#F2C21B', '#2F6FD8', '#2FA84F', '#F2F2F2', '#F28A1B'];

/** A Lego brick from the side: (x, y) is the top-left corner, without the studs. */
function brick(c: X, x: number, y: number, w: number, h: number, color: string, rot = 0): void {
  c.save();
  c.translate(x + w / 2, y + h / 2);
  c.rotate(rot);
  const studs = Math.max(1, Math.round(w / (h * 0.9)));
  const sw = (w / studs) * 0.56, sh = h * 0.24;
  c.fillStyle = color;
  for (let i = 0; i < studs; i++) c.fillRect(-w / 2 + (w / studs) * (i + 0.5) - sw / 2, -h / 2 - sh, sw, sh);
  c.fillRect(-w / 2, -h / 2, w, h);
  // Highlight on top and shadow below, so it reads as plastic.
  c.fillStyle = 'rgba(255,255,255,0.28)';
  c.fillRect(-w / 2, -h / 2, w, h * 0.18);
  c.fillStyle = 'rgba(0,0,0,0.22)';
  c.fillRect(-w / 2, h / 2 - h * 0.16, w, h * 0.16);
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.lineWidth = Math.max(1, h * 0.05);
  c.strokeRect(-w / 2, -h / 2, w, h);
  c.restore();
}

/**
 * A build (`npm run build`, `tsc`, `make`...): the cat assembles a Lego tower brick
 * by brick next to the laptop and plants a little flag on it. If the build failed,
 * the tower wobbles and collapses.
 */
export function legoTower(c: X, cat: Spot, t: number, failed: boolean): void {
  const e = envelope(t);
  if (e <= 0) return;
  const { s } = cat;
  const x0 = cat.x - 340 * s, floor = cat.y;
  const w = 110 * s, h = 40 * s, n = 7;
  const build = failed ? 0.55 : 0.78;
  // How many bricks have fallen already: one every so often, the last still coming down.
  const k = Math.max(0, Math.min(n, ((t - 0.06) / (build - 0.06)) * n));
  c.save();
  c.globalAlpha = e;
  if (failed && t > build) {
    // It wobbles and the bricks end up on the floor.
    const u = (t - build) / (1 - build);
    const r = rng(53);
    for (let i = 0; i < n; i++) {
      const dir = r() < 0.5 ? -1 : 1, far = 40 + r() * 140;
      const fall = Math.min(1, u * 2.2);
      const by = floor - (i + 1) * h, bx = x0 + ((i * 5) % 3 - 1) * 4 * s;
      brick(c, bx + dir * far * s * fall, by + (floor - h - by) * fall * fall, w, h, LEGO[i % LEGO.length]!, dir * fall * (1 + r() * 2));
    }
    outlined(c, propTexts().crack, x0 + w / 2, floor - n * h - 30 * s, Math.round(18 + 14 * s), '#FF8080');
    c.restore();
    return;
  }
  for (let i = 0; i < Math.ceil(k); i++) {
    const land = floor - (i + 1) * h;
    // The one falling comes down from above, from a paw that lets it go.
    const f = Math.min(1, k - i);
    const by = land - (1 - f) * 220 * s;
    const bx = x0 + ((i * 5) % 3 - 1) * 4 * s;
    brick(c, bx, by, w, h, LEGO[i % LEGO.length]!);
    if (f < 1) pawPad(c, bx + w / 2, by - 30 * s, s * 1.6, Math.PI);
  }
  if (!failed && t > build) {
    // The little flag on top: the build succeeded.
    const top = floor - n * h - 7 * s, fx = x0 + w / 2;
    const up = Math.min(1, (t - build) / 0.08);
    c.strokeStyle = '#3A3F4A';
    c.lineWidth = 3 * s;
    c.beginPath();
    c.moveTo(fx, top);
    c.lineTo(fx, top - 100 * s * up);
    c.stroke();
    c.fillStyle = '#2FA84F';
    c.beginPath();
    c.moveTo(fx, top - 100 * s * up);
    c.lineTo(fx + 60 * s * up, top - 84 * s * up);
    c.lineTo(fx, top - 68 * s * up);
    c.closePath();
    c.fill();
    outlined(c, propTexts().buildOk, fx, top - 125 * s, Math.round(16 + 12 * s), '#B8F5C8');
  }
  c.restore();
}

/**
 * `git merge`/`git pull`: two Lego walls, one from each side, approach and snap
 * together with a "click!". On a conflict they collide, the bricks scatter over
 * the floor and the cat steps on one ("OUCH!"; the jump is added by render.ts).
 */
export function legoMerge(c: X, cat: Spot, t: number, conflict: boolean): void {
  const e = envelope(t);
  if (e <= 0) return;
  const { s } = cat;
  const floor = cat.y, cx = cat.x - 430 * s;
  const w = 84 * s, h = 34 * s;
  const meet = 0.45;
  const u = Math.min(1, t / meet);
  const gap = (1 - ease3(u)) * 280 * s;
  c.save();
  c.globalAlpha = e;
  // Left wall (the branch) in blue, right wall (main) in red, staggered.
  const wall = (side: -1 | 1, color: string, scatter: number) => {
    const r = rng(side < 0 ? 31 : 37);
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 2; i++) {
        const off = row % 2 === (side < 0 ? 0 : 1) ? w / 2 : 0;
        let bx = cx + side * (gap / 2 + i * w + off) - (side < 0 ? w : 0), by = floor - (row + 1) * h;
        let rot = 0;
        if (scatter > 0) {
          bx += side * (30 + r() * 150) * s * scatter;
          by += (floor - h - by) * Math.min(1, scatter * 1.5);
          rot = side * scatter * (1 + r() * 2);
        }
        brick(c, bx, by, w, h, color, rot);
      }
    }
  };
  const scatter = conflict && t > meet ? Math.min(1, (t - meet) / 0.25) : 0;
  wall(-1, '#2F6FD8', scatter);
  wall(1, '#D93A2B', scatter);
  if (t > meet && t < meet + 0.35) {
    const k = (t - meet) / 0.35;
    if (conflict) {
      starBurst(c, cx, floor - 1.5 * h, (30 + 30 * k) * s + 8, '#FFE14D');
      outlined(c, propTexts().conflict, cx, floor - 4 * h - 20 * s, Math.round(16 + 12 * s), '#FF8080');
    } else {
      outlined(c, propTexts().click, cx, floor - 4 * h - 10 * s - k * 30 * s, Math.round(18 + 14 * s), '#FFFFFF');
    }
  }
  if (!conflict && t >= meet + 0.35) outlined(c, 'merge OK', cx, floor - 4 * h - 20 * s, Math.round(16 + 12 * s), '#B8F5C8');
  // Steps on a loose brick: the little paw on top and the scream.
  if (conflict && t > 0.62 && t < 0.92) {
    brick(c, cat.x - 150 * s, floor - 20 * s, 50 * s, 20 * s, '#F2C21B');
    outlined(c, propTexts().ouch, cat.x + 80 * s, cat.y - 300 * s, Math.round(22 + 16 * s), '#FFFFFF');
  }
  c.restore();
}

/** Cubic ease in-out, local to these drawings. */
const ease3 = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

/** A four-propeller drone seen from the front, centered at (x, y). `t` spins the propellers and blinks the pilot light. */
function drone(c: X, x: number, y: number, s: number, t: number, body = '#E8ECF2', tilt = 0): void {
  c.save();
  c.translate(x, y);
  c.rotate(tilt);
  // Arms and propellers: a blur that changes width to look like spinning.
  c.strokeStyle = '#3A3F4A';
  c.lineWidth = 4 * s;
  for (const k of [-1, 1]) {
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(k * 46 * s, -12 * s);
    c.stroke();
    c.fillStyle = '#3A3F4A';
    c.fillRect(k * 46 * s - 3 * s, -20 * s, 6 * s, 10 * s);
    const spin = 0.55 + 0.45 * Math.abs(Math.sin(t * 60 + (k > 0 ? 1 : 0)));
    c.fillStyle = 'rgba(200,210,225,0.55)';
    ellipse(c, k * 46 * s, -21 * s, 30 * s * spin, 4 * s);
    c.fill();
  }
  // Body, camera and legs.
  c.fillStyle = body;
  c.beginPath();
  c.roundRect(-26 * s, -14 * s, 52 * s, 24 * s, 8 * s);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.3)';
  c.lineWidth = 1.5 * s;
  c.stroke();
  c.fillStyle = '#1A1A22';
  ellipse(c, 0, 4 * s, 7 * s, 7 * s);
  c.fill();
  c.fillStyle = '#5AB0FF';
  ellipse(c, -2 * s, 2 * s, 2.5 * s, 2.5 * s);
  c.fill();
  c.strokeStyle = '#3A3F4A';
  c.lineWidth = 2.5 * s;
  for (const k of [-1, 1]) {
    c.beginPath();
    c.moveTo(k * 16 * s, 10 * s);
    c.lineTo(k * 22 * s, 20 * s);
    c.stroke();
  }
  // Blinking pilot light.
  if (Math.floor(t * 40) % 2 === 0) {
    c.fillStyle = '#FF4D4D';
    ellipse(c, 18 * s, -8 * s, 3 * s, 3 * s);
    c.fill();
  }
  c.restore();
}

/** A radio-control transmitter with two sticks and an antenna; (x, y), its center. */
function remote(c: X, x: number, y: number, s: number, t: number): void {
  c.save();
  c.translate(x, y);
  c.strokeStyle = '#9AA3B0';
  c.lineWidth = 3 * s;
  c.beginPath();
  c.moveTo(22 * s, -16 * s);
  c.lineTo(34 * s, -64 * s);
  c.stroke();
  c.fillStyle = '#FF4D4D';
  ellipse(c, 34 * s, -66 * s, 4 * s, 4 * s);
  c.fill();
  c.fillStyle = '#2B2F38';
  c.beginPath();
  c.roundRect(-38 * s, -18 * s, 76 * s, 38 * s, 10 * s);
  c.fill();
  c.fillStyle = '#4A505C';
  for (const k of [-1, 1]) {
    ellipse(c, k * 18 * s, 0, 9 * s, 9 * s);
    c.fill();
  }
  // The sticks move with the flight.
  c.fillStyle = '#C9CED6';
  ellipse(c, -18 * s + Math.sin(t * 9) * 4 * s, Math.cos(t * 7) * 4 * s, 4.5 * s, 4.5 * s);
  c.fill();
  ellipse(c, 18 * s + Math.cos(t * 11) * 4 * s, Math.sin(t * 6) * 4 * s, 4.5 * s, 4.5 * s);
  c.fill();
  c.restore();
}

/**
 * A deploy (`kubectl apply`, `terraform apply`, `fly deploy`...): the cat takes out
 * the controller and a drone lifts off the desk with the version box hanging from
 * it, climbs and carries it away overhead.
 */
export function deployDrone(c: X, cat: Spot, t: number, W: number): void {
  const e = envelope(t);
  if (e <= 0) return;
  const { s } = cat;
  // Towards the side with more room, so as not to pass over the usage card.
  const dir = cat.x > W / 2 ? -1 : 1;
  const start = { x: cat.x + dir * 240 * s, y: cat.y - 170 * s };
  // Takes off vertically, stays a moment and leaves diagonally upwards.
  const lift = 0.3, hold = 0.5;
  let x = start.x, y = start.y, tilt = 0;
  if (t < lift) y -= ease3(t / lift) * 110 * s;
  else if (t < hold) y -= 110 * s + Math.sin(((t - lift) / (hold - lift)) * TAU) * 6 * s;
  else {
    const u = (t - hold) / (0.85 - hold);
    x += dir * u * 260 * s;
    y -= 110 * s + u * u * (start.y + 200);
    tilt = dir * 0.25 * Math.min(1, u * 3);
  }
  c.save();
  c.globalAlpha = e;
  remote(c, cat.x - dir * 130 * s, cat.y - 250 * s, s * 1.4, t);
  if (y > -200) {
    // The box hanging from the cable, with the deploy label.
    c.strokeStyle = '#3A3F4A';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x, y + 20 * s);
    c.lineTo(x, y + 70 * s);
    c.stroke();
    cardboard(c, x, y + 140 * s, 100 * s, 70 * s, 900);
    c.fillStyle = '#1D4A9A';
    c.font = `bold ${Math.round(20 * s + 4)}px ${COND}`;
    c.textAlign = 'center';
    c.fillText('deploy', x, y + 112 * s);
    drone(c, x, y, s * 2.2, t, '#E8ECF2', tilt);
  }
  if (t > hold && t < 0.85) outlined(c, propTexts().toProduction, start.x, start.y - 170 * s, Math.round(16 + 12 * s), '#FFFFFF');
  c.restore();
}

/**
 * A subagent (`Agent`): a swarm of three tiny drones takes off from the laptop,
 * fans out to explore the room with their beam and comes back.
 */
export function droneSwarm(c: X, cat: Spot, t: number, W: number): void {
  const e = envelope(t);
  if (e <= 0) return;
  const { s } = cat;
  const home = { x: cat.x, y: cat.y - 240 * s };
  const ss = Math.max(0.8, s * 1.4);
  // Each drone goes to a different spot: top left, top, and top right.
  const spots = [
    { x: Math.max(80, home.x - 420 * s), y: 90 },
    { x: home.x + 40 * s, y: 50 },
    { x: Math.min(W - 80, home.x + 420 * s), y: 110 },
  ];
  // Out, exploration with the beam and back.
  const out = 0.3, back = 0.72;
  c.save();
  c.globalAlpha = e;
  spots.forEach((p, i) => {
    const u = t < out ? ease3(t / out) : t < back ? 1 : 1 - ease3((t - back) / (1 - back));
    const bob = Math.sin(t * 20 + i * 2) * 5;
    const x = home.x + (p.x - home.x) * u, y = home.y + (p.y - home.y) * u - Math.sin(Math.PI * u) * 40 + bob;
    if (t > out && t < back) {
      // Reconnaissance beam towards the floor, sweeping from side to side.
      const sweep = Math.sin(((t - out) / (back - out)) * TAU + i) * 70;
      c.fillStyle = 'rgba(120,220,255,0.16)';
      c.beginPath();
      c.moveTo(x, y + 8);
      c.lineTo(x + sweep - 60, y + 230);
      c.lineTo(x + sweep + 60, y + 230);
      c.closePath();
      c.fill();
    }
    drone(c, x, y, ss, t + i * 0.37, ['#E8ECF2', '#F2C21B', '#5AB0FF'][i]!, (p.x - home.x) * 0.0004 * (t < out ? 1 : t > back ? -1 : 0));
  });
  if (t > out && t < back) outlined(c, propTexts().subagents(spots.length), home.x, home.y - 150 * s, Math.round(14 + 10 * s), '#BFEFFF');
  c.restore();
}

/**
 * The one that has waited a long time for you gets bored and pilots a drone: it flies
 * a figure eight around the room, stops in front of you and takes your picture.
 */
export function pilotDrone(c: X, cat: Spot, t: number, W: number): void {
  const e = envelope(t);
  if (e <= 0) return;
  const { s } = cat;
  const home = { x: cat.x + 150 * s, y: cat.y - 40 * s };
  const fly = 0.72;
  let x: number, y: number, ds: number;
  if (t < fly) {
    // A lying figure eight around the cat, rising from the floor and back up.
    const u = t / fly;
    const a = u * TAU;
    const rx = Math.min(520 * s + 120, W / 2 - 80), ry = 90 * s + 30;
    const up = Math.min(1, u * 5);
    x = cat.x + Math.sin(a) * rx;
    y = home.y + (cat.y - 360 * s - home.y) * up + Math.sin(2 * a) * ry * up;
    x = home.x + (x - home.x) * up;
    ds = s * 1.7;
  } else {
    // It approaches the camera (grows) and fires the flash.
    const u = Math.min(1, (t - fly) / 0.12);
    x = cat.x + 30 * s;
    y = cat.y - 360 * s + u * 60 * s;
    ds = s * (1.7 + u * 1.6);
  }
  c.save();
  c.globalAlpha = e;
  // The controller, in the front paws.
  remote(c, cat.x, cat.y - 110 * s, s * 1.15, t);
  drone(c, x, y, ds, t, '#F28A1B', t < fly ? Math.cos(t / fly * TAU) * 0.18 : 0);
  if (t > fly + 0.12 && t < fly + 0.2) {
    // The flash, from the camera lens.
    c.fillStyle = radial(c, x, y + 4 * ds, 0, 160 * ds, [[0, 'rgba(255,255,255,0.95)'], [1, 'rgba(255,255,255,0)']]);
    ellipse(c, x, y + 4 * ds, 160 * ds, 160 * ds);
    c.fill();
    starBurst(c, x, y + 4 * ds, 30 * ds, '#FFFFFF');
  }
  if (t > fly + 0.12) outlined(c, propTexts().click, x + 120 * ds, y - 20 * ds, Math.round(18 + 14 * s), '#FFFFFF');
  c.restore();
}

// ---------- Chemistry ----------

/** A standing Erlenmeyer flask; (x, y) the center of the base. Returns where the neck ends. */
function flask(c: X, x: number, y: number, s: number, fill: number, liquid: string, cracked = false): { x: number; y: number } {
  const w = 90 * s, h = 120 * s, neck = 22 * s, neckH = 34 * s;
  const shape = () => {
    c.beginPath();
    c.moveTo(x - neck / 2, y - h);
    c.lineTo(x - neck / 2, y - h + neckH);
    c.lineTo(x - w / 2, y - 10 * s);
    c.quadraticCurveTo(x - w / 2, y, x - w / 2 + 10 * s, y);
    c.lineTo(x + w / 2 - 10 * s, y);
    c.quadraticCurveTo(x + w / 2, y, x + w / 2, y - 10 * s);
    c.lineTo(x + neck / 2, y - h + neckH);
    c.lineTo(x + neck / 2, y - h);
    c.closePath();
  };
  // The liquid, clipped to the shape of the glass.
  c.save();
  shape();
  c.clip();
  const top = y - (h - neckH) * fill;
  c.fillStyle = liquid;
  c.fillRect(x - w, top, w * 2, y - top);
  c.fillStyle = 'rgba(255,255,255,0.25)';
  c.fillRect(x - w, top, w * 2, 3 * s);
  c.restore();
  shape();
  c.fillStyle = 'rgba(220,240,255,0.18)';
  c.fill();
  c.strokeStyle = 'rgba(235,245,255,0.85)';
  c.lineWidth = Math.max(1.5, 3 * s);
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.fillRect(x - w / 2 + 14 * s, y - 50 * s, 5 * s, 30 * s);
  if (cracked) {
    c.strokeStyle = 'rgba(40,40,40,0.8)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(x - 10 * s, y - 60 * s);
    c.lineTo(x, y - 45 * s);
    c.lineTo(x - 6 * s, y - 32 * s);
    c.lineTo(x + 8 * s, y - 20 * s);
    c.stroke();
  }
  return { x, y: y - h };
}

/** Lab goggles, over the eyes of a cat facing you; (x, y) the center. */
export function labGoggles(c: X, x: number, y: number, s: number): void {
  c.save();
  c.strokeStyle = '#2E7D5B';
  c.lineWidth = 6 * s;
  c.beginPath();
  c.moveTo(x - 110 * s, y);
  c.lineTo(x + 110 * s, y);
  c.stroke();
  for (const k of [-1, 1]) {
    c.fillStyle = 'rgba(190,240,255,0.45)';
    c.strokeStyle = '#3FA27A';
    c.lineWidth = 5 * s;
    c.beginPath();
    c.roundRect(x + k * 46 * s - 38 * s, y - 28 * s, 76 * s, 56 * s, 18 * s);
    c.fill();
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.fillRect(x + k * 46 * s - 26 * s, y - 20 * s, 12 * s, 6 * s);
  }
  c.restore();
}

const FOAM = ['#FF5A7A', '#FFB23F', '#FFE45C', '#5BE07A', '#4FC3FF', '#9B6BFF'];

/**
 * Chemistry: the cat pours the blue tube into the yellow flask, the mix turns green
 * and bubbles, and a column of colored foam (the "elephant toothpaste") shoots out
 * and overflows the flask. If it failed, it blackens and a cloud of smoke comes out.
 */
export function chemistry(c: X, cat: Spot, t: number, failed: boolean): void {
  const e = envelope(t);
  if (e <= 0) return;
  const { s } = cat;
  // Far enough not to cover the "keep going?" of the one waiting.
  const fx = cat.x + 290 * s, base = cat.y - 4 * s;
  c.save();
  c.globalAlpha = e;
  // Rack with colored tubes, to the right of the flask.
  const rx = fx + 100 * s;
  c.fillStyle = '#8A5A34';
  c.fillRect(rx - 40 * s, base - 30 * s, 80 * s, 8 * s);
  c.fillRect(rx - 40 * s, base - 4 * s, 80 * s, 6 * s);
  const pour = t > 0.12 && t < 0.4;
  ['#4F8BFF', '#FF5A7A', '#9B6BFF'].forEach((col, i) => {
    if (i === 0 && pour) return;
    const tx = rx - 26 * s + i * 26 * s;
    c.fillStyle = 'rgba(220,240,255,0.5)';
    c.fillRect(tx - 7 * s, base - 70 * s, 14 * s, 66 * s);
    c.fillStyle = col;
    c.fillRect(tx - 6 * s, base - 40 * s, 12 * s, 34 * s);
  });
  // The mix: yellow, green when the blue is poured; black if it failed.
  const mix = Math.max(0, Math.min(1, (t - 0.18) / 0.2));
  const green = `rgb(${Math.round(242 - 166 * mix)},${Math.round(211 - 3 * mix)},${Math.round(58 + 64 * mix)})`;
  const burnt = failed && t > 0.48;
  const liquid = burnt ? '#2A2A2E' : green;
  const fizz = t > 0.38 && t < 0.52 ? Math.sin(t * 160) * 2 * s : 0;
  const neck = flask(c, fx + fizz, base, s, 0.45 + 0.15 * mix, liquid, burnt);
  if (pour) {
    // The blue tube, tilted over the neck, with its stream.
    const u = (t - 0.12) / 0.28;
    c.save();
    c.translate(neck.x + 34 * s, neck.y - 46 * s);
    c.rotate(-0.9 - 0.5 * Math.sin(Math.PI * u));
    c.fillStyle = 'rgba(220,240,255,0.6)';
    c.fillRect(-7 * s, -60 * s, 14 * s, 66 * s);
    c.fillStyle = '#4F8BFF';
    c.fillRect(-6 * s, -30 * s * (1 - u), 12 * s, 34 * s * (1 - u) + 1);
    c.restore();
    pawPad(c, neck.x + 52 * s, neck.y - 52 * s, s * 1.1, -0.6);
    c.strokeStyle = '#4F8BFF';
    c.lineWidth = 4 * s;
    c.beginPath();
    c.moveTo(neck.x + 6 * s, neck.y - 20 * s);
    c.lineTo(neck.x, neck.y + 30 * s);
    c.stroke();
  }
  // Bubbles that rise through the liquid and come out of the neck.
  if (t > 0.3 && t < 0.62) {
    const r = rng(331);
    for (let i = 0; i < 12; i++) {
      const ph = (t * 3 + r()) % 1;
      const bx = fx + (r() - 0.5) * 60 * s * (1 - ph), by = base - 10 * s - ph * 120 * s;
      c.strokeStyle = 'rgba(255,255,255,0.8)';
      c.lineWidth = 1.5;
      ellipse(c, bx, by, (3 + r() * 4) * s, (3 + r() * 4) * s);
      c.stroke();
    }
  }
  if (t > 0.5) {
    const u = (t - 0.5) / 0.5;
    if (failed) {
      // POOF!: black and gray smoke that rises and spreads.
      const r = rng(17);
      for (let i = 0; i < 9; i++) {
        const up = u * (120 + r() * 120) * s;
        c.fillStyle = `rgba(${60 + i * 12},${60 + i * 12},${66 + i * 12},${0.8 * (1 - u * 0.6)})`;
        ellipse(c, neck.x + (r() - 0.5) * 120 * s * u, neck.y - up, (30 + 50 * u) * s, (24 + 40 * u) * s);
        c.fill();
      }
      if (u < 0.3) starBurst(c, neck.x, neck.y, 40 * s + 10, '#FFB23F');
      outlined(c, propTexts().poof, neck.x, neck.y - 200 * s - u * 40 * s, Math.round(20 + 16 * s), '#C8C8D0');
    } else {
      // The foam: a column of colored balls that rises, bends and overflows.
      const height = Math.min(1, u * 2.2) * 300 * s;
      const n = Math.floor(height / (16 * s));
      for (let i = 0; i < n; i++) {
        const k = i / Math.max(1, n - 1);
        const sway = Math.sin(i * 0.5 + t * 8) * 10 * s * k + (k > 0.75 ? (k - 0.75) * 160 * s : 0);
        const rr = (16 + 10 * k + 4 * Math.sin(i)) * s;
        c.fillStyle = FOAM[(i + Math.floor(t * 12)) % FOAM.length]!;
        ellipse(c, neck.x + sway, neck.y - i * 16 * s, rr, rr * 0.85);
        c.fill();
      }
      // What overflows: drips down the sides of the flask.
      const spill = Math.max(0, Math.min(1, (u - 0.25) / 0.4));
      for (const k of [-1, 1]) {
        c.fillStyle = FOAM[k > 0 ? 3 : 0]!;
        ellipse(c, neck.x + k * 24 * s, neck.y + spill * 70 * s, 14 * s, (10 + 40 * spill) * s);
        c.fill();
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + t * 4;
        starBurst(c, neck.x + Math.cos(a) * 110 * s * u, neck.y - height * 0.6 + Math.sin(a) * 70 * s, (8 + 6 * (i % 2)) * s + 3, '#FFF6B0');
      }
      outlined(c, propTexts().fsshh, neck.x + 120 * s, neck.y - height - 10 * s, Math.round(20 + 16 * s), '#FFFFFF');
    }
  }
  c.restore();
}

// ---------- Compact, birthday, fireworks, weekend and juggling ----------

/** A sheet of paper from the side: (x, y) its center. */
function sheet(c: X, x: number, y: number, s: number, rot: number, k = 0): void {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = k % 3 ? '#F7F5EE' : '#FFFFFF';
  c.fillRect(-16 * s, -11 * s, 32 * s, 22 * s);
  c.fillStyle = 'rgba(80,90,110,0.45)';
  for (let i = 0; i < 4; i++) c.fillRect(-12 * s, (-7 + i * 4.5) * s, (18 + ((k + i) % 3) * 3) * s, 1.4 * s);
  c.restore();
}

/**
 * Compacting the context: the cat feeds a mountain of papers into a press, turns
 * the crank and a tiny cube of paper comes out.
 */
export function paperPress(c: X, cat: Spot, t: number): void {
  const e = envelope(t);
  if (e <= 0) return;
  const { s } = cat;
  const px = cat.x + 230 * s, floor = cat.y - 4 * s;
  c.save();
  c.globalAlpha = e;
  // Bed and columns of the press.
  const frameTop = floor - 240 * s;
  c.fillStyle = '#5A6270';
  c.fillRect(px - 80 * s, floor - 14 * s, 160 * s, 14 * s);
  c.fillRect(px - 76 * s, frameTop, 12 * s, 226 * s);
  c.fillRect(px + 64 * s, frameTop, 12 * s, 226 * s);
  c.fillRect(px - 80 * s, frameTop - 14 * s, 160 * s, 16 * s);
  // The pile: it grows at first and is squashed while the plate goes down.
  const grow = Math.min(1, t / 0.25);
  const squash = t < 0.3 ? 0 : t < 0.7 ? (t - 0.3) / 0.4 : 1;
  const pileH = (190 * grow) * (1 - 0.86 * squash) * s;
  const n = Math.max(1, Math.round(16 * grow));
  for (let i = 0; i < n; i++) {
    const k = i / Math.max(1, n - 1);
    sheet(c, px + Math.sin(i * 2.1) * 10 * s * (1 - squash), floor - 14 * s - 10 * s - k * (pileH - 20 * s), s * (1 + 0.6 * (1 - squash)), Math.sin(i * 1.7) * 0.25 * (1 - squash), i);
  }
  if (squash >= 1) {
    // The cube.
    c.fillStyle = '#ECE8DC';
    c.fillRect(px - 16 * s, floor - 46 * s, 32 * s, 32 * s);
    c.strokeStyle = 'rgba(80,90,110,0.5)';
    c.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      c.beginPath();
      c.moveTo(px - 16 * s, floor - 46 * s + i * 6.4 * s);
      c.lineTo(px + 16 * s, floor - 46 * s + i * 6.4 * s);
      c.stroke();
    }
  }
  // The plate with its screw, and the crank that turns while it goes down.
  const plateY = squash < 1 ? floor - 14 * s - pileH - 10 * s : floor - 46 * s - 10 * s - (t > 0.78 ? ((t - 0.78) / 0.22) * 120 * s : 0);
  c.fillStyle = '#8A93A3';
  c.fillRect(px - 60 * s, plateY, 120 * s, 10 * s);
  c.fillStyle = '#B9C0CB';
  c.fillRect(px - 5 * s, frameTop, 10 * s, plateY - frameTop);
  const turn = t * 26;
  c.strokeStyle = '#C0392B';
  c.lineWidth = 5 * s;
  c.beginPath();
  c.moveTo(px, frameTop - 24 * s);
  c.lineTo(px + Math.cos(turn) * 50 * s, frameTop - 24 * s + Math.sin(turn) * 12 * s);
  c.stroke();
  c.fillStyle = '#2B2F38';
  ellipse(c, px + Math.cos(turn) * 50 * s, frameTop - 24 * s + Math.sin(turn) * 12 * s, 7 * s, 7 * s);
  c.fill();
  if (t > 0.3 && t < 0.75) pawPad(c, px + Math.cos(turn) * 50 * s, frameTop - 24 * s + Math.sin(turn) * 12 * s, s * 1.1, 0);
  if (t > 0.45 && t < 0.72) outlined(c, propTexts().crunch, px, frameTop - 60 * s, Math.round(16 + 12 * s), '#FFFFFF');
  if (squash >= 1) {
    starBurst(c, px + 26 * s, floor - 56 * s, 12 * s + 4, '#FFF6B0');
    outlined(c, propTexts().contextCompacted, px, frameTop - 60 * s, Math.round(14 + 10 * s), '#BFEFFF');
  }
  c.restore();
}

/** Repo birthday: a cake with one candle per year, which the cat blows out at the end. */
export function birthdayCake(c: X, cat: Spot, t: number, years: number): void {
  const e = envelope(t);
  if (e <= 0) return;
  const { s } = cat;
  const kx = cat.x + 220 * s, floor = cat.y - 2 * s;
  c.save();
  c.globalAlpha = e;
  // Plate, two tiers and icing.
  c.fillStyle = '#E8ECF2';
  ellipse(c, kx, floor, 90 * s, 14 * s);
  c.fill();
  const tier = (w: number, h: number, y: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(kx - w / 2, y - h, w, h);
    ellipse(c, kx, y - h, w / 2, 10 * s);
    c.fill();
    c.fillStyle = '#FFF4F8';
    for (let i = 0; i < 7; i++) {
      ellipse(c, kx - w / 2 + (i + 0.5) * (w / 7), y - h + 6 * s, 7 * s, 8 * s);
      c.fill();
    }
  };
  tier(150 * s, 50 * s, floor - 4 * s, '#E87AA4');
  tier(100 * s, 40 * s, floor - 54 * s, '#F2A8C4');
  const top = floor - 94 * s;
  // Candles: one per year (from ten on, a single one with the number).
  const n = Math.min(years, 9);
  const blown = t > 0.72;
  for (let i = 0; i < n; i++) {
    const vx = kx + (i - (n - 1) / 2) * 11 * s;
    c.fillStyle = ['#4FC3FF', '#FFE45C', '#5BE07A'][i % 3]!;
    c.fillRect(vx - 2.5 * s, top - 26 * s, 5 * s, 26 * s);
    if (!blown) {
      const fl = 1 + 0.25 * Math.sin(t * 60 + i);
      c.fillStyle = 'rgba(255,200,80,0.35)';
      ellipse(c, vx, top - 32 * s, 8 * s * fl, 11 * s * fl);
      c.fill();
      c.fillStyle = '#FFB23F';
      ellipse(c, vx, top - 32 * s, 3.5 * s, 7 * s * fl);
      c.fill();
    } else {
      const u = (t - 0.72) / 0.28;
      c.strokeStyle = `rgba(200,200,210,${0.7 * (1 - u)})`;
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(vx, top - 28 * s);
      c.quadraticCurveTo(vx + 8 * s, top - 40 * s - u * 20 * s, vx - 4 * s, top - 56 * s - u * 30 * s);
      c.stroke();
    }
  }
  // The blowing, from left to right.
  if (t > 0.62 && t < 0.78) {
    c.strokeStyle = 'rgba(255,255,255,0.8)';
    c.lineWidth = 2;
    for (const dy of [-6, 0, 6]) {
      c.beginPath();
      c.moveTo(kx - 110 * s, top - 30 * s + dy * s);
      c.lineTo(kx - 60 * s, top - 30 * s + dy * s);
      c.stroke();
    }
  }
  outlined(c, propTexts().years(years), kx, top - 70 * s, Math.round(18 + 14 * s), '#FFE58A');
  c.restore();
}

/** The points of a text for the drones, cached per text. */
const textDots = new Map<string, { x: number; y: number }[]>();
function dotsOf(text: string): { x: number; y: number }[] {
  const hit = textDots.get(text);
  if (hit) return hit;
  const cv = createCanvas(12 + text.length * 22, 40);
  const g = cv.getContext('2d');
  g.fillStyle = '#FFFFFF';
  g.font = `bold 32px ${COND}`;
  g.textBaseline = 'top';
  g.fillText(text, 4, 4);
  const { data, width, height } = g.getImageData(0, 0, cv.width, cv.height);
  const dots: { x: number; y: number }[] = [];
  for (let y = 0; y < height; y += 4) for (let x = 0; x < width; x += 4) if (data[(y * width + x) * 4 + 3]! > 128) dots.push({ x, y });
  textDots.set(text, dots);
  return dots;
}

/**
 * A published version: a swarm of light drones takes off from the cat, draws the
 * version number in the sky and bursts into fireworks.
 */
export function droneShow(c: X, cat: Spot, t: number, label: string, W: number): void {
  const dots = dotsOf(label);
  if (!dots.length) return;
  const K = 2.6;
  const w = Math.max(...dots.map((d) => d.x)) * K;
  const ox = Math.max(40, Math.min(W - 40 - w, cat.x - w / 2)), oy = 22;
  const r = rng(hashLabel(label));
  const cols = ['#FF5A7A', '#FFE45C', '#5BE07A', '#4FC3FF', '#9B6BFF', '#FFFFFF'];
  c.save();
  dots.forEach((d, i) => {
    const sx = cat.x + (r() - 0.5) * 60, sy = cat.y - 200 * cat.s;
    const tx = ox + d.x * K, ty = oy + d.y * K;
    const delay = r() * 0.12;
    const u = Math.max(0, Math.min(1, (t - 0.08 - delay) / 0.3));
    const ease = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
    let x = sx + (tx - sx) * ease, y = sy + (ty - sy) * ease;
    let alpha = Math.min(1, u * 3);
    if (t > 0.82) {
      // Burst: each light shoots outwards and fades.
      const b = (t - 0.82) / 0.18;
      const ang = r() * Math.PI * 2;
      x += Math.cos(ang) * 120 * b;
      y += Math.sin(ang) * 120 * b + 40 * b * b;
      alpha = 1 - b;
    }
    if (alpha <= 0) return;
    const col = cols[i % cols.length]!;
    const twinkle = t > 0.45 && t < 0.82 ? 0.7 + 0.3 * Math.sin(t * 50 + i) : 1;
    c.globalAlpha = alpha * twinkle;
    c.fillStyle = radial(c, x, y, 0, 11, [[0, col], [1, 'rgba(0,0,0,0)']]);
    c.fillRect(x - 11, y - 11, 22, 22);
    c.fillStyle = col;
    ellipse(c, x, y, 3.5, 3.5);
    c.fill();
  });
  c.restore();
}

function hashLabel(s: string): number {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h;
}

/**
 * Working on the weekend: straw hat, a deck chair that unfolds beside it, a
 * cocktail... and back to folding it. "...on a Saturday".
 */
export function weekendBreak(c: X, cat: Spot, t: number, day: string): void {
  const e = envelope(t);
  if (e <= 0) return;
  const { s } = cat;
  const bx = cat.x + 230 * s, floor = cat.y - 2 * s;
  const open = t < 0.3 ? t / 0.3 : t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
  c.save();
  c.globalAlpha = e;
  // The deck chair, from the side: folded (leaning, narrow) or open (seat and back).
  const k = s * 1.5;
  const stripe = (x0: number, y0: number, x1: number, y1: number) => {
    for (let i = 0; i < 5; i++) {
      const a0 = i / 5, a1 = (i + 1) / 5;
      c.strokeStyle = i % 2 ? '#FFFFFF' : '#3F7FE0';
      c.lineWidth = 12 * k;
      c.beginPath();
      c.moveTo(x0 + (x1 - x0) * a0, y0 + (y1 - y0) * a0);
      c.lineTo(x0 + (x1 - x0) * a1, y0 + (y1 - y0) * a1);
      c.stroke();
    }
  };
  c.strokeStyle = '#8A5A34';
  c.lineWidth = 4 * k;
  c.lineCap = 'round';
  if (open > 0.5) {
    const seatY = floor - 22 * k, back = { x: bx - 70 * k, y: floor - 85 * k };
    c.beginPath();
    c.moveTo(bx - 50 * k, floor);
    c.lineTo(bx + 40 * k, seatY);
    c.moveTo(bx + 40 * k, floor);
    c.lineTo(bx - 40 * k, seatY);
    c.stroke();
    stripe(bx - 40 * k, seatY, bx + 50 * k, seatY);
    stripe(bx - 40 * k, seatY, back.x, back.y);
  } else {
    c.beginPath();
    c.moveTo(bx - 10 * k, floor);
    c.lineTo(bx - 4 * k, floor - 110 * k);
    c.moveTo(bx + 10 * k, floor);
    c.lineTo(bx + 4 * k, floor - 110 * k);
    c.stroke();
    stripe(bx, floor - 10 * k, bx, floor - 105 * k);
  }
  // The cocktail with its little umbrella, when it is open.
  if (open > 0.8) {
    const gx = bx + 95 * s, gy = floor;
    c.fillStyle = 'rgba(220,240,255,0.6)';
    c.beginPath();
    c.moveTo(gx - 16 * s, gy - 50 * s);
    c.lineTo(gx + 16 * s, gy - 50 * s);
    c.lineTo(gx, gy - 24 * s);
    c.fill();
    c.fillStyle = '#FFB23F';
    c.beginPath();
    c.moveTo(gx - 12 * s, gy - 47 * s);
    c.lineTo(gx + 12 * s, gy - 47 * s);
    c.lineTo(gx, gy - 29 * s);
    c.fill();
    c.fillStyle = '#9AA3AE';
    c.fillRect(gx - 1.5 * s, gy - 24 * s, 3 * s, 22 * s);
    c.fillStyle = '#E8549A';
    c.beginPath();
    c.arc(gx + 10 * s, gy - 58 * s, 12 * s, Math.PI, 0);
    c.fill();
  }
  outlined(c, propTexts().weekendIn(day), bx, floor - 190 * s, Math.round(16 + 12 * s), '#FFE58A');
  c.restore();
}

/** Straw hat for the weekend; (x, y) top of the head. */
export function strawHat(c: X, x: number, y: number, s: number): void {
  c.save();
  c.fillStyle = '#E2C27A';
  ellipse(c, x, y + 16 * s, 90 * s, 18 * s);
  c.fill();
  ellipse(c, x, y - 4 * s, 50 * s, 28 * s);
  c.fill();
  c.fillStyle = '#C0392B';
  c.fillRect(x - 50 * s, y + 4 * s, 100 * s, 8 * s);
  c.restore();
}

/**
 * A command that touches many files (format, `sed -i`, a codemod): the cat juggles
 * the sheets; if it fails, they all fall on it.
 */
export function juggling(c: X, cat: Spot, t: number, failed: boolean): void {
  const e = envelope(t);
  if (e <= 0) return;
  const { x, s } = cat;
  const y = cat.y - 230 * s;
  const drop = failed ? 0.5 : 2;
  c.save();
  c.globalAlpha = e;
  if (t < drop) {
    pawPad(c, x - 70 * s, y + 30 * s - Math.abs(Math.sin(t * 20)) * 14 * s, s * 1.1, 0.3);
    pawPad(c, x + 70 * s, y + 30 * s - Math.abs(Math.cos(t * 20)) * 14 * s, s * 1.1, -0.3);
    for (let i = 0; i < 5; i++) {
      const u = (t * 3 + i / 5) % 1;
      const px = x - 70 * s + 140 * s * u, py = y - Math.sin(Math.PI * u) * 130 * s;
      sheet(c, px, py, s * 1.2, u * 6, i);
    }
    if (!failed) outlined(c, propTexts().files(5 + Math.floor(t * 30)), x, y - 160 * s, Math.round(14 + 10 * s), '#FFFFFF');
  } else {
    const u = (t - drop) / (1 - drop);
    const r = rng(23);
    for (let i = 0; i < 9; i++) {
      const fx = x + (r() - 0.5) * 320 * s, fall = Math.min(1, u * 2.5 + r() * 0.2);
      sheet(c, fx, y - 60 * s + (cat.y - y + 50 * s) * fall, s * 1.2, r() * 6 + u * 3, i);
    }
    outlined(c, propTexts().oops, x, y - 120 * s, Math.round(18 + 14 * s), '#FF8080');
  }
  c.restore();
}
