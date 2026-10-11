import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NightEnvironment } from '../types/session';
import { COLORS } from '../constants/theme';
import { t } from '../i18n';
import { environmentLines } from '../services/environmentStats';

export const EnvironmentInfo: React.FC<{ environment: NightEnvironment }> = ({ environment }) => (
  <View>
    {environmentLines(environment).map((line) => (
      <Text key={line} style={styles.line}>
        {line}
      </Text>
    ))}
    <Text style={styles.source}>{t('environmentSource')}</Text>
  </View>
);

const styles = StyleSheet.create({
  line: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  source: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
});
