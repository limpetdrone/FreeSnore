import { SleepSession } from '../types/session';

export interface FactorComparison {
  factor: string;
  withCount: number;
  withoutCount: number;
  withAvg: number;
  withoutAvg: number;
  deltaPct: number; // Negative: lower (better) score on nights with the factor
}

const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

/**
 * Compares the average snore score of nights with and without each factor.
 * A factor is only reported with at least `minNights` nights on both sides,
 * otherwise the difference is mostly noise.
 */
export function compareFactors(sessions: SleepSession[], minNights: number = 3): FactorComparison[] {
  const factors = new Set(sessions.flatMap((s) => s.factors || []));
  const results: FactorComparison[] = [];

  factors.forEach((factor) => {
    const withScores: number[] = [];
    const withoutScores: number[] = [];
    sessions.forEach((s) => {
      ((s.factors || []).includes(factor) ? withScores : withoutScores).push(s.snoreScore);
    });
    if (withScores.length < minNights || withoutScores.length < minNights) return;

    const withAvg = average(withScores);
    const withoutAvg = average(withoutScores);
    if (withoutAvg === 0) return;

    results.push({
      factor,
      withCount: withScores.length,
      withoutCount: withoutScores.length,
      withAvg: Math.round(withAvg),
      withoutAvg: Math.round(withoutAvg),
      deltaPct: Math.round(((withAvg - withoutAvg) / withoutAvg) * 100),
    });
  });

  // Most helpful (largest score reduction) first
  return results.sort((a, b) => a.deltaPct - b.deltaPct);
}
