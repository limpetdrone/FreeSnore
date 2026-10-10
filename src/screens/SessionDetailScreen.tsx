import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SleepSession } from '../types/session';
import { ScoreGauge } from '../components/ScoreGauge';
import { SnoreTimelineChart } from '../components/SnoreTimelineChart';
import { ClipPlayer } from '../components/ClipPlayer';
import { COLORS } from '../constants/theme';
import { deleteSession } from '../services/storage';

interface SessionDetailScreenProps {
  session: SleepSession;
  onBack: () => void;
  onDeleted?: () => void;
}

export const SessionDetailScreen: React.FC<SessionDetailScreenProps> = ({
  session,
  onBack,
  onDeleted,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'clips'>('overview');

  const startDate = new Date(session.startTime);
  const endDate = new Date(session.endTime);

  const formatTime = (d: Date) =>
    `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

  const formatDate = (d: Date) =>
    d.toLocaleDateString('hu-HU', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });

  const totalHours = Math.floor(session.totalDurationSeconds / 3600);
  const totalMins = Math.floor((session.totalDurationSeconds % 3600) / 60);

  const snoreHours = Math.floor(session.snoreDurationSeconds / 3600);
  const snoreMins = Math.floor((session.snoreDurationSeconds % 3600) / 60);

  const handleDelete = () => {
    Alert.alert(
      'Munkamenet törlése',
      'Biztosan törölni szeretnéd ezt a mentett alváselemzést és a hozzá tartozó hangfelvételeket?',
      [
        { text: 'Mégse', style: 'cancel' },
        {
          text: 'Törlés',
          style: 'destructive',
          onPress: async () => {
            await deleteSession(session.id);
            onDeleted?.();
            onBack();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>{formatDate(startDate)}</Text>
          <Text style={styles.headerSubtitle}>
            {formatTime(startDate)} - {formatTime(endDate)} ({totalHours}ó {totalMins}p)
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Elemzés & Idővonal
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'clips' && styles.activeTab]}
          onPress={() => setActiveTab('clips')}
        >
          <Text style={[styles.tabText, activeTab === 'clips' && styles.activeTabText]}>
            Hangfelvételek ({session.clips?.length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' ? (
          <>
            {/* Score Card */}
            <View style={styles.card}>
              <ScoreGauge score={session.snoreScore} size={150} />

              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Összes alvásidő</Text>
                  <Text style={styles.statValue}>
                    {totalHours}ó {totalMins}p
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Horkolási idő</Text>
                  <Text style={[styles.statValue, { color: COLORS.loud }]}>
                    {snoreHours > 0 ? `${snoreHours}ó ` : ''}
                    {snoreMins}p
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Csúcs hangerő</Text>
                  <Text style={styles.statValue}>{session.peakDb} dB</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Elalvási késleltetés</Text>
                  <Text style={styles.statValue}>{session.delayMinutes} perc</Text>
                </View>
              </View>

              {/* Intensity progress distribution bar */}
              <View style={styles.distributionContainer}>
                <Text style={styles.sectionHeading}>Horkolási intenzitás megoszlása</Text>
                <View style={styles.multiBar}>
                  {session.quietPercent > 0 && (
                    <View style={{ flex: session.quietPercent, backgroundColor: COLORS.quiet }} />
                  )}
                  {session.lightPercent > 0 && (
                    <View style={{ flex: session.lightPercent, backgroundColor: COLORS.light }} />
                  )}
                  {session.loudPercent > 0 && (
                    <View style={{ flex: session.loudPercent, backgroundColor: COLORS.loud }} />
                  )}
                  {session.epicPercent > 0 && (
                    <View style={{ flex: session.epicPercent, backgroundColor: COLORS.epic }} />
                  )}
                </View>

                <View style={styles.percentLegend}>
                  <Text style={styles.percentText}>
                    <Text style={{ color: COLORS.quiet }}>● Csendes: {session.quietPercent}%</Text>
                  </Text>
                  <Text style={styles.percentText}>
                    <Text style={{ color: COLORS.light }}>● Halk: {session.lightPercent}%</Text>
                  </Text>
                  <Text style={styles.percentText}>
                    <Text style={{ color: COLORS.loud }}>● Hangos: {session.loudPercent}%</Text>
                  </Text>
                  <Text style={styles.percentText}>
                    <Text style={{ color: COLORS.epic }}>● Erős: {session.epicPercent}%</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* Timeline */}
            <View style={styles.card}>
              <Text style={styles.sectionHeading}>Éjszakai zaj-idővonal (Snore Profile)</Text>
              <Text style={styles.hintText}>
                Koppints az oszlopokra a pontos időpont és hangerő megtekintéséhez.
              </Text>
              <SnoreTimelineChart timeline={session.timeline} />
            </View>

            {/* Factors */}
            {session.factors && session.factors.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionHeading}>Kiváltó tényezők és szokások</Text>
                <View style={styles.chipRow}>
                  {session.factors.map((factor, idx) => (
                    <View key={idx} style={styles.chip}>
                      <Text style={styles.chipText}>{factor}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        ) : (
          /* Audio Clips tab */
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Rögzített horkolási minták</Text>
            <Text style={styles.hintText}>
              A detektált horkolásokból rögzített hangminták visszahallgatása.
            </Text>

            {session.clips && session.clips.length > 0 ? (
              session.clips.map((clip) => <ClipPlayer key={clip.id} clip={clip} />)
            ) : (
              <View style={styles.emptyClipsBox}>
                <Ionicons name="volume-mute-outline" size={40} color={COLORS.textMuted} />
                <Text style={styles.emptyClipsText}>Nem történt rögzített hangminta</Text>
              </View>
            )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  activeTabText: {
    color: COLORS.primaryLight,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
  },
  statBox: {
    width: '50%',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  distributionContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  hintText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  multiBar: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    marginVertical: 8,
  },
  percentLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    backgroundColor: COLORS.surfaceHighlight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '500',
  },
  emptyClipsBox: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyClipsText: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 8,
  },
});
