import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Alert,
  GestureResponderEvent,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SnoreIntensity, TimelineSample } from '../types/session';
import { COLORS } from '../constants/theme';
import { sleepMonitor } from '../services/audioService';
import { t } from '../i18n';

interface SnoreTimelineChartProps {
  timeline: TimelineSample[];
  audioUri?: string; // Whole-night recording; enables tap-to-replay
  height?: number;
  // Selects the column of this minute (offsetMinutes); pass a new object to select again
  focus?: { minute: number };
}

interface Column {
  startLabel: string;
  endLabel: string;
  samples: number; // Recorded minutes in this column (0 = gap, e.g. paused analysis)
  snoreSeconds: number;
  snoreDb: number;
  db: number;
  category: SnoreIntensity;
  replayOffset?: number; // Loudest snore in this column (seconds into the audio file)
}

// Enough columns to resolve single snoring episodes while keeping bars tappable
const MAX_COLUMNS = 96;
const REPLAY_SECONDS = 15; // A few breaths around the loudest snore
// Snoring 40% of the time (e.g. 1.5 s of every 4 s breath) fills a bar
const FULL_BAR_SNORE_RATIO = 0.4;

const CATEGORY_RANK: Record<SnoreIntensity, number> = { quiet: 0, light: 1, loud: 2, epic: 3 };

const categoryColor = (category: SnoreIntensity) => {
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

const levelLabel = (category: SnoreIntensity) =>
  t(
    (
      {
        quiet: 'levelQuiet',
        light: 'levelLight',
        loud: 'levelLoud',
        epic: 'levelEpic',
      } as const
    )[category]
  );

const clockLabel = (first: TimelineSample, minutesLater: number) => {
  const [h, m] = first.timeFormatted.split(':').map(Number);
  const total = (h * 60 + m + minutesLater) % (24 * 60);
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
};

/** Columns are laid out by time (offsetMinutes), so gaps in the data keep the axis true. */
function buildColumns(timeline: TimelineSample[]): { columns: Column[]; minutesPerColumn: number } {
  if (timeline.length === 0) return { columns: [], minutesPerColumn: 1 };
  const first = timeline[0];
  const span = timeline[timeline.length - 1].offsetMinutes - first.offsetMinutes + 1;
  const minutesPerColumn = Math.max(1, Math.ceil(span / MAX_COLUMNS));
  const count = Math.ceil(span / minutesPerColumn);

  const columns: Column[] = Array.from({ length: count }, (_, i) => ({
    startLabel: clockLabel(first, i * minutesPerColumn),
    endLabel: clockLabel(first, (i + 1) * minutesPerColumn - 1),
    samples: 0,
    snoreSeconds: 0,
    snoreDb: 0,
    db: 0,
    category: 'quiet',
  }));
  const loudest: number[] = new Array(count).fill(0);
  const snoreMinutes: number[] = new Array(count).fill(0);

  for (const s of timeline) {
    const i = Math.floor((s.offsetMinutes - first.offsetMinutes) / minutesPerColumn);
    const c = columns[i];
    c.samples++;
    c.db += s.db;
    c.snoreSeconds += s.snoreSeconds ?? 0;
    if (CATEGORY_RANK[s.category] > CATEGORY_RANK[c.category]) c.category = s.category;
    if (s.snoreDb) {
      c.snoreDb += s.snoreDb;
      snoreMinutes[i]++;
      if (s.audioOffsetSeconds !== undefined && s.snoreDb > loudest[i]) {
        loudest[i] = s.snoreDb;
        c.replayOffset = s.audioOffsetSeconds;
      }
    }
  }
  columns.forEach((c, i) => {
    if (c.samples > 0) c.db = Math.round(c.db / c.samples);
    if (snoreMinutes[i] > 0) c.snoreDb = Math.round(c.snoreDb / snoreMinutes[i]);
  });
  return { columns, minutesPerColumn };
}

export const SnoreTimelineChart: React.FC<SnoreTimelineChartProps> = ({
  timeline,
  audioUri,
  height = 140,
  focus,
}) => {
  const [chartWidth, setChartWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [appliedFocus, setAppliedFocus] = useState(focus);

  const { columns, minutesPerColumn } = useMemo(() => buildColumns(timeline || []), [timeline]);

  // Adjust the selection while rendering when a new focus request arrives
  if (focus !== appliedFocus) {
    setAppliedFocus(focus);
    if (focus && timeline?.length) {
      const index = Math.floor((focus.minute - timeline[0].offsetMinutes) / minutesPerColumn);
      setSelected(Math.max(0, Math.min(columns.length - 1, index)));
    }
  }
  // Sessions recorded before snore-based timelines only have room loudness per minute
  const hasSnoreData = useMemo(() => (timeline || []).some((s) => s.snoreSeconds !== undefined), [timeline]);

  // Stop replay when leaving the screen
  useEffect(() => () => sleepMonitor.stopPlayback(), []);

  if (columns.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={styles.emptyText}>{t('timelineEmpty')}</Text>
      </View>
    );
  }

  const barAreaHeight = height - 18;
  const barHeight = (c: Column) => {
    if (c.samples === 0) return 0; // No data for this period
    const ratio = hasSnoreData
      ? c.snoreSeconds / (minutesPerColumn * 60) / FULL_BAR_SNORE_RATIO
      : (c.db - 25) / 60;
    return Math.max(3, Math.min(1, ratio) * barAreaHeight);
  };

  const handleLayout = (e: LayoutChangeEvent) => setChartWidth(e.nativeEvent.layout.width);

  const handlePress = (e: GestureResponderEvent) => {
    if (chartWidth <= 0) return;
    const index = Math.floor((e.nativeEvent.locationX / chartWidth) * columns.length);
    const next = Math.max(0, Math.min(columns.length - 1, index));
    if (next !== selected && isPlaying) sleepMonitor.stopPlayback();
    setSelected(next);
  };

  const selectedColumn = selected !== null ? columns[selected] : null;

  const handleTogglePlay = async () => {
    if (isPlaying) {
      sleepMonitor.stopPlayback();
      return;
    }
    if (!audioUri || selectedColumn?.replayOffset === undefined) return;
    const started = await sleepMonitor.playClip(
      audioUri,
      // Start a little earlier so the snore is heard in context
      Math.max(0, selectedColumn.replayOffset - 3),
      REPLAY_SECONDS,
      () => setIsPlaying(false)
    );
    if (started) {
      setIsPlaying(true);
    } else {
      Alert.alert(t('appTitle'), t('noAudioFile'));
    }
  };

  const rangeLabel = (c: Column) =>
    c.startLabel === c.endLabel ? c.startLabel : `${c.startLabel} – ${c.endLabel}`;

  const labelIndices = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => Math.round(f * (columns.length - 1)))
    .filter((idx, pos, arr) => arr.indexOf(idx) === pos);

  return (
    <View style={styles.wrapper}>
      {/* Selected time range details and replay */}
      {selectedColumn && (
        <View style={styles.tooltipRow}>
          <View style={styles.tooltipInfo}>
            <Text style={styles.tooltipTime}>{rangeLabel(selectedColumn)}</Text>
            {selectedColumn.samples === 0 ? (
              <Text style={styles.tooltipValue}>{t('timelineNoData')}</Text>
            ) : hasSnoreData ? (
              <Text style={[styles.tooltipValue, { color: categoryColor(selectedColumn.category) }]}>
                {selectedColumn.snoreSeconds > 0
                  ? t('timelineSnoreDetail', {
                      seconds: selectedColumn.snoreSeconds,
                      db: selectedColumn.snoreDb,
                      level: levelLabel(selectedColumn.category),
                    })
                  : t('timelineNoSnore')}
              </Text>
            ) : (
              <Text style={[styles.tooltipValue, { color: categoryColor(selectedColumn.category) }]}>
                {selectedColumn.db} dB ({levelLabel(selectedColumn.category)})
              </Text>
            )}
          </View>
          {audioUri && selectedColumn.replayOffset !== undefined && (
            <TouchableOpacity
              style={[styles.playButton, isPlaying && styles.playButtonActive]}
              onPress={handleTogglePlay}
              accessibilityLabel={t(isPlaying ? 'timelineStop' : 'timelinePlay')}
            >
              <Ionicons name={isPlaying ? 'stop' : 'play'} size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Bars: one pressable surface, the tap position selects the column */}
      <Pressable
        style={[styles.chartContainer, { height }]}
        onLayout={handleLayout}
        onPress={handlePress}
      >
        <View style={styles.barsContainer} pointerEvents="none">
          {columns.map((c, index) => (
            <View key={index} style={styles.barSlot}>
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight(c),
                    backgroundColor: categoryColor(c.category),
                    opacity: selected === null || selected === index ? 1 : 0.55,
                  },
                ]}
              />
            </View>
          ))}
        </View>
      </Pressable>

      {/* Time axis markers */}
      <View style={styles.timeAxis}>
        {labelIndices.map((idx) => (
          <Text key={`time-marker-${idx}`} style={styles.timeLabel}>
            {columns[idx].startLabel}
          </Text>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        {(['quiet', 'light', 'loud', 'epic'] as const).map((category) => (
          <View key={category} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: categoryColor(category) }]} />
            <Text style={styles.legendText}>{levelLabel(category)}</Text>
          </View>
        ))}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceHighlight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    minHeight: 48,
  },
  tooltipInfo: {
    flex: 1,
  },
  tooltipTime: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  tooltipValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  playButtonActive: {
    backgroundColor: COLORS.primary,
  },
  chartContainer: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 12,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 6,
  },
  barSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  bar: {
    width: '70%',
    minWidth: 1,
    borderRadius: 2,
  },
  timeAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
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
