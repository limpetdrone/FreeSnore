import type { SleepSession } from '../types/session';
import { snoringTimeSeconds } from './timeline';

// A night belongs to the evening it started: one started at 00:41 is still the previous evening
const EVENING_CUTOFF_HOURS = 6;

/** Local date (midnight) of the evening a night started. */
export function eveningDate(session: Pick<SleepSession, 'startTime'>): Date {
  const d = new Date(new Date(session.startTime).getTime() - EVENING_CUTOFF_HOURS * 3600 * 1000);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Friday and Saturday evenings: nights before a day off. */
export const isWeekendNight = (session: Pick<SleepSession, 'startTime'>) => {
  const day = eveningDate(session).getDay();
  return day === 5 || day === 6;
};

export interface NightGroupStats {
  nights: number;
  avgScore: number;
  avgSnoreSeconds: number;
  avgBedtimeMinutes: number; // Minutes after 18:00 (so 23:30 and 00:30 average correctly)
}

function groupStats(sessions: SleepSession[]): NightGroupStats | null {
  if (sessions.length === 0) return null;
  const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  return {
    nights: sessions.length,
    avgScore: Math.round(avg(sessions.map((s) => s.snoreScore))),
    avgSnoreSeconds: Math.round(avg(sessions.map(snoringTimeSeconds))),
    avgBedtimeMinutes: Math.round(
      avg(
        sessions.map((s) => {
          const d = new Date(s.startTime);
          return (((d.getHours() - 18) * 60 + d.getMinutes()) % 1440 + 1440) % 1440;
        })
      )
    ),
  };
}

/** Bedtime as HH:MM from minutes after 18:00. */
export const bedtimeLabel = (minutesAfter18: number) => {
  const total = (18 * 60 + minutesAfter18) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export function compareWeekend(sessions: SleepSession[]): { weekday: NightGroupStats | null; weekend: NightGroupStats | null } {
  return {
    weekday: groupStats(sessions.filter((s) => !isWeekendNight(s))),
    weekend: groupStats(sessions.filter(isWeekendNight)),
  };
}

export interface StreakStats {
  goal: number; // A night meets the goal when its score is at most this
  current: number; // Recorded nights in a row meeting the goal, up to the latest one
  best: number;
  metLast30: number; // Recorded nights meeting the goal in the last 30 evenings
  recordedLast30: number;
}

/**
 * Streaks count recorded nights only: a night without a recording neither breaks a streak nor
 * extends it (forgetting to start the app is not snoring). Several recordings of one evening
 * count as one night with the highest score.
 */
export function computeStreaks(sessions: SleepSession[], goal: number, now: Date = new Date()): StreakStats {
  const byEvening = new Map<string, { date: Date; score: number }>();
  for (const s of sessions) {
    const date = eveningDate(s);
    const key = dayKey(date);
    const prev = byEvening.get(key);
    if (!prev || s.snoreScore > prev.score) byEvening.set(key, { date, score: s.snoreScore });
  }
  const nights = [...byEvening.values()].sort((a, b) => a.date.getTime() - b.date.getTime());

  let run = 0;
  let best = 0;
  for (const n of nights) {
    run = n.score <= goal ? run + 1 : 0;
    best = Math.max(best, run);
  }
  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).getTime();
  const recent = nights.filter((n) => n.date.getTime() >= since);
  return {
    goal,
    current: run,
    best,
    metLast30: recent.filter((n) => n.score <= goal).length,
    recordedLast30: recent.length,
  };
}
