import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { sleepMonitor, LiveAudioStatus } from '../services/audioService';
import { calculateSnoreStats } from '../services/scoreCalculator';
import { saveSession, getSettings } from '../services/storage';
import { SleepSession } from '../types/session';
import { COLORS, SNORE_LEVELS } from '../constants/theme';
import { showTrackingNotification, dismissTrackingNotification } from '../services/notificationService';

interface RecordScreenProps {
  onSessionFinished: (session: SleepSession) => void;
}

const DELAY_OPTIONS = [0, 5, 10, 15, 20, 30, 45];
const FACTOR_PRESETS = [
  'Hanyatt alvás',
  'Oldalfekvés',
  'Alkohol',
  'Késői vacsora',
  'Orrdugulás',
  'Orrspray / tapasz',
  'Fáradtság',
  'Párásító',
];

export const RecordScreen: React.FC<RecordScreenProps> = ({ onSessionFinished }) => {
  // Tracking state: 'idle' | 'countdown' | 'recording'
  const [trackingState, setTrackingState] = useState<'idle' | 'countdown' | 'recording'>('idle');
  const [selectedDelay, setSelectedDelay] = useState<number>(15);
  const [countdownRemainingSec, setCountdownRemainingSec] = useState<number>(0);
  const [selectedFactors, setSelectedFactors] = useState<string[]>(['Oldalfekvés']);
  const [nightClockMode, setNightClockMode] = useState<boolean>(false);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  const [liveStatus, setLiveStatus] = useState<LiveAudioStatus>({
    currentDb: 30,
    peakDb: 30,
    category: 'quiet',
    durationSeconds: 0,
    snoringSeconds: 0,
  });

  const countdownTimerRef = useRef<any>(null);
  const clockTimerRef = useRef<any>(null);
  const isAppActiveRef = useRef<boolean>(true);

  useEffect(() => {
    // Load default delay from settings
    getSettings().then((s) => {
      setSelectedDelay(s.startDelayMinutes);
    });

    // App state listener: ha a telefon le van zárva (háttér), szüneteltetjük a UI re-rendert
    const sub = AppState.addEventListener('change', (nextState) => {
      isAppActiveRef.current = nextState === 'active';
    });

    // Éjszakai óra ritkított (5 mp-es) frissítése a CPU terhelés minimalizálására
    clockTimerRef.current = setInterval(() => {
      if (!isAppActiveRef.current) return;
      const now = new Date();
      setCurrentTimeStr(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      );
    }, 5000);

    return () => {
      sub.remove();
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (clockTimerRef.current) clearInterval(clockTimerRef.current);
      deactivateKeepAwake();
    };
  }, []);

  const toggleFactor = (factor: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedFactors.includes(factor)) {
      setSelectedFactors(selectedFactors.filter((f) => f !== factor));
    } else {
      setSelectedFactors([...selectedFactors, factor]);
    }
  };

  const startCountdownOrRecording = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await activateKeepAwakeAsync();

    if (selectedDelay === 0) {
      await beginActualRecording();
    } else {
      setTrackingState('countdown');
      setCountdownRemainingSec(selectedDelay * 60);
      showTrackingNotification(
        `${selectedDelay} perc múlva indul`,
        'Elalvási késleltetés aktív'
      );

      countdownTimerRef.current = setInterval(() => {
        setCountdownRemainingSec((prev) => {
          if (prev <= 1) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            beginActualRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const skipCountdown = async () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    await beginActualRecording();
  };

  const cancelTracking = async () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    await deactivateKeepAwake();
    await dismissTrackingNotification();
    setTrackingState('idle');
  };

  const beginActualRecording = async () => {
    setTrackingState('recording');
    showTrackingNotification('Alvás figyelése aktív', 'FreeSnore akusztikai felügyelet');

    const started = await sleepMonitor.startMonitoring((status) => {
      if (isAppActiveRef.current) {
        setLiveStatus(status);
      }
    });

    if (!started) {
      Alert.alert(
        'Mikrofon hiba',
        'Nem sikerült hozzáférni a mikrofonhoz. Kérlek engedélyezd a mikrofonhasználatot a beállításokban!'
      );
      setTrackingState('idle');
      await deactivateKeepAwake();
      await dismissTrackingNotification();
    }
  };

  const stopAndFinishSession = async () => {
    Alert.alert(
      'Alvás befejezése',
      'Szeretnéd leállítani a figyelést és megtekinteni a kiértékelést?',
      [
        { text: 'Folytatás', style: 'cancel' },
        {
          text: 'Befejezés',
          style: 'default',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await deactivateKeepAwake();
            await dismissTrackingNotification();
            setNightClockMode(false);

            const result = await sleepMonitor.stopMonitoring();
            const stats = calculateSnoreStats(result.totalSeconds, result.timeline);

            const now = new Date();
            const startEpoch = now.getTime() - result.totalSeconds * 1000;

            const session: SleepSession = {
              id: `session_${Date.now()}`,
              startTime: new Date(startEpoch).toISOString(),
              endTime: now.toISOString(),
              delayMinutes: selectedDelay,
              totalDurationSeconds: result.totalSeconds,
              snoreDurationSeconds: stats.snoreDurationSeconds,
              snoreScore: stats.snoreScore,
              quietPercent: stats.quietPercent,
              lightPercent: stats.lightPercent,
              loudPercent: stats.loudPercent,
              epicPercent: stats.epicPercent,
              peakDb: result.peakDb,
              timeline: result.timeline,
              clips: result.clips,
              factors: selectedFactors,
            };

            await saveSession(session);
            setTrackingState('idle');
            onSessionFinished(session);
          },
        },
      ]
    );
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}ó ${mins}p ${secs}mp`;
    }
    return `${mins}p ${secs}mp`;
  };

  // --- RENDERING VIEWS ---

  // 1. NIGHT CLOCK SCREEN (Modal / Dim Mode)
  if (nightClockMode && trackingState === 'recording') {
    return (
      <View style={styles.nightClockContainer}>
        <Text style={styles.nightClockTime}>{currentTimeStr}</Text>
        <Text style={styles.nightClockStatus}>
          Figyelés aktív • {liveStatus.currentDb} dB ({SNORE_LEVELS[liveStatus.category]?.label})
        </Text>
        <Text style={styles.nightClockElapsed}>
          Alvásidő: {formatDuration(liveStatus.durationSeconds)}
        </Text>

        <TouchableOpacity
          style={styles.nightClockDismissBtn}
          onPress={() => setNightClockMode(false)}
        >
          <Ionicons name="sunny-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.nightClockDismissText}>Kijelző visszaállítása</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 2. COUNTDOWN VIEW
  if (trackingState === 'countdown') {
    return (
      <View style={styles.container}>
        <View style={styles.centerCard}>
          <View style={styles.iconCirclePulse}>
            <Ionicons name="moon" size={48} color={COLORS.primaryLight} />
          </View>
          <Text style={styles.countdownTitle}>Elalvási Késleltetés</Text>
          <Text style={styles.countdownSub}>A tényleges hangfelvétel ennyi idő múlva kezdődik:</Text>

          <Text style={styles.timerDisplay}>{formatCountdown(countdownRemainingSec)}</Text>

          <View style={styles.countdownActions}>
            <TouchableOpacity style={styles.primaryButton} onPress={skipCountdown}>
              <Ionicons name="flash" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.primaryButtonText}>Azonnali indítás</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={cancelTracking}>
              <Text style={styles.secondaryButtonText}>Mégse</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // 3. ACTIVE RECORDING VIEW
  if (trackingState === 'recording') {
    const currentLevel = SNORE_LEVELS[liveStatus.category] || SNORE_LEVELS.quiet;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.recordingScroll}>
          <View style={styles.recordingHeader}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingStatusText}>Alvás és Horkolás Figyelése...</Text>
          </View>

          {/* Live Sound Meter Card */}
          <View style={styles.meterCard}>
            <View
              style={[
                styles.dbCircle,
                { borderColor: currentLevel.color, shadowColor: currentLevel.color },
              ]}
            >
              <Text style={[styles.dbValue, { color: currentLevel.color }]}>
                {liveStatus.currentDb}
              </Text>
              <Text style={styles.dbUnit}>dB</Text>
              <View style={[styles.levelTag, { backgroundColor: currentLevel.color + '20' }]}>
                <Text style={[styles.levelTagText, { color: currentLevel.color }]}>
                  {currentLevel.label}
                </Text>
              </View>
            </View>

            {/* Audio Wave Visualizer */}
            <View style={styles.waveRow}>
              {Array.from({ length: 18 }).map((_, i) => {
                const dynamicHeight = Math.min(
                  45,
                  Math.max(6, (liveStatus.currentDb - 30) * 1.5 + ((i * 7) % 15))
                );
                return (
                  <View
                    key={i}
                    style={[
                      styles.waveBar,
                      {
                        height: dynamicHeight,
                        backgroundColor: currentLevel.color,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>

          {/* Metrics summary */}
          <View style={styles.statsCard}>
            <View style={styles.metricRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Eltelt alvásidő</Text>
                <Text style={styles.metricValue}>
                  {formatDuration(liveStatus.durationSeconds)}
                </Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Horkolási idő</Text>
                <Text style={[styles.metricValue, { color: COLORS.loud }]}>
                  {formatDuration(liveStatus.snoringSeconds)}
                </Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Csúcs hangerő</Text>
                <Text style={styles.metricValue}>{liveStatus.peakDb} dB</Text>
              </View>
            </View>
          </View>

          {/* Night mode button */}
          <TouchableOpacity
            style={styles.nightModeBtn}
            onPress={() => setNightClockMode(true)}
          >
            <Ionicons name="moon-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.nightModeBtnText}>Éjszakai sötétített óra mód</Text>
          </TouchableOpacity>

          {/* Stop session button */}
          <TouchableOpacity
            style={styles.stopButton}
            onPress={stopAndFinishSession}
          >
            <Ionicons name="stop" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.stopButtonText}>Ébredés / Elemzés Befejezése</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // 4. IDLE / SETUP VIEW (Delay, Factors, Start button)
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.idleScroll}>
      <View style={styles.heroSection}>
        <View style={styles.moonBadge}>
          <Ionicons name="bed" size={28} color={COLORS.primaryLight} />
        </View>
        <Text style={styles.title}>FreeSnore Figyelés</Text>
        <Text style={styles.subtitle}>
          Helyezd a telefont az éjjeliszekrényre, a mikrofonnal az ágy felé.
        </Text>
      </View>

      {/* Delay selection card */}
      <View style={styles.setupCard}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="timer-outline" size={22} color={COLORS.primaryLight} />
          <Text style={styles.cardTitle}>Felvétel késleltetése (elalvási idő)</Text>
        </View>
        <Text style={styles.cardDesc}>
          Mennyi idővel az indítás után kezdje a tényleges figyelést és hangrögzítést?
        </Text>

        <View style={styles.delayChips}>
          {DELAY_OPTIONS.map((mins) => {
            const isSelected = selectedDelay === mins;
            return (
              <TouchableOpacity
                key={mins}
                style={[styles.delayChip, isSelected && styles.delayChipActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedDelay(mins);
                }}
              >
                <Text style={[styles.delayChipText, isSelected && styles.delayChipTextActive]}>
                  {mins === 0 ? 'Azonnal' : `${mins} perc`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Sleep factors tracker */}
      <View style={styles.setupCard}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="pulse-outline" size={22} color={COLORS.accent} />
          <Text style={styles.cardTitle}>Mai szokások & kiváltó tényezők</Text>
        </View>
        <Text style={styles.cardDesc}>
          Segít feltérképezni, mi befolyásolja a mai horkolásodat.
        </Text>

        <View style={styles.factorsGrid}>
          {FACTOR_PRESETS.map((factor) => {
            const isSelected = selectedFactors.includes(factor);
            return (
              <TouchableOpacity
                key={factor}
                style={[styles.factorChip, isSelected && styles.factorChipActive]}
                onPress={() => toggleFactor(factor)}
              >
                {isSelected && (
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color="#FFFFFF"
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text
                  style={[styles.factorChipText, isSelected && styles.factorChipTextActive]}
                >
                  {factor}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Big Start Button */}
      <TouchableOpacity
        style={styles.startHeroButton}
        onPress={startCountdownOrRecording}
        activeOpacity={0.85}
      >
        <Ionicons name="play" size={26} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={styles.startHeroButtonText}>Alvás Figyelése Indítása</Text>
      </TouchableOpacity>

      <Text style={styles.bottomTips}>
        💡 Tipp: Csatlakoztasd a telefont töltőre éjszakára a zavartalan működéshez.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  idleScroll: {
    padding: 18,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  moonBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  setupCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 14,
    lineHeight: 16,
  },
  delayChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  delayChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.surfaceHighlight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  delayChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  delayChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  delayChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  factorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  factorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surfaceHighlight,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  factorChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  factorChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  factorChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  startHeroButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    marginVertical: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  startHeroButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bottomTips: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  // Countdown styles
  centerCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconCirclePulse: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  countdownTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  countdownSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  timerDisplay: {
    fontSize: 56,
    fontWeight: '900',
    color: COLORS.primaryLight,
    letterSpacing: 2,
    marginBottom: 36,
  },
  countdownActions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: COLORS.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  // Recording styles
  recordingScroll: {
    padding: 20,
    alignItems: 'center',
  },
  recordingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.error,
  },
  recordingStatusText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  meterCard: {
    backgroundColor: COLORS.surfaceCard,
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  dbCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceHighlight,
    marginBottom: 20,
  },
  dbValue: {
    fontSize: 48,
    fontWeight: '900',
  },
  dbUnit: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: -4,
  },
  levelTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
  },
  levelTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 50,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
  },
  statsCard: {
    backgroundColor: COLORS.surfaceCard,
    width: '100%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  nightModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceHighlight,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nightModeBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  stopButton: {
    backgroundColor: COLORS.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  // Night Clock styles
  nightClockContainer: {
    flex: 1,
    backgroundColor: '#030508',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  nightClockTime: {
    fontSize: 72,
    fontWeight: '200',
    color: '#3B4866',
    letterSpacing: 2,
  },
  nightClockStatus: {
    fontSize: 14,
    color: '#28334A',
    fontWeight: '600',
    marginTop: 12,
  },
  nightClockElapsed: {
    fontSize: 12,
    color: '#1E273A',
    marginTop: 6,
  },
  nightClockDismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 50,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#0A0E1A',
  },
  nightClockDismissText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
});
