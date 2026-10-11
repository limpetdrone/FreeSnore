import { describe, expect, it, jest } from '@jest/globals';
import { nightValues, summarizeEnvironment } from '../environment';
import { compareEnvironment } from '../environmentStats';
import type { SleepSession } from '../../types/session';

jest.mock('expo-location', () => ({}));

describe('summarizeEnvironment', () => {
  // Hourly data from 20:00 to 08:00 (epoch seconds)
  const base = Date.UTC(2026, 9, 10, 20) / 1000;
  const hours = Array.from({ length: 13 }, (_, i) => base + i * 3600);
  const air = {
    hourly: {
      time: hours,
      grass_pollen: hours.map((_, i) => (i === 5 ? 40 : 2)), // Peak at 01:00
      ragweed_pollen: hours.map(() => null),
      pm10: hours.map(() => 20),
      pm2_5: hours.map(() => 12),
    },
  };
  const weather = {
    hourly: {
      time: hours,
      relative_humidity_2m: hours.map((_, i) => 60 + i),
      temperature_2m: hours.map(() => 9),
      pressure_msl: hours.map(() => 1012),
    },
  };
  // Night from 23:30 to 06:10
  const start = Date.UTC(2026, 9, 10, 23, 30);
  const end = Date.UTC(2026, 9, 11, 6, 10);

  it('takes the hours of the night only', () => {
    // 23:00 (the hour the night started in) .. 06:00
    expect(nightValues(weather, 'relative_humidity_2m', start, end)).toEqual([63, 64, 65, 66, 67, 68, 69, 70]);
  });

  it('keeps the pollen peak and averages the weather', () => {
    expect(summarizeEnvironment(air, weather, start, end)).toEqual({
      pollen: { grass: 40 }, // Ragweed has no data
      humidity: 67,
      temperature: 9,
      pressure: 1012,
      pm10: 20,
      pm25: 12,
    });
  });
});

describe('compareEnvironment', () => {
  const night = (score: number, humidity: number, pm10?: number) =>
    ({ snoreScore: score, environment: { pollen: {}, humidity, pm10 } }) as unknown as SleepSession;

  it('compares nights above and below the median', () => {
    const results = compareEnvironment([
      night(20, 40, 5),
      night(25, 45, 6),
      night(22, 50, 5),
      night(50, 80, 7),
      night(55, 85, 6),
      night(60, 90, 5),
    ]);
    // Humid nights: 55 vs 22 points. PM10 barely varied: not compared
    expect(results).toEqual([
      expect.objectContaining({ metric: 'humidity', median: 50, highAvg: 55, lowAvg: 22, deltaPct: 146 }),
    ]);
  });

  it('needs enough nights', () => {
    expect(compareEnvironment([night(20, 40), night(60, 90)])).toEqual([]);
  });
});
