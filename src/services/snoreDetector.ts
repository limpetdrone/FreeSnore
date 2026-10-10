import { SnoreIntensity } from '../types/session';

export interface SnoreEventCandidate {
  startTime: number;
  durationMs: number;
  peakDb: number;
  avgDb: number;
  confidence: number; // 0.0 - 1.0
  isPeriodic: boolean;
}

/**
 * SnoreClassifier
 *
 * Acoustic and physical rule-based snoring classifier:
 * 1. Running Adaptive Baseline Noise Floor (tracks quiet room level)
 * 2. Duration Gating (0.7s - 3.8s inspiratory phase, filtering out clicks and constant hums)
 * 3. Respiratory Periodicity (2.5s - 6.0s rhythm cadence matching human breathing)
 * 4. Signal-to-Noise Ratio (at least +7 dB above ambient floor)
 */
const MAX_BURST_MS = 3800;
const MIN_BURST_MS = 700;

export class SnoreClassifier {
  // Adaptive room noise floor (dBA)
  private noiseFloor: number = 32;

  // Absolute minimum threshold (from sensitivity setting)
  private minThresholdDb: number = 44;

  // Current sound burst state
  private inSoundBurst: boolean = false;
  private burstStartTime: number = 0;
  private burstFrames: number[] = [];

  // Recent detected snore timestamps (for rhythm / periodicity verification)
  private recentSnoreTimes: number[] = [];

  constructor(initialFloor: number = 32) {
    this.noiseFloor = initialFloor;
    this.reset();
  }

  reset() {
    this.noiseFloor = 32;
    this.inSoundBurst = false;
    this.burstStartTime = 0;
    this.burstFrames = [];
    this.recentSnoreTimes = [];
  }

  setMinThreshold(db: number) {
    this.minThresholdDb = db;
  }

  /**
   * Process every incoming audio meter frame (e.g. every 250 ms)
   * @param currentDb Current measured decibel level
   * @param timestampMs Current timestamp in ms
   */
  processFrame(currentDb: number, timestampMs: number = Date.now()): SnoreEventCandidate | null {
    // 1. Adaptive noise floor update (slow tracking when quiet)
    if (!this.inSoundBurst) {
      this.noiseFloor = this.noiseFloor * 0.95 + currentDb * 0.05;
    }

    // Audio must noticeably exceed the ambient baseline (min +7 dB)
    const threshold = Math.max(this.minThresholdDb, this.noiseFloor + 7);
    const isAboveThreshold = currentDb >= threshold;

    if (isAboveThreshold) {
      if (!this.inSoundBurst) {
        // New sound burst starts
        this.inSoundBurst = true;
        this.burstStartTime = timestampMs;
        this.burstFrames = [currentDb];
      } else {
        this.burstFrames.push(currentDb);
        // Excessively long sound: continuous noise (fan, AC, traffic, TV).
        // Discard burst and elevate floor to avoid infinite burst state.
        if (timestampMs - this.burstStartTime > MAX_BURST_MS) {
          this.noiseFloor =
            this.burstFrames.reduce((a, b) => a + b, 0) / this.burstFrames.length;
          this.inSoundBurst = false;
          this.burstFrames = [];
        }
      }
      return null;
    } else {
      if (this.inSoundBurst) {
        // Sound burst ended, evaluate candidates
        this.inSoundBurst = false;
        const durationMs = timestampMs - this.burstStartTime;
        const result = this.evaluateBurst(this.burstFrames, durationMs, timestampMs);
        this.burstFrames = [];
        return result;
      }
      return null;
    }
  }

  private evaluateBurst(
    frames: number[],
    durationMs: number,
    _endTimeMs: number
  ): SnoreEventCandidate | null {
    if (frames.length === 0) return null;

    const peakDb = Math.max(...frames);
    const avgDb = Math.round(frames.reduce((a, b) => a + b, 0) / frames.length);

    // --- RULE 1: Duration Gating ---
    // Human snore inhalation typically lasts 0.7s to 3.5s.
    // - Under 700 ms: likely a cough, bed squeak, or impulse click.
    // - Over 3800 ms: continuous ambient noise (fan, traffic, droning AC).
    const isDurationValid = durationMs >= MIN_BURST_MS && durationMs <= MAX_BURST_MS;
    if (!isDurationValid) {
      return null;
    }

    // --- RULE 2: Elevation above ambient baseline ---
    const snr = peakDb - this.noiseFloor;
    if (snr < 7) {
      return null;
    }

    // --- RULE 3: Respiratory Periodicity (Cadence) ---
    // Resting human respiratory rate produces repetitions every 2.5s to 6.0s.
    let isPeriodic = false;
    let confidence = 0.6; // Baseline confidence from duration + SNR

    if (this.recentSnoreTimes.length > 0) {
      const lastSnoreTime = this.recentSnoreTimes[this.recentSnoreTimes.length - 1];
      const deltaSec = (this.burstStartTime - lastSnoreTime) / 1000;

      // If time since previous snore burst matches respiratory rate (2.2s - 6.5s)
      if (deltaSec >= 2.2 && deltaSec <= 6.5) {
        isPeriodic = true;
        confidence = 0.95; // High confidence periodic match
      } else if (deltaSec > 6.5 && deltaSec <= 13.0) {
        // Skipped one respiratory cycle, still rhythmic
        isPeriodic = true;
        confidence = 0.8;
      }
    }

    // Keep history of last 5 snore event timestamps
    this.recentSnoreTimes.push(this.burstStartTime);
    if (this.recentSnoreTimes.length > 5) {
      this.recentSnoreTimes.shift();
    }

    return {
      startTime: this.burstStartTime,
      durationMs,
      peakDb,
      avgDb,
      confidence,
      isPeriodic,
    };
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

export const snoreClassifier = new SnoreClassifier();
