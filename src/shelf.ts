/**
 * The week's shelf: each of your commits this week is a book and each merged
 * MR/PR a binder. They are counted with `git log` in the repositories some
 * session has been in (remembered in the plugin's data directory), so
 * commits made by hand count too, and any week can be recomputed: no
 * snapshots are kept to compare with the previous ones.
 *
 * MRs/PRs come from the merge message: "Merge pull request #12" (GitHub),
 * "See merge request group/project!34" in the body (GitLab) or a "(#12)" at
 * the end of the subject (GitHub squash). A merge done on the web only shows
 * after a `git fetch`.
 *
 * Everything here is pure except `loadShelfRepos` / `saveShelfRepos` and
 * `readShelf`, which run `git`.
 */
import { execFile } from 'node:child_process';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface ShelfEntry {
  repo: string;
  /** Author date, ms epoch: it survives a rebase (the commit date doesn't). */
  at: number;
  subject: string;
  /** Is it the merge of an MR/PR? Then it is a binder. */
  mr: boolean;
}

/** What the scene paints: this week's books and the count of the previous weeks. */
export interface ShelfView {
  /** ISO week number of the current one. */
  week: number;
  /** This week, in order: each with its repo (for the colour) and whether it is an MR. */
  books: { repo: string; mr: boolean }[];
  /** Weeks, oldest first, the current one last. */
  weeks: { commits: number; mrs: number }[];
}

/** `git log` separators: field (0x1f) and record (0x1e). */
export const LOG_FORMAT = '%at%x1f%s%x1f%b%x1e';

const MERGE_SUBJECT = /^Merge pull request #\d+|\(#\d+\)\s*$/;
const MERGE_BODY = /See merge request \S+!\d+/;

/** This week's Monday at 00:00, local time. */
export function weekStart(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/** The output of `git log --format=LOG_FORMAT` as the entries of a repo. */
export function parseShelfLog(out: string, repo: string): ShelfEntry[] {
  const list: ShelfEntry[] = [];
  for (const rec of out.split('\x1e')) {
    const [at, subject = '', body = ''] = rec.replace(/^\s+/, '').split('\x1f');
    const secs = Number(at);
    if (!at || !Number.isFinite(secs)) continue;
    // A bare "Merge branch … into …" is not an MR: only if GitLab says so in the body.
    const mr = MERGE_BODY.test(body) || MERGE_SUBJECT.test(subject);
    list.push({ repo, at: secs * 1000, subject: subject.trim(), mr });
  }
  return list;
}

/**
 * Without duplicates: with `--all`, a rebased commit shows in two branches
 * with a different hash but the same author date and subject.
 */
export function dedupe(entries: ShelfEntry[]): ShelfEntry[] {
  const seen = new Set<string>();
  return entries.filter((e) => {
    const key = `${e.repo}\n${e.at}\n${e.subject}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** ISO 8601 week number. */
export function isoWeek(now: number): number {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7;
  const thursday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day + 3);
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  return 1 + Math.round(((thursday.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
}

/** Since when the log has to be asked for to show `weeks` weeks. */
export const shelfSince = (now: number, weeks = 6) => weekStart(now) - (weeks - 1) * 7 * 86_400_000;

/** Splits the entries into weeks (they start on Monday at 00:00). */
export function shelfView(entries: ShelfEntry[], now: number, weeks = 6): ShelfView {
  const starts = Array.from({ length: weeks }, (_, i) => weekStart(weekStart(now) - (weeks - 1 - i) * 7 * 86_400_000 + 3_600_000));
  const counts = starts.map(() => ({ commits: 0, mrs: 0 }));
  const current = starts[weeks - 1]!;
  const books: ShelfEntry[] = [];
  for (const e of dedupe(entries)) {
    if (e.at > now) continue;
    for (let i = weeks - 1; i >= 0; i--) {
      if (e.at >= starts[i]!) {
        if (e.mr) counts[i]!.mrs++;
        else counts[i]!.commits++;
        if (i === weeks - 1 && e.at >= current) books.push(e);
        break;
      }
    }
  }
  books.sort((a, b) => a.at - b.at);
  return { week: isoWeek(now), books: books.map((b) => ({ repo: b.repo, mr: b.mr })), weeks: counts };
}

/** The repos some session has been in. Those that no longer exist are forgotten on load. */
export function loadShelfRepos(path: string): string[] {
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as { repos?: unknown };
    return Array.isArray(raw.repos) ? raw.repos.filter((r): r is string => typeof r === 'string' && existsSync(r)) : [];
  } catch {
    return [];
  }
}

export function saveShelfRepos(path: string, repos: string[]): void {
  writeFileSync(`${path}.tmp`, JSON.stringify({ repos: [...new Set(repos)].sort() }, null, 2), 'utf8');
  renameSync(`${path}.tmp`, path);
}

const emails = new Map<string, string>();

/**
 * Remembers the repos of the sessions in `path` and builds the view from
 * `git log` in each. A repo that is gone, or a git that fails, gives no books.
 */
export async function readShelf(path: string, sessionRepos: (string | undefined)[], now: number, signal?: AbortSignal): Promise<ShelfView> {
  const repos = loadShelfRepos(path);
  const fresh = [...new Set(sessionRepos.filter((r): r is string => !!r && !repos.includes(r)))];
  if (fresh.length) {
    repos.push(...fresh);
    try {
      saveShelfRepos(path, repos);
    } catch {
      // Not saved: they are seen this time and remembered the next.
    }
  }
  const all: ShelfEntry[] = [];
  for (const repo of repos) {
    let email = emails.get(repo);
    if (email === undefined) {
      email = await execFileAsync('git', ['config', 'user.email'], { cwd: repo, timeout: 3000, signal }).then((r) => r.stdout.trim(), () => '');
      emails.set(repo, email);
    }
    if (!email) continue;
    try {
      const { stdout } = await execFileAsync('git', ['log', '--all', `--author=${email}`, `--since=${new Date(shelfSince(now)).toISOString()}`, `--format=${LOG_FORMAT}`], { cwd: repo, timeout: 10_000, maxBuffer: 8_000_000, signal });
      all.push(...parseShelfLog(stdout, repo));
    } catch {
      // A repo that is gone or a failing git: no books from there.
    }
  }
  return shelfView(all, now);
}
