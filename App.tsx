import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RecordScreen } from './src/screens/RecordScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SessionDetailScreen } from './src/screens/SessionDetailScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { applyRecordingRetention } from './src/services/recordingStorage';
import { fillMissingEnvironment } from './src/services/environment';
import { fillMissingHealth } from './src/services/health';
import { updateWidgets } from './src/widgets/updateWidgets';
import { updateSession } from './src/services/storage';
import { SleepSession } from './src/types/session';
import { getSessions, getSettings } from './src/services/storage';
import { initNotifications } from './src/services/notificationService';
import { COLORS } from './src/constants/theme';
import { t, getLanguage, setLanguage, Language } from './src/i18n';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'record' | 'history' | 'settings'>('record');
  const [sessions, setSessions] = useState<SleepSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<SleepSession | null>(null);
  // Cannot switch tabs during active tracking: unmounting RecordScreen would detach the audio pipeline
  const [isTracking, setIsTracking] = useState(false);
  const [, setLanguageState] = useState<Language>(getLanguage());

  const loadData = async () => {
    const data = await getSessions();
    setSessions(data);
    // Home screen widget: the latest night
    getSettings().then((s) => updateWidgets(data, s.snoreGoal ?? 25));
  };

  // Pollen and weather, watch and scale data of recent nights, when turned on in the settings
  const fetchEnvironment = async () => {
    const settings = await getSettings();
    const updated = [
      ...(settings.environmentData ? await fillMissingEnvironment(await getSessions(), updateSession) : []),
      ...(settings.healthData ? await fillMissingHealth(await getSessions(), updateSession) : []),
    ];
    if (updated.length === 0) return;
    loadData();
    const latest = await getSessions();
    setSelectedSession((current) => latest.find((s) => s.id === current?.id && updated.some((u) => u.id === s.id)) ?? current);
  };

  useEffect(() => {
    loadData();
    // Old whole-night recordings become their snoring parts (or go) as set in the settings
    applyRecordingRetention().then((changed) => {
      if (changed > 0) loadData();
    });
    fetchEnvironment();
    initNotifications();
    getSettings().then((s) => {
      if (s.language) {
        setLanguage(s.language);
        setLanguageState(s.language);
      }
    });
  }, []);

  // Android hardware back button: navigate back from detail view to history list
  useEffect(() => {
    if (!selectedSession) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedSession(null);
      return true;
    });
    return () => sub.remove();
  }, [selectedSession]);

  const handleSessionFinished = (session: SleepSession) => {
    loadData();
    setSelectedSession(session);
    fetchEnvironment();
  };

  const handleSelectSession = (session: SleepSession) => {
    setSelectedSession(session);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />

        {/* Header hidden while tracking so the night clock is a fully dark screen */}
        {!selectedSession && !isTracking && (
          <View style={styles.topBar}>
            <View style={styles.logoRow}>
              <View style={styles.logoCircle}>
                <Ionicons name="moon" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.brandTitle}>FreeSnore</Text>
            </View>
            <View style={styles.sessionCountBadge}>
              <Ionicons name="bed-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.sessionCountText}>
                {t('nightsCount', { count: sessions.length })}
              </Text>
            </View>
          </View>
        )}

        {/* Main Content Area */}
        <View style={styles.content}>
          {selectedSession ? (
            <SessionDetailScreen
              session={selectedSession}
              history={sessions}
              onBack={() => setSelectedSession(null)}
              onDeleted={() => {
                loadData();
                setSelectedSession(null);
              }}
            />
          ) : currentTab === 'record' ? (
            <RecordScreen onSessionFinished={handleSessionFinished} onTrackingChange={setIsTracking} />
          ) : currentTab === 'history' ? (
            <HistoryScreen
              sessions={sessions}
              onSelectSession={handleSelectSession}
              onRefresh={loadData}
            />
          ) : (
            <SettingsScreen onLanguageChange={setLanguageState} onRecordingsChanged={loadData} />
          )}
        </View>

        {/* Bottom Tab Bar (hidden when inspecting session detail or while tracking) */}
        {!selectedSession && !isTracking && (
          <View style={styles.bottomTabBar}>
            <TouchableOpacity
              style={styles.tabBtn}
              onPress={() => setCurrentTab('record')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={currentTab === 'record' ? 'moon' : 'moon-outline'}
                size={22}
                color={currentTab === 'record' ? COLORS.primaryLight : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  currentTab === 'record' && styles.tabLabelActive,
                ]}
              >
                {t('tabRecord')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabBtn}
              onPress={() => {
                loadData();
                setCurrentTab('history');
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={currentTab === 'history' ? 'stats-chart' : 'stats-chart-outline'}
                size={22}
                color={currentTab === 'history' ? COLORS.primaryLight : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  currentTab === 'history' && styles.tabLabelActive,
                ]}
              >
                {t('tabHistory')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabBtn}
              onPress={() => setCurrentTab('settings')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={currentTab === 'settings' ? 'settings' : 'settings-outline'}
                size={22}
                color={currentTab === 'settings' ? COLORS.primaryLight : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  currentTab === 'settings' && styles.tabLabelActive,
                ]}
              >
                {t('tabSettings')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  sessionCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceHighlight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sessionCountText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 8,
    paddingBottom: 14,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabLabelActive: {
    color: COLORS.primaryLight,
    fontWeight: '700',
  },
});
