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
 * Akusztikai és fizikai szabályokon alapuló horkolás-felismerő szűrő:
 * 1. Adaptív Alapzaj (Running Adaptive Baseline Noise Floor)
 * 2. Időtartam-szűrő (0.8s - 3.5s közötti belégzési fázis, kizárva a rövid koppanásokat és folyamatos zúgásokat)
 * 3. Légzési Periodicitás (2.5s - 6.0s közötti légzési ritmus, emberi nyugalmi légzés ~10-18 légzés/perc)
 * 4. Dinamikai kiemelkedés (legalább +6 dB az alapzaj felett)
 */
export class SnoreClassifier {
  // Adaptív szoba-alapzaj szint (dBA)
  private noiseFloor: number = 32;

  // Aktuális hangkitörés állapota
  private inSoundBurst: boolean = false;
  private burstStartTime: number = 0;
  private burstFrames: number[] = [];

  // Korábbi detektált horkolások időbélyegzői (ritmusvizsgálathoz)
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

  /**
   * Minden bejövő hangkeret feldolgozása (pl. 250-350 ms-onként)
   * @param currentDb aktuális mért dB érték
   * @param timestampMs aktuális időbélyegző ms-ben
   */
  processFrame(currentDb: number, timestampMs: number = Date.now()): SnoreEventCandidate | null {
    // 1. Adaptív alapzaj frissítése (lassú követés: ha csend van, finoman le- vagy felfelé korrigál)
    if (!this.inSoundBurst && currentDb < 45) {
      this.noiseFloor = this.noiseFloor * 0.95 + currentDb * 0.05;
    }

    // A hangnak érezhetően az alapzaj felett kell lennie (min +7 dB)
    const threshold = Math.max(40, this.noiseFloor + 7);
    const isAboveThreshold = currentDb >= threshold;

    if (isAboveThreshold) {
      if (!this.inSoundBurst) {
        // Új hangkitörés kezdődik
        this.inSoundBurst = true;
        this.burstStartTime = timestampMs;
        this.burstFrames = [currentDb];
      } else {
        this.burstFrames.push(currentDb);
      }
      return null;
    } else {
      if (this.inSoundBurst) {
        // Hangkitörés véget ért, kiértékeljük
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
    endTimeMs: number
  ): SnoreEventCandidate | null {
    if (frames.length === 0) return null;

    const peakDb = Math.max(...frames);
    const avgDb = Math.round(frames.reduce((a, b) => a + b, 0) / frames.length);

    // --- 1. SZABÁLY: Időtartam vizsgálat ---
    // Az emberi horkolás belégzési fázisa tipikusan 0.7 - 3.5 másodperc.
    // - Ha < 500 ms: valószínűleg köhögés, ágynyikorgás, tárgy koppanása, leütés.
    // - Ha > 5000 ms: folyamatos zúgás (klíma felpörgése, forgalom, TV).
    const isDurationValid = durationMs >= 700 && durationMs <= 3800;
    if (!isDurationValid) {
      return null;
    }

    // --- 2. SZABÁLY: Kiemelkedés az alapzajból ---
    const snr = peakDb - this.noiseFloor;
    if (snr < 7) {
      return null;
    }

    // --- 3. SZABÁLY: Légzési Periodicitás (Respiratory Cadence) ---
    // Az emberi légzési ciklus nyugalomban 2.5 és 6.0 másodperc közötti periódusú.
    let isPeriodic = false;
    let confidence = 0.6; // Alap konfidencia időtartam és SNR alapján

    if (this.recentSnoreTimes.length > 0) {
      const lastSnoreTime = this.recentSnoreTimes[this.recentSnoreTimes.length - 1];
      const deltaSec = (this.burstStartTime - lastSnoreTime) / 1000;

      // Ha az előző horkolástól eltelt idő 2.2s és 6.5s között van:
      if (deltaSec >= 2.2 && deltaSec <= 6.5) {
        isPeriodic = true;
        confidence = 0.95; // Nagyon magas bizonyosság!
      } else if (deltaSec > 6.5 && deltaSec <= 13.0) {
        // Esetleg egy ciklus kimaradt, de még mindig ritmikus
        isPeriodic = true;
        confidence = 0.8;
      }
    }

    // Elmentjük az időbélyegzőt az utolsó 5 esemény nyilvántartásába
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
