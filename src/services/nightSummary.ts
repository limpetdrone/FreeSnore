import type { SleepSession, TimelineSample } from '../types/session';
import { t, tFactor, formatHoursMinutes } from '../i18n';
import { compareFactors } from './factorStats';
import { clockAfter, snoringTimeSeconds, timelineStep } from './timeline';

export interface SnoreEpisode {
  startMinute: number; // offsetMinutes of the first snoring minute
  endMinute: number; // offsetMinutes of the last minute covered
  peakMinute: number; // Loudest minute, for jumping to it on the timeline
  from: string;
  to: string;
}

export type SnorePattern = 'continuous' | 'intermittent' | 'sporadic';

export interface NightSummary {
  sentences: string[]; // What happened
  pattern?: SnorePattern;
  insights: string[]; // What it may mean, citing REFERENCES as [n]
  references: number[]; // Keys of REFERENCES cited by the insights
  longestEpisode?: SnoreEpisode;
}

/**
 * Sources of the insights. Only population-level findings from these papers are used: the app
 * measures loudness and rhythm, not sleep stages, airflow or position.
 */
export const REFERENCES: Record<number, string> = {
  1: 'Dafna E, Tarasiuk A, Zigel Y. Automatic detection of whole night snoring events using non-contact microphone. PLoS ONE. 2013;8(12):e84139.',
  2: 'Exploring the dynamics of snoring in relation to sleep stages: implications for gender differences, sleep position, and upper airway collapsibility. PLoS ONE. 2024;19:e0295232.',
  3: 'Effects of demographic and sleep-related factors on snoring sound parameters. Sleep Medicine. 2023.',
  4: 'The influence of nocturnal alcohol ingestion on snoring. Eur Arch Otorhinolaryngol. 2010. doi:10.1007/s00405-009-1163-9.',
  5: 'Institute of Medicine. Sleep Disorders and Sleep Deprivation: An Unmet Public Health Problem. National Academies Press; 2006. Ch. 2: Sleep physiology.',
  6: 'REM sleep obstructive sleep apnoea. Eur Respir Rev. 2024;33(171):230166.',
  7: 'Definition of the snoring episode index based on the analyses of snoring parameters and the apnea hypopnea index. Sci Rep. 2022. doi:10.1038/s41598-022-10934-1.',
  8: 'Snoring index and neck circumference as predictors of adult obstructive sleep apnea. Healthcare. 2022;10(12):2543.',
};

// Snoring minutes closer than this belong to the same episode
const EPISODE_GAP_MINUTES = 5;
const MIN_SNORE_SECONDS = 60; // Less snoring than this is a quiet night
const MIN_QUIET_STRETCH_MINUTES = 60;
const CONCENTRATED_SHARE = 0.6; // Share of snoring in one third of the night
const MIN_HISTORY_NIGHTS = 3;
const MIN_FACTOR_DELTA_PCT = 20;
// Snoring pattern: a long episode holding most of the snoring is continuous snoring;
// little snoring in short episodes only is occasional
const CONTINUOUS_EPISODE_MINUTES = 30;
const CONTINUOUS_SHARE = 0.5;
const SPORADIC_MAX_SNORE_MINUTES = 15;
const SPORADIC_MAX_EPISODE_MINUTES = 10;

const clock = clockAfter;

function findEpisodes(timeline: TimelineSample[], step: number): SnoreEpisode[] {
  const first = timeline[0];
  const episodes: (SnoreEpisode & { peakDb: number })[] = [];
  let current: (typeof episodes)[number] | null = null;

  for (const s of timeline) {
    if (!s.snoreSeconds) continue;
    const end = s.offsetMinutes + step - 1;
    if (current && s.offsetMinutes - current.endMinute <= EPISODE_GAP_MINUTES + 1) {
      current.endMinute = end;
      if ((s.snoreDb ?? 0) > current.peakDb) {
        current.peakDb = s.snoreDb ?? 0;
        current.peakMinute = s.offsetMinutes;
      }
    } else {
      current = {
        startMinute: s.offsetMinutes,
        endMinute: end,
        peakMinute: s.offsetMinutes,
        peakDb: s.snoreDb ?? 0,
        from: '',
        to: '',
      };
      episodes.push(current);
    }
  }
  return episodes.map(({ peakDb: _peakDb, ...e }) => ({
    ...e,
    from: clock(first, e.startMinute - first.offsetMinutes),
    to: clock(first, e.endMinute + 1 - first.offsetMinutes),
  }));
}

const episodeMinutes = (e: SnoreEpisode) => e.endMinute - e.startMinute + 1;

/**
 * Short plain-language description of a night, built from the per-minute snore timeline,
 * followed by what the pattern may mean according to sleep research.
 * Deliberately limited to what loudness and rhythm can tell: it never claims a sleep stage,
 * apnea or position for this night, only what is typical for that part of the night.
 * Returns null for sessions recorded before per-minute snore data existed.
 */
export function summarizeNight(session: SleepSession, history: SleepSession[] = []): NightSummary | null {
  const timeline = session.timeline || [];
  if (timeline.length === 0 || !timeline.some((s) => s.snoreSeconds !== undefined)) return null;

  const first = timeline[0];
  const last = timeline[timeline.length - 1];
  const step = timelineStep(timeline); // Minutes covered by one sample (1 for real recordings)
  // The timeline starts after the start delay, i.e. around falling asleep
  const spanMinutes = last.offsetMinutes + step - first.offsetMinutes;
  const totalSnore = timeline.reduce((n, s) => n + (s.snoreSeconds ?? 0), 0);
  const episodes = findEpisodes(timeline, step);
  const sentences: string[] = [];
  const insights: string[] = [];
  let pattern: SnorePattern | undefined;
  let longestEpisode: SnoreEpisode | undefined;

  if (totalSnore < MIN_SNORE_SECONDS || episodes.length === 0) {
    sentences.push(t('summaryQuietNight'));
  } else {
    const snoringTime = snoringTimeSeconds(session);
    const percent = Math.max(1, Math.round((snoringTime / session.totalDurationSeconds) * 100));
    sentences.push(t('summaryAmount', { percent, snore: formatHoursMinutes(snoringTime) }));

    // Snores per hour of the night (nights recorded with snore counts only)
    if (timeline.some((s) => s.snoreCount !== undefined)) {
      const snores = timeline.reduce((n, s) => n + (s.snoreCount ?? 0), 0);
      const rate = Math.round(snores / (session.totalDurationSeconds / 3600));
      sentences.push(t('summaryRate', { count: snores, rate }));
      insights.push(t('insightRate'));
    }

    // Where in the night the snoring happened
    const thirds = [0, 0, 0];
    for (const s of timeline) {
      const third = Math.min(2, Math.floor(((s.offsetMinutes - first.offsetMinutes) / spanMinutes) * 3));
      thirds[third] += s.snoreSeconds ?? 0;
    }
    const topThird = thirds.indexOf(Math.max(...thirds));
    const concentrated = thirds[topThird] / totalSnore >= CONCENTRATED_SHARE;
    if (concentrated) {
      const part = t((['summaryPartStart', 'summaryPartMiddle', 'summaryPartEnd'] as const)[topThird]);
      sentences.push(t('summaryConcentrated', { part }));
    } else if (episodes.length >= 3) {
      sentences.push(t('summarySpread'));
    }

    // Longest episode
    longestEpisode = episodes.reduce((a, b) => (episodeMinutes(b) > episodeMinutes(a) ? b : a));
    const duration = formatHoursMinutes(episodeMinutes(longestEpisode) * 60);
    sentences.push(
      episodes.length === 1
        ? t('summarySingleEpisode', { from: longestEpisode.from, to: longestEpisode.to, duration })
        : t('summaryEpisodes', {
            count: episodes.length,
            from: longestEpisode.from,
            to: longestEpisode.to,
            duration,
          })
    );

    // Longest quiet stretch (before, between and after episodes)
    const bounds = [first.offsetMinutes - 1, ...episodes.flatMap((e) => [e.startMinute, e.endMinute]), first.offsetMinutes + spanMinutes];
    let quiet = { minutes: 0, from: 0, to: 0 };
    for (let i = 0; i < bounds.length; i += 2) {
      const minutes = bounds[i + 1] - bounds[i] - 1;
      if (minutes > quiet.minutes) quiet = { minutes, from: bounds[i] + 1, to: bounds[i + 1] };
    }
    if (quiet.minutes >= MIN_QUIET_STRETCH_MINUTES) {
      sentences.push(
        t('summaryQuietStretch', {
          duration: formatHoursMinutes(quiet.minutes * 60),
          from: clock(first, quiet.from - first.offsetMinutes),
          to: clock(first, quiet.to - first.offsetMinutes),
        })
      );
    }

    // Loudness
    const snoring = timeline.filter((s) => s.snoreSeconds);
    const loudShare = snoring.filter((s) => s.category === 'loud' || s.category === 'epic').length / snoring.length;
    const loudest = snoring.reduce((a, b) => ((b.snoreDb ?? 0) > (a.snoreDb ?? 0) ? b : a));
    sentences.push(
      t(loudShare >= 0.5 ? 'summaryMostlyLoud' : 'summaryMostlyLight', {
        time: loudest.timeFormatted,
        db: loudest.snoreDb ?? 0,
      })
    );

    // Pattern of the snoring
    const snoreMinutes = snoring.length * step;
    const longest = episodeMinutes(longestEpisode);
    if (longest >= CONTINUOUS_EPISODE_MINUTES && longest >= snoreMinutes * CONTINUOUS_SHARE) {
      pattern = 'continuous';
    } else if (snoreMinutes <= SPORADIC_MAX_SNORE_MINUTES && longest <= SPORADIC_MAX_EPISODE_MINUTES) {
      pattern = 'sporadic';
    } else {
      pattern = 'intermittent';
    }
    sentences.push(
      t(({ continuous: 'summaryPatternContinuous', intermittent: 'summaryPatternIntermittent', sporadic: 'summaryPatternSporadic' } as const)[pattern])
    );

    // What the timing may mean: sleep stages follow a typical order through the night
    if (concentrated) {
      insights.push(t((['insightEarly', 'insightMiddle', 'insightLate'] as const)[topThird]));
      if (topThird === 0 && session.factors?.includes('factorAlcohol')) insights.push(t('insightAlcohol'));
    }
    if (pattern === 'continuous') insights.push(t('insightContinuous'));
    else if (pattern === 'intermittent') insights.push(t('insightIntermittent'));
    if (loudShare >= 0.5) insights.push(t('insightLoud'));
    insights.push(t('insightDoctor'));
  }

  // Compared with the previous week
  const previous = history
    .filter((s) => s.id !== session.id && s.startTime < session.startTime)
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
    .slice(0, 7);
  if (previous.length >= MIN_HISTORY_NIGHTS) {
    const avg = Math.round(previous.reduce((n, s) => n + s.snoreScore, 0) / previous.length);
    const score = session.snoreScore;
    if (Math.abs(score - avg) <= Math.max(5, avg * 0.15)) {
      sentences.push(t('summaryUsual', { avg }));
    } else {
      sentences.push(t(score < avg ? 'summaryBetter' : 'summaryWorse', { score, avg }));
    }
  }

  // The most telling factor of tonight, if there is enough data
  const nights = [session, ...history.filter((s) => s.id !== session.id)];
  const factor = compareFactors(nights)
    .filter((f) => session.factors?.includes(f.factor) && Math.abs(f.deltaPct) >= MIN_FACTOR_DELTA_PCT)
    .sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))[0];
  if (factor) {
    sentences.push(
      t(factor.deltaPct > 0 ? 'summaryFactorHigher' : 'summaryFactorLower', {
        factor: tFactor(factor.factor),
        pct: Math.abs(factor.deltaPct),
      })
    );
  }

  return { sentences, pattern, insights, references: citedReferences(insights), longestEpisode };
}

/** Reference numbers cited as [n] or [n, m] in the texts, in order. */
export function citedReferences(texts: string[]): number[] {
  const cited = new Set<number>();
  for (const text of texts) {
    for (const group of text.matchAll(/\[([\d,\s]+)\]/g)) {
      group[1].split(',').forEach((n) => cited.add(Number(n)));
    }
  }
  return [...cited].filter((n) => REFERENCES[n]).sort((a, b) => a - b);
}
