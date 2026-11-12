import { test } from 'node:test';
import assert from 'node:assert';
import { HEAT_WINDOW_MS, type HeatSample, pushSample, sustainedHeat } from './heat.ts';

const series = (temps: number[], stepMs = 5000, end = 100_000): HeatSample[] =>
  temps.map((temp, i) => ({ at: end - (temps.length - 1 - i) * stepMs, temp }));

test('Heat: a lone spike does not count', () => {
  assert.strictEqual(sustainedHeat(series([55, 60, 99, 58, 62, 57, 60]), 100_000, 85), false);
});

test('Heat: if it lasts the whole window, it does', () => {
  assert.strictEqual(sustainedHeat(series([90, 92, 95, 91, 93, 94, 96]), 100_000, 85), true);
});

test('Heat: without readings covering the window we do not know, and the answer is no', () => {
  assert.strictEqual(sustainedHeat(series([95, 96]), 100_000, 85), false, 'just started');
  assert.strictEqual(sustainedHeat([], 100_000, 85), false);
  // A long gap without samples is not "hot the whole time" either.
  assert.strictEqual(sustainedHeat([{ at: 100_000 - HEAT_WINDOW_MS * 3, temp: 99 }, { at: 100_000, temp: 99 }], 100_000, 85), false);
});

test('Heat: one dip is enough for the fireman to leave', () => {
  assert.strictEqual(sustainedHeat(series([95, 95, 95, 70, 95, 95, 95]), 100_000, 85), false);
});

test('Heat: the list does not grow without end', () => {
  let list: HeatSample[] = [];
  for (let i = 0; i < 1000; i++) list = pushSample(list, { at: i * 5000, temp: 60 });
  assert.ok(list.length <= (HEAT_WINDOW_MS * 2) / 5000 + 1);
});
