import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SleepSession } from '../types/session';
import { COLORS } from '../constants/theme';
import { t, formatHoursMinutes } from '../i18n';
import { bedtimeLabel, compareWeekend, NightGroupStats } from '../services/nightStats';

interface WeekendCardProps {
  sessions: SleepSession[]; // The nights to compare (e.g. the last 30 days)
}

/** Weekday nights next to Friday and Saturday nights. */
export const WeekendCard: React.FC<WeekendCardProps> = ({ sessions }) => {
  const { weekday, weekend } = useMemo(() => compareWeekend(sessions), [sessions]);

  const column = (title: string, stats: NightGroupStats | null) => (
    <View style={styles.column}>
      <Text style={styles.columnTitle}>{title}</Text>
      {stats ? (
        <>
          <Text style={styles.score}>{stats.avgScore}</Text>
          <Text style={styles.unit}>{t('averagePoints')}</Text>
          <Text style={styles.line}>{t('weekendSnore', { snore: formatHoursMinutes(stats.avgSnoreSeconds) })}</Text>
          <Text style={styles.line}>{t('weekendBedtime', { time: bedtimeLabel(stats.avgBedtimeMinutes) })}</Text>
          <Text style={styles.muted}>{t('nightsCount', { count: stats.nights })}</Text>
        </>
      ) : (
        <Text style={styles.muted}>{t('weekendNoNights')}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('weekendTitle')}</Text>
      <View style={styles.row}>
        {column(t('weekendWeekdays'), weekday)}
        <View style={styles.divider} />
        {column(t('weekendWeekends'), weekend)}
      </View>
      <Text style={styles.footnote}>{t('weekendFootnote')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginTop: 14,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  columnTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  score: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '800',
  },
  unit: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 6,
  },
  line: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  muted: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  footnote: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 10,
  },
});
