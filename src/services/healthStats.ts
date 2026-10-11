import type { NightHealth, SleepSession, SleepStage, TimelineSample } from '../types/session';
import type { t as translate } from '../i18n';

type Translate = typeof translate;

export interface StageInterval {
  start: number; // epoch ms
  end: number;
  stage: SleepStage;
}

export interface TimedValue {
  time: number; // epoch ms
  value: number;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

/** Average and minimum of the values within the night. */
export function nightStats(values: TimedValue[], startMs: number, endMs: number): { avg: number; min: number } | undefined {
  const inNight = values.filter((v) => v.time >= startMs && v.time <= endMs).map((v) => v.value);
  if (inNight.length === 0) return undefined;
  return {
    avg: round1(inNight.reduce((a, b) => a + b, 0) / inNight.length),
    min: round1(Math.min(...inNight)),
  };
}

/** Minutes of each sleep stage within the night. */
export function stageMinutes(stages: StageInterval[], startMs: number, endMs: number): Partial<Record<SleepStage, number>> {
  const minutes: Partial<Record<SleepStage, number>> = {};
  for (const s of stages) {
    const overlap = Math.min(s.end, endMs) - Math.max(s.start, startMs);
    if (overlap > 0) minutes[s.stage] = Math.round((minutes[s.stage] ?? 0) + overlap / 60000);
  }
  return minutes;
}

const MIN_STAGE_MINUTES = 10; // Shorter stage totals give meaningless percentages

/**
 * The share of each sleep stage's minutes in which snoring was detected. The watch tells the
 * stage, the microphone the snoring: a direct, personal version of what sleep labs measure.
 */
export function snoreShareByStage(
  timeline: TimelineSample[],
  sessionStartMs: number,
  stages: StageInterval[]
): Partial<Record<SleepStage, number>> {
  const total: Partial<Record<SleepStage, number>> = {};
  const snoring: Partial<Record<SleepStage, number>> = {};
  for (const sample of timeline) {
    if (sample.snoreSeconds === undefined) continue;
    const mid = sessionStartMs + (sample.offsetMinutes + 0.5) * 60000;
    const stage = stages.find((s) => mid >= s.start && mid < s.end)?.stage;
    if (!stage) continue;
    total[stage] = (total[stage] ?? 0) + 1;
    if (sample.snoreSeconds > 0) snoring[stage] = (snoring[stage] ?? 0) + 1;
  }
  const share: Partial<Record<SleepStage, number>> = {};
  for (const stage of Object.keys(total) as SleepStage[]) {
    if ((total[stage] ?? 0) >= MIN_STAGE_MINUTES) share[stage] = Math.round(((snoring[stage] ?? 0) / total[stage]!) * 100);
  }
  return share;
}

/** Nights whose health data was fetched too soon after waking (watch not yet synced). */
export function needsHealthFetch(session: SleepSession, now: number): boolean {
  const end = new Date(session.endTime).getTime();
  if (now - end > 3 * 24 * 3600 * 1000) return false;
  if (!session.health) return true;
  // Fetched within 2 hours of waking: fetch once more after that
  const fetched = new Date(session.health.fetchedAt).getTime();
  return fetched - end < 2 * 3600 * 1000 && now - end >= 2 * 3600 * 1000;
}

const STAGE_ORDER: SleepStage[] = ['deep', 'light', 'rem', 'awake'];

/** Display lines of a night's health data (screen and PDF). */
export function healthLines(health: NightHealth, t: Translate): string[] {
  const lines: string[] = [];
  if (health.heartRate) lines.push(t('healthHeartRate', health.heartRate));
  if (health.restingHeartRate !== undefined) lines.push(t('healthResting', { value: health.restingHeartRate }));
  if (health.hrv !== undefined) lines.push(t('healthHrv', { value: health.hrv }));
  if (health.respiratoryRate !== undefined) lines.push(t('healthRespiratory', { value: health.respiratoryRate }));
  if (health.oxygenSaturation) lines.push(t('healthSpo2', health.oxygenSaturation));
  if (health.breathingDisturbances !== undefined) lines.push(t('healthBreathing', { value: health.breathingDisturbances }));
  if (health.stageMinutes) {
    const m = health.stageMinutes;
    const fmt = (minutes = 0) => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
    lines.push(t('healthStages', { deep: fmt(m.deep), light: fmt(m.light), rem: fmt(m.rem), awake: fmt(m.awake) }));
  }
  if (health.weightKg !== undefined) lines.push(t('healthWeight', { value: health.weightKg }));
  if (health.sleepApneaEvents) lines.push(t('healthApneaEvents', { count: health.sleepApneaEvents }));
  return lines;
}

/** "deep sleep 40% of the time, REM 5%..." from the snore share per stage. */
export function stageShareItems(health: NightHealth, t: Translate): string[] {
  const share = health.snoreShareByStage ?? {};
  const label = { deep: 'stageDeep', light: 'stageLight', rem: 'stageRem', awake: 'stageAwake' } as const;
  return STAGE_ORDER.filter((s) => share[s] !== undefined).map((s) =>
    t('summaryStageItem', { stage: t(label[s]), pct: share[s]! })
  );
}
