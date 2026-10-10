import { describe, expect, it } from '@jest/globals';
import { audioFileOffsetSeconds, buildTimeline, emptyBucket } from '../timeline';
import { calculateSnoreStats } from '../scoreCalculator';

const minute = (db: number, snoreEvents = 0, snorePeak = 0) => ({
  ...emptyBucket(),
  dbSum: db * 240,
  frames: 240,
  snoreMs: snoreEvents * 1500,
  snorePeakSum: snoreEvents * snorePeak,
  snoreEvents,
  loudestSnoreDb: snorePeak,
  loudestSnoreOffset: 100,
});

describe('buildTimeline', () => {
  it('scores a loud fan without snoring as a quiet night', () => {
    const buckets = Object.fromEntries(Array.from({ length: 60 }, (_, m) => [m, minute(55)]));
    const timeline = buildTimeline(buckets, Date.now(), true);
    expect(timeline.every((s) => s.category === 'quiet')).toBe(true);
    expect(calculateSnoreStats(3600, timeline).snoreScore).toBe(0);
  });

  it('marks snoring minutes by snore loudness and links them to the recording', () => {
    const timeline = buildTimeline({ 0: minute(40), 1: minute(45, 12, 60), 2: minute(40, 3, 39) }, 0, true);
    expect(timeline.map((s) => s.category)).toEqual(['quiet', 'loud', 'light']);
    expect(timeline[1]).toEqual(expect.objectContaining({ snoreSeconds: 18, audioOffsetSeconds: 100 }));
    expect(timeline[0].audioOffsetSeconds).toBeUndefined();
  });
});

describe('audioFileOffsetSeconds', () => {
  it('leaves out the time the recorder was interrupted', () => {
    const pauses = [{ start: 60_000, end: 90_000 }];
    expect(audioFileOffsetSeconds(30_000, 0, pauses)).toBe(30); // Before the pause
    expect(audioFileOffsetSeconds(120_000, 0, pauses)).toBe(90); // After: 30 s of pause skipped
    expect(audioFileOffsetSeconds(75_000, 0, pauses)).toBe(60); // During: end of audio before it
  });
});
