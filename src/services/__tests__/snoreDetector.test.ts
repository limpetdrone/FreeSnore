import { describe, expect, it } from '@jest/globals';
import { SnoreClassifier } from '../snoreDetector';

const FRAME_MS = 250;

// Feeds a synthetic dB signal at the real 250 ms frame rate and counts detected snore events
function countEvents(signal: (tMs: number) => number, seconds: number, minThresholdDb = 44) {
  const classifier = new SnoreClassifier();
  classifier.setMinThreshold(minThresholdDb);
  let events = 0;
  for (let t = 0; t < seconds * 1000; t += FRAME_MS) {
    events += classifier.processFrame(signal(t), t).length;
  }
  return { events, floor: classifier.getCurrentNoiseFloor() };
}

// 1.5 s snore every 4 s (15 breaths/min) at `snoreDb` over a `baseDb` background
const snoring = (snoreDb: number, baseDb: number) => (t: number) => (t % 4000 < 1500 ? snoreDb : baseDb);

// 1.5 s bursts at the given onset times (ms) over a quiet room
const burstsAt = (onsets: number[], db = 62) => (t: number) =>
  onsets.some((o) => t >= o && t < o + 1500) ? db : 33;

describe('SnoreClassifier', () => {
  it('detects rhythmic snoring in a quiet room', () => {
    expect(countEvents(snoring(60, 33), 60).events).toBeGreaterThanOrEqual(14);
  });

  it('ignores a steady fan and adapts the noise floor to it', () => {
    const { events, floor } = countEvents(() => 50, 3600);
    expect(events).toBe(0);
    expect(floor).toBe(50);
  });

  it('still detects snoring on top of a steady fan', () => {
    const signal = (t: number) => (t < 60000 ? 50 : snoring(62, 50)(t));
    expect(countEvents(signal, 180).events).toBeGreaterThanOrEqual(25);
  });

  it('ignores a single short knock', () => {
    expect(countEvents((t) => (t === 10000 ? 75 : 33), 30).events).toBe(0);
  });

  it('counts the first breaths of a snoring run retroactively', () => {
    // Exactly three rhythmic snores: all three are counted once the third confirms the rhythm
    expect(countEvents(burstsAt([5000, 9000, 13000]), 30).events).toBe(3);
  });

  it('ignores loud sounds at irregular intervals (knocks, coughs, movement)', () => {
    let t = 5000;
    const onsets = [3000, 7500, 2400, 11000, 4000, 9000, 2600, 14000, 5200].map((gap) => (t += gap));
    expect(countEvents(burstsAt(onsets, 70), 120).events).toBe(0);
  });

  it('ignores speech-like syllable bursts', () => {
    // 0.75 s syllables every 1.25 s: too fast to be breathing
    const speech = (t: number) => ((t % 1250) < 750 ? 60 : 36);
    expect(countEvents(speech, 60).events).toBe(0);
  });

  it('respects the sensitivity threshold', () => {
    // 50 dB snores pass the medium (44 dB) threshold but not the low-sensitivity (52 dB) one
    expect(countEvents(snoring(50, 33), 60, 44).events).toBeGreaterThan(0);
    expect(countEvents(snoring(50, 33), 60, 52).events).toBe(0);
  });
});
