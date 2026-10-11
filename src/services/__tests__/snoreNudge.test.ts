import { describe, expect, it } from '@jest/globals';
import { nudgeDecision, nudgeEffect, snoringEpisodeOngoing, snoringStopped } from '../snoreNudge';
import type { SleepSession } from '../../types/session';

const night = (snoring: (m: number) => boolean, nudges: { minute: number; sent: boolean }[]) =>
  ({
    timeline: Array.from({ length: 120 }, (_, m) => ({ offsetMinutes: m, snoreSeconds: snoring(m) ? 15 : 0 })),
    nudges,
  }) as unknown as SleepSession;

describe('snore nudge', () => {
  it('waits for three minutes of snoring in a row', () => {
    const snores = (m: number) => (m >= 10 && m !== 12 ? 5 : 0);
    expect(snoringEpisodeOngoing(snores, 12)).toBe(false); // Minutes 9-11: 9 is quiet
    expect(snoringEpisodeOngoing(snores, 13)).toBe(false); // 12 was a pause
    expect(snoringEpisodeOngoing(snores, 16)).toBe(true); // 13, 14, 15
  });

  it('keeps a cooldown and leaves some episodes as control', () => {
    expect(nudgeDecision([], 30, 0.9)).toEqual({ minute: 30, sent: true });
    expect(nudgeDecision([], 30, 0.1)).toEqual({ minute: 30, sent: false });
    expect(nudgeDecision([{ minute: 30, sent: true }], 45, 0.9)).toBeNull();
    expect(nudgeDecision([{ minute: 30, sent: false }], 50, 0.9)).toEqual({ minute: 50, sent: true });
  });

  it('measures whether snoring stopped after nudged and control episodes', () => {
    // Snoring 10-29 stops at 31 after the nudge at 30; 60-89 goes on after the control at 62
    const s = night((m) => (m >= 10 && m < 31) || (m >= 60 && m < 90), [
      { minute: 30, sent: true },
      { minute: 62, sent: false },
      { minute: 118, sent: true }, // Night over before the window: not counted
    ]);
    expect(snoringStopped(s, 30)).toBe(true);
    expect(snoringStopped(s, 62)).toBe(false);
    expect(nudgeEffect([s])).toEqual({ nudged: { stopped: 1, total: 1 }, control: { stopped: 0, total: 1 } });
  });
});
