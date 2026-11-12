/**
 * The cabinet at the back: on its two shelves, the week of work (see
 * shelf.ts): one book per commit, in the colour of its repo, and one binder
 * per merged MR/PR. On the plinth, a plate with the week number and the
 * count, and little bars for the last weeks to compare. It empties itself
 * every Monday. On top, the week's LEGO sets, in miniature (see trophies.ts).
 */
import { trophyMinis } from './lego.ts';
import { type X, hashString, radial } from './paint.ts';
import type { ShelfView } from './shelf.ts';

/** Width of the cabinet, in design units. */
export const SHELF_W = 300;

const KICK = 16, ROW = 34, BOARD = 4, TOP = 8;
/** Height of the cabinet, from the floor to the top of the upper board. */
export const CABINET_H = KICK + 2 * (ROW + BOARD) + TOP;

const hue = (repo: string) => hashString(repo) % 360;

/** A book spine or a binder; (x, base) is the bottom left corner. Returns its width. */
function volume(c: X, x: number, base: number, repo: string, i: number, mr: boolean, night: boolean): number {
  const h = hue(repo), seed = hashString(`${repo}#${i}`);
  const light = night ? 0.55 : 1;
  if (mr) {
    const w = 12, ht = ROW - 5;
    c.fillStyle = `hsl(${h},45%,${30 * light}%)`;
    c.fillRect(x, base - ht, w, ht);
    c.fillStyle = night ? '#9A9A92' : '#F2F0E6';
    c.fillRect(x + 2, base - ht + 5, w - 4, 7);
    c.fillStyle = `hsl(${h},45%,${18 * light}%)`;
    c.beginPath();
    c.arc(x + w / 2, base - 8, 2.2, 0, Math.PI * 2);
    c.fill();
    return w;
  }
  const w = 4 + (seed % 4), ht = ROW - 14 + ((seed >> 3) % 10);
  c.fillStyle = `hsl(${h},${50 + ((seed >> 5) % 15)}%,${(38 + ((seed >> 7) % 14)) * light}%)`;
  c.fillRect(x, base - ht, w, ht);
  // The bands of the spine.
  c.fillStyle = 'rgba(255,255,255,0.28)';
  c.fillRect(x, base - ht + 3, w, 1.5);
  c.fillRect(x, base - 5, w, 1.5);
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.fillRect(x + w - 1, base - ht, 1, ht);
  return w;
}

/** The plate's text: week number and count. */
export function shelfLabel(shelf: ShelfView, weekWord: string): string {
  const now = shelf.weeks[shelf.weeks.length - 1] ?? { commits: 0, mrs: 0 };
  return `${weekWord} ${shelf.week} · ${now.commits} commit${now.commits === 1 ? '' : 's'}${now.mrs ? ` · ${now.mrs} MR` : ''}`;
}

/**
 * The cabinet with everything, standing on the floor at the back; (x, y) is
 * the bottom left corner. Without a shelf it isn't painted.
 */
export function drawCabinet(c: X, x: number, y: number, shelf: ShelfView | null, night: boolean, weekWord = 'wk', trophies: string[] = []): void {
  if (!shelf && !trophies.length) return;
  const W = SHELF_W, top = y - CABINET_H;
  c.save();
  if (night) {
    c.fillStyle = radial(c, x + W / 2, top - 10, 0, W * 0.7, [[0, 'rgba(255,214,140,0.28)'], [1, 'rgba(255,214,140,0)']]);
    c.fillRect(x - W * 0.15, top - W * 0.5, W * 1.3, W * 0.5 + CABINET_H);
  }
  const wood = night ? '#3B2E26' : '#6B4A32', dark = night ? '#1E1712' : '#3A281B', edge = night ? '#2A211B' : '#4E3524';
  // Body: dark back, sides, top board, shelves and plinth.
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.fillRect(x + 4, y - 2, W, 5);
  c.fillStyle = dark;
  c.fillRect(x, top, W, CABINET_H);
  c.fillStyle = wood;
  c.fillRect(x - 3, top, W + 6, TOP);
  c.fillRect(x, top, 6, CABINET_H);
  c.fillRect(x + W - 6, top, 6, CABINET_H);
  const baseB = y - KICK, baseA = baseB - ROW - BOARD;
  c.fillRect(x, baseA, W, BOARD);
  c.fillRect(x, baseB, W, BOARD);
  c.fillStyle = edge;
  c.fillRect(x, y - KICK + BOARD, W, KICK - BOARD);
  // The books: the lower shelf first, then the upper one.
  if (shelf) drawShelf(c, x, y, W, baseA, baseB, shelf, night, weekWord);
  // On top, the LEGO sets built this week.
  if (trophies.length) trophyMinis(c, trophies, x, top, night);
  c.restore();
}

/** The week's work: books and binders on the two shelves, and the plate on the plinth. */
function drawShelf(c: X, x: number, y: number, W: number, baseA: number, baseB: number, shelf: ShelfView, night: boolean, weekWord: string): void {
  const inner = W - 16;
  let row = 0, cx = 0, shown = 0;
  for (const [i, b] of shelf.books.entries()) {
    const need = b.mr ? 12 : 7;
    if (cx + need > inner) {
      if (row === 1) break;
      row = 1;
      cx = 0;
    }
    cx += volume(c, x + 8 + cx, row === 0 ? baseB : baseA, b.repo, i, b.mr, night) + 1;
    shown++;
  }
  const rest = shelf.books.length - shown;
  c.font = 'bold 11px sans-serif';
  if (rest > 0) {
    c.fillStyle = night ? '#C9B98F' : '#F3E3B5';
    c.textAlign = 'right';
    c.fillText(`+${rest}`, x + W - 9, baseA - 4);
  }
  // The plate: week and count, and the little bars of the last weeks.
  c.fillStyle = night ? '#C9B98F' : '#F3E3B5';
  c.textAlign = 'left';
  c.fillText(shelfLabel(shelf, weekWord), x + 9, y - 3);
  const max = Math.max(1, ...shelf.weeks.map((w) => w.commits + w.mrs));
  shelf.weeks.forEach((w, i) => {
    const h = Math.max(1, Math.round(((w.commits + w.mrs) / max) * (KICK - BOARD - 3)));
    c.fillStyle = i === shelf.weeks.length - 1 ? (night ? '#E8C26A' : '#FFD27A') : night ? '#6E6152' : '#B49A78';
    c.fillRect(x + W - 9 - (shelf.weeks.length - i) * 7, y - 2 - h, 5, h);
  });
}
