import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { SleepSession } from '../types/session';
import { t, getLanguage } from '../i18n';

export async function generateAndSharePdfReport(session: SleepSession): Promise<boolean> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      alert('Sharing is not available on this device');
      return false;
    }

    const startDate = new Date(session.startTime);
    const endDate = new Date(session.endTime);
    const dateFormatted = startDate.toLocaleDateString(getLanguage() === 'hu' ? 'hu-HU' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });

    const totalHours = Math.floor(session.totalDurationSeconds / 3600);
    const totalMins = Math.floor((session.totalDurationSeconds % 3600) / 60);
    const snoreHours = Math.floor(session.snoreDurationSeconds / 3600);
    const snoreMins = Math.floor((session.snoreDurationSeconds % 3600) / 60);

    const timelineBarsHtml = (session.timeline || [])
      .map((sample) => {
        const heightPct = Math.min(100, Math.max(10, ((sample.db - 25) / 60) * 100));
        let col = '#10B981';
        if (sample.category === 'epic') col = '#EF4444';
        else if (sample.category === 'loud') col = '#F97316';
        else if (sample.category === 'light') col = '#FBBF24';
        return `<div style="flex: 1; height: ${heightPct}%; background-color: ${col}; border-radius: 2px; margin: 0 1px;"></div>`;
      })
      .join('');

    const factorsHtml = (session.factors || [])
      .map(
        (f) =>
          `<span style="background: #EEF2F6; color: #1E293B; padding: 4px 10px; border-radius: 12px; font-size: 11px; margin-right: 6px; display: inline-block; margin-bottom: 4px;">${f}</span>`
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>FreeSnore Report</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 30px;
            color: #0F172A;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #E2E8F0;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            color: #4F46E5;
          }
          .date {
            font-size: 13px;
            color: #64748B;
          }
          .score-card {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            margin-bottom: 20px;
          }
          .score-number {
            font-size: 48px;
            font-weight: 800;
            color: ${session.snoreScore >= 50 ? '#EA580C' : '#10B981'};
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
          }
          .stat-box {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
          }
          .stat-label {
            font-size: 10px;
            text-transform: uppercase;
            color: #64748B;
            font-weight: 600;
          }
          .stat-val {
            font-size: 16px;
            font-weight: 700;
            color: #0F172A;
            margin-top: 4px;
          }
          .distribution-bar {
            height: 16px;
            border-radius: 8px;
            display: flex;
            overflow: hidden;
            margin: 12px 0;
          }
          .timeline-container {
            height: 100px;
            background: #0F172A;
            border-radius: 8px;
            padding: 10px;
            display: flex;
            align-items: flex-end;
            margin-top: 12px;
          }
          .section-title {
            font-size: 14px;
            font-weight: 700;
            color: #1E293B;
            margin-top: 20px;
            margin-bottom: 8px;
          }
          .alert-box {
            background: #FEF3C7;
            border-left: 4px solid #F59E0B;
            padding: 12px;
            border-radius: 4px;
            font-size: 12px;
            color: #92400E;
            margin-top: 16px;
          }
          .disclaimer {
            font-size: 10px;
            color: #94A3B8;
            margin-top: 40px;
            border-top: 1px solid #E2E8F0;
            padding-top: 12px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🌙 FreeSnore</div>
          <div class="date">${t('pdfReportTitle')} • ${dateFormatted}</div>
        </div>

        <div class="score-card">
          <div class="score-number">${session.snoreScore}</div>
          <div style="font-weight: 700; font-size: 14px; color: #475569;">${t('snoreScoreLabel')}</div>
          <div style="font-size: 12px; color: #64748B; margin-top: 4px;">
            ${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()} (${totalHours}h ${totalMins}m)
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-label">${t('totalSleepTime')}</div>
            <div class="stat-val">${totalHours}h ${totalMins}m</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">${t('snoreDuration')}</div>
            <div class="stat-val">${snoreHours}h ${snoreMins}m</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">${t('peakLoudness')}</div>
            <div class="stat-val">${session.peakDb} dB</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">${t('delayLabel')}</div>
            <div class="stat-val">${session.delayMinutes} ${t('minutesSuffix')}</div>
          </div>
        </div>

        <div class="section-title">${t('intensityDistribution')}</div>
        <div class="distribution-bar">
          <div style="flex: ${session.quietPercent}; background-color: #10B981;"></div>
          <div style="flex: ${session.lightPercent}; background-color: #FBBF24;"></div>
          <div style="flex: ${session.loudPercent}; background-color: #F97316;"></div>
          <div style="flex: ${session.epicPercent}; background-color: #EF4444;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600;">
          <span style="color: #10B981;">● ${t('levelQuiet')}: ${session.quietPercent}%</span>
          <span style="color: #FBBF24;">● ${t('levelLight')}: ${session.lightPercent}%</span>
          <span style="color: #F97316;">● ${t('levelLoud')}: ${session.loudPercent}%</span>
          <span style="color: #EF4444;">● ${t('levelEpic')}: ${session.epicPercent}%</span>
        </div>

        <div class="section-title">${t('nightNoiseTimeline')}</div>
        <div class="timeline-container">
          ${timelineBarsHtml}
        </div>

        ${
          session.apneaSuspectCount && session.apneaSuspectCount > 0
            ? `<div class="alert-box">
                <strong>${t('apneaWarningTitle')}</strong><br>
                ${t('apneaWarningBody', { count: session.apneaSuspectCount })}
              </div>`
            : ''
        }

        ${
          session.factors && session.factors.length > 0
            ? `<div class="section-title">${t('habitsAndRemedies')}</div>
               <div>${factorsHtml}</div>`
            : ''
        }

        <div class="disclaimer">
          ${t('pdfDoctorDisclaimer')}
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: t('pdfReportTitle'),
    });

    return true;
  } catch (error) {
    console.error('Failed to generate PDF report:', error);
    return false;
  }
}
