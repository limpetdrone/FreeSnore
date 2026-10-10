import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SleepSession } from '../types/session';
import { WeeklyChart } from '../components/WeeklyChart';
import { MonthlyChart } from '../components/MonthlyChart';
import { COLORS } from '../constants/theme';

interface HistoryScreenProps {
  sessions: SleepSession[];
  onSelectSession: (session: SleepSession) => void;
  onRefresh: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  sessions,
  onSelectSession,
  onRefresh,
}) => {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const getScoreColor = (score: number) => {
    if (score >= 80) return COLORS.epic;
    if (score >= 50) return COLORS.loud;
    if (score >= 25) return COLORS.light;
    return COLORS.quiet;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });
  };

  const renderDailySessionItem = (item: SleepSession) => {
    const hrs = Math.floor(item.totalDurationSeconds / 3600);
    const mins = Math.floor((item.totalDurationSeconds % 3600) / 60);

    const snoreHrs = Math.floor(item.snoreDurationSeconds / 3600);
    const snoreMins = Math.floor((item.snoreDurationSeconds % 3600) / 60);

    const scoreCol = getScoreColor(item.snoreScore);

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.sessionCard}
        onPress={() => onSelectSession(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.cardDate}>{formatDate(item.startTime)}</Text>
          <View style={styles.cardDetailsRow}>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
              <Text style={styles.detailText}>
                {hrs}ó {mins}p alvás
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="volume-medium-outline" size={13} color={COLORS.loud} />
              <Text style={[styles.detailText, { color: COLORS.loud }]}>
                {snoreHrs > 0 ? `${snoreHrs}ó ` : ''}
                {snoreMins}p horkolás
              </Text>
            </View>
          </View>

          {item.factors && item.factors.length > 0 && (
            <View style={styles.factorsRow}>
              {item.factors.slice(0, 3).map((f, i) => (
                <Text key={i} style={styles.factorSmallBadge}>
                  {f}
                </Text>
              ))}
              {item.factors.length > 3 && (
                <Text style={styles.factorSmallBadge}>+{item.factors.length - 3}</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.cardRight}>
          <View style={[styles.scoreBadge, { borderColor: scoreCol }]}>
            <Text style={[styles.scoreNum, { color: scoreCol }]}>{item.snoreScore}</Text>
            <Text style={styles.scoreLbl}>Pont</Text>
          </View>

          <View style={styles.clipsBadge}>
            <Ionicons name="mic-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.clipsCount}>{item.clips?.length || 0} minta</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* View Mode Segment Switcher */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, viewMode === 'daily' && styles.segmentBtnActive]}
          onPress={() => setViewMode('daily')}
        >
          <Text
            style={[styles.segmentText, viewMode === 'daily' && styles.segmentTextActive]}
          >
            Napi Bontás
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, viewMode === 'weekly' && styles.segmentBtnActive]}
          onPress={() => setViewMode('weekly')}
        >
          <Text
            style={[styles.segmentText, viewMode === 'weekly' && styles.segmentTextActive]}
          >
            Heti Bontás
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, viewMode === 'monthly' && styles.segmentBtnActive]}
          onPress={() => setViewMode('monthly')}
        >
          <Text
            style={[styles.segmentText, viewMode === 'monthly' && styles.segmentTextActive]}
          >
            Havi Bontás
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {viewMode === 'daily' && (
          <View>
            <View style={styles.listHeaderRow}>
              <Text style={styles.sectionHeader}>Rögzített éjszakák ({sessions.length})</Text>
              <Text style={styles.hintHeader}>Részletekhez és hangokhoz koppints</Text>
            </View>

            {sessions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="moon-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>Még nincsenek rögzített éjszakák</Text>
                <Text style={styles.emptySub}>
                  Indíts el egy alvásfigyelést az új felvétel készítéséhez.
                </Text>
              </View>
            ) : (
              sessions.map((s) => renderDailySessionItem(s))
            )}
          </View>
        )}

        {viewMode === 'weekly' && (
          <View>
            <WeeklyChart sessions={sessions} />

            <Text style={[styles.sectionHeader, { marginTop: 16 }]}>
              A hét rögzített éjszakái
            </Text>
            {sessions.slice(0, 7).map((s) => renderDailySessionItem(s))}
          </View>
        )}

        {viewMode === 'monthly' && (
          <View>
            <MonthlyChart sessions={sessions} />

            <Text style={[styles.sectionHeader, { marginTop: 16 }]}>
              Havi éjszakák listája
            </Text>
            {sessions.slice(0, 15).map((s) => renderDailySessionItem(s))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 4,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  hintHeader: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  sessionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardLeft: {
    flex: 1,
  },
  cardDate: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  cardDetailsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  factorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  factorSmallBadge: {
    fontSize: 10,
    color: COLORS.textMuted,
    backgroundColor: COLORS.surfaceHighlight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardRight: {
    alignItems: 'center',
    marginLeft: 12,
  },
  scoreBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceHighlight,
    borderWidth: 2,
  },
  scoreNum: {
    fontSize: 16,
    fontWeight: '800',
  },
  scoreLbl: {
    fontSize: 8,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  clipsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  clipsCount: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});
