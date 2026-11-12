import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { addTrophy, loadTrophies, thisWeek } from './trophies.ts';

const DAY = 86_400_000;
const THU = new Date(2026, 9, 8, 12, 0).getTime();
const MON = new Date(2026, 9, 5, 0, 0).getTime();

test('trophies: this week only, in the order they were built', () => {
  const list = [{ id: 'taj', at: MON + 5 * 3_600_000 }, { id: 'titanic', at: MON - DAY }, { id: 'halcon', at: MON + DAY }, { id: 'future', at: THU + DAY }];
  assert.deepEqual(thisWeek(list, THU), ['taj', 'halcon']);
});

test('trophies: noted in a file, those older than two weeks forgotten, a broken file is no trophies', () => {
  const dir = mkdtempSync(join(tmpdir(), 'trofeos-'));
  const path = join(dir, 'trophies.json');
  assert.deepEqual(loadTrophies(path), []);
  addTrophy(path, 'old', THU - 20 * DAY);
  addTrophy(path, 'taj', THU - DAY);
  const list = addTrophy(path, 'halcon', THU);
  assert.deepEqual(list.map((t) => t.id), ['taj', 'halcon']);
  assert.deepEqual(loadTrophies(path).map((t) => t.id), ['taj', 'halcon']);
});
