import { test } from 'node:test';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LOG_FORMAT, dedupe, isoWeek, parseShelfLog, shelfSince, shelfView } from './shelf.ts';

const DAY = 86_400_000;
const rec = (secs: number, subject: string, body = '') => `${secs}\x1f${subject}\x1f${body}\x1e\n`;

test('shelf: commits y MR/PR desde el mensaje del merge', () => {
  const out = rec(100, 'feat: algo') + rec(200, 'Merge pull request #12 from x/y') + rec(300, 'fix: otra cosa (#34)') +
    rec(400, "Merge branch 'f' into 'main'", 'Mira\n\nSee merge request grupo/proyecto!56') + rec(500, "Merge branch 'main' into feature");
  const e = parseShelfLog(out, '/r/a');
  assert.deepStrictEqual(e.map((x) => [x.at, x.mr]), [[100_000, false], [200_000, true], [300_000, true], [400_000, true], [500_000, false]]);
});

test('shelf: sin duplicados de rebase, por semanas y con la de ahora la última', () => {
  const now = new Date(2026, 9, 8, 12, 0).getTime(); // jueves
  const mon = new Date(2026, 9, 5, 0, 0).getTime();
  const e = [
    { repo: 'a', at: mon + 3_600_000, subject: 'uno', mr: false },
    { repo: 'a', at: mon + 3_600_000, subject: 'uno', mr: false }, // el mismo, rebasado
    { repo: 'b', at: mon + DAY, subject: 'dos', mr: true },
    { repo: 'a', at: mon - 3_600_000, subject: 'domingo pasado', mr: false },
    { repo: 'a', at: mon - 8 * DAY, subject: 'hace dos semanas', mr: true },
  ];
  assert.strictEqual(dedupe(e).length, 4);
  const v = shelfView(e, now, 3);
  assert.deepStrictEqual(v.weeks, [{ commits: 0, mrs: 1 }, { commits: 1, mrs: 0 }, { commits: 1, mrs: 1 }]);
  assert.deepStrictEqual(v.books, [{ repo: 'a', mr: false }, { repo: 'b', mr: true }]);
  assert.strictEqual(v.week, 41);
  assert.strictEqual(isoWeek(new Date(2026, 0, 1).getTime()), 1);
  assert.ok(shelfSince(now, 3) <= mon - 14 * DAY + 3_600_000);
});

test('shelf: con un repo de verdad, a ambos lados del lunes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'estanteria-'));
  const git = (args: string[], env: Record<string, string> = {}) => execFileSync('git', args, { cwd: dir, env: { ...process.env, ...env }, encoding: 'utf8' });
  git(['init', '-q']);
  git(['config', 'user.email', 'gato@example.com']);
  git(['config', 'user.name', 'Gato']);
  git(['config', 'commit.gpgsign', 'false']);
  const now = new Date(2026, 9, 8, 12, 0).getTime();
  for (const [when, msg] of [[new Date(2026, 9, 4, 23, 0), 'domingo'], [new Date(2026, 9, 5, 9, 0), 'lunes'], [new Date(2026, 9, 6, 9, 0), 'arreglo (#7)']] as const) {
    const iso = when.toISOString();
    git(['commit', '-q', '--allow-empty', '-m', msg], { GIT_AUTHOR_DATE: iso, GIT_COMMITTER_DATE: iso });
  }
  const out = git(['log', '--all', `--author=gato@example.com`, `--since=${new Date(shelfSince(now, 2)).toISOString()}`, `--format=${LOG_FORMAT}`]);
  const v = shelfView(parseShelfLog(out, dir), now, 2);
  assert.deepStrictEqual(v.weeks, [{ commits: 1, mrs: 0 }, { commits: 1, mrs: 1 }]);
});
