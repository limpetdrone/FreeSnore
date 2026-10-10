import { SleepSession, SnoreIntensity, TimelineSample } from '../types/session';

function generateTimeline(hours: number, snoreIntensityFactor: number, startHour: number = 23): TimelineSample[] {
  const samples: TimelineSample[] = [];
  const totalMinutes = hours * 60;
  const interval = 10; // every 10 mins

  for (let m = 0; m < totalMinutes; m += interval) {
    const hour = Math.floor((startHour * 60 + m) / 60) % 24;
    const min = (startHour * 60 + m) % 60;
    const timeFormatted = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

    // Deep sleep cycles around hour 2-4 and 5-6 have more snoring
    const cycle = Math.sin((m / totalMinutes) * Math.PI * 3);
    const noise = (Math.random() - 0.5) * 15;
    const baseDb = 32 + cycle * 18 * snoreIntensityFactor + noise;
    const clampedDb = Math.max(28, Math.min(85, Math.round(baseDb)));

    let category: SnoreIntensity = 'quiet';
    if (clampedDb >= 68) category = 'epic';
    else if (clampedDb >= 52) category = 'loud';
    else if (clampedDb >= 40) category = 'light';

    samples.push({
      offsetMinutes: m,
      timeFormatted,
      db: clampedDb,
      category,
    });
  }
  return samples;
}

export function createMockSessions(): SleepSession[] {
  const now = new Date();
  const sessions: SleepSession[] = [];

  const presets = [
    { daysAgo: 0, score: 58, hours: 7.5, factor: 0.85, factors: ['Hanyatt fekvés', 'Késői vacsora'] },
    { daysAgo: 1, score: 32, hours: 8.0, factor: 0.45, factors: ['Oldalfekvés', 'Orrspray'] },
    { daysAgo: 2, score: 76, hours: 6.8, factor: 1.1, factors: ['Alkohol', 'Fáradtság', 'Hanyatt fekvés'] },
    { daysAgo: 3, score: 44, hours: 7.2, factor: 0.65, factors: ['Oldalfekvés'] },
    { daysAgo: 4, score: 22, hours: 8.2, factor: 0.35, factors: ['Párásító', 'Oldalfekvés'] },
    { daysAgo: 5, score: 88, hours: 6.5, factor: 1.25, factors: ['Alkohol', 'Orrdugulás'] },
    { daysAgo: 6, score: 35, hours: 7.8, factor: 0.5, factors: ['Orrtágító tapasz'] },
    { daysAgo: 8, score: 62, hours: 7.0, factor: 0.9, factors: ['Hanyatt fekvés'] },
    { daysAgo: 11, score: 28, hours: 8.1, factor: 0.4, factors: ['Oldalfekvés'] },
    { daysAgo: 14, score: 54, hours: 7.3, factor: 0.8, factors: ['Stresszes nap'] },
    { daysAgo: 18, score: 70, hours: 6.9, factor: 1.05, factors: ['Alkohol', 'Hanyatt fekvés'] },
    { daysAgo: 22, score: 38, hours: 7.6, factor: 0.55, factors: ['Oldalfekvés'] },
  ];

  presets.forEach((p, idx) => {
    const sDate = new Date(now.getTime() - p.daysAgo * 24 * 60 * 60 * 1000);
    sDate.setHours(23, 15, 0, 0);
    const eDate = new Date(sDate.getTime() + p.hours * 60 * 60 * 1000);

    const timeline = generateTimeline(p.hours, p.factor, 23);
    const snoreCount = timeline.filter((t) => t.category !== 'quiet').length;
    const lightCount = timeline.filter((t) => t.category === 'light').length;
    const loudCount = timeline.filter((t) => t.category === 'loud').length;
    const epicCount = timeline.filter((t) => t.category === 'epic').length;
    const totalCount = timeline.length;

    const snoreDurationSec = Math.round((snoreCount / totalCount) * p.hours * 3600);

    sessions.push({
      id: `mock-session-${idx}-${sDate.getTime()}`,
      startTime: sDate.toISOString(),
      endTime: eDate.toISOString(),
      delayMinutes: 15,
      totalDurationSeconds: Math.round(p.hours * 3600),
      snoreDurationSeconds: snoreDurationSec,
      snoreScore: p.score,
      quietPercent: Math.round(((totalCount - snoreCount) / totalCount) * 100),
      lightPercent: Math.round((lightCount / totalCount) * 100),
      loudPercent: Math.round((loudCount / totalCount) * 100),
      epicPercent: Math.round((epicCount / totalCount) * 100),
      peakDb: Math.min(88, Math.round(62 + p.factor * 20)),
      timeline,
      clips: [
        {
          id: `clip-1-${idx}`,
          timestamp: new Date(sDate.getTime() + 2.5 * 3600 * 1000).toISOString(),
          offsetSeconds: 9000,
          durationSeconds: 6,
          peakDb: 64,
          avgDb: 58,
          category: 'loud',
          audioUri: 'sample_audio_1',
        },
        {
          id: `clip-2-${idx}`,
          timestamp: new Date(sDate.getTime() + 4.2 * 3600 * 1000).toISOString(),
          offsetSeconds: 15120,
          durationSeconds: 8,
          peakDb: 73,
          avgDb: 69,
          category: 'epic',
          audioUri: 'sample_audio_2',
        },
      ],
      factors: p.factors,
    });
  });

  return sessions;
}
