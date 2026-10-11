import type { SleepSession } from '../types/session';
import { t, getLanguage, tFactor, formatHoursMinutes } from '../i18n';
import { SnorePattern, summarizeNight } from './nightSummary';
import { snoringTimeSeconds } from './timeline';
import { compareFactors } from './factorStats';

export interface PeriodSummary {
  sentences: string[];
  insights: string[]; // What the period's pattern may mean, citing nightSummary REFERENCES
}

const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const MIN_FACTOR_DELTA_PCT = 20;

/**
 * Short description of several nights (a week, a month or any period), for the history
 * screen and the period PDF report. Returns null when there are no nights.
 */
export function summarizePeriod(sessions: SleepSession[]): PeriodSummary | null {
  if (sessions.length === 0) return null;
  const nights = [...sessions].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const locale = getLanguage() === 'hu' ? 'hu-HU' : 'en-US';
  const snoreTimes = nights.map(snoringTimeSeconds);
  const totalSleep = Math.max(1, nights.reduce((n, s) => n + s.totalDurationSeconds, 0));
  const totalSnore = snoreTimes.reduce((a, b) => a + b, 0);
  const avgScore = Math.round(avg(nights.map((s) => s.snoreScore)));
  const quietNights = nights.filter((s, i) => snoreTimes[i] < 0.05 * s.totalDurationSeconds).length;
  const summaries = nights.map((s) => summarizeNight(s));

  const sentences: string[] = [
    t('periodAmount', {
      nights: nights.length,
      percent: Math.round((totalSnore / totalSleep) * 100),
      avgSnore: formatHoursMinutes(totalSnore / nights.length),
      avgScore,
    }),
    t('periodQuietNights', { count: quietNights, total: nights.length }),
  ];
  const best = nights.reduce((a, b) => (b.snoreScore < a.snoreScore ? b : a));
  const worst = nights.reduce((a, b) => (b.snoreScore > a.snoreScore ? b : a));
  if (best !== worst) {
    const day = (s: SleepSession) =>
      new Date(s.startTime).toLocaleDateString(locale, { month: 'short', day: 'numeric', weekday: 'short' });
    sentences.push(t('periodBestWorst', { best: day(best), bestScore: best.snoreScore, worst: day(worst), worstScore: worst.snoreScore }));
  }
  if (nights.length >= 4) {
    const half = Math.floor(nights.length / 2);
    const firstAvg = avg(nights.slice(0, half).map((s) => s.snoreScore));
    const secondAvg = avg(nights.slice(nights.length - half).map((s) => s.snoreScore));
    const diff = secondAvg - firstAvg;
    sentences.push(
      Math.abs(diff) <= Math.max(5, firstAvg * 0.15)
        ? t('periodTrendStable')
        : t(diff < 0 ? 'periodTrendBetter' : 'periodTrendWorse', { from: Math.round(firstAvg), to: Math.round(secondAvg) })
    );
  }
  const patterns = summaries
    .map((s) => s?.pattern)
    .filter((p): p is SnorePattern => !!p)
    .reduce<Record<string, number>>((acc, p) => ({ ...acc, [p]: (acc[p] ?? 0) + 1 }), {});
  if (Object.keys(patterns).length > 0) {
    sentences.push(
      t('periodPatterns', {
        continuous: patterns.continuous ?? 0,
        intermittent: patterns.intermittent ?? 0,
        sporadic: patterns.sporadic ?? 0,
      })
    );
  }

  // Where in the night the period's snoring happened, from the nights with snore data
  const thirds = [0, 0, 0];
  for (const s of nights) {
    const tl = s.timeline || [];
    if (tl.length === 0) continue;
    const first = tl[0].offsetMinutes;
    const span = tl[tl.length - 1].offsetMinutes - first + 1;
    for (const sample of tl) {
      thirds[Math.min(2, Math.floor(((sample.offsetMinutes - first) / span) * 3))] += sample.snoreSeconds ?? 0;
    }
  }
  const thirdsTotal = thirds.reduce((a, b) => a + b, 0);
  const insights: string[] = [];
  if (thirdsTotal > 0) {
    const top = thirds.indexOf(Math.max(...thirds));
    sentences.push(
      t('periodThirds', {
        start: Math.round((thirds[0] / thirdsTotal) * 100),
        middle: Math.round((thirds[1] / thirdsTotal) * 100),
        end: Math.round((thirds[2] / thirdsTotal) * 100),
      })
    );
    if (thirds[top] / thirdsTotal >= 0.5) {
      insights.push(t((['insightEarly', 'insightMiddle', 'insightLate'] as const)[top]));
    }
  }
  if ((patterns.intermittent ?? 0) >= Math.max(1, nights.length / 2)) insights.push(t('insightIntermittent'));
  if ((patterns.continuous ?? 0) >= Math.max(1, nights.length / 2)) insights.push(t('insightContinuous'));
  if (totalSnore > 0) insights.push(t('insightDoctor'));


  // The habit or remedy that changed the score the most in this period
  const factor = compareFactors(nights, 2)
    .filter((f) => Math.abs(f.deltaPct) >= MIN_FACTOR_DELTA_PCT)
    .sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))[0];
  if (factor) {
    sentences.push(
      t(factor.deltaPct > 0 ? 'summaryFactorHigher' : 'summaryFactorLower', {
        factor: tFactor(factor.factor),
        pct: Math.abs(factor.deltaPct),
      })
    );
  }

  return { sentences, insights };
}
