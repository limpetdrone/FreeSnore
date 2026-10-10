import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SleepSession } from '../types/session';
import { COLORS } from '../constants/theme';
import { t, getLanguage } from '../i18n';

interface WeeklyChartProps {
  sessions: SleepSession[];
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ sessions }) => {
  const isHu = getLanguage() === 'hu';
  // Generate the last 7 days starting from today backwards
  const dayNames = isHu
    ? ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  // Local (non-UTC) date key so sessions started near midnight map to the correct local calendar day
  const localDateKey = (d: Date) =>
    `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  const daysData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (6 - i));
    const dayOfWeek = d.getDay();
    const dateKey = localDateKey(d);

    // Find session for this date
    const session = sessions.find((s) => localDateKey(new Date(s.startTime)) === dateKey);

    return {
      date: d,
      dayLabel: dayNames[dayOfWeek],
      score: session ? session.snoreScore : 0,
      hours: session ? (session.totalDurationSeconds / 3600).toFixed(1) : '0',
      hasSession: !!session,
    };
  });

  const validSessions = daysData.filter((d) => d.hasSession);
  const avgScore =
    validSessions.length > 0
      ? Math.round(validSessions.reduce((acc, curr) => acc + curr.score, 0) / validSessions.length)
      : 0;

  const maxScore = Math.max(100, ...daysData.map((d) => d.score));

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
          <Text style={styles.title}>{t('weeklyTitle')}</Text>
          <Text style={styles.subtitle}>{t('weeklySubtitle')}</Text>
        </View>
        <View style={styles.avgBadge}>
          <Text style={styles.avgLabel}>{t('weeklyAverage')}</Text>
          <Text style={[styles.avgValue, { color: getScoreColor(avgScore) }]}>{avgScore}</Text>
        </View>
      </View>

      {/* Bar Chart */}
      <View style={styles.chartContainer}>
        {daysData.map((d, index) => {
          const barHeight = d.hasSession ? Math.max(8, (d.score / maxScore) * 110) : 4;
          return (
            <View key={index} style={styles.dayColumn}>
              {d.hasSession ? (
                <Text style={styles.barValue}>{d.score}</Text>
              ) : (
                <Text style={styles.emptyValue}>-</Text>
              )}
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: d.hasSession ? getScoreColor(d.score) : COLORS.surfaceHighlight,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.dayLabel, d.hasSession && styles.activeDayLabel]}>{d.dayLabel}</Text>
              <Text style={styles.hoursLabel}>{d.hasSession ? `${d.hours}${isHu ? 'ó' : 'h'}` : ''}</Text>
            </View>
          );
        })}
      </View>

      {/* Weekly Stats Summary */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>{t('trackedNights')}</Text>
          <Text style={styles.statVal}>{validSessions.length} / 7</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>{t('quietestNight')}</Text>
          <Text style={[styles.statVal, { color: COLORS.quiet }]}>
            {validSessions.length > 0
              ? `${Math.min(...validSessions.map((s) => s.score))} ${t('points')}`
              : 'N/A'}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>{t('loudestNight')}</Text>
          <Text style={[styles.statVal, { color: COLORS.epic }]}>
            {validSessions.length > 0
              ? `${Math.max(...validSessions.map((s) => s.score))} ${t('points')}`
              : 'N/A'}
          </Text>
        </View>
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
    marginBottom: 20,
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
  avgBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.surfaceHighlight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  avgLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  avgValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingBottom: 6,
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: 110,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 22,
    borderRadius: 6,
  },
  barValue: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyValue: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginBottom: 4,
  },
  dayLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  activeDayLabel: {
    color: COLORS.textPrimary,
  },
  hoursLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginBottom: 2,
  },
  statVal: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});
