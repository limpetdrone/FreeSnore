import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SleepSession } from '../types/session';
import { COLORS } from '../constants/theme';
import { t, getLanguage, tFactor } from '../i18n';
import { compareFactors } from '../services/factorStats';

interface MonthlyChartProps {
  sessions: SleepSession[];
  onSelectSession?: (session: SleepSession) => void;
}

export const MonthlyChart: React.FC<MonthlyChartProps> = ({ sessions }) => {
  const isHu = getLanguage() === 'hu';
  // Filter sessions in the last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const monthlySessions = sessions.filter((s) => new Date(s.startTime) >= thirtyDaysAgo);

  const totalNights = monthlySessions.length;
  const avgScore =
    totalNights > 0
      ? Math.round(monthlySessions.reduce((acc, s) => acc + s.snoreScore, 0) / totalNights)
      : 0;

  // Breakdown by 4 weeks (Week 1, Week 2, Week 3, Week 4)
  const weekBuckets = [
    { label: isHu ? '1-7. nap' : 'Days 1-7', sessions: [] as SleepSession[] },
    { label: isHu ? '8-14. nap' : 'Days 8-14', sessions: [] as SleepSession[] },
    { label: isHu ? '15-21. nap' : 'Days 15-21', sessions: [] as SleepSession[] },
    { label: isHu ? '22-30. nap' : 'Days 22-30', sessions: [] as SleepSession[] },
  ];

  monthlySessions.forEach((s) => {
    const sDate = new Date(s.startTime);
    const diffDays = Math.floor((now.getTime() - sDate.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays <= 7) weekBuckets[0].sessions.push(s);
    else if (diffDays <= 14) weekBuckets[1].sessions.push(s);
    else if (diffDays <= 21) weekBuckets[2].sessions.push(s);
    else if (diffDays <= 30) weekBuckets[3].sessions.push(s);
  });

  const factorComparisons = compareFactors(monthlySessions);

  const getScoreColor = (score: number) => {
    if (score >= 80) return COLORS.epic;
    if (score >= 50) return COLORS.loud;
    if (score >= 25) return COLORS.light;
    return COLORS.quiet;
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{t('monthlyTitle')}</Text>
          <Text style={styles.subtitle}>{t('monthlySubtitle')}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>{t('monthlyAverage')}</Text>
          <Text style={[styles.badgeScore, { color: getScoreColor(avgScore) }]}>{avgScore}</Text>
        </View>
      </View>

      {/* 4-week progression */}
      <Text style={styles.sectionTitle}>{t('fourWeekProgression')}</Text>
      <View style={styles.weeksContainer}>
        {weekBuckets.map((wb, idx) => {
          const wAvg =
            wb.sessions.length > 0
              ? Math.round(wb.sessions.reduce((acc, s) => acc + s.snoreScore, 0) / wb.sessions.length)
              : 0;

          return (
            <View key={idx} style={styles.weekCard}>
              <Text style={styles.weekLabel}>{wb.label}</Text>
              <Text style={[styles.weekScore, { color: getScoreColor(wAvg) }]}>
                {wb.sessions.length > 0 ? `${wAvg} ${t('points')}` : '-'}
              </Text>
              <Text style={styles.weekCount}>
                {wb.sessions.length} {t('nightsSuffix')}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Factor impact: average score with vs. without each factor */}
      {monthlySessions.length > 0 && (
        <View style={styles.factorSection}>
          <Text style={styles.sectionTitle}>{t('remedyCompareTitle')}</Text>
          {factorComparisons.length === 0 ? (
            <Text style={styles.factorCount}>{t('remedyCompareHint')}</Text>
          ) : (
            factorComparisons.slice(0, 4).map((item) => (
              <View key={item.factor} style={styles.factorRow}>
                <View style={styles.factorNameBox}>
                  <Text style={styles.factorName}>{tFactor(item.factor)}</Text>
                  <Text style={styles.factorCount}>
                    {item.withAvg} / {item.withoutAvg} {t('averagePoints')} ({item.withCount} / {item.withoutCount}{' '}
                    {t('nightsSuffix')})
                  </Text>
                </View>
                <View style={styles.factorScoreBox}>
                  <Text
                    style={[styles.factorScore, { color: item.deltaPct <= 0 ? COLORS.quiet : COLORS.loud }]}
                  >
                    {item.deltaPct <= 0
                      ? t('remedyCompareLower', { pct: Math.abs(item.deltaPct) })
                      : t('remedyCompareHigher', { pct: item.deltaPct })}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Quick advice */}
      <View style={styles.insightBox}>
        <Text style={styles.insightTitle}>{t('monthlyInsightTitle')}</Text>
        <Text style={styles.insightText}>
          {avgScore < 35
            ? t('monthlyInsightGreat')
            : avgScore < 65
            ? t('monthlyInsightModerate')
            : t('monthlyInsightSevere')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: COLORS.surfaceHighlight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  badgeScore: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginVertical: 8,
  },
  weeksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  weekCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceHighlight,
    padding: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  weekLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  weekScore: {
    fontSize: 14,
    fontWeight: '700',
    marginVertical: 4,
  },
  weekCount: {
    fontSize: 9,
    color: COLORS.textSecondary,
  },
  factorSection: {
    marginTop: 8,
  },
  factorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceHighlight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  factorNameBox: {
    flexDirection: 'column',
  },
  factorName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  factorCount: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  factorScoreBox: {
    alignItems: 'flex-end',
  },
  factorScore: {
    fontSize: 13,
    fontWeight: '700',
  },
  insightBox: {
    backgroundColor: COLORS.surfaceHighlight + '80',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  insightTitle: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4,
  },
  insightText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
});
