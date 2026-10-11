import { describe, expect, it } from '@jest/globals';
import { bedtimeLabel, compareWeekend, computeStreaks, eveningDate, isWeekendNight } from '../nightStats';
import type { SleepSession } from '../../types/session';

const night = (y: number, mo: number, d: number, h: number, min: number, score: number) =>
  ({
    id: `${mo}-${d}-${h}`,
    startTime: new Date(y, mo, d, h, min).toISOString(),
    snoreScore: score,
    snoreDurationSeconds: score * 60,
    totalDurationSeconds: 7 * 3600,
    timeline: [],
  }) as unknown as SleepSession;

describe('eveningDate', () => {
  it('counts a night started after midnight to the previous evening', () => {
    // Sunday 00:41 belongs to Saturday evening
    expect(eveningDate(night(2026, 9, 11, 0, 41, 0)).getDate()).toBe(10);
    expect(eveningDate(night(2026, 9, 10, 23, 15, 0)).getDate()).toBe(10);
    expect(isWeekendNight(night(2026, 9, 11, 0, 41, 0))).toBe(true); // Saturday evening
    expect(isWeekendNight(night(2026, 9, 12, 0, 30, 0))).toBe(false); // Sunday evening: work tomorrow
  });
});

describe('compareWeekend', () => {
  it('averages weekday and weekend nights separately, bedtimes across midnight', () => {
    const stats = compareWeekend([
      night(2026, 9, 5, 23, 0, 20), // Mon
      night(2026, 9, 7, 1, 0, 30), // Tue evening, after midnight
      night(2026, 9, 9, 23, 30, 60), // Fri
      night(2026, 9, 11, 0, 30, 80), // Sat evening
    ]);
    expect(stats.weekday).toEqual(expect.objectContaining({ nights: 2, avgScore: 25 }));
    expect(bedtimeLabel(stats.weekday!.avgBedtimeMinutes)).toBe('00:00');
    expect(stats.weekend).toEqual(expect.objectContaining({ nights: 2, avgScore: 70 }));
    expect(bedtimeLabel(stats.weekend!.avgBedtimeMinutes)).toBe('00:00');
  });
});

describe('computeStreaks', () => {
  it('counts recorded nights in a row under the goal; missing nights do not break a streak', () => {
    const now = new Date(2026, 9, 12);
    const stats = computeStreaks(
      [
        night(2026, 9, 1, 23, 0, 10),
        night(2026, 9, 2, 23, 0, 12),
        night(2026, 9, 3, 23, 0, 18),
        night(2026, 9, 4, 23, 0, 40), // over the goal: breaks
        night(2026, 9, 6, 23, 0, 5),
        // 7th not recorded
        night(2026, 9, 9, 0, 30, 20), // 8th evening
        night(2026, 9, 9, 3, 0, 8), // second recording of the same evening: the worse counts
      ],
      25,
      now
    );
    expect(stats).toEqual({ goal: 25, current: 2, best: 3, metLast30: 5, recordedLast30: 6 });
  });
});
