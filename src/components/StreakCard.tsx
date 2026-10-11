import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SleepSession } from '../types/session';
import { COLORS } from '../constants/theme';
import { t } from '../i18n';
import { computeStreaks } from '../services/nightStats';

interface StreakCardProps {
  sessions: SleepSession[];
  goal: number;
}

/** Nights in a row under the score goal, the best streak and the last 30 days. */
export const StreakCard: React.FC<StreakCardProps> = ({ sessions, goal }) => {
  const stats = useMemo(() => computeStreaks(sessions, goal), [sessions, goal]);
  const onFire = stats.current >= 3;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.main}>
          <Text style={styles.big}>
            {onFire ? '🔥 ' : ''}
            {stats.current}
          </Text>
          <Text style={styles.label}>{t('streakCurrent', { goal })}</Text>
        </View>
        <View style={styles.side}>
          <View style={styles.sideItem}>
            <Ionicons name="trophy-outline" size={14} color={COLORS.light} />
            <Text style={styles.sideText}>{t('streakBest', { count: stats.best })}</Text>
          </View>
          <View style={styles.sideItem}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.primaryLight} />
            <Text style={styles.sideText}>
              {t('streakLast30', { met: stats.metLast30, total: stats.recordedLast30 })}
            </Text>
          </View>
        </View>
      </View>
      {stats.current === 0 && stats.best === 0 ? (
        <Text style={styles.hint}>{t('streakHintStart', { goal })}</Text>
      ) : stats.current > 0 && stats.current === stats.best ? (
        <Text style={styles.hint}>{t('streakHintRecord')}</Text>
      ) : null}
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
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  main: {
    flex: 1,
  },
  big: {
    color: COLORS.textPrimary,
    fontSize: 30,
    fontWeight: '800',
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  side: {
    gap: 6,
    alignItems: 'flex-start',
  },
  sideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sideText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 10,
  },
});
