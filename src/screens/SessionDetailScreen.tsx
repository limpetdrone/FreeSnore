import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SleepSession } from '../types/session';
import { ScoreGauge } from '../components/ScoreGauge';
import { SnoreTimelineChart } from '../components/SnoreTimelineChart';
import { ClipPlayer } from '../components/ClipPlayer';
import { COLORS } from '../constants/theme';
import { deleteSession } from '../services/storage';
import { buildPdfReportHtml } from '../services/pdfReportGenerator';
import { usePdfReport } from '../hooks/usePdfReport';
import { PdfPreviewModal } from '../components/PdfPreviewModal';
import { REFERENCES, summarizeNight } from '../services/nightSummary';
import { snoringTimeSeconds } from '../services/timeline';
import { exportNightRecording, nightRecordingSize } from '../services/recordingExport';
import { t, getLanguage, tFactor, formatHoursMinutes } from '../i18n';

interface SessionDetailScreenProps {
  session: SleepSession;
  history?: SleepSession[]; // All saved nights, for comparisons in the summary
  onBack: () => void;
  onDeleted?: () => void;
}

export const SessionDetailScreen: React.FC<SessionDetailScreenProps> = ({
  session,
  history = [],
  onBack,
  onDeleted,
}) => {
  const summary = useMemo(() => summarizeNight(session, history), [session, history]);
  const [timelineFocus, setTimelineFocus] = useState<{ minute: number } | undefined>();
  const scrollRef = useRef<ScrollView>(null);
  const timelineY = useRef(0);

  // Select the longest episode and bring the timeline into view (it is below the fold)
  const showLongestEpisode = () => {
    if (!summary?.longestEpisode) return;
    setTimelineFocus({ minute: summary.longestEpisode.peakMinute });
    scrollRef.current?.scrollTo({ y: Math.max(0, timelineY.current - 12), animated: true });
  };
  const [recordingBytes, setRecordingBytes] = useState<number | null>(null);
  const [isExportingAudio, setIsExportingAudio] = useState(false);

  useEffect(() => {
    let active = true;
    nightRecordingSize(session).then((size) => active && setRecordingBytes(size));
    return () => {
      active = false;
    };
  }, [session]);

  const handleExportRecording = async () => {
    setIsExportingAudio(true);
    const result = await exportNightRecording(session);
    setIsExportingAudio(false);
    if (result === 'missing') Alert.alert(t('appTitle'), t('exportRecordingMissing'));
    else if (result === 'unavailable') Alert.alert(t('appTitle'), t('sharingUnavailable'));
    else if (result === 'error') Alert.alert(t('appTitle'), t('exportRecordingError'));
  };
  const [activeTab, setActiveTab] = useState<'overview' | 'clips'>('overview');
  const report = usePdfReport();

  const startDate = new Date(session.startTime);
  const endDate = new Date(session.endTime);

  const formatTime = (d: Date) =>
    `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

  const formatDate = (d: Date) =>
    d.toLocaleDateString(getLanguage() === 'hu' ? 'hu-HU' : 'en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });

  const totalDuration = formatHoursMinutes(session.totalDurationSeconds);

  const handleDelete = () => {
    Alert.alert(
      t('deleteSessionTitle'),
      t('deleteSessionPrompt'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('deleteAction'),
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

  const handleOpenPdfPreview = () => report.open(buildPdfReportHtml(session));

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
            {formatTime(startDate)} - {formatTime(endDate)} ({totalDuration})
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconBtn, { marginRight: 4 }]}
            onPress={handleOpenPdfPreview}
          >
            <Ionicons name="document-text-outline" size={22} color={COLORS.primaryLight} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            {t('sessionDetailOverviewTab')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'clips' && styles.activeTab]}
          onPress={() => setActiveTab('clips')}
        >
          <Text style={[styles.tabText, activeTab === 'clips' && styles.activeTabText]}>
            {t('sessionDetailClipsTab', { count: session.clips?.length || 0 })}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' ? (
          <>
            {/* Score Card */}
            <View style={styles.card}>
              <ScoreGauge score={session.snoreScore} size={150} label={t('snoreScoreLabel')} />

              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>{t('totalSleepTime')}</Text>
                  <Text style={styles.statValue}>
                    {totalDuration}
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>{t('snoreDuration')}</Text>
                  <Text style={[styles.statValue, { color: COLORS.loud }]}>
                    {formatHoursMinutes(snoringTimeSeconds(session))}
                  </Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>{t('peakLoudness')}</Text>
                  <Text style={styles.statValue}>{session.peakDb} dB</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>{t('delayLabel')}</Text>
                  <Text style={styles.statValue}>
                    {session.delayMinutes} {t('minutesSuffix')}
                  </Text>
                </View>
              </View>

              {/* Intensity progress distribution bar */}
              <View style={styles.distributionContainer}>
                <Text style={styles.sectionHeading}>{t('intensityDistribution')}</Text>
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
                    <Text style={{ color: COLORS.quiet }}>● {t('levelQuiet')}: {session.quietPercent}%</Text>
                  </Text>
                  <Text style={styles.percentText}>
                    <Text style={{ color: COLORS.light }}>● {t('levelLight')}: {session.lightPercent}%</Text>
                  </Text>
                  <Text style={styles.percentText}>
                    <Text style={{ color: COLORS.loud }}>● {t('levelLoud')}: {session.loudPercent}%</Text>
                  </Text>
                  <Text style={styles.percentText}>
                    <Text style={{ color: COLORS.epic }}>● {t('levelEpic')}: {session.epicPercent}%</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* Night summary */}
            {summary && (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={summary.longestEpisode ? 0.8 : 1}
                disabled={!summary.longestEpisode}
                onPress={showLongestEpisode}
              >
                <Text style={styles.sectionHeading}>{t('summaryTitle')}</Text>
                <Text style={styles.summaryText}>{summary.sentences.join(' ')}</Text>
                {summary.longestEpisode && (
                  <Text style={[styles.hintText, styles.summaryHint]}>{t('summaryJumpHint')}</Text>
                )}
              </TouchableOpacity>
            )}

            {/* What the pattern may mean, with sources */}
            {summary && summary.insights.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionHeading}>{t('insightTitle')}</Text>
                {summary.insights.map((insight, i) => (
                  <Text key={i} style={[styles.summaryText, i > 0 && styles.insightGap]}>
                    {insight}
                  </Text>
                ))}
                <Text style={[styles.referencesHeading]}>{t('referencesTitle')}</Text>
                {summary.references.map((n) => (
                  <Text key={n} style={styles.referenceText}>
                    [{n}] {REFERENCES[n]}
                  </Text>
                ))}
              </View>
            )}

            {/* Timeline */}
            <View style={styles.card} onLayout={(e) => (timelineY.current = e.nativeEvent.layout.y)}>
              <Text style={styles.sectionHeading}>{t('nightNoiseTimeline')}</Text>
              <Text style={styles.hintText}>{t('timelineHint')}</Text>
              <SnoreTimelineChart
                timeline={session.timeline}
                audioUri={session.audioUri ?? session.clips?.[0]?.audioUri}
                focus={timelineFocus}
              />
            </View>

            {/* Factors */}
            {session.factors && session.factors.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionHeading}>{t('habitsAndRemedies')}</Text>
                <View style={styles.chipRow}>
                  {session.factors.map((factor, idx) => (
                    <View key={idx} style={styles.chip}>
                      <Text style={styles.chipText}>{tFactor(factor)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Export PDF Button Card */}
            <TouchableOpacity style={styles.pdfExportBtn} onPress={handleOpenPdfPreview} activeOpacity={0.8}>
              <Ionicons name="document-text" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.pdfExportBtnText}>{t('exportPdfBtn')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Audio Clips tab */
          <>
            {recordingBytes !== null && (
              <TouchableOpacity
                style={styles.card}
                onPress={handleExportRecording}
                disabled={isExportingAudio}
                activeOpacity={0.8}
              >
                <View style={styles.exportRow}>
                  {isExportingAudio ? (
                    <ActivityIndicator color={COLORS.primaryLight} />
                  ) : (
                    <Ionicons name="download-outline" size={22} color={COLORS.primaryLight} />
                  )}
                  <View style={styles.exportTextBox}>
                    <Text style={styles.sectionHeading}>{t('exportRecordingBtn')}</Text>
                    <Text style={[styles.hintText, { marginBottom: 0 }]}>
                      {t('exportRecordingDesc', { size: Math.max(1, Math.round(recordingBytes / 1e6)) })}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            <View style={styles.card}>
              <Text style={styles.sectionHeading}>{t('recordedClipsTitle')}</Text>
              <Text style={styles.hintText}>{t('recordedClipsHint')}</Text>

              {session.clips && session.clips.length > 0 ? (
                session.clips.map((clip) => <ClipPlayer key={clip.id} clip={clip} />)
              ) : (
                <View style={styles.emptyClipsBox}>
                  <Ionicons name="volume-mute-outline" size={40} color={COLORS.textMuted} />
                  <Text style={styles.emptyClipsText}>{t('noClips')}</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* PDF Report Preview & Share Modal */}
      <PdfPreviewModal
        visible={report.visible}
        html={report.html}
        isSharing={report.isSharing}
        onClose={report.close}
        onShare={report.share}
      />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exportTextBox: {
    flex: 1,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },
  insightGap: {
    marginTop: 8,
  },
  referencesHeading: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 4,
  },
  referenceText: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  summaryHint: {
    marginTop: 8,
    marginBottom: 0,
    color: COLORS.primaryLight,
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
  pdfExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryDark,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  pdfExportBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
