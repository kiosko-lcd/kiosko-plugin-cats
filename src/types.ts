/**
 * What the scene paints. A session is the record the agent hook writes, plus
 * what git says about its working directory (`EnrichedSession`, read by the
 * `agents/sessions` source) and, for calendar meetings travelling as one more
 * session, their start and end.
 */
import { matchFilter } from '@kiosko/sdk';
import type { EnrichedSession } from '@loksly/agent-sessions/git';

export type { Provider, SessionState } from '@loksly/agent-sessions';

export interface SessionView extends EnrichedSession {
  /** Present when the "session" is a meeting: when it starts, ms epoch. */
  startsAt?: number;
  /** End of the meeting, ms epoch. */
  endsAt?: number;
}

/** Data of the `agents/sessions` source. */
export interface SessionsData {
  sessions: SessionView[];
  /** The source's `zombieMs`: a working session silent this long is dropped (see the agents plugin). */
  zombieMs?: number;
}

/** The `agents/sessions` default of `zombieMs`, for data without one (demo, an older agents plugin). */
export const DEFAULT_ZOMBIE_MS = 15 * 60_000;

/** The sessions of the shared source, or none yet. */
export function sessionsOf(sources: Record<string, unknown>): SessionView[] {
  const d = sources['agents/sessions'] as SessionsData | undefined;
  return Array.isArray(d?.sessions) ? d.sessions : [];
}

/** The source's zombie threshold, so the room hints at it with the same value. */
export function zombieMsOf(sources: Record<string, unknown>): number {
  const ms = (sources['agents/sessions'] as SessionsData | undefined)?.zombieMs;
  return typeof ms === 'number' && ms > 0 ? ms : DEFAULT_ZOMBIE_MS;
}

/**
 * The sessions that pass a `projects` filter (a `t.filter`), matched by
 * project name, repository or folder. A meeting has no project: it passes.
 */
export function filterProjects(sessions: SessionView[], projects: readonly string[]): SessionView[] {
  return sessions.filter((s) => s.startsAt !== undefined || matchFilter([s.project, s.repo, s.cwd].filter((v): v is string => !!v), projects));
}
