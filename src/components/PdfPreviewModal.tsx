import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SleepSession } from '../types/session';
import { COLORS } from '../constants/theme';
import { t, getLanguage, tFactor, formatHoursMinutes } from '../i18n';

interface PdfPreviewModalProps {
  visible: boolean;
  session: SleepSession;
  pdfUri: string | null;
  isLoading?: boolean;
  isSharing?: boolean;
  onClose: () => void;
  onShare: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  visible,
  session,
  isLoading = false,
  isSharing = false,
  onClose,
  onShare,
}) => {
  const startDate = new Date(session.startTime);
  const endDate = new Date(session.endTime);
  const dateFormatted = startDate.toLocaleDateString(getLanguage() === 'hu' ? 'hu-HU' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const formatClockTime = (d: Date) =>
    `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

  const totalDuration = formatHoursMinutes(session.totalDurationSeconds);
  const snoreDuration = formatHoursMinutes(session.snoreDurationSeconds);

  const hasSnoreData = (session.timeline || []).some((s) => s.snoreSeconds !== undefined);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        {/* Modal Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topBarBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>{t('pdfPreviewTitle')}</Text>
          <TouchableOpacity
            style={styles.topBarBtn}
            onPress={onShare}
            disabled={isLoading || isSharing}
            activeOpacity={0.7}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color={COLORS.primaryLight} />
            ) : (
              <Ionicons name="share-outline" size={22} color={COLORS.primaryLight} />
            )}
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primaryLight} />
            <Text style={styles.loadingText}>{t('generatingPdf')}</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {/* White Paper Sheet Preview */}
            <View style={styles.paperSheet}>
              {/* Document Header */}
              <View style={styles.docHeader}>
                <View>
                  <Text style={styles.docLogo}>🌙 FreeSnore</Text>
                  <Text style={styles.docTitle}>{t('pdfReportTitle')}</Text>
                </View>
                <Text style={styles.docDate}>{dateFormatted}</Text>
              </View>

              {/* Score Card */}
              <View style={styles.scoreCard}>
                <Text
                  style={[
                    styles.scoreNumber,
                    { color: session.snoreScore >= 50 ? COLORS.loud : COLORS.quiet },
                  ]}
                >
                  {session.snoreScore}
                </Text>
                <Text style={styles.scoreLabel}>{t('snoreScoreLabel')}</Text>
                <Text style={styles.scoreSub}>
                  {formatClockTime(startDate)} – {formatClockTime(endDate)} ({totalDuration})
                </Text>
              </View>

              {/* 4-Item Stats Grid */}
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>{t('totalSleepTime')}</Text>
                  <Text style={styles.statVal}>{totalDuration}</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>{t('snoreDuration')}</Text>
                  <Text style={[styles.statVal, { color: COLORS.loud }]}>{snoreDuration}</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>{t('peakLoudness')}</Text>
                  <Text style={styles.statVal}>{session.peakDb} dB</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>{t('delayLabel')}</Text>
                  <Text style={styles.statVal}>
                    {session.delayMinutes} {t('minutesSuffix')}
                  </Text>
                </View>
              </View>

              {/* Snore Intensity Distribution */}
              <Text style={styles.sectionHeading}>{t('intensityDistribution')}</Text>
              <View style={styles.distributionBar}>
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
              <View style={styles.distributionLegend}>
                <Text style={[styles.legendText, { color: '#059669' }]}>
                  ● {t('levelQuiet')}: {session.quietPercent}%
                </Text>
                <Text style={[styles.legendText, { color: '#D97706' }]}>
                  ● {t('levelLight')}: {session.lightPercent}%
                </Text>
                <Text style={[styles.legendText, { color: '#EA580C' }]}>
                  ● {t('levelLoud')}: {session.loudPercent}%
                </Text>
                <Text style={[styles.legendText, { color: '#DC2626' }]}>
                  ● {t('levelEpic')}: {session.epicPercent}%
                </Text>
              </View>

              {/* Night Noise Timeline */}
              <Text style={[styles.sectionHeading, { marginTop: 18 }]}>
                {t('nightNoiseTimeline')}
              </Text>
              <View style={styles.timelineBox}>
                {(session.timeline || []).map((sample, idx) => {
                  const ratio = hasSnoreData
                    ? (sample.snoreSeconds ?? 0) / 24
                    : (sample.db - 25) / 60;
                  const heightPct = Math.min(100, Math.max(4, ratio * 100));
                  let col = COLORS.quiet;
                  if (sample.category === 'epic') col = COLORS.epic;
                  else if (sample.category === 'loud') col = COLORS.loud;
                  else if (sample.category === 'light') col = COLORS.light;

                  return (
                    <View
                      key={idx}
                      style={[
                        styles.timelineBar,
                        {
                          height: `${heightPct}%`,
                          backgroundColor: col,
                        },
                      ]}
                    />
                  );
                })}
              </View>

              {/* Habits and remedies */}
              {session.factors && session.factors.length > 0 && (
                <View style={{ marginTop: 18 }}>
                  <Text style={styles.sectionHeading}>{t('habitsAndRemedies')}</Text>
                  <View style={styles.factorsRow}>
                    {session.factors.map((f, i) => (
                      <View key={i} style={styles.factorBadge}>
                        <Text style={styles.factorBadgeText}>{tFactor(f)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Clinical / Legal Disclaimer */}
              <View style={styles.disclaimerBox}>
                <Text style={styles.disclaimerText}>{t('pdfDoctorDisclaimer')}</Text>
              </View>
            </View>
          </ScrollView>
        )}

        {/* Bottom Actions Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={onShare}
            disabled={isLoading || isSharing}
            activeOpacity={0.85}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="share-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.shareBtnText}>{t('pdfShareReport')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  topBarBtn: {
    padding: 6,
    borderRadius: 8,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  paperSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  docHeader: {
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  docLogo: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4F46E5',
  },
  docTitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  docDate: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'right',
  },
  scoreCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreNumber: {
    fontSize: 44,
    fontWeight: '900',
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginTop: 2,
  },
  scoreSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },
  statVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  distributionBar: {
    height: 14,
    borderRadius: 7,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 8,
  },
  distributionLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  timelineBox: {
    height: 80,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  timelineBar: {
    flex: 1,
    borderRadius: 1,
    marginHorizontal: 0.5,
  },
  factorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  factorBadge: {
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  factorBadgeText: {
    color: '#1E293B',
    fontSize: 11,
    fontWeight: '500',
  },
  disclaimerBox: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
  },
  disclaimerText: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 14,
  },
  bottomBar: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  shareBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
