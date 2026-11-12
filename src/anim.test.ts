import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DURATION, FORCED_KINDS, type GestureKind, HOLD, branchOf, candidates, frameTimes, gestureAt, holdIndex, nextGap, pickGesture,
  placements, planGesture, poseAt, quietHours, significantMove, toolGesture,
} from './anim.ts';
import { type LayoutConfig, layoutScene } from './layout.ts';
import type { SessionView } from './types.ts';

const KINDS = Object.keys(DURATION) as GestureKind[];
const MIN = 60_000;
const T0 = Date.parse('2026-11-05T10:42:00');
const CFG: LayoutConfig = { zombieMs: 15 * MIN, side: 'derecha', swapSidesMs: 0 };

const rec = (id: string, state: SessionView['state'], ago: number, extra: Partial<SessionView> = {}): SessionView => ({
  schemaVersion: 1, session_id: id, provider: 'claude', state, detail: '', project: id, cwd: `/r/${id}`, since: T0 - ago, updated: T0 - 2_000, event: 'x', ...extra,
});

test('Gestures: all start and end at rest', () => {
  for (const k of KINDS) {
    for (const t of [0, 1]) {
      const p = poseAt(k, t);
      assert.ok(!(p.lid || p.swing || p.yawn || p.ear), `${k} at t=${t} should be at rest`);
    }
  }
  assert.equal(poseAt('parpadeo', 0.5).lid, 1, 'halfway through a blink, eye closed');
  assert.equal(poseAt('bostezo', 0.5).yawn, 1);
});

test('Gestures: parameters are quantized, so the cache hits', () => {
  const seen = new Set<string>();
  for (let i = 0; i <= 100; i++) seen.add(JSON.stringify(poseAt('cola', i / 100)));
  assert.ok(seen.size <= 9, `too many tail variants: ${seen.size}`);
});

test('Gestures: frames from first to last, with the requested duration', () => {
  const t = frameTimes('cola', 6);
  assert.equal(t[0], 0);
  assert.equal(t[t.length - 1], 1);
  assert.equal(t.length, Math.round(DURATION.cola * 6) + 1);
  assert.ok(frameTimes('parpadeo', 1).length >= 2);
});

test('Gestures: each pose does what suits it', () => {
  const fresh = layoutScene([rec('e', 'waiting', MIN)], T0, CFG, 1920).actors;
  assert.ok(!candidates(fresh, T0, false).some((c) => c.kind === 'bostezo'), 'no yawn from one that just started waiting');
  const bored = layoutScene([rec('e', 'waiting', 9 * MIN)], T0, CFG, 1920).actors;
  assert.ok(candidates(bored, T0, false).some((c) => c.kind === 'bostezo'));
  const f = '/r/x/a.ts';
  const fight = layoutScene([
    rec('a', 'active', MIN, { cwd: '/r/x', files: [f], dirtyFiles: ['a.ts'] }),
    rec('b', 'ready', MIN, { cwd: '/r/x', files: [f], dirtyFiles: ['a.ts'] }),
  ], T0, CFG, 1920).actors;
  // The ones stepping on each other only do one thing: duel (see duel.ts).
  assert.ok(candidates(fight, T0, false).length > 0);
  assert.ok(candidates(fight, T0, false).every((c) => c.kind === 'duelo'));
  assert.ok(candidates([], T0, true).some((c) => c.id === 'bombero'), 'with a hot CPU, the fireman too');
  assert.equal(pickGesture([], T0, false), null);
});

test('Gestures: the pause between gestures stays between the two limits', () => {
  assert.equal(nextGap(15_000, 40_000, () => 0), 15_000);
  assert.equal(nextGap(15_000, 40_000, () => 0.9999999), 15_000 + 0.9999999 * 25_000);
  assert.equal(nextGap(100, 50, () => 0.5), 1000, 'with absurd limits, at least one second');
});

test('Gestures: pickGesture is deterministic with an injected rnd', () => {
  const bored = layoutScene([rec('e', 'waiting', 9 * MIN)], T0, CFG, 1920).actors;
  const all = candidates(bored, T0, false);
  assert.deepEqual(pickGesture(bored, T0, false, () => 0), all[0]);
  assert.deepEqual(pickGesture(bored, T0, false, () => 0.999999), all[all.length - 1]);
  assert.deepEqual(candidates(bored, T0, false, { away: true }), [], 'away: no gestures');
});

test('Gestures: each tool has its own, with the real names', () => {
  const cases: [string, string | null][] = [
    ['Bash: npm test -- --watch=false', 'ovillo'],
    ['Bash: pytest -q tests/', 'ovillo'],
    ['Bash: git status', 'teclea'],
    ['Edit: /datos/x/src/a.ts', 'teclea'],
    ['Write: README.md', 'teclea'],
    ['Agent: review the branch', 'gatitos'],
    ['WebFetch: https://example.com', 'peces'],
    ['WebSearch: napi canvas leak', 'peces'],
    ['mcp__Claude_Browser__browser_batch', 'peces'],
    ['Read: /etc/hosts', 'folios'],
    ['Grep "registerFromPath"', 'rebusca'],
    ['run_shell_command: ls', 'teclea'],
    ['read_file: a.ts', 'folios'],
    ['AskUserQuestion', null],
    ['', null],
    ['Bash: git push --force origin x', 'apisonadora'],
    ['Bash: git push -f', 'apisonadora'],
    ['Bash: git push --force-with-lease', 'apisonadora'],
    ['Bash: git push origin main', 'catapulta'],
    ['Bash: git rebase -i HEAD~3', 'cartas'],
    ['Bash: gh pr review 12 --approve', 'lgtm'],
    ['Bash: gh pr merge 12 --squash', 'lgtm'],
    ['Bash: glab mr approve 3', 'lgtm'],
    ['Bash: gh pr view 12', 'teclea'],
    ['Bash: git blame -L 10,20 a.ts', 'lupa'],
    ['Bash: git switch main', 'voltereta'],
    ['Bash: git checkout -b hotfix/login', 'voltereta'],
    ['Bash: git checkout -- src/a.ts', 'teclea'],
    ['Bash: git cherry-pick abc123', 'cereza'],
  ];
  for (const [detail, want] of cases) assert.equal(toolGesture(detail), want, detail);
  assert.equal(branchOf('Bash: git checkout -b hotfix/login'), 'hotfix/login');
  assert.equal(branchOf('Bash: git switch main'), 'main');
  assert.equal(branchOf('Bash: git switch -c feature/gatos'), 'feature/gatos');
});

test('Gestures: the tool one only for whoever works, and it counts double', () => {
  const r = (id: string, state: SessionView['state'], detail: string) => rec(id, state, MIN, { detail });
  const L = layoutScene([r('w', 'active', 'Agent: three subagents'), r('p', 'permission', 'Agent: something else')], T0, CFG, 1920).actors;
  const c = candidates(L, T0, false);
  assert.equal(c.filter((x) => x.id === 'w' && x.kind === 'gatitos').length, 2);
  assert.ok(!c.some((x) => x.id === 'p' && x.kind === 'gatitos'), 'the one asking permission does not launch kittens');
});

test('Walks: only with real changes', () => {
  const P = (x: number, z: number, pose: any = 'portatil') => ({ x, floorY: 300, scale: 1 - z * 0.72, z, pose });
  const m = (...e: [string, ReturnType<typeof P>][]) => new Map(e);
  assert.ok(significantMove(m(['a', P(900, 0.8)]), m(['a', P(300, 0, 'cartel')])), 'from working to asking permission');
  assert.ok(significantMove(m(['a', P(500, 0.3, 'sentado')]), m(['a', P(500, 0.45, 'sentado')])), 'a good stretch of depth');
  assert.ok(!significantMove(m(['a', P(500, 0.7)]), m(['a', P(500, 0.75)])), 'the weather step does not');
  assert.ok(!significantMove(m(['a', P(500, 0.7)]), m(['a', P(620, 0.7)])), 'making room for another cat neither');
  assert.ok(!significantMove(m(), m(['a', P(500, 0.7)])), 'a newcomer just appears');
  const actors = layoutScene([rec('a', 'active', MIN)], T0, CFG, 1920).actors;
  assert.equal(placements(actors).get('a')?.pose, actors[0]!.pose);
});

test('Assembly: it stops for a minute with the finished model', () => {
  assert.equal(HOLD.montaje!.ms, 60_000);
  const times = frameTimes('montaje', 6);
  const i = holdIndex('montaje', times);
  assert.ok(i > 0 && i < times.length - 1);
  assert.ok(times[i]! >= HOLD.montaje!.at && times[i - 1]! < HOLD.montaje!.at);
  assert.equal(holdIndex('consola', frameTimes('consola', 6)), -1, 'the others do not stop');
});

test('Assembly: no building at night, but the other bored gestures stay', () => {
  const at = (h: number, m = 0) => new Date(2026, 9, 7, h, m).getTime();
  assert.ok(quietHours(at(21)) && quietHours(at(23, 30)) && quietHours(at(3)) && quietHours(at(6, 59)));
  assert.ok(!quietHours(at(7)) && !quietHours(at(18, 30)) && !quietHours(at(20, 59)));
  const cats = (now: number) => candidates(layoutScene([{ ...rec('yo', 'waiting', 15 * MIN), since: now - 15 * MIN, updated: now - 2_000 }], now, CFG, 1920).actors, now, false);
  assert.ok(cats(at(18, 30)).some((c) => c.kind === 'montaje'), 'at 18:30 yes');
  assert.ok(!cats(at(23)).some((c) => c.kind === 'montaje'), 'at 23:00 no');
  assert.ok(cats(at(23)).some((c) => c.kind === 'consola'), 'the rest of the bored one stays');
});

test('Duck: with the duck already won it stays on the desk and the cat talks to it again', () => {
  const now = new Date(2026, 9, 7, 11, 0).getTime();
  const sessions = (duck: boolean) => [{ ...rec('yo', 'active', 2 * MIN, { detail: 'Bash: ls', duck }), since: now - 2 * MIN, updated: now - 2_000 }];
  const kinds = (duck: boolean) => candidates(layoutScene(sessions(duck), now, CFG, 1920).actors, now, false).filter((c) => c.kind === 'patito').length;
  assert.equal(kinds(false), 0);
  assert.equal(kinds(true), 1);
});

test('Plan: planGesture counts frames with first and last, and carries the hold as a frame index', () => {
  for (const fps of [2, 6]) {
    for (const kind of KINDS) {
      const p = planGesture({ id: 'x', kind }, fps);
      assert.equal(p.frames, frameTimes(kind, fps).length, `${kind} @${fps}`);
      assert.equal(p.frames, Math.max(2, Math.round(DURATION[kind] * fps) + 1));
      assert.equal(p.fps, fps);
      assert.deepEqual(p.params, { id: 'x', kind });
      assert.equal(p.interruptible, true);
    }
  }
  const m = planGesture({ id: 'yo', kind: 'montaje' }, 6);
  assert.equal(m.hold?.ms, 60_000);
  assert.equal(m.hold?.at, holdIndex('montaje', frameTimes('montaje', 6)));
  assert.equal(planGesture({ id: 'yo', kind: 'cola' }, 6).hold, undefined);
});

test('Plan: forced gestures are not interruptible', () => {
  for (const kind of FORCED_KINDS) assert.equal(planGesture({ id: 'runner', kind }, 6, true).interruptible, false);
  assert.equal(planGesture({ id: 'a', kind: 'lego' }, 6).interruptible, true, 'a random one is');
});

test('Plan: gestureAt is the inverse, with t = i / (frames - 1)', () => {
  const p = planGesture({ id: 'a', kind: 'cola' }, 6);
  const times = frameTimes('cola', 6);
  assert.equal(p.frames, times.length);
  for (let i = 0; i < p.frames; i++) {
    const g = gestureAt(p.params, i, p.frames);
    assert.deepEqual(g, { id: 'a', kind: 'cola', t: times[i]! });
  }
  assert.equal(gestureAt(p.params, 0, p.frames).t, 0);
  assert.equal(gestureAt(p.params, p.frames - 1, p.frames).t, 1);
  assert.equal(gestureAt(p.params, 0, 1).t, 0, 'degenerate plan');
});
