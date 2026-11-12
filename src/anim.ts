/**
 * Cat-mode gestures: blinks, tail flicks, yawns...
 *
 * There is no continuous animation: every few seconds ONE cat does ONE short
 * gesture and the panel goes still again. That way very few frames are written
 * (every send is a copy in the cache) and the CPU only works in bursts.
 *
 * Everything here is pure: which gestures each pose admits, the curve of each
 * one and its quantization. The renderer receives a `Gesture` with its instant
 * `t` (0..1) and paints that frame; the last frame of any gesture is the rest
 * pose, identical to the static frame. The gesture ids stay in Spanish.
 *
 * Ported from aimonitor's `scene/anim.ts`. The calendar moments (`nightOwl`,
 * `partyTime`, `spookyDay`, `ABANDONED_MS`) live in `moments.ts` and are
 * re-exported here.
 */
import { TALKS_TO_DUCK } from '@loksly/agent-sessions';
import type { Pose } from './cat.ts';
import { type Actor, type Pose as ActorPose, SILL } from './layout.ts';
import { ABANDONED_MS, nightOwl, partyTime, spookyDay } from './moments.ts';

export { ABANDONED_MS, nightOwl, partyTime, spookyDay, TALKS_TO_DUCK };

export type GestureKind =
  | 'parpadeo' | 'cola' | 'bostezo' | 'orejas' | 'respira' | 'zetas' | 'espuma'
  // Depending on the tool the session is using:
  | 'teclea' | 'ovillo' | 'peces' | 'gatitos' | 'folios'
  // Those stepping on the same file, with light sabers:
  | 'duelo'
  // The one that has waited a long time for you gets bored and takes out the console:
  | 'consola'
  // Depending on what happens around: hours of work, quota, push, failing
  // tests, a meeting about to start or Friday afternoon.
  | 'cafe' | 'hucha' | 'catapulta' | 'enredo' | 'corbata' | 'confeti'
  // Special dates and hours: the mad night-time dash and the ghost of
  // Halloween and Tuesday the 13th.
  | 'carrera' | 'buu'
  // Between cats and with the system: high five, the sage and the apprentice,
  // the one that knocks over the cup, RAM full of boxes and the butterfly
  // when there is no network.
  | 'chocala' | 'sabio' | 'distrae' | 'cajas' | 'mariposa'
  // Git: rebase (cards), approved PR (stamp), forced push (steamroller),
  // blame (magnifier), checkout (somersault), cherry-pick (cherry), detached
  // HEAD (the head floats) and abandoned branch (cobwebs, shakes them off).
  | 'cartas' | 'lgtm' | 'apisonadora' | 'lupa' | 'voltereta' | 'cereza' | 'cabeza' | 'sacude'
  // Shell: docker, installing dependencies, kill -9, search, sudo, ssh and tail -f.
  | 'contenedor' | 'reparto' | 'chancla' | 'rebusca' | 'corona' | 'portal' | 'palomitas'
  // The trade: inexplicable error (book), spaghetti code, rubber duck, coffee
  // overdose and piled-up TODOs.
  | 'libro' | 'espagueti' | 'patito' | 'temblor' | 'postits'
  // Weather and calendar: rain on the glass, thunder, hot chocolate with
  // snow, papers in the wind, full-moon howl and a circle for a long meeting.
  | 'gotas' | 'trueno' | 'chocolate' | 'viento' | 'aullido' | 'corro'
  // In the beach room, a wave climbing the sand; in the space one,
  // everybody floating up and down.
  | 'ola' | 'ingravidez'
  // Outdoors: a penguin in Antarctica, a tumbleweed in the desert and a
  // squirrel in the forest.
  | 'pinguino' | 'rodadora' | 'ardilla'
  // Lego and drones: a build assembles a tower (and it crumbles if it fails);
  // a merge fits two walls (and with a conflict, steps on a brick); a deploy
  // leaves by drone; a subagent releases a swarm; and the bored one flies one.
  | 'lego' | 'encaje' | 'dron' | 'enjambre' | 'piloto'
  // The bored one builds a huge LEGO set from its manual (see lego.ts).
  | 'montaje'
  // Chemistry: the bored one, or the one updating dependencies (mixing
  // versions to see what comes out), makes elephant toothpaste; if it fails, smoke.
  | 'quimica'
  // Compacting the context (paper press), the repo's birthday (cake), a
  // published release (light drones), working on the weekend (deckchair) and
  // a command touching many files (juggling).
  | 'compacta' | 'tarta' | 'fuegos' | 'finde' | 'malabares';

export interface Gesture {
  /** Session of the cat that moves (the actor's first one), or 'bombero'. */
  id: string;
  kind: GestureKind;
  /** Instant within the gesture, 0..1. */
  t: number;
}

/** Duration of each gesture, in seconds. */
export const DURATION: Record<GestureKind, number> = {
  parpadeo: 0.5, cola: 1.3, bostezo: 2.2, orejas: 0.6, respira: 2.4, zetas: 1.8, espuma: 1.6,
  teclea: 1.2, ovillo: 2.2, peces: 2.2, gatitos: 2.0, folios: 1.6,
  duelo: 6.5,
  consola: 10,
  cafe: 3, hucha: 2.4, catapulta: 2.4, enredo: 2.6, corbata: 3.2, confeti: 3,
  // Four intervals at 6 fps: three running frames between two still ones.
  carrera: 4 / 6, buu: 1.6,
  chocala: 2.2, sabio: 3.2, distrae: 4, cajas: 1.6, mariposa: 3.4,
  cartas: 3.4, lgtm: 3, apisonadora: 3, lupa: 3.6, voltereta: 2.2, cereza: 3, cabeza: 3, sacude: 1.6,
  // The crown, three frames at 6 fps: now you see it, now you don't, before the command.
  contenedor: 3, reparto: 3.4, chancla: 2, rebusca: 2.4, corona: 4 / 6, portal: 4, palomitas: 3,
  libro: 5, espagueti: 3, patito: 3.6, temblor: 1.2, postits: 3.4,
  gotas: 3, trueno: 1.4, chocolate: 3.4, viento: 3.4, aullido: 3.4, corro: 12,
  ola: 2.4, ingravidez: 3, pinguino: 4, rodadora: 3, ardilla: 3.4,
  lego: 3.4, encaje: 3, dron: 3.4, enjambre: 3.4, piloto: 4,
  // Like the console: the one waiting gets no events to cut it short.
  montaje: 11,
  quimica: 5,
  compacta: 5, tarta: 4.5, fuegos: 5, finde: 4.5, malabares: 3.4,
};

/**
 * Gestures that stop halfway to show off: at instant `at` the panel stays
 * still for `ms` (the finished model of the build, one minute), unless
 * something changes; then it is cut short and repainted like any gesture.
 */
export const HOLD: Partial<Record<GestureKind, { at: number; ms: number }>> = {
  montaje: { at: 0.86, ms: 60_000 },
};

/** Index of the frame (of `times`) where the gesture stops, or -1. */
export function holdIndex(kind: GestureKind, times: number[]): number {
  const h = HOLD[kind];
  return h ? times.findIndex((t) => t >= h.at) : -1;
}

/** Consecutive failures that can no longer be explained. */
export const FAILS_TO_DOUBT = 3;
/** Piled-up TODOs that start falling like post-its. */
export const TODOS_TO_NOTES = 3;
/** Three coffees: after working this long without a break, it already vibrates. */
export const JITTER_AFTER_MS = 3 * 45 * 60_000;

/** Veteran session (over 2 h) and rookie one (under 15 min) in the same repo. */
export const SENIOR_MS = 2 * 60 * 60_000;
export const JUNIOR_MS = 15 * 60_000;
/** Two tools "at once": their events, with less than this between them. */
export const TOGETHER_MS = 15_000;

/** Tool name in the hook's detail ("Edit: a.ts" -> Edit). */
const toolName = (detail: string | undefined) => /^[\w-]+/.exec((detail ?? '').trim())?.[0] ?? '';

/**
 * From 21:00 to 07:00 no LEGO is built: at those hours nobody works and the
 * panel only has to say who is left idle. The finished sets stay in the
 * cabinet. It goes by the clock and not by the light: in winter it gets dark
 * in the middle of the working day.
 */
export function quietHours(now: number): boolean {
  const h = new Date(now).getHours();
  return h >= 21 || h < 7;
}

/** Working without a break this long: coffee time. */
export const COFFEE_AFTER_MS = 45 * 60_000;

/** What happens around the cats and decides some gestures. */
export interface Surroundings {
  /** The usage window is over 90 %. */
  usageHigh?: boolean;
  /** There is a meeting in less than ten minutes. */
  meetingSoon?: boolean;
  /** There is no network. */
  offline?: boolean;
  /** RAM, in steps 0..3. */
  memLevel?: number;
  /** Weather outside, from the WMO codes and the wind of the last reading. */
  rain?: boolean;
  storm?: boolean;
  snow?: boolean;
  windy?: boolean;
  /** Full moon and night. */
  fullMoon?: boolean;
  /** A meeting of half an hour or more is under way. */
  longMeeting?: boolean;
  /** The current room (see room.ts). */
  room?: string;
  /** You are away: the ones waiting doze off and there are no gestures. */
  away?: boolean;
}

/** open-meteo WMO codes: drizzle and rain, storm and snow. */
export const isRain = (code: number) => (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
export const isStorm = (code: number) => code >= 95;
export const isSnow = (code: number) => (code >= 71 && code <= 77) || code === 85 || code === 86;
/** From here (km/h) a draught comes in through the window. */
export const WINDY_KMH = 40;
export const LONG_MEETING_MS = 30 * 60_000;

/** After waiting for you this long, the cat gets bored and starts to play. */
export const BORED_AFTER_MS = 10 * 60_000;

const TESTS = /\b(npm (run )?test|pytest|vitest|jest|cargo test|go test|node --test|mvn test|gradle test)\b|(^|[;&|:(]\s*)make\s+(test|check)\b/;
/** Compile or package. `cargo build` stays with the delivery truck (it downloads crates). */
const BUILD = /\b((npm|pnpm|yarn|bun)\s+(run\s+)?build|tsc|go\s+build|(vite|next|nuxt|astro|webpack|rollup)\s+build|(gradle|gradlew|mvn)\s+(build|package|assemble|install)|cmake\s+--build|docker\s+build|dotnet\s+build)\b|(^|[;&|:(]\s*)(make|ninja)\b/;
/** A command touching many files: formatting, `sed -i`, a codemod. Goes before "rebusca" (`find ... -exec sed -i`). */
const BULK = /\b(prettier\s.*(--write|-w)\b|eslint\b.*--fix|ruff\s+(format|check\b.*--fix)|black\s|gofmt\s+-w|cargo\s+fmt|rustfmt\b|jscodeshift|codemod|comby\b|(npm|pnpm|yarn)\s+(run\s+)?(format|fmt|lint:fix)\b|sed\s+-i|perl\s+-pi)/;
/** Publishing a release: a named tag or a release. Not a bare `git tag`, `-l` or `-d`. */
const RELEASE = /\bgit\s+tag\s+(?!-[ldvn]\b|--(list|delete|verify|contains|points-at)\b)(-[asf]\s+|-m\s+("[^"]*"|'[^']*'|\S+)\s+)*[^\s-]|\b(gh|glab)\s+release\s+create\b/;

/** Name of the release being published, to write it in the sky. */
export function releaseTag(detail: string): string {
  const gh = /\b(?:gh|glab)\s+release\s+create\s+([^\s-]\S*)/.exec(detail);
  if (gh) return gh[1]!.slice(0, 12);
  const tag = /\bgit\s+tag\s+(?:(?:-[asf]|-m\s+(?:"[^"]*"|'[^']*'|\S+))\s+)*([^\s-]\S*)/.exec(detail);
  return (tag?.[1] ?? 'release').slice(0, 12);
}

/** Years the repo turns today (its first commit was on this day), or 0. */
export function repoBirthday(born: number | undefined, now: number): number {
  if (!born) return 0;
  const b = new Date(born), d = new Date(now);
  if (b.getMonth() !== d.getMonth() || b.getDate() !== d.getDate()) return 0;
  return Math.max(0, d.getFullYear() - b.getFullYear());
}

/** It compacted the context recently: the press shows for this long. */
export const COMPACT_SHOWS_MS = 15 * 60_000;

/** Updating dependencies: mixing versions to see what comes out. Goes before the delivery (`pip install -U`). */
const UPGRADE = /\b((npm|pnpm|yarn|bun)\s+(update|upgrade|up|outdated)|npx\s+(npm-check-updates|ncu)|ncu\b|pip3?\s+install\s+(-U|--upgrade)|cargo\s+update|bundle\s+update|poetry\s+update|go\s+get\s+-u|composer\s+update)\b/;
/** Deploy or publish: the package leaves by drone. */
const DEPLOY = /\b(kubectl\s+(apply|rollout)|helm\s+(upgrade|install)|(terraform|tofu)\s+apply|fly(ctl)?\s+deploy|vercel\s+(deploy|--prod)|netlify\s+deploy|wrangler\s+(deploy|publish)|firebase\s+deploy|gcloud\s.*\bdeploy|(cdk|serverless|sls|sam)\s+deploy|npm\s+publish|cargo\s+publish|ansible-playbook|rsync|scp)\b/;

/**
 * The gesture of the tool in use. The hook stores the detail as
 * "Tool: argument"; the names are the ones that really appear in Claude Code
 * transcripts (the subagent one is `Agent`, not `Task`) and the Gemini CLI
 * equivalents.
 */
export function toolGesture(detail: string): GestureKind | null {
  // The name comes first ("Bash: npm test", "Grep \"pattern\"",
  // "mcp__claude-in-chrome__computer: ..."); the rest is the argument.
  const tool = /^[\w-]+/.exec(detail.trim())?.[0] ?? '';
  const arg = detail.trim().slice(tool.length);
  if (/^(Agent|Task)$/.test(tool)) return 'gatitos';
  if (/^(WebFetch|WebSearch|web_fetch|google_web_search)$/.test(tool) || /^mcp__.*(browser|playwright|chrome)/i.test(tool)) return 'peces';
  if (/^(Bash|run_shell_command)$/.test(tool)) {
    if (/(^|[;&|:(]\s*)sudo\s/.test(arg)) return 'corona';
    if (UPGRADE.test(arg)) return 'quimica';
    if (BULK.test(arg)) return 'malabares';
    if (RELEASE.test(arg)) return 'fuegos';
    if (/\b(docker\s+(run|compose\s+up)|docker-compose\s+up|podman\s+run)\b/.test(arg)) return 'contenedor';
    if (/\b(tail\s+-[a-zA-Z]*[fF]\b|journalctl\b.*\s-f\b|(kubectl|docker(\s+compose)?)\s+logs\b.*\s-f\b)/.test(arg)) return 'palomitas';
    if (/\b((npm|pnpm|yarn)\s+(install|i|ci|add)|cargo\s+build|pip3?\s+install|bundle\s+install|go\s+mod\s+download|composer\s+install)\b/.test(arg)) return 'reparto';
    if (/\b(kill\s+-(9|KILL|SIGKILL)|pkill|killall)\b/.test(arg)) return 'chancla';
    if (DEPLOY.test(arg)) return 'dron';
    if (/\bssh\s/.test(arg)) return 'portal';
    if (/(^|[;&|:]\s*)(grep|rg|egrep|find|fd|ag|ack)\s/.test(arg)) return 'rebusca';
    if (/\bgit\s+push\b.*\s(--force(-with-lease)?|-f)\b/.test(arg)) return 'apisonadora';
    if (/\bgit\s+push\b/.test(arg)) return 'catapulta';
    if (/\bgit\s+rebase\b/.test(arg)) return 'cartas';
    if (/\b(gh\s+pr\s+(review\b.*--approve|merge)|glab\s+mr\s+(approve|merge))\b/.test(arg)) return 'lgtm';
    if (/\bgit\s+blame\b/.test(arg)) return 'lupa';
    if (/\bgit\s+cherry-pick\b/.test(arg)) return 'cereza';
    // `git checkout -- file` restores files: that is not switching branches.
    if (/\bgit\s+(switch|checkout)\b(?!.*\s--(\s|$))/.test(arg)) return 'voltereta';
    if (/\bgit\s+(merge|pull)\b/.test(arg)) return 'encaje';
    // If it also runs the tests (`npm run build && npm test`), the yarn ball wins.
    if (TESTS.test(arg)) return 'ovillo';
    return BUILD.test(arg) ? 'lego' : 'teclea';
  }
  if (/^(Edit|MultiEdit|Write|NotebookEdit|write_file|replace)$/.test(tool)) return 'teclea';
  if (/^(Grep|Glob|search_file_content|glob)$/.test(tool)) return 'rebusca';
  if (/^(Read|read_file|read_many_files|list_directory)$/.test(tool)) return 'folios';
  return null;
}

/** The branch a `git switch`/`checkout` jumps to, to choose a hat. */
export function branchOf(detail: string): string {
  const m = /\bgit\s+(?:switch|checkout)\s+(?:-[bcBC]\s+|--create\s+|-t\s+|--track\s+)?([^\s-][^\s]*)/.exec(detail);
  return m?.[1] ?? '';
}

/** The server of an `ssh`, without user or options: "deploy@web1 -p 22" -> web1. */
export function sshHost(detail: string): string {
  const m = /\bssh\s+((?:-[a-zA-Z]+(?:\s+(?!-)\S+)?\s+)*)([^\s-]\S*)/.exec(detail);
  return (m?.[2] ?? '').replace(/^.*@/, '');
}

/** Poses that are working and therefore admit their tool's gesture. */
const WORKING = new Set<ActorPose>(['portatil', 'corazon', 'amasa']);

/** Which gestures each pose admits. Those that already move by themselves (bufido) do nothing else. */
const BY_POSE: Record<ActorPose, GestureKind[]> = {
  cartel: ['parpadeo', 'orejas', 'cola'],
  sentado: ['parpadeo', 'cola', 'orejas', 'bostezo', 'consola', 'piloto', 'montaje', 'quimica'],
  portatil: ['cola', 'orejas'],
  amasa: ['cola', 'orejas'],
  corazon: [],
  // Two sessions stepping on one file: they fight with swords (see duel.ts).
  bufido: ['duelo', 'duelo', 'duelo'],
  dormido: ['respira'],
  caja: ['zetas'],
  schrodinger: ['parpadeo'],
};

/** A yawn is only funny if it has been waiting for you a while. */
export const YAWN_AFTER_MS = 5 * 60_000;

const q = (v: number, step: number) => Math.round(v / step) * step;

/** Pose parameters of the cat at instant `t` of the gesture, already quantized. */
export function poseAt(kind: GestureKind, t: number): Pose {
  const u = Math.max(0, Math.min(1, t));
  switch (kind) {
    case 'parpadeo': return { lid: q(1 - Math.abs(2 * u - 1), 0.5) };
    // Two fading swings: sin(2*2*pi*t)*(1-t) starts and ends at rest.
    case 'cola': return { swing: q(Math.sin(4 * Math.PI * u) * (1 - u), 0.25) };
    case 'bostezo': return { yawn: q(Math.sin(Math.PI * u), 0.25) };
    case 'orejas': return { ear: q(Math.sin(Math.PI * u), 0.5) };
    default: return {};
  }
}

/** Does this gesture change the cat's drawing (and not just how it is composed)? */
export const redraws = (kind: GestureKind) => kind === 'parpadeo' || kind === 'cola' || kind === 'bostezo' || kind === 'orejas';

/** Instants of each frame: the first and the last one at rest. */
export function frameTimes(kind: GestureKind, fps: number): number[] {
  const n = Math.max(2, Math.round(DURATION[kind] * fps) + 1);
  return Array.from({ length: n }, (_, i) => i / (n - 1));
}

/** Cats facing front: the ones that can wear a tie and go to the meeting. */
const FACING = new Set<ActorPose>(['sentado', 'cartel']);

/** Gestures possible right now in the scene. */
export function candidates(actors: Actor[], now: number, hot: boolean, around: Surroundings = {}): { id: string; kind: GestureKind }[] {
  // With nobody in front, not a single gesture: saves frames and the waiting ones doze.
  if (around.away) return [];
  const out: { id: string; kind: GestureKind }[] = [];
  for (const a of actors) {
    const lead = a.records[0]!;
    const id = lead.session_id;
    if (a.pose === 'portatil' && now - lead.since >= COFFEE_AFTER_MS) out.push({ id, kind: 'cafe' }, { id, kind: 'cafe' });
    if (around.usageHigh && (a.pose === 'portatil' || a.pose === 'sentado')) out.push({ id, kind: 'hucha' });
    if (lead.testsFailed && WORKING.has(a.pose)) out.push({ id, kind: 'enredo' }, { id, kind: 'enredo' });
    if (around.meetingSoon && FACING.has(a.pose)) out.push({ id, kind: 'corbata' }, { id, kind: 'corbata' });
    // In the small hours, the one working does not flick its tail: it dashes off.
    const idle = a.pose === 'portatil' && nightOwl(now) ? (['carrera', 'carrera'] as GestureKind[])
      : a.pose === 'caja' && spookyDay(now) ? (['buu'] as GestureKind[]) : BY_POSE[a.pose];
    for (const kind of idle) {
      if (kind === 'bostezo' && now - lead.since < YAWN_AFTER_MS) continue;
      if ((kind === 'consola' || kind === 'piloto' || kind === 'montaje' || kind === 'quimica') && now - lead.since < BORED_AFTER_MS) continue;
      if (kind === 'montaje' && quietHours(now)) continue;
      out.push({ id: lead.session_id, kind });
    }
    if (WORKING.has(a.pose) && (lead.failStreak ?? 0) >= FAILS_TO_DOUBT) out.push({ id, kind: 'libro' }, { id, kind: 'libro' });
    if (a.pose === 'portatil' && lead.spaghetti) out.push({ id, kind: 'espagueti' });
    if ((a.pose === 'portatil' || a.pose === 'sentado' || a.pose === 'caja') && (lead.talkStreak ?? 0) >= TALKS_TO_DUCK) out.push({ id, kind: 'patito' }, { id, kind: 'patito' });
    // With the duck already on the desk, now and then it tells it something more.
    else if (a.pose === 'portatil' && lead.duck) out.push({ id, kind: 'patito' });
    if (a.pose === 'portatil' && now - lead.since >= JITTER_AFTER_MS) out.push({ id, kind: 'temblor' }, { id, kind: 'temblor' });
    if (a.pose === 'portatil' && (lead.todos ?? 0) >= TODOS_TO_NOTES) out.push({ id, kind: 'postits' }, { id, kind: 'postits' });
    if (a.pose === 'portatil' && lead.detached) out.push({ id, kind: 'cabeza' }, { id, kind: 'cabeza' });
    if (lead.compactAt && now - lead.compactAt < COMPACT_SHOWS_MS && (WORKING.has(a.pose) || a.pose === 'sentado')) out.push({ id, kind: 'compacta' }, { id, kind: 'compacta' });
    if (repoBirthday(lead.repoBorn, now) >= 1 && a.pose !== 'dormido' && a.pose !== 'caja') out.push({ id, kind: 'tarta' }, { id, kind: 'tarta' });
    const day = new Date(now).getDay();
    if (a.pose === 'portatil' && (day === 0 || day === 6)) out.push({ id, kind: 'finde' });
    if (a.pose === 'portatil' && lead.lastCommit !== undefined && now - lead.lastCommit >= ABANDONED_MS) out.push({ id, kind: 'sacude' });
    // The tool's gesture counts double: it is the one that says something.
    const tg = WORKING.has(a.pose) ? toolGesture(lead.detail ?? '') : null;
    if (tg) out.push({ id: lead.session_id, kind: tg }, { id: lead.session_id, kind: tg });
    // A subagent: sometimes kittens and sometimes a swarm of drones.
    if (tg === 'gatitos') out.push({ id, kind: 'enjambre' });
  }
  // Between two cats: the id carries both sessions, "a+b" or "a>b".
  for (const [i, a] of actors.entries()) {
    for (const b of actors.slice(i + 1)) {
      const ra = a.records[0]!, rb = b.records[0]!;
      if (!WORKING.has(a.pose) || !WORKING.has(b.pose)) continue;
      const tool = toolName(ra.detail);
      if (tool && tool === toolName(rb.detail) && toolGesture(ra.detail ?? '') && Math.abs(ra.updated - rb.updated) <= TOGETHER_MS) {
        out.push({ id: `${ra.session_id}+${rb.session_id}`, kind: 'chocala' }, { id: `${ra.session_id}+${rb.session_id}`, kind: 'chocala' });
      }
    }
  }
  const all = actors.flatMap((a) => a.records.map((r) => ({ a, r })));
  for (const s of all) {
    if (s.r.started === undefined || now - s.r.started < SENIOR_MS || s.r.state === 'idle') continue;
    const key = s.r.repo ?? s.r.cwd;
    const j = all.find((o) => o.r !== s.r && o.r.started !== undefined && now - o.r.started <= JUNIOR_MS && (o.r.repo ?? o.r.cwd) === key);
    if (j && key) out.push({ id: `${s.r.session_id}>${j.r.session_id}`, kind: 'sabio' }, { id: `${s.r.session_id}>${j.r.session_id}`, kind: 'sabio' });
  }
  // The sleeper bothers the one working closest.
  for (const a of actors.filter((x) => x.pose === 'dormido')) {
    const w = actors.filter((x) => x.pose === 'portatil' && x.records[0]!.state === 'active').sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x))[0];
    if (w) out.push({ id: `${a.records[0]!.session_id}>${w.records[0]!.session_id}`, kind: 'distrae' });
  }
  if ((around.memLevel ?? 0) > 0 && actors.length) out.push({ id: 'ram', kind: 'cajas' }, { id: 'ram', kind: 'cajas' });
  if (around.offline) {
    for (const a of actors.filter((x) => x.pose === 'portatil')) out.push({ id: a.records[0]!.session_id, kind: 'mariposa' }, { id: a.records[0]!.session_id, kind: 'mariposa' });
  }
  // Weather and calendar.
  // "The one by the window": on the sill, not the one sleeping on top of the shelf.
  const sill = actors.find((a) => a.sill && a.x === SILL.x);
  // If nobody sleeps on the sill, the one with the window in front watches the drops.
  const byWindow = sill ?? actors.filter((a) => !a.sill && (a.pose === 'portatil' || a.pose === 'sentado') && Math.abs(a.x - SILL.x) < 260).sort((p, q) => Math.abs(p.x - SILL.x) - Math.abs(q.x - SILL.x))[0];
  if (byWindow && (around.rain || around.storm)) out.push({ id: byWindow.records[0]!.session_id, kind: 'gotas' }, { id: byWindow.records[0]!.session_id, kind: 'gotas' });
  if (around.storm && actors.length) out.push({ id: 'trueno', kind: 'trueno' }, { id: 'trueno', kind: 'trueno' });
  const moonCat = sill ?? actors.find((a) => a.pose === 'dormido' && !a.sill);
  if (around.fullMoon && moonCat) out.push({ id: moonCat.records[0]!.session_id, kind: 'aullido' }, { id: moonCat.records[0]!.session_id, kind: 'aullido' });
  for (const a of actors) {
    const id = a.records[0]!.session_id;
    if (around.snow && (a.pose === 'portatil' || a.pose === 'sentado')) out.push({ id, kind: 'chocolate' });
    if (around.windy && a.pose === 'portatil') out.push({ id, kind: 'viento' });
  }
  if (around.room === 'playa' && actors.length) out.push({ id: 'mar', kind: 'ola' }, { id: 'mar', kind: 'ola' });
  const local: Record<string, GestureKind> = { antartida: 'pinguino', desierto: 'rodadora', bosque: 'ardilla' };
  const visit = local[around.room ?? ''];
  if (visit && actors.length) out.push({ id: around.room!, kind: visit }, { id: around.room!, kind: visit });
  if (around.longMeeting && actors.length >= 2) out.push({ id: 'corro', kind: 'corro' }, { id: 'corro', kind: 'corro' });
  if (hot) out.push({ id: 'bombero', kind: 'espuma' }, { id: 'bombero', kind: 'parpadeo' });
  if (partyTime(now) && actors.length) out.push({ id: 'fiesta', kind: 'confeti' }, { id: 'fiesta', kind: 'confeti' });
  if (around.room === 'espacio') {
    // In space it neither rains nor blows; instead, things float.
    const earthly = new Set<GestureKind>(['gotas', 'trueno', 'chocolate', 'viento', 'aullido']);
    const rest = out.filter((c) => !earthly.has(c.kind));
    if (actors.length) rest.push({ id: 'espacio', kind: 'ingravidez' }, { id: 'espacio', kind: 'ingravidez' });
    return rest;
  }
  return out;
}

/** Picks one at random. `rnd` is injectable so tests are deterministic. */
export function pickGesture(actors: Actor[], now: number, hot: boolean, rnd: () => number = Math.random, around: Surroundings = {}): { id: string; kind: GestureKind } | null {
  const all = candidates(actors, now, hot, around);
  return all.length ? all[Math.floor(rnd() * all.length)]! : null;
}

/** Pause until the next gesture, random between the two limits. */
export function nextGap(minMs: number, maxMs: number, rnd: () => number = Math.random): number {
  const lo = Math.max(1000, Math.min(minMs, maxMs));
  return lo + rnd() * Math.max(0, maxMs - lo);
}

// ---------- Walks ----------
/** Where each cat was, by the session that leads it. */
export interface Placement {
  x: number;
  floorY: number;
  scale: number;
  z: number;
  pose: ActorPose;
}

export const MOVE_SECONDS = 1.2;
/** At most one walk every so often: otherwise, with lots of activity, they would never stop. */
export const MOVE_COOLDOWN_MS = 10_000;

export function placements(actors: Actor[]): Map<string, Placement> {
  return new Map(actors.map((a) => [a.records[0]!.session_id, { x: a.x, floorY: a.floorY, scale: a.scale, z: a.z, pose: a.pose }]));
}

/**
 * Is a walk warranted? Only if some cat that was already there changes pose
 * (from working to asking permission, say) or really changes depth. The 0.05
 * steps of the time and the floor reshuffle when another cat appears do not
 * count: those look like a small jump, and a walk every time would make a
 * panel that never stays still.
 */
export function significantMove(prev: Map<string, Placement>, next: Map<string, Placement>): boolean {
  for (const [id, n] of next) {
    const p = prev.get(id);
    if (!p) continue;
    if (p.pose !== n.pose || Math.abs(p.z - n.z) >= 0.1 - 1e-9) return true;
  }
  return false;
}

/** Ease in-out: starts and brakes like a cat, not like an elevator. */
export const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// ---------- Plugin runtime plan ----------
/**
 * Gestures that something that just happened asks for (the CI runner cat in
 * aimonitor's daemon: `reparto`, `contenedor`, `lego`). They do not wait for
 * their turn and are never cut short, so their plan is not interruptible.
 */
export const FORCED_KINDS: readonly GestureKind[] = ['reparto', 'contenedor', 'lego'];

/** What the Kiosko runtime needs to play a gesture: the `animation(ctx)` plan. */
export interface GesturePlan {
  id: string;
  /** Number of frames counting the first and the last one, which are the rest pose. */
  frames: number;
  fps: number;
  /** Frame index where the gesture stops for `ms` (see `HOLD`), if it does. */
  hold?: { at: number; ms: number };
  /** The picked gesture, to rebuild each frame with `gestureAt`. */
  params: { id: string; kind: GestureKind };
  /** False for forced/urgent gestures: a change in the scene does not cut them short. */
  interruptible: boolean;
}

/**
 * Turns a picked gesture into a runtime plan. `frames` is `frameTimes(kind, fps).length`
 * (first and last included; aimonitor's daemon did not send those two because
 * they equal the static frame). `hold.at` is a frame index (`holdIndex`).
 * `forced` marks urgent gestures (see `FORCED_KINDS`): not interruptible.
 */
export function planGesture(pick: { id: string; kind: GestureKind }, fps: number, forced = false): GesturePlan {
  const times = frameTimes(pick.kind, fps);
  const h = HOLD[pick.kind];
  const at = holdIndex(pick.kind, times);
  return {
    id: pick.id,
    frames: times.length,
    fps,
    ...(h && at >= 0 ? { hold: { at, ms: h.ms } } : {}),
    params: { id: pick.id, kind: pick.kind },
    interruptible: !forced,
  };
}

/** Inverse of `planGesture`: the gesture of frame `i` out of `frames`, with t = i / (frames - 1). */
export function gestureAt(params: { id: string; kind: GestureKind }, i: number, frames: number): Gesture {
  const t = frames > 1 ? Math.max(0, Math.min(1, i / (frames - 1))) : 0;
  return { id: params.id, kind: params.kind, t };
}
