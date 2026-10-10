import type { SnoreIntensity, TimelineSample } from '../types/session';
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
      ...(b.snoreEvents > 0 && hasAudio ? { audioOffsetSeconds: b.loudestSnoreOffset } : {}),
    });
  }
  return timeline;
}
