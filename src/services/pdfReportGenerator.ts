import { Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { SleepSession, SnoreIntensity } from '../types/session';
import { t, getLanguage, tFactor, formatHoursMinutes } from '../i18n';
import { citedReferences, REFERENCES, summarizeNight } from './nightSummary';
import { summarizePeriod } from './periodSummary';
import { binTimeline, columnFill, snoringTimeSeconds } from './timeline';
import { compareFactors } from './factorStats';

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const CATEGORY_COLORS: Record<SnoreIntensity, string> = {
  quiet: '#10B981',
  light: '#FBBF24',
  loud: '#F97316',
  epic: '#EF4444',
};

const scoreColor = (score: number) =>
  score >= 80 ? '#EF4444' : score >= 50 ? '#EA580C' : score >= 25 ? '#D97706' : '#10B981';

const locale = () => (getLanguage() === 'hu' ? 'hu-HU' : 'en-US');

const clockTime = (d: Date) =>
  `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

// A4 at 96 dpi minus margins; one bar per column stays visible at this width
export const PDF_TIMELINE_COLUMNS = 96;
const CHART_WIDTH = 700;

/** The night's snore timeline as an inline SVG (fixed-size bars: flexbox bars collapse in print). */
export function timelineSvg(session: SleepSession): string {
  const timeline = session.timeline || [];
  const { columns, minutesPerColumn } = binTimeline(timeline, PDF_TIMELINE_COLUMNS);
  if (columns.length === 0) return `<p class="muted">${escapeHtml(t('timelineEmpty'))}</p>`;
  const hasSnoreData = timeline.some((s) => s.snoreSeconds !== undefined);

  const barArea = 90;
  const slot = CHART_WIDTH / columns.length;
  const bars = columns
    .map((c, i) => {
      if (c.samples === 0) return '';
      const h = Math.max(2, columnFill(c, minutesPerColumn, hasSnoreData) * barArea);
      return `<rect x="${(i * slot + slot * 0.15).toFixed(1)}" y="${(barArea - h).toFixed(1)}" width="${(slot * 0.7).toFixed(1)}" height="${h.toFixed(1)}" rx="1" fill="${CATEGORY_COLORS[c.category]}"/>`;
    })
    .join('');
  // Labels stay outside the stretched SVG, where text would be distorted on narrow screens
  const labels = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => Math.round(f * (columns.length - 1)))
    .filter((idx, pos, arr) => arr.indexOf(idx) === pos)
    .map((idx) => `<span>${columns[idx].startLabel}</span>`)
    .join('');

  return `<svg class="chart" viewBox="0 0 ${CHART_WIDTH} ${barArea}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${CHART_WIDTH}" height="${barArea}" fill="#0F172A" rx="6"/>
    ${bars}
  </svg>
  <div class="axis">${labels}</div>
  <div class="legend">
    ${(['quiet', 'light', 'loud', 'epic'] as const)
      .map((c) => `<span style="color:${CATEGORY_COLORS[c]}">● ${escapeHtml(levelLabel(c))}</span>`)
      .join('')}
  </div>`;
}

const levelLabel = (category: SnoreIntensity) =>
  t(({ quiet: 'levelQuiet', light: 'levelLight', loud: 'levelLoud', epic: 'levelEpic' } as const)[category]);

const referencesHtml = (refs: number[]) =>
  refs.length === 0
    ? ''
    : `<div class="references"><div class="ref-title">${escapeHtml(t('referencesTitle'))}</div>${refs
        .map((n) => `<div>[${n}] ${escapeHtml(REFERENCES[n])}</div>`)
        .join('')}</div>`;

const factorChips = (factors: string[]) =>
  factors.map((f) => `<span class="chip">${escapeHtml(tFactor(f))}</span>`).join('');

function documentHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 28px; color: #0F172A; line-height: 1.45; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; border-bottom: 2px solid #E2E8F0; padding-bottom: 12px; margin-bottom: 20px; }
    .logo { font-size: 22px; font-weight: 800; color: #4F46E5; }
    .subtitle { font-size: 12px; color: #64748B; font-weight: 600; }
    .date { font-size: 12px; color: #64748B; text-align: right; }
    .score-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 16px; }
    .score-number { font-size: 44px; font-weight: 800; line-height: 1.1; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 8px; }
    .stat-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 6px; text-align: center; }
    .stat-label { font-size: 10px; text-transform: uppercase; color: #64748B; font-weight: 600; }
    .stat-val { font-size: 16px; font-weight: 700; margin-top: 4px; }
    .section-title { font-size: 14px; font-weight: 700; color: #1E293B; margin: 20px 0 8px; page-break-after: avoid; }
    p { font-size: 12px; margin: 0 0 8px; }
    .muted { color: #64748B; }
    .distribution-bar { height: 14px; border-radius: 7px; display: flex; overflow: hidden; margin: 8px 0; }
    .legend { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px 12px; font-size: 11px; font-weight: 600; margin-top: 6px; }
    .chart { width: 100%; height: 90px; display: block; }
    .axis { display: flex; justify-content: space-between; font-size: 10.5px; color: #64748B; margin-top: 3px; }
    .axis-even span { flex: 1; text-align: center; }
    .chip { background: #EEF2F6; color: #1E293B; padding: 3px 9px; border-radius: 10px; font-size: 11px; margin: 0 4px 4px 0; display: inline-block; }
    .insights p { padding-left: 10px; border-left: 3px solid #C7D2FE; }
    .references { font-size: 9.5px; color: #64748B; margin-top: 12px; line-height: 1.35; }
    .ref-title { font-weight: 700; margin-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { text-align: left; color: #64748B; font-weight: 600; border-bottom: 1px solid #E2E8F0; padding: 5px 4px; }
    td { border-bottom: 1px solid #F1F5F9; padding: 5px 4px; vertical-align: top; }
    tr { page-break-inside: avoid; }
    .num { text-align: right; white-space: nowrap; }
    .disclaimer { font-size: 10px; color: #94A3B8; margin-top: 28px; border-top: 1px solid #E2E8F0; padding-top: 10px; text-align: center; }
    @media (max-width: 520px) {
      body { margin: 16px; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .header { flex-direction: column; align-items: flex-start; }
      .date { text-align: left; }
    }
  </style>
</head>
<body>
${body}
  <div class="disclaimer">${escapeHtml(t('pdfDoctorDisclaimer'))}</div>
</body>
</html>`;
}

const statBox = (label: string, value: string, color?: string) =>
  `<div class="stat-box"><div class="stat-label">${escapeHtml(label)}</div><div class="stat-val"${
    color ? ` style="color:${color}"` : ''
  }>${escapeHtml(value)}</div></div>`;

const distributionHtml = (q: number, l: number, lo: number, e: number) => `
  <div class="distribution-bar">
    <div style="flex: ${q}; background-color: #10B981;"></div>
    <div style="flex: ${l}; background-color: #FBBF24;"></div>
    <div style="flex: ${lo}; background-color: #F97316;"></div>
    <div style="flex: ${e}; background-color: #EF4444;"></div>
  </div>
  <div class="legend">
    <span style="color: #10B981;">● ${escapeHtml(t('levelQuiet'))}: ${q}%</span>
    <span style="color: #D97706;">● ${escapeHtml(t('levelLight'))}: ${l}%</span>
    <span style="color: #EA580C;">● ${escapeHtml(t('levelLoud'))}: ${lo}%</span>
    <span style="color: #DC2626;">● ${escapeHtml(t('levelEpic'))}: ${e}%</span>
  </div>`;

export function buildPdfReportHtml(session: SleepSession): string {
  // Single-night description only: comparisons with other nights are personal, not clinical
  const summary = summarizeNight(session);
  const startDate = new Date(session.startTime);
  const endDate = new Date(session.endTime);
  const dateFormatted = startDate.toLocaleDateString(locale(), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  const totalDuration = formatHoursMinutes(session.totalDurationSeconds);
  const refs = summary ? citedReferences([t('methodNote'), ...summary.insights]) : [];

  const body = `
  <div class="header">
    <div><div class="logo">🌙 FreeSnore</div><div class="subtitle">${escapeHtml(t('pdfReportTitle'))}</div></div>
    <div class="date">${escapeHtml(dateFormatted)}</div>
  </div>

  <div class="score-card">
    <div class="score-number" style="color:${scoreColor(session.snoreScore)}">${session.snoreScore}</div>
    <div style="font-weight: 700; font-size: 14px; color: #475569;">${escapeHtml(t('snoreScoreLabel'))}</div>
    <div class="muted" style="font-size: 12px; margin-top: 4px;">${clockTime(startDate)} – ${clockTime(endDate)} (${totalDuration})</div>
  </div>

  <div class="stats-grid">
    ${statBox(t('totalSleepTime'), totalDuration)}
    ${statBox(t('snoreDuration'), formatHoursMinutes(snoringTimeSeconds(session)), '#EA580C')}
    ${statBox(t('peakLoudness'), `${session.peakDb} dB`)}
    ${statBox(t('delayLabel'), `${session.delayMinutes} ${t('minutesSuffix')}`)}
  </div>

  ${
    summary
      ? `<div class="section-title">${escapeHtml(t('summaryTitle'))}</div>
  <p>${escapeHtml(summary.sentences.join(' '))}</p>`
      : ''
  }

  <div class="section-title">${escapeHtml(t('nightNoiseTimeline'))}</div>
  ${timelineSvg(session)}

  <div class="section-title">${escapeHtml(t('intensityDistribution'))}</div>
  ${distributionHtml(session.quietPercent, session.lightPercent, session.loudPercent, session.epicPercent)}

  ${
    summary && summary.insights.length > 0
      ? `<div class="section-title">${escapeHtml(t('insightTitle'))}</div>
  <div class="insights">${summary.insights.map((i) => `<p>${escapeHtml(i)}</p>`).join('')}</div>`
      : ''
  }

  ${
    session.factors && session.factors.length > 0
      ? `<div class="section-title">${escapeHtml(t('habitsAndRemedies'))}</div><div>${factorChips(session.factors)}</div>`
      : ''
  }

  ${summary ? `<p class="muted" style="font-size: 10.5px; margin-top: 16px;">${escapeHtml(t('methodNote'))}</p>` : ''}
  ${referencesHtml(refs)}`;

  return documentHtml(t('pdfReportTitle'), body);
}

export interface ReportPeriod {
  from: Date; // First day (local), inclusive
  to: Date; // Last day (local), inclusive
}

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Nights whose start falls on a day of the period (a night belongs to the evening it started). */
export function sessionsInPeriod(sessions: SleepSession[], period: ReportPeriod): SleepSession[] {
  const from = dayStart(period.from).getTime();
  const to = dayStart(period.to).getTime() + 24 * 60 * 60 * 1000;
  return sessions
    .filter((s) => {
      const start = new Date(s.startTime).getTime();
      return start >= from && start < to;
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

function scoreChartSvg(nights: SleepSession[]): string {
  const barArea = 110;
  const maxScore = Math.max(100, ...nights.map((s) => s.snoreScore));
  const slot = CHART_WIDTH / nights.length;
  const labelEvery = Math.ceil(nights.length / 10);
  const bars = nights
    .map((s, i) => {
      const h = Math.max(2, (s.snoreScore / maxScore) * barArea);
      return `<rect x="${(i * slot + slot * 0.15).toFixed(1)}" y="${(barArea - h).toFixed(1)}" width="${(slot * 0.7).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${scoreColor(s.snoreScore)}"/>`;
    })
    .join('');
  // One label slot per night keeps the dates under their bars; scores are in the table
  const labels = nights
    .map((s, i) => {
      const d = new Date(s.startTime);
      return `<span>${i % labelEvery === 0 ? `${d.getMonth() + 1}.${d.getDate()}.` : ''}</span>`;
    })
    .join('');
  return `<svg class="chart" style="height:${barArea}px" viewBox="0 0 ${CHART_WIDTH} ${barArea}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="0" y1="${barArea - 0.5}" x2="${CHART_WIDTH}" y2="${barArea - 0.5}" stroke="#E2E8F0"/>${bars}
  </svg>
  <div class="axis axis-even">${labels}</div>`;
}

/** Report over several nights (a week, a month or any chosen period). */
export function buildPeriodReportHtml(allSessions: SleepSession[], period: ReportPeriod): string {
  const nights = sessionsInPeriod(allSessions, period);
  const fmt = (d: Date) => d.toLocaleDateString(locale(), { year: 'numeric', month: 'long', day: 'numeric' });
  const rangeLabel = `${fmt(period.from)} – ${fmt(period.to)}`;
  const header = `
  <div class="header">
    <div><div class="logo">🌙 FreeSnore</div><div class="subtitle">${escapeHtml(t('periodReportTitle'))}</div></div>
    <div class="date">${escapeHtml(rangeLabel)}</div>
  </div>`;

  if (nights.length === 0) {
    return documentHtml(t('periodReportTitle'), `${header}<p>${escapeHtml(t('periodNoNights'))}</p>`);
  }

  const snoreTimes = nights.map(snoringTimeSeconds);
  const totalSleep = nights.reduce((n, s) => n + s.totalDurationSeconds, 0);
  const totalSnore = snoreTimes.reduce((a, b) => a + b, 0);
  const avgScore = Math.round(avg(nights.map((s) => s.snoreScore)));

  // Weighted intensity distribution over all recorded minutes
  const weight = (key: 'quietPercent' | 'lightPercent' | 'loudPercent' | 'epicPercent') =>
    Math.round(nights.reduce((n, s) => n + s[key] * s.totalDurationSeconds, 0) / totalSleep);

  const { sentences, insights } = summarizePeriod(nights)!; // nights is not empty here

  // Habits and remedies within the period
  const factors = compareFactors(nights, 2);
  const factorRows = factors
    .map(
      (f) => `<tr><td>${escapeHtml(tFactor(f.factor))}</td><td class="num">${f.withCount}</td><td class="num">${f.withAvg}</td><td class="num">${f.withoutAvg}</td><td class="num" style="color:${
        f.deltaPct <= 0 ? '#059669' : '#DC2626'
      }">${f.deltaPct > 0 ? '+' : ''}${f.deltaPct}%</td></tr>`
    )
    .join('');

  const nightRows = nights
    .map((s, i) => {
      const start = new Date(s.startTime);
      const end = new Date(s.endTime);
      const date = start.toLocaleDateString(locale(), { month: 'short', day: 'numeric', weekday: 'short' });
      const percent = Math.round((snoreTimes[i] / Math.max(1, s.totalDurationSeconds)) * 100);
      return `<tr>
        <td>${escapeHtml(date)}</td>
        <td>${clockTime(start)}–${clockTime(end)}</td>
        <td class="num">${formatHoursMinutes(s.totalDurationSeconds)}</td>
        <td class="num">${formatHoursMinutes(snoreTimes[i])} (${percent}%)</td>
        <td class="num" style="color:${scoreColor(s.snoreScore)}; font-weight:700">${s.snoreScore}</td>
        <td>${(s.factors || []).map((f) => escapeHtml(tFactor(f))).join(', ')}</td>
      </tr>`;
    })
    .join('');

  const body = `${header}
  <div class="stats-grid">
    ${statBox(t('periodNights'), String(nights.length))}
    ${statBox(t('periodAvgSleep'), formatHoursMinutes(totalSleep / nights.length))}
    ${statBox(t('periodAvgSnore'), formatHoursMinutes(totalSnore / nights.length), '#EA580C')}
    ${statBox(t('periodAvgScore'), String(avgScore), scoreColor(avgScore))}
  </div>

  <div class="section-title">${escapeHtml(t('periodSummaryTitle'))}</div>
  <p>${escapeHtml(sentences.join(' '))}</p>

  <div class="section-title">${escapeHtml(t('periodScoreChart'))}</div>
  ${scoreChartSvg(nights)}

  <div class="section-title">${escapeHtml(t('intensityDistribution'))}</div>
  ${distributionHtml(weight('quietPercent'), weight('lightPercent'), weight('loudPercent'), weight('epicPercent'))}

  ${
    insights.length > 0
      ? `<div class="section-title">${escapeHtml(t('insightTitle'))}</div>
  <div class="insights">${insights.map((i) => `<p>${escapeHtml(i)}</p>`).join('')}</div>`
      : ''
  }

  ${
    factorRows
      ? `<div class="section-title">${escapeHtml(t('habitsAndRemedies'))}</div>
  <table><thead><tr><th>${escapeHtml(t('periodFactor'))}</th><th class="num">${escapeHtml(t('periodNights'))}</th><th class="num">${escapeHtml(t('periodWith'))}</th><th class="num">${escapeHtml(t('periodWithout'))}</th><th class="num">${escapeHtml(t('periodDifference'))}</th></tr></thead><tbody>${factorRows}</tbody></table>`
      : ''
  }

  <div class="section-title">${escapeHtml(t('periodNightsTable'))}</div>
  <table>
    <thead><tr><th>${escapeHtml(t('periodDate'))}</th><th>${escapeHtml(t('periodTime'))}</th><th class="num">${escapeHtml(t('totalSleepTime'))}</th><th class="num">${escapeHtml(t('snoreDuration'))}</th><th class="num">${escapeHtml(t('periodScore'))}</th><th>${escapeHtml(t('habitsAndRemedies'))}</th></tr></thead>
    <tbody>${nightRows}</tbody>
  </table>

  <p class="muted" style="font-size: 10.5px; margin-top: 16px;">${escapeHtml(t('methodNote'))}</p>
  ${referencesHtml(citedReferences([t('methodNote'), ...insights]))}`;

  return documentHtml(t('periodReportTitle'), body);
}

export async function createPdfFromHtml(html: string): Promise<{ uri: string } | null> {
  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    return { uri };
  } catch (error) {
    console.error('Failed to create PDF report file:', error);
    Alert.alert(t('saveErrorTitle'), 'Failed to create PDF report.');
    return null;
  }
}

export async function createPdfReportFile(session: SleepSession): Promise<{ uri: string } | null> {
  return createPdfFromHtml(buildPdfReportHtml(session));
}

export async function sharePdfReportFile(uri: string): Promise<boolean> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(t('saveErrorTitle'), t('sharingUnavailable'));
      return false;
    }

    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: t('pdfReportTitle'),
    });
    return true;
  } catch (error) {
    console.error('Failed to share PDF report:', error);
    return false;
  }
}

export async function generateAndSharePdfReport(session: SleepSession): Promise<boolean> {
  const result = await createPdfReportFile(session);
  if (!result) return false;
  return sharePdfReportFile(result.uri);
}
