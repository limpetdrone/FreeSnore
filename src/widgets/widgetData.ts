import type { SleepSession } from '../types/session';
import { t, formatHoursMinutes, getLanguage } from '../i18n';
import { snoringTimeSeconds } from '../services/timeline';
import { computeStreaks } from '../services/nightStats';

/** Everything the home screen widgets show (texts are translated here: widgets cannot). */
export interface WidgetData {
  hasNight: boolean;
  score: string;
  scoreColor: string;
  snore: string; // "Snoring 1h 12m"
  date: string; // "Sun, Oct 11"
  streak: string; // "🔥 3 nights in a row"
  title: string;
  empty: string;
}

const scoreColor = (score: number) =>
  score >= 80 ? '#EF4444' : score >= 50 ? '#F97316' : score >= 25 ? '#FBBF24' : '#10B981';

export function buildWidgetData(sessions: SleepSession[], goal: number): WidgetData {
  const latest = [...sessions].sort((a, b) => b.startTime.localeCompare(a.startTime))[0];
  const base = { title: t('widgetTitle'), empty: t('widgetEmpty') };
  if (!latest) {
    return { ...base, hasNight: false, score: '–', scoreColor: '#94A3B8', snore: '', date: '', streak: '' };
  }
  const streak = computeStreaks(sessions, goal).current;
  return {
    ...base,
    hasNight: true,
    score: String(latest.snoreScore),
    scoreColor: scoreColor(latest.snoreScore),
    snore: t('widgetSnore', { snore: formatHoursMinutes(snoringTimeSeconds(latest)) }),
    date: new Date(latest.startTime).toLocaleDateString(getLanguage() === 'hu' ? 'hu-HU' : 'en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    }),
    streak: streak > 0 ? t('widgetStreak', { count: streak }) : '',
  };
}
