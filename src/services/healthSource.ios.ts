import {
  isHealthDataAvailableAsync,
  queryCategorySamples,
  queryQuantitySamples,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import type { HealthSource, RawNightHealth } from './healthSource.types';
import type { StageInterval, TimedValue } from './healthStats';

const READ = [
  'HKQuantityTypeIdentifierHeartRate',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKQuantityTypeIdentifierRespiratoryRate',
  'HKQuantityTypeIdentifierOxygenSaturation',
  'HKQuantityTypeIdentifierAppleSleepingBreathingDisturbances',
  'HKQuantityTypeIdentifierBodyMass',
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKCategoryTypeIdentifierSleepApneaEvent',
] as const;

// HKCategoryValueSleepAnalysis: 2 awake, 3 core, 4 deep, 5 REM (0 in bed and 1 unspecified carry no stage)
const STAGES: Record<number, StageInterval['stage']> = { 2: 'awake', 3: 'light', 4: 'deep', 5: 'rem' };

const MONTH_MS = 30 * 24 * 3600 * 1000;

const between = (startMs: number, endMs: number) => ({
  date: { startDate: new Date(startMs), endDate: new Date(endMs) },
});

async function quantities(
  id: (typeof READ)[number],
  unit: string,
  startMs: number,
  endMs: number
): Promise<TimedValue[]> {
  try {
    const samples = await queryQuantitySamples(id as any, { limit: 0, unit: unit as any, filter: between(startMs, endMs) });
    return samples.map((s) => ({ time: new Date(s.startDate).getTime(), value: s.quantity }));
  } catch {
    return []; // Not authorized or unsupported on this iOS version
  }
}

export const healthSource: HealthSource = {
  name: 'Apple Health',
  isAvailable: () => isHealthDataAvailableAsync(),
  requestPermission: () => requestAuthorization({ toRead: READ }),

  async readNight(startMs, endMs): Promise<RawNightHealth> {
    const [heartRate, resting, hrv, respiratoryRate, spo2, disturbances, weight] = await Promise.all([
      quantities('HKQuantityTypeIdentifierHeartRate', 'count/min', startMs, endMs),
      quantities('HKQuantityTypeIdentifierRestingHeartRate', 'count/min', startMs - 12 * 3600 * 1000, endMs + 12 * 3600 * 1000),
      quantities('HKQuantityTypeIdentifierHeartRateVariabilitySDNN', 'ms', startMs, endMs),
      quantities('HKQuantityTypeIdentifierRespiratoryRate', 'count/min', startMs, endMs),
      quantities('HKQuantityTypeIdentifierOxygenSaturation', '%', startMs, endMs),
      // Apple stores one value per night, dated around waking up
      quantities('HKQuantityTypeIdentifierAppleSleepingBreathingDisturbances', 'count', startMs, endMs + 6 * 3600 * 1000),
      quantities('HKQuantityTypeIdentifierBodyMass', 'kg', endMs - MONTH_MS, endMs),
    ]);

    let stages: StageInterval[] = [];
    let sleepApneaEvents: number | undefined;
    try {
      const sleep = await queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
        limit: 0,
        filter: between(startMs - 3600 * 1000, endMs + 3600 * 1000),
      });
      stages = sleep
        .filter((s) => STAGES[Number(s.value)] !== undefined)
        .map((s) => ({
          start: new Date(s.startDate).getTime(),
          end: new Date(s.endDate).getTime(),
          stage: STAGES[Number(s.value)],
        }));
      const apnea = await queryCategorySamples('HKCategoryTypeIdentifierSleepApneaEvent', {
        limit: 0,
        filter: between(startMs, endMs + 6 * 3600 * 1000),
      });
      if (apnea.length > 0) sleepApneaEvents = apnea.length;
    } catch {
      // Sleep data not authorized
    }

    const latest = (values: TimedValue[]) =>
      values.length > 0 ? values.reduce((a, b) => (b.time > a.time ? b : a)).value : undefined;
    return {
      heartRate,
      restingHeartRate: latest(resting),
      hrv,
      respiratoryRate,
      // HealthKit's percent unit is a fraction (0.97)
      oxygenSaturation: spo2.map((v) => ({ ...v, value: v.value <= 1 ? v.value * 100 : v.value })),
      breathingDisturbances: latest(disturbances),
      sleepApneaEvents,
      stages,
      weightKg: latest(weight),
    };
  },
};
