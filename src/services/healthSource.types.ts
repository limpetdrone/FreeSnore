import type { StageInterval, TimedValue } from './healthStats';

/** What a platform's health store gives for one night (raw, before summarizing). */
export interface RawNightHealth {
  heartRate: TimedValue[];
  restingHeartRate?: number;
  hrv: TimedValue[];
  respiratoryRate: TimedValue[];
  oxygenSaturation: TimedValue[]; // %
  breathingDisturbances?: number;
  sleepApneaEvents?: number;
  stages: StageInterval[];
  weightKg?: number;
}

export interface HealthSource {
  name: 'Apple Health' | 'Health Connect' | null;
  isAvailable(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  readNight(startMs: number, endMs: number): Promise<RawNightHealth>;
}
