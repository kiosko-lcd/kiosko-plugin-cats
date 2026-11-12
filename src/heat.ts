/**
 * Is the CPU really hot, or is it just a spike?
 *
 * A laptop processor pushes one core to the maximum for a couple of seconds and
 * the package temperature touches 95-99 C, even if the machine is almost idle.
 * The tower in cat mode shows the instantaneous reading, but the fireman cat
 * only comes out if the heat is sustained: otherwise it would appear and
 * vanish with every spike for no reason.
 */
export interface HeatSample {
  at: number;
  temp: number;
}

/** How long the heat has to last for the fireman to come out. */
export const HEAT_WINDOW_MS = 30_000;

/** Adds a reading and drops the ones that can no longer count. */
export function pushSample(list: HeatSample[], s: HeatSample, keepMs = HEAT_WINDOW_MS * 2): HeatSample[] {
  return [...list.filter((x) => s.at - x.at <= keepMs), s];
}

/**
 * Sustained heat: every reading in the window is over the threshold, and the
 * readings cover almost all of it (just started, or after a gap without
 * samples, we do not know yet and the answer is no).
 */
export function sustainedHeat(samples: HeatSample[], now: number, threshold: number, windowMs = HEAT_WINDOW_MS): boolean {
  const recent = samples.filter((s) => s.at <= now && s.at >= now - windowMs);
  if (!recent.length) return false;
  const oldest = Math.min(...recent.map((s) => s.at));
  return now - oldest >= windowMs * 0.8 && recent.every((s) => s.temp >= threshold);
}
