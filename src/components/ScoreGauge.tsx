import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '../constants/theme';

interface ScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  size = 140,
  strokeWidth = 12,
  label = 'Horkolási Pontszám',
  sublabel,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Score 0 to 120 maps to 0% to 100% of progress
  const progress = Math.min(1, Math.max(0, score / 120));
  const strokeDashoffset = circumference - progress * circumference;

  let scoreColor = COLORS.quiet;
  if (score >= 80) scoreColor = COLORS.epic;
  else if (score >= 50) scoreColor = COLORS.loud;
  else if (score >= 25) scoreColor = COLORS.light;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={COLORS.surfaceHighlight}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Kept inside the ring: long labels (e.g. Hungarian) wrap instead of crossing it */}
      <View style={[styles.centerContent, { maxWidth: (size - 2 * strokeWidth) * 0.8 }]}>
        <Text style={[styles.scoreText, { color: scoreColor }]}>{score}</Text>
        <Text style={styles.labelText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
          {label}
        </Text>
        {sublabel && <Text style={styles.sublabelText}>{sublabel}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
  },
  labelText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 14,
    textAlign: 'center',
    marginTop: 2,
  },
  sublabelText: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
