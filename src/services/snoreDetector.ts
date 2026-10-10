import type { SnoreIntensity } from '../types/session';

export interface SnoreEventCandidate {
  startTime: number;
  peakTime: number; // Loudest moment; the rhythm is measured between peaks (onsets jitter with faint lead-ins)
  durationMs: number;
  peakDb: number;
  avgDb: number;
}

/**
 * SnoreClassifier
 *
 * Rule-based snore detector working on the 250 ms loudness envelope (expo-audio metering):
 * 1. Adaptive noise floor (tracks the quiet room level, absorbs steady fans/AC)
 * 2. Burst segmentation: sound at least +5 dB above the floor and above the sensitivity threshold.
 *    Deliberately sensitive: the rhythm gate below removes the extra false bursts.
 * 3. Duration gating: 0.5 s - 4.5 s (Dafna et al. 2013: 99.9% of snores last 0.2 - 3.5 s;
 *    our coarse 250 ms envelope also includes the faint breath before the snore)
 * 4. Respiratory rhythm gating: a burst only counts once it belongs to a run of at least
 *    three bursts spaced like breaths. Periodicity was the most discriminative feature group
 *    in Dafna et al.; it rejects knocks, coughs, door slams, passing cars and most speech/TV.
 *    The first bursts of a run are confirmed retroactively, so no snore is lost.
 */
const MAX_BURST_MS = 4500;
const MIN_BURST_MS = 500;
// Dips shorter than this inside a sound do not split it: snores often have a brief drop
// between their inspiratory parts (Dafna et al. also merge fragments of one event)
const MERGE_GAP_MS = 500;
// Minimum elevation above the room noise floor (snores over a fan are often only ~8 dB louder)
const MIN_SNR_DB = 5;

// Onset-to-onset spacing of consecutive breaths (~9 - 27 breaths/min)
const MIN_BREATH_GAP_MS = 2200;
const MAX_BREATH_GAP_MS = 6500;
// Within a confirmed run a breath may be skipped (missed quiet snore)
const MAX_RUN_GAP_MS = 13000;
// Two gaps are "regular" when they differ by at most this fraction of the longer one
const GAP_TOLERANCE = 0.3;
// A run ends after this many off-rhythm bursts in a row (speech, TV, movement)
const MAX_RUN_MISSES = 2;

export class SnoreClassifier {
  // Adaptive room noise floor (dBA)
  private noiseFloor: number = 32;

  // Absolute minimum threshold (from sensitivity setting)
  private minThresholdDb: number = 44;

  // Current sound burst state
  private inSoundBurst: boolean = false;
  private burstStartTime: number = 0;
  private burstFrames: number[] = [];
  private burstPeakTime: number = 0;
  private quietSince: number | null = null; // Start of a dip inside the current burst

  // Rhythm gating state: last unconfirmed bursts and the onset of the last counted snore
  private pending: SnoreEventCandidate[] = [];
  private lastConfirmedPeak: number | null = null;
  private runPeriodMs: number = 0;
  private runMisses: number = 0;

  constructor(initialFloor: number = 32) {
    this.noiseFloor = initialFloor;
    this.reset();
  }

  reset() {
    this.noiseFloor = 32;
    this.inSoundBurst = false;
    this.burstStartTime = 0;
    this.burstFrames = [];
    this.quietSince = null;
    this.pending = [];
    this.lastConfirmedPeak = null;
    this.runPeriodMs = 0;
    this.runMisses = 0;
  }

  setMinThreshold(db: number) {
    this.minThresholdDb = db;
  }

  /**
   * Process every incoming audio meter frame (e.g. every 250 ms)
   * @param currentDb Current measured decibel level
   * @param timestampMs Current timestamp in ms
   * @returns Snore events confirmed by this frame (usually empty; several when a run is confirmed)
   */
  processFrame(currentDb: number, timestampMs: number = Date.now()): SnoreEventCandidate[] {
    // 1. Adaptive noise floor update (slow tracking when quiet)
    if (!this.inSoundBurst) {
      this.noiseFloor = this.noiseFloor * 0.95 + currentDb * 0.05;
    }

    // Audio must noticeably exceed the ambient baseline
    const threshold = Math.max(this.minThresholdDb, this.noiseFloor + MIN_SNR_DB);

    if (currentDb >= threshold) {
      if (!this.inSoundBurst) {
        this.inSoundBurst = true;
        this.burstStartTime = timestampMs;
        this.burstPeakTime = timestampMs;
        this.burstFrames = [currentDb];
      } else {
        this.quietSince = null;
        if (currentDb > Math.max(...this.burstFrames)) this.burstPeakTime = timestampMs;
        this.burstFrames.push(currentDb);
        // Excessively long sound: continuous noise (fan, AC, traffic, TV).
        // Discard burst and elevate floor to avoid infinite burst state.
        if (timestampMs - this.burstStartTime > MAX_BURST_MS) {
          this.noiseFloor = this.burstFrames.reduce((a, b) => a + b, 0) / this.burstFrames.length;
          this.inSoundBurst = false;
          this.burstFrames = [];
        }
      }
      return [];
    }

    if (!this.inSoundBurst) return [];

    // Bridge short dips; the burst ends where the dip started
    this.quietSince ??= timestampMs;
    if (timestampMs - this.quietSince < MERGE_GAP_MS) return [];

    this.inSoundBurst = false;
    const candidate = this.evaluateBurst(this.burstFrames, this.quietSince - this.burstStartTime);
    this.quietSince = null;
    this.burstFrames = [];
    return candidate ? this.applyRhythmGate(candidate) : [];
  }

  private evaluateBurst(frames: number[], durationMs: number): SnoreEventCandidate | null {
    if (frames.length === 0) return null;
    // Under 0.5 s: click, knock, bed squeak. Over 3.8 s: handled above as continuous noise.
    if (durationMs < MIN_BURST_MS || durationMs > MAX_BURST_MS) return null;

    const peakDb = Math.max(...frames);
    if (peakDb - this.noiseFloor < MIN_SNR_DB) return null;

    return {
      startTime: this.burstStartTime,
      peakTime: this.burstPeakTime,
      durationMs,
      peakDb,
      avgDb: Math.round(frames.reduce((a, b) => a + b, 0) / frames.length),
    };
  }

  private applyRhythmGate(c: SnoreEventCandidate): SnoreEventCandidate[] {
    // Inside a confirmed run a burst counts only if it lands on the breathing rhythm
    // (allowing up to two skipped breaths). Dense off-rhythm sound ends the run, otherwise
    // talking or TV after a snoring episode would be counted as snoring.
    if (this.lastConfirmedPeak !== null) {
      const gap = c.peakTime - this.lastConfirmedPeak;
      const breaths = Math.round(gap / this.runPeriodMs);
      const onRhythm =
        gap <= MAX_RUN_GAP_MS &&
        breaths >= 1 &&
        breaths <= 3 &&
        Math.abs(gap - breaths * this.runPeriodMs) <= GAP_TOLERANCE * this.runPeriodMs;

      if (onRhythm) {
        // Follow slow drifts of the breathing rate
        this.runPeriodMs = this.runPeriodMs * 0.7 + (gap / breaths) * 0.3;
        this.lastConfirmedPeak = c.peakTime;
        this.runMisses = 0;
        return [c];
      }
      if (gap <= MAX_RUN_GAP_MS && ++this.runMisses < MAX_RUN_MISSES) return [];
      this.lastConfirmedPeak = null; // Run ended: this burst may start a new one
      this.pending = [];
    }

    // The last two bursts and this one must follow each other like regular breaths.
    // Only consecutive bursts count: fast speech would otherwise yield breath-like
    // spacing between every second syllable.
    const n = this.pending.length;
    if (n >= 2) {
      const a = this.pending[n - 2];
      const b = this.pending[n - 1];
      const gap1 = b.peakTime - a.peakTime;
      const gap2 = c.peakTime - b.peakTime;
      if (
        isBreathGap(gap1) &&
        isBreathGap(gap2) &&
        Math.abs(gap1 - gap2) <= GAP_TOLERANCE * Math.max(gap1, gap2)
      ) {
        this.pending = [];
        this.lastConfirmedPeak = c.peakTime;
        this.runPeriodMs = (gap1 + gap2) / 2;
        this.runMisses = 0;
        return [a, b, c];
      }
    }

    this.pending.push(c);
    if (this.pending.length > 2) this.pending.shift();
    return [];
  }

  classifyIntensity(peakDb: number): SnoreIntensity {
    if (peakDb >= 68) return 'epic';
    if (peakDb >= 52) return 'loud';
    if (peakDb >= 40) return 'light';
    return 'quiet';
  }

  getCurrentNoiseFloor(): number {
    return Math.round(this.noiseFloor);
  }
}

function isBreathGap(gapMs: number): boolean {
  return gapMs >= MIN_BREATH_GAP_MS && gapMs <= MAX_BREATH_GAP_MS;
}

export const snoreClassifier = new SnoreClassifier();
