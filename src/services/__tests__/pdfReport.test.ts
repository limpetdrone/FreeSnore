import { beforeAll, describe, expect, it } from '@jest/globals';
import { buildPdfReportHtml, buildPeriodReportHtml, PDF_TIMELINE_COLUMNS, sessionsInPeriod } from '../pdfReportGenerator';
import { binTimeline, snoringTimeSeconds } from '../timeline';
import { setLanguage } from '../../i18n';
import type { SleepSession, TimelineSample } from '../../types/session';

// A real-length night: 5.5 hours of minutes from 00:41, snoring 01:12-02:14 and 03:00-03:20
function longNight(day: number, factors: string[] = []): SleepSession {
  const timeline: TimelineSample[] = Array.from({ length: 332 }, (_, m) => {
    const total = 41 + m;
    const snoring = (m >= 31 && m < 93) || (m >= 139 && m < 159);
    return {
      offsetMinutes: m,
      timeFormatted: `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`,
      db: 38,
      category: snoring ? 'loud' : 'quiet',
      snoreSeconds: snoring ? 15 : 0,
      snoreDb: snoring ? 60 : 0,
      snoreCount: snoring ? 12 : 0,
    };
  });
  return {
    id: `n${day}`,
    startTime: new Date(2026, 9, day, 0, 41).toISOString(),
    endTime: new Date(2026, 9, day, 6, 13).toISOString(),
    delayMinutes: 30,
    totalDurationSeconds: 332 * 60,
    snoreDurationSeconds: 15 * 60, // Saved by an older version: snore sounds only
    snoreScore: 30 + day,
    quietPercent: 75,
    lightPercent: 0,
    loudPercent: 25,
    epicPercent: 0,
    peakDb: 80,
    timeline,
    clips: [],
    factors,
  };
}

describe('night PDF report', () => {
  beforeAll(() => setLanguage('en'));

  it('counts the minutes with snoring as snoring time', () => {
    expect(snoringTimeSeconds(longNight(11))).toBe(82 * 60);
  });

  it('draws the whole night as at most 96 visible bars', () => {
    const html = buildPdfReportHtml(longNight(11));
    const bars = html.match(/<rect [^>]*fill="#F97316"/g) ?? [];
    expect(bars.length).toBeGreaterThan(10);
    expect(bars.length).toBeLessThanOrEqual(PDF_TIMELINE_COLUMNS);
    // Each bar is wider than a hairline
    const widths = bars.map((b) => Number(/width="([\d.]+)"/.exec(b)![1]));
    expect(Math.min(...widths)).toBeGreaterThan(3);
    expect(binTimeline(longNight(11).timeline, PDF_TIMELINE_COLUMNS).columns.length).toBeLessThanOrEqual(96);
  });

  it('contains the summary, the insights and their sources', () => {
    const html = buildPdfReportHtml(longNight(11));
    expect(html).toContain('Your night in brief');
    expect(html).toContain('You snored for 25% of the night, 1h 22m in total.');
    expect(html).toContain('What it may mean');
    expect(html).toContain('[1] Dafna E');
    expect(html).not.toContain('>15m<'); // The old, sound-only snoring time
  });
});

describe('period PDF report', () => {
  beforeAll(() => setLanguage('en'));
  const nights = [3, 5, 6, 8, 9, 10, 11].map((d) => longNight(d, d % 2 ? ['factorAlcohol'] : []));

  it('picks the nights that started within the period', () => {
    const period = { from: new Date(2026, 9, 5), to: new Date(2026, 9, 9) };
    expect(sessionsInPeriod(nights, period).map((s) => s.id)).toEqual(['n5', 'n6', 'n8', 'n9']);
  });

  it('summarizes the nights with a chart, a table and the shared snoring time', () => {
    const html = buildPeriodReportHtml(nights, { from: new Date(2026, 9, 5), to: new Date(2026, 9, 11) });
    expect(html).toContain('You recorded 6 nights.');
    expect(html).toContain('1h 22m per night on average');
    expect(html).toContain('Snore score per night');
    expect((html.match(/<tr>/g) ?? []).length).toBeGreaterThanOrEqual(6);
    expect(html).toContain('By pattern:');
  });

  it('says so when the period has no nights', () => {
    const html = buildPeriodReportHtml(nights, { from: new Date(2026, 8, 1), to: new Date(2026, 8, 7) });
    expect(html).toContain('No nights were recorded in this period.');
  });
});
