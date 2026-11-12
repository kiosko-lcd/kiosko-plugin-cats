import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { registerFonts } from '@kiosko/core';
import { useCanvas } from './canvas.ts';
import { EN, ES, propTexts, propTextsFor, usePropTexts, type PropTexts } from './prop-texts.ts';
import { outlined, birthdayCake } from './props.ts';
import type { X } from './paint.ts';

registerFonts();
useCanvas({ createCanvas, loadImage });
afterEach(() => usePropTexts(ES));

test('prop-texts: ES and EN have the same keys and no empty strings', () => {
  assert.deepEqual(Object.keys(EN).sort(), Object.keys(ES).sort());
  for (const table of [ES, EN]) {
    for (const [k, v] of Object.entries(table)) {
      if (typeof v === 'string') assert.ok(v.length > 0, k);
    }
  }
  assert.equal(propTextsFor('es').id, 'es');
  assert.equal(propTextsFor('en').id, 'en');
  assert.equal(propTexts().id, 'es', 'Spanish by default');
});

test('prop-texts: the functions return strings with their numbers', () => {
  for (const t of [ES, EN]) {
    assert.match(t.years(3), /3/);
    assert.match(t.weekendIn('x-day'), /x-day/);
    assert.match(t.packages(137), /137/);
    assert.match(t.files(12), /12/);
    assert.match(t.subagents(4), /4/);
    assert.match(t.piece('1.234', '9.090'), /1\.234.*9\.090/);
    assert.match(t.boxPieces('10294', '9.090'), /10294.*9\.090/);
    assert.match(t.finishedModel('Titanic', '10294', '9.090', 135), /Titanic.*10294.*9\.090.*135/);
    assert.match(t.thisWeek(5, 0), /5/);
    assert.match(t.thisWeek(5, 2), /5.*2/);
  }
  assert.equal(ES.years(1), '¡1 año!');
  assert.equal(EN.years(2), '2 years!');
});

test('prop-texts: no Spanish literals are left in props.ts or lego.ts', () => {
  // Exception: the keycaps of the `typing` gesture (an ñ on a Spanish keyboard, not a word).
  const allowed = ["'asdfjklñ{}();='"];
  for (const file of ['props.ts', 'lego.ts']) {
    const src = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8');
    for (const [i, line] of src.split('\n').entries()) {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
      // LEGO set definitions: official set names are data, not texts.
      if (/^\s*\{ id: '[^']+', name: /.test(line)) continue;
      const code = line.replace(/\s\/\/.*$/, '');
      for (const lit of code.match(/'[^'\n]*'|"[^"\n]*"|`[^`\n]*`/g) ?? []) {
        if (/[¡¿ñáéíóúÑ]/.test(lit) && !allowed.includes(lit)) assert.fail(`${file}:${i + 1}: ${lit}`);
      }
    }
  }
});

function spy(): { c: X; texts: string[] } {
  const ctx = createCanvas(600, 400).getContext('2d');
  const texts: string[] = [];
  const c = new Proxy(ctx, {
    get(target, key) {
      const v = Reflect.get(target, key, target);
      if (key === 'fillText') return (t: string, ...rest: number[]) => { texts.push(t); return (v as Function).call(target, t, ...rest); };
      return typeof v === 'function' ? v.bind(target) : v;
    },
    set(target, key, value) { return Reflect.set(target, key, value, target); },
  }) as unknown as X;
  return { c, texts };
}

test('prop-texts: changing the language changes the text a drawing paints', () => {
  const paint = (t: PropTexts) => {
    usePropTexts(t);
    const { c, texts } = spy();
    birthdayCake(c, { x: 300, y: 350, s: 1 }, 0.5, 3);
    outlined(c, propTexts().bump, 100, 100, 20, '#FFF');
    return texts.join('|');
  };
  const es = paint(ES);
  const en = paint(EN);
  assert.ok(es.includes('¡3 años!'), es);
  assert.ok(en.includes('3 years!'), en);
  assert.ok(es.includes('¡choca!') && en.includes('bonk!'));
});
