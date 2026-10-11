import type { NightEnvironment, SleepSession } from '../types/session';
import { t } from '../i18n';

export const POLLEN_TYPES = ['alder', 'birch', 'grass', 'mugwort', 'ragweed'] as const;
export type PollenType = (typeof POLLEN_TYPES)[number];

export type EnvironmentMetric = 'pollen' | 'humidity' | 'temperature' | 'pressure' | 'pm10';

export interface EnvironmentComparison {
  metric: EnvironmentMetric;
  median: number; // Nights above it are the "high" nights
  highAvg: number; // Average score of the high nights
  lowAvg: number;
  highNights: number;
  lowNights: number;
  deltaPct: number; // Positive: more snoring on high nights
}

const MIN_NIGHTS = 6;
const MIN_GROUP = 3;
// Below this spread the nights were too alike to compare
const MIN_SPREAD: Record<EnvironmentMetric, number> = {
  pollen: 10,
  humidity: 10,
  temperature: 4,
  pressure: 6,
  pm10: 10,
};

/** Total pollen of the night: the peaks of all types added up (grains/m³). */
export const totalPollen = (env: NightEnvironment) =>
  Object.values(env.pollen).reduce<number>((a, b) => a + (b ?? 0), 0);

const metricValue = (env: NightEnvironment, metric: EnvironmentMetric): number | undefined =>
  metric === 'pollen' ? (Object.keys(env.pollen).length > 0 ? totalPollen(env) : undefined) : env[metric];

/**
 * Compares the snore score of nights with high and low outdoor values (split at the median).
 * These are continuous measurements, so they are not handled like the yes/no habits.
 */
export function compareEnvironment(sessions: SleepSession[]): EnvironmentComparison[] {
  const results: EnvironmentComparison[] = [];
  for (const metric of Object.keys(MIN_SPREAD) as EnvironmentMetric[]) {
    const nights = sessions
      .map((s) => ({ score: s.snoreScore, value: s.environment ? metricValue(s.environment, metric) : undefined }))
      .filter((n): n is { score: number; value: number } => n.value !== undefined);
    if (nights.length < MIN_NIGHTS) continue;
    const values = nights.map((n) => n.value).sort((a, b) => a - b);
    if (values[values.length - 1] - values[0] < MIN_SPREAD[metric]) continue;
    const median = values[Math.floor((values.length - 1) / 2)];
    const high = nights.filter((n) => n.value > median);
    const low = nights.filter((n) => n.value <= median);
    if (high.length < MIN_GROUP || low.length < MIN_GROUP) continue;
    const avg = (group: { score: number }[]) => group.reduce((a, n) => a + n.score, 0) / group.length;
    const highAvg = avg(high);
    const lowAvg = avg(low);
    if (lowAvg === 0) continue;
    results.push({
      metric,
      median: Math.round(median),
      highAvg: Math.round(highAvg),
      lowAvg: Math.round(lowAvg),
      highNights: high.length,
      lowNights: low.length,
      deltaPct: Math.round(((highAvg - lowAvg) / lowAvg) * 100),
    });
  }
  return results.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
}

const POLLEN_LABEL = {
  alder: 'pollenAlder',
  birch: 'pollenBirch',
  grass: 'pollenGrass',
  mugwort: 'pollenMugwort',
  ragweed: 'pollenRagweed',
} as const;

// Pollen below this hardly matters (grains/m³)
const NOTABLE_POLLEN = 5;

/** The lines describing a night's outdoor conditions (also used in the PDF). */
export function environmentLines(env: NightEnvironment): string[] {
  const pollen = POLLEN_TYPES.filter((p) => (env.pollen[p] ?? 0) >= NOTABLE_POLLEN)
    .map((p) => `${t(POLLEN_LABEL[p])} ${env.pollen[p]}`)
    .join(', ');
  return [
    pollen ? t('environmentPollen', { list: pollen }) : t('environmentNoPollen'),
    ...(env.humidity !== undefined ? [t('environmentHumidity', { value: env.humidity })] : []),
    ...(env.temperature !== undefined ? [t('environmentTemperature', { value: env.temperature })] : []),
    ...(env.pressure !== undefined ? [t('environmentPressure', { value: env.pressure })] : []),
    ...(env.pm10 !== undefined ? [t('environmentPm10', { value: env.pm10 })] : []),
  ];
}

