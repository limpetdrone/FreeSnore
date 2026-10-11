import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  AppState,
  BackHandler,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Brightness from 'expo-brightness';
import * as Haptics from 'expo-haptics';
import { sleepMonitor, LiveAudioStatus } from '../services/audioService';
import { SnoreTimelineChart } from '../components/SnoreTimelineChart';
import { nudgeDecision, SnoreNudge } from '../services/snoreNudge';
import { calculateSnoreStats } from '../services/scoreCalculator';
import { saveSession, getSettings, DEFAULT_SETTINGS } from '../services/storage';
import { SleepSession, AppSettings, TimelineSample } from '../types/session';
import { COLORS, SNORE_LEVELS } from '../constants/theme';
import {
  showTrackingNotification,
  dismissTrackingNotification,
  showSnoreNudge,
  showSessionSavedNotification,
} from '../services/notificationService';
import { watchAlarms } from '../../modules/alarm-watcher';
import { t, formatHoursMinutes } from '../i18n';

interface RecordScreenProps {
  onSessionFinished: (session: SleepSession) => void;
  onTrackingChange?: (active: boolean) => void;
}

const DELAY_OPTIONS = [0, 5, 10, 15, 20, 30, 45];
const AUTO_NIGHT_CLOCK_MS = 30000;
const LIVE_TIMELINE_REFRESH_MS = 30000;

const AGGRAVATING_KEYS = [
  'factorBackSleep',
  'factorAlcohol',
  'factorLateMeal',
  'factorBlockedNose',
  'factorFatigue',
  'factorStress',
] as const;

const REMEDY_KEYS = [
  'factorSideSleep',
  'remedyNasalStrips',
  'remedyMouthguard',
  'remedyHumidifier',
  'remedyElevatedPillow',
  'remedyNasalSpray',
] as const;

// Quietest sound that can count as a snore. Not a user setting: the detector already adapts to
// the room's noise floor, and on a real recorded night lower values missed half of the snores
// while higher ones picked up restless movement (scripts/audio-fixtures/night-regression.json)
const MIN_SNORE_DB = 44;

const formatClock = (d: Date) =>
  `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

export const RecordScreen: React.FC<RecordScreenProps> = ({ onSessionFinished, onTrackingChange }) => {
  // Tracking state: 'idle' | 'countdown' | 'recording'
  const [trackingState, setTrackingState] = useState<'idle' | 'countdown' | 'recording'>('idle');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [selectedDelay, setSelectedDelay] = useState<number>(DEFAULT_SETTINGS.startDelayMinutes);
  const [countdownRemainingSec, setCountdownRemainingSec] = useState<number>(0);
  // Translation keys, not labels, so stats survive a language switch
  const [selectedFactors, setSelectedFactors] = useState<string[]>(['factorSideSleep']);
  const [showFactors, setShowFactors] = useState<boolean>(false);
  const [nightClockMode, setNightClockMode] = useState<boolean>(false);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>(() => formatClock(new Date()));
  // Small per-minute offset of the night clock text against OLED burn-in
  const [clockShift, setClockShift] = useState({ x: 0, y: 0 });
  const [minutesToStart, setMinutesToStart] = useState(0);

  const [liveStatus, setLiveStatus] = useState<LiveAudioStatus>({
    currentDb: 30,
    peakDb: 30,
    category: 'quiet',
    durationSeconds: 0,
    snoringSeconds: 0,
    paused: false,
    pauseRemainingSeconds: null,
  });
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const [liveTimeline, setLiveTimeline] = useState<TimelineSample[]>([]);

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAppActiveRef = useRef<boolean>(true);
  const nightClockModeRef = useRef<boolean>(false);
  const lastStatusRef = useRef<LiveAudioStatus | null>(null);
  const finishingRef = useRef(false);
  const nudgesRef = useRef<SnoreNudge[]>([]); // Labs snore nudges of the current night
  const stopAlarmWatchRef = useRef<(() => void) | null>(null);
  // Latest finishSession for callbacks registered when tracking started
  const finishSessionRef = useRef<(reason: 'manual' | 'alarm') => Promise<void>>(async () => {});

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setSelectedDelay(s.startDelayMinutes);
    });

    // App state listener: pause UI re-render when device is locked/in background
    const sub = AppState.addEventListener('change', (nextState) => {
      isAppActiveRef.current = nextState === 'active';
      // Catch up on the status skipped while in the background
      if (isAppActiveRef.current && lastStatusRef.current && !nightClockModeRef.current) {
        setLiveStatus(lastStatusRef.current);
      }
    });

    return () => {
      sub.remove();
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      deactivateKeepAwake();
    };
  }, []);

  // The night clock shows HH:MM only, so it ticks once per minute, aligned to the
  // minute boundary, and only while it is visible.
  useEffect(() => {
    nightClockModeRef.current = nightClockMode;
    if (!nightClockMode) {
      if (lastStatusRef.current) setLiveStatus(lastStatusRef.current);
      return;
    }
    // Android keeps the screen on all night (see keepAwake), so dim this window to
    // near-minimum while the clock is shown. Window-only: needs no permission and the
    // system brightness is restored on exit. iOS brightness is global, so it is left alone.
    if (Platform.OS === 'android') {
      Brightness.setBrightnessAsync(0.02).catch(() => {});
    }
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const now = new Date();
      setCurrentTimeStr(formatClock(now));
      setMinutesToStart(Math.max(1, Math.ceil((sleepMonitor.getMonitorStartTime() - now.getTime()) / 60000)));
      setClockShift({ x: Math.round(Math.random() * 16 - 8), y: Math.round(Math.random() * 16 - 8) });
      if (lastStatusRef.current) setLiveStatus(lastStatusRef.current);
      timer = setTimeout(tick, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50);
    };
    tick();
    return () => {
      clearTimeout(timer);
      if (Platform.OS === 'android') {
        Brightness.restoreSystemBrightnessAsync().catch(() => {});
      }
    };
  }, [nightClockMode]);

  // The night so far, refreshed while the recording screen is visible (e.g. awake at night)
  useEffect(() => {
    if (trackingState !== 'recording' || nightClockMode) return;
    const refresh = () => setLiveTimeline(sleepMonitor.getLiveTimeline());
    refresh();
    const timer = setInterval(refresh, LIVE_TIMELINE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [trackingState, nightClockMode, isPaused]);

  const togglePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // The status callback updates isPaused right away
    if (isPaused) {
      sleepMonitor.resumeMonitoring();
    } else if (sleepMonitor.pauseMonitoring()) {
      showTrackingNotification(t('monitoringPaused'), t('monitoringPausedHint'));
    }
  };

  // Switch to the dark night clock after a short time without touches while
  // recording: a lit, constantly re-rendering screen is the biggest drain all night.
  const scheduleAutoNightClock = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setNightClockMode(true), AUTO_NIGHT_CLOCK_MS);
  };

  useEffect(() => {
    if (trackingState !== 'idle' && !nightClockMode) {
      scheduleAutoNightClock();
    } else if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, [trackingState, nightClockMode]);

  useEffect(() => {
    onTrackingChange?.(trackingState !== 'idle');
    if (trackingState === 'idle') return;
    // Prevent accidental Android hardware back button exit during active monitoring
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [trackingState, onTrackingChange]);

  const clearCountdownTimer = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  const toggleFactor = (factor: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedFactors.includes(factor)) {
      setSelectedFactors(selectedFactors.filter((f) => f !== factor));
    } else {
      setSelectedFactors([...selectedFactors, factor]);
    }
  };

  const enterRecordingState = () => {
    clearCountdownTimer();
    isPausedRef.current = false;
    setIsPaused(false);
    setTrackingState('recording');
    showTrackingNotification(t('nightClockMonitoring'), t('monitoringActive'));
  };

  const startCountdownOrRecording = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (settings.keepAwake) {
      await activateKeepAwakeAsync();
    }

    // Microphone starts now (iOS policy disallows background start);
    // frame evaluation stays idle during countdown delay.
    nudgesRef.current = [];
    const started = await sleepMonitor.startMonitoring(
      (status) => {
        lastStatusRef.current = status;
        // The pause ends on its own after PAUSE_MAX_MS
        if (status.paused !== isPausedRef.current) {
          isPausedRef.current = status.paused;
          setIsPaused(status.paused);
          if (!status.paused) showTrackingNotification(t('nightClockMonitoring'), t('monitoringActive'));
        }
        // No re-render while locked or while the night clock (which ticks per minute) is shown
        if (isAppActiveRef.current && !nightClockModeRef.current) {
          setLiveStatus(status);
        }
      },
      {
        delaySeconds: selectedDelay * 60,
        minSnoreDb: MIN_SNORE_DB,
        maxClips: settings.maxClipsPerSession,
        saveAudio: settings.saveAudioClips,
        keepFullRecording: settings.keepFullRecording,
        // iOS: the Clock alarm (or a call) takes the microphone away from us
        onInterrupted: () => {
          if (settings.stopOnAlarm !== false) finishSessionRef.current('alarm');
        },
        resumeAfterInterruption: settings.stopOnAlarm === false,
        // Labs: a nudge (watch tap) when snoring goes on; some episodes stay un-nudged as control
        onSnoringEpisode: settings.labsSnoreNudge
          ? (minute) => {
              const decision = nudgeDecision(nudgesRef.current, minute);
              if (!decision) return;
              nudgesRef.current.push(decision);
              if (decision.sent) showSnoreNudge(t('nudgeTitle'), t('nudgeBody'));
            }
          : undefined,
      }
    );

    if (!started) {
      Alert.alert(t('micErrorTitle'), t('micErrorBody'));
      deactivateKeepAwake();
      return;
    }

    // Android keeps recording through alarms; the native watcher reports them instead
    if (settings.stopOnAlarm !== false) {
      stopAlarmWatchRef.current = watchAlarms((at) => {
        if (sleepMonitor.canAutoStopAt(at)) finishSessionRef.current('alarm');
      });
    }

    if (selectedDelay === 0) {
      enterRecordingState();
      return;
    }

    setTrackingState('countdown');
    showTrackingNotification(`${selectedDelay} ${t('minutesSuffix')}`, t('countdownTitle'));

    // Deadline-based countdown: background timers may throttle, but wall-clock calculation stays exact
    const tick = () => {
      const remaining = Math.ceil((sleepMonitor.getMonitorStartTime() - Date.now()) / 1000);
      if (remaining <= 0) {
        enterRecordingState();
      } else {
        // The night clock shows minutes on its own tick; skip per-second re-renders
        if (!nightClockModeRef.current) setCountdownRemainingSec(remaining);
      }
    };
    tick();
    countdownTimerRef.current = setInterval(tick, 1000);
  };

  const skipCountdown = () => {
    sleepMonitor.skipDelay();
    enterRecordingState();
  };

  const stopAlarmWatch = () => {
    stopAlarmWatchRef.current?.();
    stopAlarmWatchRef.current = null;
  };

  const cancelTracking = async () => {
    stopAlarmWatch();
    clearCountdownTimer();
    await sleepMonitor.cancelMonitoring();
    deactivateKeepAwake();
    await dismissTrackingNotification();
    setTrackingState('idle');
  };

  /**
   * Ends the night and saves it. Runs once even if the user and an alarm stop it at the same time.
   * Data is saved first: after an iOS interruption the app may be suspended at any moment.
   */
  const finishSession = async (reason: 'manual' | 'alarm') => {
    if (finishingRef.current || !sleepMonitor.running) return;
    finishingRef.current = true;
    stopAlarmWatch();
    clearCountdownTimer();

    const result = await sleepMonitor.stopMonitoring();
    const stats = calculateSnoreStats(result.totalSeconds, result.timeline);
    const session: SleepSession = {
      id: `session_${Date.now()}`,
      startTime: new Date(result.startTime).toISOString(),
      endTime: new Date(result.endTime).toISOString(),
      delayMinutes: selectedDelay,
      totalDurationSeconds: result.totalSeconds,
      // Minutes with snoring (matches the live display and the timeline)
      snoreDurationSeconds: Math.min(result.snoreSeconds, result.totalSeconds),
      snoreScore: stats.snoreScore,
      quietPercent: stats.quietPercent,
      lightPercent: stats.lightPercent,
      loudPercent: stats.loudPercent,
      epicPercent: stats.epicPercent,
      peakDb: result.peakDb,
      timeline: result.timeline,
      clips: result.clips,
      ...(result.audioUri ? { audioUri: result.audioUri } : {}),
      factors: selectedFactors,
      ...(nudgesRef.current.length > 0 ? { nudges: nudgesRef.current } : {}),
    };

    let saved = true;
    try {
      await saveSession(session);
    } catch {
      saved = false;
      Alert.alert(t('saveErrorTitle'), t('saveErrorBody'));
    }

    deactivateKeepAwake();
    await dismissTrackingNotification();
    if (reason === 'alarm') {
      if (saved) showSessionSavedNotification(t('alarmStoppedTitle'), t('alarmStoppedBody'));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setNightClockMode(false);
    setTrackingState('idle');
    finishingRef.current = false;
    onSessionFinished(session);
  };

  useEffect(() => {
    finishSessionRef.current = finishSession;
  });

  const stopAndFinishSession = async () => {
    Alert.alert(
      t('finishSleepPromptTitle'),
      t('finishSleepPromptBody'),
      [
        { text: t('continueTracking'), style: 'cancel' },
        { text: t('finishAction'), style: 'default', onPress: () => finishSession('manual') },
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
      return `${hrs}${t('unitHour')} ${mins}${t('unitMin')} ${secs}${t('unitSec')}`;
    }
    return `${mins}${t('unitMin')} ${secs}${t('unitSec')}`;
  };

  // --- RENDERING VIEWS ---

  // 1. NIGHT CLOCK SCREEN (Modal / Dim Mode)
  if (nightClockMode && trackingState !== 'idle') {
    return (
      // Any tap wakes the screen: the dimmed restore button is hard to find at night
      <Pressable style={styles.nightClockContainer} onPress={() => setNightClockMode(false)}>
        <View style={{ alignItems: 'center', transform: [{ translateX: clockShift.x }, { translateY: clockShift.y }] }}>
          <Text style={styles.nightClockTime}>{currentTimeStr}</Text>
          {trackingState === 'countdown' ? (
            <Text style={styles.nightClockStatus}>
              {t('countdownSub')} {minutesToStart} {t('minutesSuffix')}
            </Text>
          ) : (
            <>
              <Text style={styles.nightClockStatus}>
                {isPaused ? t('monitoringPaused') : t('nightClockMonitoring')}
              </Text>
              <Text style={styles.nightClockElapsed}>
                {t('nightClockElapsed')}: {formatHoursMinutes(liveStatus.durationSeconds)}
              </Text>
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.nightClockDismissBtn}
          onPress={() => setNightClockMode(false)}
        >
          <Ionicons name="sunny-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.nightClockDismissText}>{t('nightClockRestore')}</Text>
        </TouchableOpacity>
      </Pressable>
    );
  }

  // 2. COUNTDOWN VIEW
  if (trackingState === 'countdown') {
    return (
      <View style={styles.container} onTouchStart={scheduleAutoNightClock}>
        <View style={styles.centerCard}>
          <View style={styles.iconCirclePulse}>
            <Ionicons name="moon" size={48} color={COLORS.primaryLight} />
          </View>
          <Text style={styles.countdownTitle}>{t('countdownTitle')}</Text>
          <Text style={styles.countdownSub}>{t('countdownSub')}</Text>

          <Text style={styles.timerDisplay}>{formatCountdown(countdownRemainingSec)}</Text>

          <View style={styles.countdownActions}>
            <TouchableOpacity style={styles.primaryButton} onPress={skipCountdown}>
              <Ionicons name="flash" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.primaryButtonText}>{t('skipCountdown')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={cancelTracking}>
              <Text style={styles.secondaryButtonText}>{t('cancel')}</Text>
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
      <View style={styles.container} onTouchStart={scheduleAutoNightClock}>
        <ScrollView contentContainerStyle={styles.recordingScroll}>
          <View style={styles.recordingHeader}>
            <View style={[styles.recordingDot, isPaused && styles.recordingDotPaused]} />
            <Text style={styles.recordingStatusText}>
              {isPaused ? t('monitoringPaused') : t('monitoringActive')}
            </Text>
          </View>

          {/* Live Sound Meter Card */}
          <View style={[styles.meterCard, isPaused && styles.dimmed]}>
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
                <Text style={styles.metricLabel}>{t('elapsedSleepTime')}</Text>
                <Text style={styles.metricValue}>
                  {formatDuration(liveStatus.durationSeconds)}
                </Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>{t('snoringTime')}</Text>
                <Text style={[styles.metricValue, { color: COLORS.loud }]}>
                  {formatDuration(liveStatus.snoringSeconds)}
                </Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>{t('peakLoudness')}</Text>
                <Text style={styles.metricValue}>{liveStatus.peakDb} dB</Text>
              </View>
            </View>
          </View>

          {/* The night so far */}
          <View style={styles.liveTimelineCard}>
            <Text style={styles.liveTimelineTitle}>{t('liveTimelineTitle')}</Text>
            <SnoreTimelineChart timeline={liveTimeline} height={110} />
          </View>

          {/* Pause (awake at night) and night mode */}
          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={[styles.nightModeBtn, styles.secondaryActionBtn, isPaused && styles.resumeBtn]}
              onPress={togglePause}
            >
              <Ionicons
                name={isPaused ? 'play' : 'pause'}
                size={20}
                color={isPaused ? '#FFFFFF' : COLORS.textSecondary}
              />
              <Text style={[styles.nightModeBtnText, isPaused && styles.resumeBtnText]}>
                {isPaused ? t('resumeMonitoringBtn') : t('pauseMonitoringBtn')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nightModeBtn, styles.secondaryActionBtn]}
              onPress={() => setNightClockMode(true)}
            >
              <Ionicons name="moon-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.nightModeBtnText}>{t('nightClockModeBtn')}</Text>
            </TouchableOpacity>
          </View>
          {isPaused && (
            <Text style={styles.pausedHint}>
              {liveStatus.pauseRemainingSeconds !== null
                ? `${t('monitoringResumesIn', {
                    minutes: Math.max(1, Math.ceil(liveStatus.pauseRemainingSeconds / 60)),
                  })} `
                : ''}
              {t('monitoringPausedHint')}
            </Text>
          )}

          {/* Stop session button */}
          <TouchableOpacity
            style={styles.stopButton}
            onPress={stopAndFinishSession}
          >
            <Ionicons name="stop" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.stopButtonText}>{t('finishSleepBtn')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // 4. IDLE / SETUP VIEW (Start Button, Delay, Factors & Remedies)
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.idleScroll}>
      <View style={styles.heroSection}>
        <View style={styles.moonBadge}>
          <Ionicons name="bed" size={26} color={COLORS.primaryLight} />
        </View>
        <Text style={styles.title}>{t('recordHeroTitle')}</Text>
        <Text style={styles.subtitle}>{t('recordHeroSubtitle')}</Text>
      </View>

      {/* Primary Action: Big Start Button at the top */}
      <TouchableOpacity
        style={styles.startHeroButton}
        onPress={startCountdownOrRecording}
        activeOpacity={0.85}
      >
        <Ionicons name="play" size={24} color="#FFFFFF" style={{ marginRight: 10 }} />
        <View style={styles.startBtnTextCol}>
          <Text style={styles.startHeroButtonText}>{t('startTrackingButton')}</Text>
          <Text style={styles.startHeroButtonSub}>
            {selectedDelay === 0
              ? t('immediate')
              : t('startTrackingWithDelay', {
                  delay: `${selectedDelay} ${t('minutesSuffix')}`,
                })}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Delay selection card */}
      <View style={styles.setupCard}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="timer-outline" size={20} color={COLORS.primaryLight} />
          <Text style={styles.cardTitle}>{t('delayCardTitle')}</Text>
        </View>
        <Text style={styles.cardDesc}>{t('delayCardDesc')}</Text>

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
                  {mins === 0 ? t('immediate') : `${mins} ${t('minutesSuffix')}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Sleep factors & remedies tracker (collapsible) */}
      <View style={styles.setupCard}>
        <TouchableOpacity
          style={styles.cardHeaderRowClickable}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFactors(!showFactors);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeaderTitleRow}>
            <Ionicons name="pulse-outline" size={20} color={COLORS.accent} />
            <Text style={styles.cardTitle}>{t('factorsCardTitle')}</Text>
            {selectedFactors.length > 0 && (
              <View style={styles.factorCountBadge}>
                <Text style={styles.factorCountText}>
                  {t('factorsSelectedCount', { count: selectedFactors.length })}
                </Text>
              </View>
            )}
          </View>
          <Ionicons
            name={showFactors ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>

        {showFactors ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.cardDesc}>{t('factorsCardDesc')}</Text>

            {/* Aggravating Triggers */}
            <Text style={styles.subHeading}>{t('factorsSectionAggravating')}</Text>
            <View style={styles.factorsGrid}>
              {AGGRAVATING_KEYS.map((key) => {
                const label = t(key);
                const isSelected = selectedFactors.includes(key);
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.factorChip, isSelected && styles.factorChipActive]}
                    onPress={() => toggleFactor(key)}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                    )}
                    <Text style={[styles.factorChipText, isSelected && styles.factorChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Remedies Applied */}
            <Text style={[styles.subHeading, { marginTop: 14 }]}>{t('factorsSectionRemedies')}</Text>
            <View style={styles.factorsGrid}>
              {REMEDY_KEYS.map((key) => {
                const label = t(key);
                const isSelected = selectedFactors.includes(key);
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.remedyChip, isSelected && styles.remedyChipActive]}
                    onPress={() => toggleFactor(key)}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                    )}
                    <Text style={[styles.factorChipText, isSelected && styles.factorChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.collapsedPreviewRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowFactors(true);
            }}
            activeOpacity={0.7}
          >
            {selectedFactors.length > 0 ? (
              <View style={styles.previewChipsRow}>
                {selectedFactors.slice(0, 3).map((key) => (
                  <View key={key} style={styles.previewChip}>
                    <Text style={styles.previewChipText}>{t(key as any)}</Text>
                  </View>
                ))}
                {selectedFactors.length > 3 && (
                  <Text style={styles.previewMoreText}>+{selectedFactors.length - 3}</Text>
                )}
              </View>
            ) : (
              <Text style={styles.collapsedPromptText}>{t('tapToCustomize')}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.bottomTips}>{t('chargingTip')}</Text>
      <Text style={[styles.bottomTips, { marginTop: 2 }]}>
        {Platform.OS === 'ios' ? t('lockTipIos') : t('lockTipAndroid')}
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
    marginTop: 8,
    marginBottom: 14,
  },
  moonBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
    lineHeight: 16,
  },
  setupCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardHeaderRowClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  cardHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  factorCountBadge: {
    backgroundColor: COLORS.surfaceHighlight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  factorCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
  },
  collapsedPreviewRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  previewChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  previewChip: {
    backgroundColor: COLORS.surfaceHighlight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewChipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  previewMoreText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '700',
    marginLeft: 2,
  },
  collapsedPromptText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
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
  subHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
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
  remedyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surfaceHighlight,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  remedyChipActive: {
    backgroundColor: COLORS.quiet,
    borderColor: COLORS.quiet,
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  startBtnTextCol: {
    alignItems: 'center',
  },
  startHeroButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  startHeroButtonSub: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
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
  recordingDotPaused: {
    backgroundColor: COLORS.light,
  },
  dimmed: {
    opacity: 0.4,
  },
  liveTimelineCard: {
    backgroundColor: COLORS.surfaceCard,
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 16,
  },
  liveTimelineTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  secondaryActionBtn: {
    flex: 1,
    justifyContent: 'center',
  },
  resumeBtn: {
    backgroundColor: COLORS.primary,
  },
  resumeBtnText: {
    color: '#FFFFFF',
  },
  pausedHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 16,
    paddingHorizontal: 8,
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
    backgroundColor: '#000000',
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
