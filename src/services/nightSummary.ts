import type { SleepSession, TimelineSample } from '../types/session';
import { t, tFactor, formatHoursMinutes } from '../i18n';
import { compareFactors } from './factorStats';

export interface SnoreEpisode {
  startMinute: number; // offsetMinutes of the first snoring minute
  endMinute: number; // offsetMinutes of the last minute covered
  peakMinute: number; // Loudest minute, for jumping to it on the timeline
  from: string;
  to: string;
}

export interface NightSummary {
  sentences: string[];
  longestEpisode?: SnoreEpisode;
}

// Snoring minutes closer than this belong to the same episode
const EPISODE_GAP_MINUTES = 5;
const MIN_SNORE_SECONDS = 60; // Less snoring than this is a quiet night
const MIN_QUIET_STRETCH_MINUTES = 60;
const CONCENTRATED_SHARE = 0.6; // Share of snoring in one third of the night
const MIN_HISTORY_NIGHTS = 3;
const MIN_FACTOR_DELTA_PCT = 20;

const clock = (first: TimelineSample, minutesLater: number) => {
  const [h, m] = first.timeFormatted.split(':').map(Number);
  const total = (((h * 60 + m + minutesLater) % 1440) + 1440) % 1440;
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
};

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
 * Short plain-language description of a night, built from the per-minute snore timeline.
 * Deliberately limited to what loudness and rhythm can tell: no sleep stages, apnea or position.
 * Returns null for sessions recorded before per-minute snore data existed.
 */
export function summarizeNight(session: SleepSession, history: SleepSession[] = []): NightSummary | null {
  const timeline = session.timeline || [];
  if (timeline.length === 0 || !timeline.some((s) => s.snoreSeconds !== undefined)) return null;

  const first = timeline[0];
  const last = timeline[timeline.length - 1];
  // Minutes covered by one sample (1 for real recordings)
  const step = Math.max(1, Math.min(...timeline.slice(1).map((s, i) => s.offsetMinutes - timeline[i].offsetMinutes)));
  const spanMinutes = last.offsetMinutes + step - first.offsetMinutes;
  const totalSnore = timeline.reduce((n, s) => n + (s.snoreSeconds ?? 0), 0);
  const episodes = findEpisodes(timeline, step);
  const sentences: string[] = [];
  let longestEpisode: SnoreEpisode | undefined;

  if (totalSnore < MIN_SNORE_SECONDS || episodes.length === 0) {
    sentences.push(t('summaryQuietNight'));
  } else {
    const percent = Math.max(1, Math.round((session.snoreDurationSeconds / session.totalDurationSeconds) * 100));
    sentences.push(t('summaryAmount', { percent, snore: formatHoursMinutes(session.snoreDurationSeconds) }));

    // Where in the night the snoring happened
    const thirds = [0, 0, 0];
    for (const s of timeline) {
      const third = Math.min(2, Math.floor(((s.offsetMinutes - first.offsetMinutes) / spanMinutes) * 3));
      thirds[third] += s.snoreSeconds ?? 0;
    }
    const topThird = thirds.indexOf(Math.max(...thirds));
    if (thirds[topThird] / totalSnore >= CONCENTRATED_SHARE) {
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

  return { sentences, longestEpisode };
}
