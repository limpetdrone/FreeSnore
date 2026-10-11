import { beforeAll, describe, expect, it } from '@jest/globals';
import { buildWidgetData } from '../widgetData';
import { setLanguage } from '../../i18n';
import type { SleepSession } from '../../types/session';

const night = (day: number, score: number) =>
  ({
    id: `n${day}`,
    startTime: new Date(2026, 9, day, 23, 0).toISOString(),
    snoreScore: score,
    snoreDurationSeconds: 3600,
    totalDurationSeconds: 7 * 3600,
    timeline: [],
  }) as unknown as SleepSession;

describe('buildWidgetData', () => {
  beforeAll(() => setLanguage('en'));

  it('shows the latest night and the streak', () => {
    const data = buildWidgetData([night(8, 60), night(9, 20), night(10, 15)], 25);
    expect(data).toEqual(
      expect.objectContaining({ hasNight: true, score: '15', scoreColor: '#10B981', snore: 'Snoring: 1h 0m', streak: '🔥 2 nights under goal' })
    );
  });

  it('has a placeholder before the first night', () => {
    expect(buildWidgetData([], 25)).toEqual(expect.objectContaining({ hasNight: false, empty: 'No night recorded yet' }));
  });
});
