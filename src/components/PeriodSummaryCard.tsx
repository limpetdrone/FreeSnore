import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SleepSession } from '../types/session';
import { COLORS } from '../constants/theme';
import { t } from '../i18n';
import { sessionsInPeriod } from '../services/pdfReportGenerator';
import { summarizePeriod } from '../services/periodSummary';

interface PeriodSummaryCardProps {
  sessions: SleepSession[];
  days: number; // The last N days, today included
  title: string;
}

/** Short description of the last week or month on the history screen. */
export const PeriodSummaryCard: React.FC<PeriodSummaryCardProps> = ({ sessions, days, title }) => {
  const summary = useMemo(() => {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1));
    return summarizePeriod(sessionsInPeriod(sessions, { from, to: today }));
  }, [sessions, days]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{summary ? summary.sentences.join(' ') : t('periodNoNights')}</Text>
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
    marginBottom: 6,
  },
  text: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
