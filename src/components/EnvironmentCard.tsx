import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SleepSession } from '../types/session';
import { COLORS } from '../constants/theme';
import { t } from '../i18n';
import { compareEnvironment, EnvironmentMetric } from '../services/environmentStats';

export const METRIC_LABEL: Record<EnvironmentMetric, Parameters<typeof t>[0]> = {
  pollen: 'metricPollen',
  humidity: 'metricHumidity',
  temperature: 'metricTemperature',
  pressure: 'metricPressure',
  pm10: 'metricPm10',
};

/** Snore score on nights with high and low outdoor values (pollen, humidity...). */
export const EnvironmentCard: React.FC<{ sessions: SleepSession[] }> = ({ sessions }) => {
  const results = useMemo(() => compareEnvironment(sessions), [sessions]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('environmentCompareTitle')}</Text>
      {results.length === 0 ? (
        <Text style={styles.hint}>{t('environmentCompareHint')}</Text>
      ) : (
        results.map((r) => (
          <View key={r.metric} style={styles.row}>
            <Text style={styles.metric}>{t(METRIC_LABEL[r.metric])}</Text>
            <Text style={[styles.value, { color: r.deltaPct > 0 ? COLORS.loud : COLORS.quiet }]}>
              {t('environmentCompareRow', {
                high: r.highAvg,
                low: r.lowAvg,
                pct: `${r.deltaPct > 0 ? '+' : ''}${r.deltaPct}%`,
              })}
            </Text>
          </View>
        ))
      )}
      <Text style={styles.source}>{t('environmentSource')}</Text>
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
    marginBottom: 8,
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  metric: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
  },
  source: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 8,
  },
});
