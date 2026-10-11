import { getSdkStatus, initialize, readRecords, requestPermission, SdkAvailabilityStatus } from 'react-native-health-connect';
import type { HealthSource, RawNightHealth } from './healthSource.types';
import type { StageInterval, TimedValue } from './healthStats';

const RECORDS = [
  'HeartRate',
  'RestingHeartRate',
  'HeartRateVariabilityRmssd',
  'RespiratoryRate',
  'OxygenSaturation',
  'SleepSession',
  'Weight',
] as const;

// Health Connect SleepStageType: 1 awake, 4 light, 5 deep, 6 REM
const STAGES: Record<number, StageInterval['stage']> = { 1: 'awake', 4: 'light', 5: 'deep', 6: 'rem' };

const MONTH_MS = 30 * 24 * 3600 * 1000;

const range = (startMs: number, endMs: number) => ({
  timeRangeFilter: {
    operator: 'between' as const,
    startTime: new Date(startMs).toISOString(),
    endTime: new Date(endMs).toISOString(),
  },
});

async function read(type: (typeof RECORDS)[number], startMs: number, endMs: number): Promise<any[]> {
  try {
    return (await readRecords(type, range(startMs, endMs))).records;
  } catch {
    return []; // Not permitted
  }
}

let ready: Promise<boolean> | null = null;
const ensureInitialized = () => (ready ??= initialize());

export const healthSource: HealthSource = {
  name: 'Health Connect',
  async isAvailable() {
    return (await getSdkStatus()) === SdkAvailabilityStatus.SDK_AVAILABLE && (await ensureInitialized());
  },
  async requestPermission() {
    if (!(await ensureInitialized())) return false;
    const granted = await requestPermission(RECORDS.map((recordType) => ({ accessType: 'read' as const, recordType })));
    return granted.length > 0;
  },

  async readNight(startMs, endMs): Promise<RawNightHealth> {
    await ensureInitialized();
    const [heart, resting, hrv, respiratory, spo2, sleep, weight] = await Promise.all([
      read('HeartRate', startMs, endMs),
      read('RestingHeartRate', startMs - 12 * 3600 * 1000, endMs + 12 * 3600 * 1000),
      read('HeartRateVariabilityRmssd', startMs, endMs),
      read('RespiratoryRate', startMs, endMs),
      read('OxygenSaturation', startMs, endMs),
      read('SleepSession', startMs - 3600 * 1000, endMs + 3600 * 1000),
      read('Weight', endMs - MONTH_MS, endMs),
    ]);
    const timed = (records: { time: string }[], value: (r: never) => number): TimedValue[] =>
      records.map((r) => ({ time: new Date(r.time).getTime(), value: value(r as never) }));
    const latest = (values: TimedValue[]) =>
      values.length > 0 ? values.reduce((a, b) => (b.time > a.time ? b : a)).value : undefined;

    return {
      // Heart rate records hold a series of samples
      heartRate: heart.flatMap((r) =>
        (r.samples ?? []).map((s: { time: string; beatsPerMinute: number }) => ({
          time: new Date(s.time).getTime(),
          value: s.beatsPerMinute,
        }))
      ),
      restingHeartRate: latest(timed(resting, (r: { beatsPerMinute: number }) => r.beatsPerMinute)),
      hrv: timed(hrv, (r: { heartRateVariabilityMillis: number }) => r.heartRateVariabilityMillis),
      respiratoryRate: timed(respiratory, (r: { rate: number }) => r.rate),
      oxygenSaturation: timed(spo2, (r: { percentage: number }) => r.percentage),
      stages: sleep.flatMap((session) =>
        (session.stages ?? [])
          .filter((s: { stage: number }) => STAGES[s.stage] !== undefined)
          .map((s: { startTime: string; endTime: string; stage: number }) => ({
            start: new Date(s.startTime).getTime(),
            end: new Date(s.endTime).getTime(),
            stage: STAGES[s.stage],
          }))
      ),
      weightKg: latest(timed(weight, (r: { weight: { inKilograms: number } }) => r.weight.inKilograms)),
    };
  },
};
