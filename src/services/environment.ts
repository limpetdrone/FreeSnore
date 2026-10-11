import * as Location from 'expo-location';
import type { NightEnvironment, SleepSession } from '../types/session';
import { POLLEN_TYPES, PollenType } from './environmentStats';

/*
 * Outdoor conditions of a night from Open-Meteo (pollen and particulate matter: CAMS European
 * air quality forecast; humidity, temperature and air pressure: weather models). Free for non-commercial use with attribution.
 * The location is rounded to 0.1° (about 10 km) before it leaves the phone and is not stored.
 */


const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
const LOCATION_MAX_AGE_MS = 12 * 3600 * 1000;

const round1 = (x: number) => Math.round(x * 10) / 10;

interface HourlyResponse {
  hourly?: { time: number[] } & Record<string, (number | null)[] | number[]>;
}

/** Values of the hours the night covers (hour starts within [start - 1 h, end]). */
export function nightValues(response: HourlyResponse, key: string, startMs: number, endMs: number): number[] {
  const times = response.hourly?.time ?? [];
  const values = (response.hourly?.[key] ?? []) as (number | null)[];
  const out: number[] = [];
  times.forEach((t, i) => {
    const ms = t * 1000;
    const v = values[i];
    if (ms >= startMs - 3600 * 1000 && ms <= endMs && typeof v === 'number') out.push(v);
  });
  return out;
}

/** Summarizes the hourly responses for one night (pollen: peak; weather: average). */
export function summarizeEnvironment(
  air: HourlyResponse,
  weather: HourlyResponse,
  startMs: number,
  endMs: number
): NightEnvironment | null {
  const pollen: Partial<Record<PollenType, number>> = {};
  for (const type of POLLEN_TYPES) {
    const values = nightValues(air, `${type}_pollen`, startMs, endMs);
    if (values.length > 0) pollen[type] = Math.round(Math.max(...values));
  }
  const avg = (values: number[]) =>
    values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : undefined;
  const humidity = avg(nightValues(weather, 'relative_humidity_2m', startMs, endMs));
  const temperature = avg(nightValues(weather, 'temperature_2m', startMs, endMs));
  const pressure = avg(nightValues(weather, 'pressure_msl', startMs, endMs));
  const pm10 = avg(nightValues(air, 'pm10', startMs, endMs));
  const pm25 = avg(nightValues(air, 'pm2_5', startMs, endMs));
  if (Object.keys(pollen).length === 0 && humidity === undefined && pm10 === undefined) return null;
  return { pollen, humidity, temperature, pressure, pm10, pm25 };
}

async function approximateLocation(): Promise<{ latitude: number; longitude: number } | null> {
  const permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted) return null;
  const last = await Location.getLastKnownPositionAsync({ maxAge: LOCATION_MAX_AGE_MS });
  const position = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
  return { latitude: round1(position.coords.latitude), longitude: round1(position.coords.longitude) };
}

/** Asks for the location permission (when the user turns the feature on). */
export async function requestEnvironmentPermission(): Promise<boolean> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  return granted;
}

/** Outdoor conditions of a finished night, or null (no permission, offline, no data). */
export async function fetchNightEnvironment(session: SleepSession): Promise<NightEnvironment | null> {
  try {
    const location = await approximateLocation();
    if (!location) return null;
    const startMs = new Date(session.startTime).getTime();
    const endMs = new Date(session.endTime).getTime();
    // The night is at most a day old when this runs: yesterday and today cover it
    const common = `latitude=${location.latitude}&longitude=${location.longitude}&past_days=2&forecast_days=1&timeformat=unixtime`;
    const [air, weather] = await Promise.all([
      fetch(
        `${AIR_QUALITY_URL}?${common}&hourly=${[...POLLEN_TYPES.map((p) => `${p}_pollen`), 'pm10', 'pm2_5'].join(',')}`
      ).then((r) => r.json()),
      fetch(`${WEATHER_URL}?${common}&hourly=relative_humidity_2m,temperature_2m,pressure_msl`).then((r) => r.json()),
    ]);
    return summarizeEnvironment(air, weather, startMs, endMs);
  } catch (e) {
    console.warn('Could not fetch the night environment:', e);
    return null;
  }
}

const BACKFILL_MS = 2 * 24 * 3600 * 1000; // The requests reach two days back

/**
 * Fetches the outdoor conditions of recent nights that have none yet (just finished, or
 * finished offline). Returns the updated nights.
 */
export async function fillMissingEnvironment(
  sessions: SleepSession[],
  save: (session: SleepSession) => Promise<void>
): Promise<SleepSession[]> {
  const now = Date.now();
  const updated: SleepSession[] = [];
  for (const session of sessions) {
    if (session.environment || now - new Date(session.endTime).getTime() > BACKFILL_MS) continue;
    const environment = await fetchNightEnvironment(session);
    if (!environment) break; // No permission or offline: the next nights would fail the same way
    const withEnvironment = { ...session, environment };
    await save(withEnvironment);
    updated.push(withEnvironment);
  }
  return updated;
}
