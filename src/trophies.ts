/**
 * The trophies: the LEGO sets the cats have built this week (see lego.ts).
 * They are noted when each build ends, in a file of the plugin's data
 * directory, and the cabinet at the back shows the ones of this week, which
 * starts on Monday at 00:00.
 */
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { weekStart } from './shelf.ts';

export interface Trophy {
  id: string;
  at: number;
}

export { weekStart };

/** This week's ids, in the order they were built. */
export function thisWeek(list: Trophy[], now: number): string[] {
  const from = weekStart(now);
  return list.filter((t) => t.at >= from && t.at <= now).sort((a, b) => a.at - b.at).map((t) => t.id);
}

export function loadTrophies(path: string): Trophy[] {
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown;
    return Array.isArray(raw) ? raw.filter((t): t is Trophy => typeof t?.id === 'string' && typeof t?.at === 'number') : [];
  } catch {
    return [];
  }
}

/** Notes one and forgets those of more than two weeks ago. Writes at once (rename). */
export function addTrophy(path: string, id: string, now: number): Trophy[] {
  const keep = loadTrophies(path).filter((t) => t.at >= weekStart(now) - 7 * 86_400_000);
  const list = [...keep, { id, at: now }];
  writeFileSync(`${path}.tmp`, JSON.stringify(list), 'utf8');
  renameSync(`${path}.tmp`, path);
  return list;
}
