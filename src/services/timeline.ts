import type { SleepSession, SnoreIntensity, TimelineSample } from '../types/session';
import { snoreClassifier } from './snoreDetector';

export interface MinuteBucket {
  dbSum: number;
  frames: number;
  snoreMs: number;
  snorePeakSum: number;
  snoreEvents: number;
  loudestSnoreDb: number;
  loudestSnoreOffset: number; // Seconds into the audio file
}

export const emptyBucket = (): MinuteBucket => ({
  dbSum: 0,
  frames: 0,
  snoreMs: 0,
  snorePeakSum: 0,
  snoreEvents: 0,
  loudestSnoreDb: 0,
  loudestSnoreOffset: 0,
});

/**
 * Turns the per-minute monitoring buckets into the stored timeline.
 * A minute's category reflects detected snoring only, never room loudness:
 * a steady fan or traffic must not show up (or be scored) as snoring.
 */
export function buildTimeline(
  buckets: { [minute: number]: MinuteBucket },
  startTime: number,
  hasAudio: boolean
): TimelineSample[] {
  const timeline: TimelineSample[] = [];
  const minutes = Object.keys(buckets).map(Number).sort((a, b) => a - b);

  for (const m of minutes) {
    const b = buckets[m];
    if (b.frames === 0) continue;

    const sampleTime = new Date(startTime + m * 60 * 1000);
    const hh = sampleTime.getHours().toString().padStart(2, '0');
    const mm = sampleTime.getMinutes().toString().padStart(2, '0');
    const snoreDb = b.snoreEvents > 0 ? Math.round(b.snorePeakSum / b.snoreEvents) : 0;

    let category: SnoreIntensity = 'quiet';
    if (b.snoreEvents > 0) {
      // Faint snores (high sensitivity) still count as at least light snoring
      const level = snoreClassifier.classifyIntensity(snoreDb);
      category = level === 'quiet' ? 'light' : level;
    }

    timeline.push({
      offsetMinutes: m,
      timeFormatted: `${hh}:${mm}`,
      db: Math.round(b.dbSum / b.frames),
      category,
      snoreSeconds: Math.round(b.snoreMs / 1000),
      snoreDb,
      snoreCount: b.snoreEvents,
      ...(b.snoreEvents > 0 && hasAudio ? { audioOffsetSeconds: b.loudestSnoreOffset } : {}),
    });
  }
  return timeline;
}

export interface PauseInterval {
  start: number; // epoch ms
  end: number;
}

/**
 * Position of a wall-clock moment in the night's audio file. The file has no audio for the
 * time the recorder was interrupted (call, alarm, Siri), so that time is left out.
 */
export function audioFileOffsetSeconds(
  timestampMs: number,
  recordingStartMs: number,
  pauses: PauseInterval[]
): number {
  const paused = pauses.reduce(
    (sum, p) => sum + Math.max(0, Math.min(p.end, timestampMs) - p.start),
    0
  );
  return Math.max(0, (timestampMs - recordingStartMs - paused) / 1000);
}

/** Minutes covered by one timeline sample (1 for real recordings, more for mock data). */
export function timelineStep(timeline: TimelineSample[]): number {
  let step = Infinity;
  for (let i = 1; i < timeline.length; i++) {
    step = Math.min(step, timeline[i].offsetMinutes - timeline[i - 1].offsetMinutes);
  }
  return Number.isFinite(step) ? Math.max(1, step) : 1;
}

/**
 * Time spent snoring: the minutes in which snoring was detected, breaths between snores
 * included. Sessions saved before this definition stored the sum of the snore sounds only
 * (a quarter of the real time at most), so it is derived from the timeline when possible.
 */
export function snoringTimeSeconds(session: Pick<SleepSession, 'timeline' | 'snoreDurationSeconds' | 'totalDurationSeconds'>): number {
  const timeline = session.timeline || [];
  if (!timeline.some((s) => s.snoreSeconds !== undefined)) return session.snoreDurationSeconds;
  const step = timelineStep(timeline);
  const seconds = timeline.filter((s) => (s.snoreSeconds ?? 0) > 0).length * step * 60;
  return Math.min(seconds, session.totalDurationSeconds);
}

export interface TimelineColumn {
  startLabel: string;
  endLabel: string;
  startMinute: number; // offsetMinutes of the column start
  samples: number; // Recorded minutes in this column (0 = gap, e.g. paused analysis)
  snoreSeconds: number;
  snoreDb: number;
  db: number;
  category: SnoreIntensity;
  replayOffset?: number; // Loudest snore in this column (seconds into the audio file)
}

const CATEGORY_RANK: Record<SnoreIntensity, number> = { quiet: 0, light: 1, loud: 2, epic: 3 };

export const clockAfter = (first: TimelineSample, minutesLater: number) => {
  const [h, m] = first.timeFormatted.split(':').map(Number);
  const total = (((h * 60 + m + minutesLater) % 1440) + 1440) % 1440;
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
};

/**
 * Groups the per-minute timeline into at most `maxColumns` columns laid out by time
 * (offsetMinutes), so gaps in the data keep the axis true. A night has ~500 minutes:
 * one bar each would be too thin to see or tap, on screen and in the PDF alike.
 */
export function binTimeline(
  timeline: TimelineSample[],
  maxColumns: number
): { columns: TimelineColumn[]; minutesPerColumn: number } {
  if (timeline.length === 0) return { columns: [], minutesPerColumn: 1 };
  const first = timeline[0];
  const span = timeline[timeline.length - 1].offsetMinutes - first.offsetMinutes + 1;
  const minutesPerColumn = Math.max(1, Math.ceil(span / maxColumns));
  const count = Math.ceil(span / minutesPerColumn);

  const columns: TimelineColumn[] = Array.from({ length: count }, (_, i) => ({
    startLabel: clockAfter(first, i * minutesPerColumn),
    endLabel: clockAfter(first, (i + 1) * minutesPerColumn - 1),
    startMinute: first.offsetMinutes + i * minutesPerColumn,
    samples: 0,
    snoreSeconds: 0,
    snoreDb: 0,
    db: 0,
    category: 'quiet',
  }));
  const loudest: number[] = new Array(count).fill(0);
  const snoreMinutes: number[] = new Array(count).fill(0);

  for (const s of timeline) {
    const i = Math.floor((s.offsetMinutes - first.offsetMinutes) / minutesPerColumn);
    const c = columns[i];
    c.samples++;
    c.db += s.db;
    c.snoreSeconds += s.snoreSeconds ?? 0;
    if (CATEGORY_RANK[s.category] > CATEGORY_RANK[c.category]) c.category = s.category;
    if (s.snoreDb) {
      c.snoreDb += s.snoreDb;
      snoreMinutes[i]++;
      if (s.audioOffsetSeconds !== undefined && s.snoreDb > loudest[i]) {
        loudest[i] = s.snoreDb;
        c.replayOffset = s.audioOffsetSeconds;
      }
    }
  }
  columns.forEach((c, i) => {
    if (c.samples > 0) c.db = Math.round(c.db / c.samples);
    if (snoreMinutes[i] > 0) c.snoreDb = Math.round(c.snoreDb / snoreMinutes[i]);
  });
  return { columns, minutesPerColumn };
}

// Snoring 40% of the time (e.g. 1.5 s of every 4 s breath) fills a bar
const FULL_BAR_SNORE_RATIO = 0.4;

/** Bar height of a column as a 0..1 fraction (legacy sessions: room loudness). */
export function columnFill(c: TimelineColumn, minutesPerColumn: number, hasSnoreData: boolean): number {
  if (c.samples === 0) return 0;
  const ratio = hasSnoreData ? c.snoreSeconds / (minutesPerColumn * 60) / FULL_BAR_SNORE_RATIO : (c.db - 25) / 60;
  return Math.max(0, Math.min(1, ratio));
}
