import { describe, expect, it } from '@jest/globals';
import { needsHealthFetch, nightStats, snoreShareByStage, stageMinutes } from '../healthStats';
import type { SleepSession, TimelineSample } from '../../types/session';

const T0 = Date.UTC(2026, 9, 10, 22, 0);
const min = (m: number) => T0 + m * 60000;

describe('health statistics', () => {
  it('keeps only the values of the night', () => {
    const values = [
      { time: min(-60), value: 90 }, // Evening: left out
      { time: min(30), value: 60 },
      { time: min(90), value: 50 },
      { time: min(500), value: 80 }, // Morning: left out
    ];
    expect(nightStats(values, min(0), min(480))).toEqual({ avg: 55, min: 50 });
    expect(nightStats([], min(0), min(480))).toBeUndefined();
  });

  it('adds up stage minutes inside the night', () => {
    const stages = [
      { start: min(-30), end: min(30), stage: 'light' as const }, // Half inside
      { start: min(30), end: min(120), stage: 'deep' as const },
      { start: min(120), end: min(150), stage: 'rem' as const },
    ];
    expect(stageMinutes(stages, min(0), min(480))).toEqual({ light: 30, deep: 90, rem: 30 });
  });

  it('tells how much of each stage had snoring', () => {
    const timeline: TimelineSample[] = Array.from({ length: 120 }, (_, m) => ({
      offsetMinutes: m,
      timeFormatted: '',
      db: 40,
      category: 'quiet',
      // Snoring in minutes 0-29 (deep) and 100-104 (REM)
      snoreSeconds: m < 30 || (m >= 100 && m < 105) ? 10 : 0,
    }));
    const stages = [
      { start: min(0), end: min(60), stage: 'deep' as const },
      { start: min(60), end: min(80), stage: 'light' as const },
      { start: min(80), end: min(120), stage: 'rem' as const },
      { start: min(120), end: min(125), stage: 'awake' as const }, // Too short to report
    ];
    expect(snoreShareByStage(timeline, T0, stages)).toEqual({ deep: 50, light: 0, rem: 13 });
  });

  it('fetches again once the watch had time to sync', () => {
    const night = { endTime: new Date(min(480)).toISOString() } as SleepSession;
    const fetchedEarly = { ...night, health: { fetchedAt: new Date(min(485)).toISOString() } };
    expect(needsHealthFetch(night, min(490))).toBe(true);
    expect(needsHealthFetch(fetchedEarly, min(500))).toBe(false); // Still too early to retry
    expect(needsHealthFetch(fetchedEarly, min(480 + 180))).toBe(true);
    const fetchedLate = { ...night, health: { fetchedAt: new Date(min(480 + 180)).toISOString() } };
    expect(needsHealthFetch(fetchedLate, min(480 + 300))).toBe(false);
  });
});
