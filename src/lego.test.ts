import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { registerFonts } from '@kiosko/core';
import { useCanvas } from './canvas.ts';
import { SETS, STEPS, bricksOf, drawBuildBehind, drawBuildFront, drawTrophies, planBuild, stageAt, trophyMinis } from './lego.ts';
import * as props from './props.ts';

registerFonts();
useCanvas({ createCanvas, loadImage });

const ctx = () => createCanvas(900, 500).getContext('2d');

test('lego: every set has a piece list that covers its non-empty cells', () => {
  for (const set of SETS) {
    const bricks = bricksOf(set);
    assert.ok(bricks.length > 50, set.id);
    let cells = 0;
    for (let r = 0; r < set.rows; r++) for (let c = 0; c < set.cols; c++) if (set.cell(c, r)) cells++;
    assert.equal(bricks.reduce((n, b) => n + b.len, 0), cells, `${set.id}: pieces tile the model exactly`);
  }
});

test('lego: the build stages go from nothing to the finished model', () => {
  assert.equal(stageAt(0).show, 0);
  assert.equal(stageAt(0.5).show, 1);
  assert.equal(stageAt(0.2).step < STEPS, true);
  assert.equal(stageAt(0.9).built, 1);
  assert.equal(stageAt(1).show, 0);
});

test('lego: the plan picks a set that fits and a side with room', () => {
  const p = planBuild(300, 420, 1, 3, 0, 900);
  assert.equal(p.dir, 1);
  assert.ok(SETS.includes(p.set));
  const tiny = planBuild(450, 100, 1, 3, 400, 500);
  assert.ok(SETS.includes(tiny.set), 'falls back to the smallest set');
});

test('lego: the build paints something while it lasts and nothing outside it', () => {
  const p = planBuild(300, 420, 1, 3, 0, 900);
  const blank = ctx().getImageData(0, 0, 900, 500).data;
  const c = ctx();
  drawBuildBehind(c, p, 0);
  drawBuildFront(c, p, 0);
  assert.deepEqual(c.getImageData(0, 0, 900, 500).data, blank);
  for (const t of [0.05, 0.4, 0.7, 0.86]) {
    const g = ctx();
    drawBuildBehind(g, p, t);
    drawBuildFront(g, p, t);
    assert.notDeepEqual(g.getImageData(0, 0, 900, 500).data, blank, `t=${t}`);
  }
  drawBuildBehind(ctx(), { ...p, night: true }, 0.6);
});

test('lego: the trophy shelf shows the last ones that fit', () => {
  const c = ctx();
  assert.equal(drawTrophies(c, [], 10, 280, false), 0);
  assert.equal(drawTrophies(c, ['comarca'], 10, 280, false), 1);
  const many = ['titanic', 'coliseo', 'rivendel', 'comarca', 'taj'];
  const n = drawTrophies(c, many, 10, 280, false);
  assert.ok(n >= 2 && n < many.length, `${n} fit`);
  assert.equal(trophyMinis(c, many, 10, 250, true), n);
});

test('props: every gesture prop draws without throwing', () => {
  const c = ctx();
  const cat = { x: 450, y: 420, s: 1 };
  const other = { x: 700, y: 420, s: 0.8 };
  const coat = { fur: { deep: [20, 20, 20], dark: [60, 50, 40], mid: [140, 120, 90], light: [200, 180, 150], top: [230, 220, 200] } } as never;
  for (const t of [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1]) {
    props.typing(c, 450, 420, 1, t); props.yarn(c, 450, 420, 1, t); props.fish(c, 450, 420, 1, t);
    props.kittens(c, coat, 450, 420, 1, t); props.papers(c, 450, 420, 1, t); props.tv(c, 450, 420, 1, null, true);
    props.coffee(c, 450, 420, 1, t); props.piggy(c, 450, 420, 1, t, 42); props.catapult(c, 450, 420, 1, t);
    props.tangle(c, 450, 420, 1, t); props.confetti(c, 900, 500, t); props.highFive(c, cat, other, t);
    props.wand(c, { x: 400, y: 300 }, { x: 700, y: 300 }, 1, t); props.mugPush(c, cat, other, 80, t);
    props.fallingBox(c, 450, 300, 1, t); props.butterfly(c, cat, t); props.cards(c, cat, t, t > 0.5);
    props.lgtmStamp(c, cat, t); props.steamroller(c, cat, t); props.cherryPick(c, cat, { x: 600, y: 300 }, t);
    props.crane(c, cat, t); props.delivery(c, cat, t, 900); props.slipper(c, cat, t, 900); props.portal(c, 450, 420, 1, t);
    props.popcorn(c, cat, t); props.catBook(c, cat, t); props.spaghetti(c, cat, t); props.rubberDuck(c, cat, t);
    props.postIts(c, cat, t, 5); props.windowDrops(c, { x: 100, y: 50, w: 200, h: 200 }, cat, t);
    props.cocoa(c, cat, t); props.windPapers(c, 100, 100, 800, 420, t); props.blueprint(c, 450, 420, t);
    props.legoTower(c, cat, t, t > 0.5); props.legoMerge(c, cat, t, t > 0.5); props.deployDrone(c, cat, t, 900);
    props.droneSwarm(c, cat, t, 900); props.pilotDrone(c, cat, t, 900); props.chemistry(c, cat, t, t > 0.5);
    props.paperPress(c, cat, t); props.birthdayCake(c, cat, t, 3); props.droneShow(c, cat, t, 'v1.2', 900);
    props.weekendBreak(c, cat, t, 'sábado'); props.juggling(c, cat, t, t > 0.5);
  }
  props.wizardHat(c, 450, 200, 1); props.sageGlasses(c, 450, 200, 1); props.hardHat(c, 450, 200, 1);
  props.crown(c, 450, 200, 1); props.royalty(c, 450, 200, 1); props.woolHat(c, 450, 200, 1); props.strawHat(c, 450, 200, 1);
  props.labGoggles(c, 450, 200, 1); props.magnifier(c, 450, 200, 1); props.pointAtYou(c, 450, 200, 1, 0.5);
  props.branchHat(c, 450, 200, 1, 'feature/x'); props.remoteDesk(c, 450, 420, 1, 'host'); props.lampGrip(c, 450, 200, 1);
  props.speedLines(c, 450, 420, 1, 1, 5); props.fallingLeaves(c, 450, 300, 1, 0.5);
  props.cardboard(c, 450, 420, 80, 60, 3); props.boxPile(c, 0, 900, 420, 2); props.boxWall(c, 450, 420, 1);
});
