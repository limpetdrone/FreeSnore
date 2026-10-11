import type { NightHealth, SleepSession } from '../types/session';
import { healthSource } from './healthSource';
import { needsHealthFetch, nightStats, snoreShareByStage, stageMinutes } from './healthStats';

export const healthSourceName = healthSource.name;

/** Asks for read access (when the user turns the feature on). */
export async function requestHealthPermission(): Promise<boolean> {
  try {
    return (await healthSource.isAvailable()) && (await healthSource.requestPermission());
  } catch (e) {
    console.warn('Health permission request failed:', e);
    return false;
  }
}

/** The night's watch and scale data, or null when there is none. */
export async function fetchNightHealth(session: SleepSession): Promise<NightHealth | null> {
  try {
    if (!(await healthSource.isAvailable())) return null;
    const startMs = new Date(session.startTime).getTime();
    const endMs = new Date(session.endTime).getTime();
    const raw = await healthSource.readNight(startMs, endMs);
    const heartRate = nightStats(raw.heartRate, startMs, endMs);
    const hrv = nightStats(raw.hrv, startMs, endMs);
    const respiratoryRate = nightStats(raw.respiratoryRate, startMs, endMs);
    const oxygenSaturation = nightStats(raw.oxygenSaturation, startMs, endMs);
    const stages = stageMinutes(raw.stages, startMs, endMs);
    const share = snoreShareByStage(session.timeline || [], startMs, raw.stages);
    const health: NightHealth = {
      ...(heartRate ? { heartRate: { avg: Math.round(heartRate.avg), min: Math.round(heartRate.min) } } : {}),
      ...(raw.restingHeartRate !== undefined ? { restingHeartRate: Math.round(raw.restingHeartRate) } : {}),
      ...(hrv ? { hrv: Math.round(hrv.avg) } : {}),
      ...(respiratoryRate ? { respiratoryRate: respiratoryRate.avg } : {}),
      ...(oxygenSaturation ? { oxygenSaturation } : {}),
      ...(raw.breathingDisturbances !== undefined ? { breathingDisturbances: raw.breathingDisturbances } : {}),
      ...(raw.sleepApneaEvents !== undefined ? { sleepApneaEvents: raw.sleepApneaEvents } : {}),
      ...(Object.keys(stages).length > 0 ? { stageMinutes: stages } : {}),
      ...(Object.keys(share).length > 0 ? { snoreShareByStage: share } : {}),
      ...(raw.weightKg !== undefined ? { weightKg: Math.round(raw.weightKg * 10) / 10 } : {}),
      fetchedAt: new Date().toISOString(),
    };
    // Nothing but the fetch time: no watch or scale data for this night
    return Object.keys(health).length > 1 ? health : { fetchedAt: health.fetchedAt };
  } catch (e) {
    console.warn('Could not read health data:', e);
    return null;
  }
}

/** Reads the health data of recent nights that have none yet (or got it before the watch synced). */
export async function fillMissingHealth(
  sessions: SleepSession[],
  save: (session: SleepSession) => Promise<void>
): Promise<SleepSession[]> {
  const now = Date.now();
  const updated: SleepSession[] = [];
  for (const session of sessions) {
    if (!needsHealthFetch(session, now)) continue;
    const health = await fetchNightHealth(session);
    if (!health) break; // Not available or not permitted: the other nights would fail too
    const withHealth = { ...session, health };
    await save(withHealth);
    updated.push(withHealth);
  }
  return updated;
}
