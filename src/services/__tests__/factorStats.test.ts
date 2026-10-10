import { describe, expect, it } from '@jest/globals';
import { compareFactors } from '../factorStats';
import { SleepSession } from '../../types/session';

const night = (snoreScore: number, factors: string[]) => ({ snoreScore, factors }) as SleepSession;

describe('compareFactors', () => {
  it('reports the score change on nights with vs. without a factor', () => {
    const sessions = [
      night(30, ['remedyNasalStrips']),
      night(30, ['remedyNasalStrips']),
      night(30, ['remedyNasalStrips']),
      night(60, []),
      night(60, []),
      night(60, []),
    ];
    expect(compareFactors(sessions)).toEqual([
      expect.objectContaining({ factor: 'remedyNasalStrips', withAvg: 30, withoutAvg: 60, deltaPct: -50 }),
    ]);
  });

  it('skips factors without enough nights on both sides', () => {
    const sessions = [night(30, ['factorAlcohol']), night(60, []), night(60, []), night(60, [])];
    expect(compareFactors(sessions)).toEqual([]);
  });
});
