import { TimelineSample } from '../types/session';

export interface CalculatedStats {
  snoreScore: number;
  quietPercent: number;
  lightPercent: number;
  loudPercent: number;
  epicPercent: number;
  snoreDurationSeconds: number;
  scoreDescription: string;
}

export function calculateSnoreStats(
  totalDurationSeconds: number,
  timeline: TimelineSample[]
): CalculatedStats {
  if (timeline.length === 0) {
    return {
      snoreScore: 0,
      quietPercent: 100,
      lightPercent: 0,
      loudPercent: 0,
      epicPercent: 0,
      snoreDurationSeconds: 0,
      scoreDescription: 'Csendes éjszaka',
    };
  }

  let quietCount = 0;
  let lightCount = 0;
  let loudCount = 0;
  let epicCount = 0;

  timeline.forEach((sample) => {
    switch (sample.category) {
      case 'quiet':
        quietCount++;
        break;
      case 'light':
        lightCount++;
        break;
      case 'loud':
        loudCount++;
        break;
      case 'epic':
        epicCount++;
        break;
    }
  });

  const total = timeline.length;
  const quietPercent = Math.round((quietCount / total) * 100);
  const lightPercent = Math.round((lightCount / total) * 100);
  const loudPercent = Math.round((loudCount / total) * 100);
  const epicPercent = Math.round((epicCount / total) * 100);

  const snoreCount = lightCount + loudCount + epicCount;
  const snoreRatio = snoreCount / total;
  const snoreDurationSeconds = Math.round(totalDurationSeconds * snoreRatio);

  // SnoreLab inspired Snore Score calculation:
  // Combines duration of snoring with severity multipliers
  const rawScore =
    lightPercent * 0.4 +
    loudPercent * 1.2 +
    epicPercent * 2.5;

  const snoreScore = Math.min(160, Math.round(rawScore));

  let scoreDescription = 'Kiváló (Csendes)';
  if (snoreScore >= 80) {
    scoreDescription = 'Súlyos horkolás';
  } else if (snoreScore >= 50) {
    scoreDescription = 'Erős horkolás';
  } else if (snoreScore >= 25) {
    scoreDescription = 'Mérsékelt horkolás';
  } else if (snoreScore > 10) {
    scoreDescription = 'Enyhe horkolás';
  }

  return {
    snoreScore,
    quietPercent,
    lightPercent,
    loudPercent,
    epicPercent,
    snoreDurationSeconds,
    scoreDescription,
  };
}
