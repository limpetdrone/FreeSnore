import { beforeAll, describe, expect, it } from '@jest/globals';
import { summarizeNight } from '../nightSummary';
import { setLanguage } from '../../i18n';
import type { SleepSession, TimelineSample } from '../../types/session';

// 8 hours from 23:00; `snoring(m)` gives the snore seconds of minute m
function night(snoring: (m: number) => number, extra: Partial<SleepSession> = {}): SleepSession {
  const timeline: TimelineSample[] = Array.from({ length: 480 }, (_, m) => {
    const total = (23 * 60 + m) % 1440;
    const sec = snoring(m);
    return {
      offsetMinutes: m,
      timeFormatted: `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`,
      db: 35,
      category: sec > 0 ? (m === 200 ? 'epic' : 'loud') : 'quiet',
      snoreSeconds: sec,
      snoreDb: sec > 0 ? (m === 200 ? 70 : 58) : 0,
    };
  });
  const snoreSeconds = timeline.reduce((n, s) => n + (s.snoreSeconds ?? 0), 0);
  return {
    id: 'tonight',
    startTime: '2026-10-09T21:00:00.000Z',
    endTime: '2026-10-10T05:00:00.000Z',
    delayMinutes: 0,
    totalDurationSeconds: 480 * 60,
    snoreDurationSeconds: snoreSeconds,
    snoreScore: 40,
    quietPercent: 0,
    lightPercent: 0,
    loudPercent: 0,
    epicPercent: 0,
    peakDb: 70,
    timeline,
    clips: [],
    factors: [],
    ...extra,
  };
}

const previous = (day: number, snoreScore: number, factors: string[] = []) =>
  ({ id: `n${day}`, startTime: `2026-10-0${day}T21:00:00.000Z`, snoreScore, factors }) as SleepSession;

describe('summarizeNight', () => {
  beforeAll(() => setLanguage('en'));

  it('describes a single snoring episode and the quiet rest of the night', () => {
    // Snoring 20 s/min from 02:00 to 03:30 (minutes 180-269)
    const summary = summarizeNight(night((m) => (m >= 180 && m < 270 ? 20 : 0)))!;
    expect(summary.sentences).toEqual([
      'You snored for 6% of the night, 30m in total.',
      'Most of the snoring happened in the middle of the night.',
      'There was one continuous snoring episode, from 02:00 to 03:30 (1h 30m).',
      'Your longest quiet stretch was 3h 30m (03:30–07:00).',
      'The snoring was mostly loud, peaking around 02:20 (70 dB).',
    ]);
    expect(summary.longestEpisode).toEqual(expect.objectContaining({ startMinute: 180, peakMinute: 200 }));
  });

  it('merges snoring minutes separated by short pauses into one episode', () => {
    // Every third minute between 01:00 and 02:00: still a single episode
    const summary = summarizeNight(night((m) => (m >= 120 && m < 180 && m % 3 === 0 ? 20 : 0)))!;
    expect(summary.sentences[2]).toMatch(/^There was one continuous snoring episode, from 01:00/);
  });

  it('calls a night without snoring quiet and compares it with recent nights', () => {
    const history = [previous(6, 60), previous(7, 50), previous(8, 55)];
    const summary = summarizeNight(night(() => 0, { snoreScore: 5 }), history)!;
    expect(summary.sentences).toEqual([
      'A quiet night: you hardly snored at all.',
      'Better than your recent average (5 points vs. the usual 55).',
    ]);
    expect(summary.longestEpisode).toBeUndefined();
  });

  it('mentions a factor that clearly changes the score', () => {
    const history = [
      previous(1, 70, ['factorAlcohol']),
      previous(2, 70, ['factorAlcohol']),
      previous(3, 30),
      previous(4, 30),
      previous(5, 30),
    ];
    const tonight = night(() => 0, { snoreScore: 70, factors: ['factorAlcohol'] });
    expect(summarizeNight(tonight, history)!.sentences).toContain(
      'On nights marked “Alcohol”, your score is 133% higher on average.'
    );
  });

  it('skips sessions recorded before per-minute snore data', () => {
    const legacy = night(() => 0);
    legacy.timeline = legacy.timeline.map(({ snoreSeconds: _s, snoreDb: _d, ...rest }) => rest);
    expect(summarizeNight(legacy)).toBeNull();
  });
});
