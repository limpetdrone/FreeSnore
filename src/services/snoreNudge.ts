import type { SleepSession } from '../types/session';

/*
 * Experimental (Labs): a short notification when snoring goes on for a few minutes. With the
 * iPhone locked it is mirrored to a worn Apple Watch (a wrist tap); Android forwards it to a
 * paired Wear OS watch. Some episodes are deliberately left alone, so the app can measure
 * whether the nudge actually stops the snoring.
 */

export interface SnoreNudge {
  minute: number; // Timeline minute (offsetMinutes) when the episode qualified
  sent: boolean; // false: a control episode, deliberately not nudged
}

export const NUDGE_AFTER_MINUTES = 3; // Snoring in this many consecutive minutes
export const NUDGE_COOLDOWN_MINUTES = 20;
export const NUDGE_CONTROL_SHARE = 0.3;
const MIN_SNORES_PER_MINUTE = 2;

/** Whether the last minutes before `minute` were all snoring. */
export function snoringEpisodeOngoing(snoresPerMinute: (m: number) => number, minute: number): boolean {
  if (minute < NUDGE_AFTER_MINUTES) return false;
  for (let m = minute - NUDGE_AFTER_MINUTES; m < minute; m++) {
    if (snoresPerMinute(m) < MIN_SNORES_PER_MINUTE) return false;
  }
  return true;
}

/** The decision for an ongoing episode: nudge, keep as control, or wait (cooldown). */
export function nudgeDecision(
  history: SnoreNudge[],
  minute: number,
  random: number = Math.random()
): SnoreNudge | null {
  const last = history[history.length - 1];
  if (last && minute - last.minute < NUDGE_COOLDOWN_MINUTES) return null;
  return { minute, sent: random >= NUDGE_CONTROL_SHARE };
}

const STOP_FROM = 2; // Minutes allowed to turn over
const STOP_UNTIL = 6;

/** Whether the snoring stopped shortly after the episode qualified. */
export function snoringStopped(session: SleepSession, minute: number): boolean | undefined {
  const window = (session.timeline || []).filter(
    (s) => s.offsetMinutes >= minute + STOP_FROM && s.offsetMinutes < minute + STOP_UNTIL
  );
  if (window.length < STOP_UNTIL - STOP_FROM) return undefined; // Night ended or no data
  return window.every((s) => !s.snoreSeconds);
}

export interface NudgeEffect {
  nudged: { stopped: number; total: number };
  control: { stopped: number; total: number };
}

/** How often the snoring stopped after a nudge, and after the control episodes. */
export function nudgeEffect(sessions: SleepSession[]): NudgeEffect {
  const effect: NudgeEffect = { nudged: { stopped: 0, total: 0 }, control: { stopped: 0, total: 0 } };
  for (const session of sessions) {
    for (const nudge of session.nudges ?? []) {
      const stopped = snoringStopped(session, nudge.minute);
      if (stopped === undefined) continue;
      const group = nudge.sent ? effect.nudged : effect.control;
      group.total++;
      if (stopped) group.stopped++;
    }
  }
  return effect;
}
