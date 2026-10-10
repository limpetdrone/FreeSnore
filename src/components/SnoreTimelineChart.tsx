import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { TimelineSample } from '../types/session';
import { COLORS, SNORE_LEVELS } from '../constants/theme';

interface SnoreTimelineChartProps {
  timeline: TimelineSample[];
  height?: number;
}

export const SnoreTimelineChart: React.FC<SnoreTimelineChartProps> = ({
  timeline,
  height = 140,
}) => {
  const [selectedSample, setSelectedSample] = useState<TimelineSample | null>(null);

  if (!timeline || timeline.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={styles.emptyText}>Nincs elegendő adat az éjszakai idővonalhoz</Text>
      </View>
    );
  }

  // Min db 25, max db 85
  const minDb = 25;
  const maxDb = 85;

  const getBarHeight = (db: number) => {
    const ratio = Math.max(0.1, Math.min(1, (db - minDb) / (maxDb - minDb)));
    return ratio * (height - 35);
  };

  const getBarColor = (category: string) => {
    switch (category) {
      case 'epic':
        return COLORS.epic;
      case 'loud':
        return COLORS.loud;
      case 'light':
        return COLORS.light;
      default:
        return COLORS.quiet;
    }
  };

  // Select evenly spaced time labels
  const timeLabelIndices = [
    0,
    Math.floor(timeline.length * 0.25),
    Math.floor(timeline.length * 0.5),
    Math.floor(timeline.length * 0.75),
    timeline.length - 1,
  ].filter((idx, pos, arr) => arr.indexOf(idx) === pos && idx < timeline.length);

  return (
    <View style={styles.wrapper}>
      {/* Selection tooltip banner */}
      {selectedSample && (
        <View style={styles.tooltipRow}>
          <Text style={styles.tooltipTime}>Időpont: {selectedSample.timeFormatted}</Text>
          <Text style={[styles.tooltipDb, { color: getBarColor(selectedSample.category) }]}>
            {selectedSample.db} dB ({SNORE_LEVELS[selectedSample.category]?.label})
          </Text>
        </View>
      )}

      {/* Bar graph */}
      <View style={[styles.chartContainer, { height }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.barsContainer}>
            {timeline.map((sample, index) => {
              const barH = getBarHeight(sample.db);
              const isSelected = selectedSample?.offsetMinutes === sample.offsetMinutes;

              return (
                <TouchableOpacity
                  key={`sample-${index}`}
                  activeOpacity={0.7}
                  onPress={() => setSelectedSample(sample)}
                  style={styles.barTouchTarget}
                >
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barH,
                        backgroundColor: getBarColor(sample.category),
                        opacity: isSelected ? 1 : 0.85,
                        width: timeline.length > 50 ? 4 : 8,
                        transform: isSelected ? [{ scaleY: 1.05 }] : [],
                      },
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Time axis markers */}
      <View style={styles.timeAxis}>
        {timeLabelIndices.map((idx) => (
          <Text key={`time-marker-${idx}`} style={styles.timeLabel}>
            {timeline[idx]?.timeFormatted}
          </Text>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.quiet }]} />
          <Text style={styles.legendText}>Csendes</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.light }]} />
          <Text style={styles.legendText}>Halk</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.loud }]} />
          <Text style={styles.legendText}>Hangos</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.epic }]} />
          <Text style={styles.legendText}>Erős</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
  },
  tooltipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceHighlight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  tooltipTime: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  tooltipDb: {
    fontSize: 12,
    fontWeight: '700',
  },
  chartContainer: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingTop: 12,
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
    paddingBottom: 6,
  },
  barTouchTarget: {
    paddingHorizontal: 1.5,
    justifyContent: 'flex-end',
    height: '100%',
  },
  bar: {
    borderRadius: 3,
  },
  timeAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: 6,
  },
  timeLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  emptyContainer: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
});
