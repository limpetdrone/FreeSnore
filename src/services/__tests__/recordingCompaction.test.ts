import { describe, expect, it } from '@jest/globals';
import { compactedSession, mergeRanges, remapOffset, retentionAction, snoringRanges, withoutAudio } from '../recordingCompaction';
import type { SleepSession, TimelineSample } from '../../types/session';

const sample = (m: number, audioOffsetSeconds?: number): TimelineSample => ({
  offsetMinutes: m,
  timeFormatted: '01:00',
  db: 40,
  category: audioOffsetSeconds === undefined ? 'quiet' : 'loud',
  snoreSeconds: audioOffsetSeconds === undefined ? 0 : 12,
  snoreDb: audioOffsetSeconds === undefined ? 0 : 60,
  ...(audioOffsetSeconds === undefined ? {} : { audioOffsetSeconds }),
});

const session = (extra: Partial<SleepSession> = {}): SleepSession => ({
  id: 'n1',
  startTime: '2026-10-10T22:41:00.000Z',
  endTime: '2026-10-11T04:14:00.000Z',
  delayMinutes: 30,
  totalDurationSeconds: 20000,
  snoreDurationSeconds: 300,
  snoreScore: 50,
  quietPercent: 90,
  lightPercent: 0,
  loudPercent: 10,
  epicPercent: 0,
  peakDb: 80,
  // Snoring minutes 1, 2 and 10; minute 3 is quiet
  timeline: [sample(0), sample(1, 1870), sample(2, 1925), sample(3), sample(10, 2400)],
  clips: [
    {
      id: 'c1',
      timestamp: '2026-10-10T23:12:00.000Z',
      offsetSeconds: 1925,
      durationSeconds: 2,
      peakDb: 70,
      avgDb: 60,
      category: 'loud',
      audioUri: 'file:///docs/night.m4a',
    },
  ],
  audioUri: 'file:///docs/night.m4a',
  factors: [],
  ...extra,
});

describe('snoringRanges', () => {
  it('keeps the replay window of every snoring minute and clip, merged', () => {
    expect(snoringRanges(session())).toEqual([
      { start: 1865, end: 1886 },
      { start: 1920, end: 1941 }, // The clip at 1925 (1922-1930) falls inside
      { start: 2395, end: 2416 },
    ]);
  });

  it('clamps at the start of the file', () => {
    expect(snoringRanges(session({ timeline: [sample(0, 2)], clips: [] }))).toEqual([{ start: 0, end: 18 }]);
  });
});

describe('mergeRanges', () => {
  it('joins overlapping and nearly adjacent ranges and sorts them', () => {
    expect(
      mergeRanges([
        { start: 50, end: 60 },
        { start: 0, end: 10 },
        { start: 11, end: 20 }, // 1 s gap: joined
        { start: 55, end: 70 },
        { start: 30, end: 30 }, // empty: dropped
      ])
    ).toEqual([
      { start: 0, end: 20 },
      { start: 50, end: 70 },
    ]);
  });
});

describe('compactedSession', () => {
  const copied = [
    { start: 1865, end: 1941, outStart: 0 },
    { start: 2395.02, end: 2416, outStart: 76 }, // Android snapped the start by 20 ms
  ];

  it('moves every replay offset into the compacted file', () => {
    expect(remapOffset(1870, copied)).toBe(5);
    expect(remapOffset(2400, copied)).toBe(80.98);
    expect(remapOffset(2395, copied)).toBe(76); // Inside the snapping slack
    expect(remapOffset(3000, copied)).toBeUndefined();

    const compacted = compactedSession(session(), copied, 'file:///docs/night-snoring.m4a');
    expect(compacted.audioCompacted).toBe(true);
    expect(compacted.audioUri).toBe('file:///docs/night-snoring.m4a');
    expect(compacted.timeline.map((s) => s.audioOffsetSeconds)).toEqual([undefined, 5, 60, undefined, 80.98]);
    expect(compacted.clips).toEqual([
      expect.objectContaining({ offsetSeconds: 60, audioUri: 'file:///docs/night-snoring.m4a' }),
    ]);
  });

  it('drops replay points that were not kept', () => {
    const compacted = compactedSession(session(), [copied[0]], 'file:///x.m4a');
    expect(compacted.timeline[4].audioOffsetSeconds).toBeUndefined();
  });
});

describe('retention', () => {
  const day = 24 * 3600 * 1000;
  const end = new Date('2026-10-11T04:14:00.000Z').getTime();

  it('compacts a night after the full-night days, deletes after the audio days', () => {
    expect(retentionAction(session(), 3, null, true, end + 2 * day)).toBeNull();
    expect(retentionAction(session(), 3, null, true, end + 3 * day)).toBe('compact');
    expect(retentionAction(session({ audioCompacted: true }), 3, null, true, end + 10 * day)).toBeNull();
    expect(retentionAction(session(), null, null, true, end + 100 * day)).toBeNull(); // Keep whole nights
    expect(retentionAction(session(), 3, 30, true, end + 30 * day)).toBe('delete');
    expect(retentionAction(session(), 3, 30, false, end + 30 * day)).toBeNull(); // Nothing to do
  });

  it('keeps the statistics of a night whose recording is deleted', () => {
    const gone = withoutAudio(session());
    expect(gone.audioUri).toBeUndefined();
    expect(gone.audioRemoved).toBe(true);
    expect(gone.clips).toEqual([]);
    expect(gone.timeline.every((s) => s.audioOffsetSeconds === undefined)).toBe(true);
    expect(gone.snoreScore).toBe(50);
  });
});
