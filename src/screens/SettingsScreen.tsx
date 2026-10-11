import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSettings, getSessions, saveSettings, DEFAULT_SETTINGS } from '../services/storage';
import { applyRecordingRetention, recordingUsage, RecordingUsage } from '../services/recordingStorage';
import { requestEnvironmentPermission } from '../services/environment';
import { AppSettings } from '../types/session';
import { COLORS } from '../constants/theme';
import { t, getLanguage, setLanguage, Language } from '../i18n';

interface SettingsScreenProps {
  onLanguageChange?: (lang: Language) => void;
  onRecordingsChanged?: () => void; // Nights were compacted or their audio deleted
}

const formatBytes = (bytes: number) =>
  bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1e6))} MB`;

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onLanguageChange, onRecordingsChanged }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [usage, setUsage] = useState<RecordingUsage | null>(null);
  const [isCompacting, setIsCompacting] = useState(false);

  const refreshUsage = () => getSessions().then(recordingUsage).then(setUsage);

  useEffect(() => {
    getSettings().then(setSettings);
    refreshUsage();
  }, []);

  // Applies changed retention settings right away (e.g. "delete after 30 days")
  const updateRetention = async <K extends 'keepFullNightDays' | 'deleteAudioAfterDays'>(key: K, value: AppSettings[K]) => {
    updateSetting(key, value);
    await saveSettings({ ...settings, [key]: value });
    if (await applyRecordingRetention()) onRecordingsChanged?.();
    refreshUsage();
  };

  // Pollen and weather need the (approximate) location: ask when turned on
  const toggleEnvironment = async (on: boolean) => {
    if (on && !(await requestEnvironmentPermission())) {
      Alert.alert(t('environmentTitle'), t('environmentPermissionDenied'));
      return;
    }
    updateSetting('environmentData', on);
  };

  const compactNow = async () => {
    setIsCompacting(true);
    const count = await applyRecordingRetention(true);
    setIsCompacting(false);
    refreshUsage();
    if (count > 0) onRecordingsChanged?.();
    Alert.alert(t('storageTitle'), count > 0 ? t('compactDone', { count }) : t('compactNothing'));
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);
    if (key === 'language') {
      setLanguage(value as Language);
      onLanguageChange?.(value as Language);
    }
  };

  const delayPresets = [0, 5, 10, 15, 20, 30, 45];
  // No stored choice means the device locale decides
  const activeLanguage = settings.language ?? getLanguage();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={styles.screenTitle}>{t('settingsTitle')}</Text>

      {/* Language Section */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Ionicons name="language-outline" size={20} color={COLORS.cyan} />
          <Text style={styles.cardTitle}>{t('languageSectionTitle')}</Text>
        </View>
        <Text style={styles.cardDesc}>{t('languageSectionDesc')}</Text>

        <View style={styles.chipsRow}>
          <TouchableOpacity
            style={[styles.chip, activeLanguage === 'hu' && styles.chipActive]}
            onPress={() => updateSetting('language', 'hu')}
          >
            <Text style={[styles.chipText, activeLanguage === 'hu' && styles.chipTextActive]}>
              🇭🇺 {t('langHu')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.chip, activeLanguage === 'en' && styles.chipActive]}
            onPress={() => updateSetting('language', 'en')}
          >
            <Text style={[styles.chipText, activeLanguage === 'en' && styles.chipTextActive]}>
              🇬🇧 {t('langEn')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Default delay section */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Ionicons name="timer-outline" size={20} color={COLORS.primaryLight} />
          <Text style={styles.cardTitle}>{t('defaultDelayTitle')}</Text>
        </View>
        <Text style={styles.cardDesc}>{t('defaultDelayDesc')}</Text>

        <View style={styles.chipsRow}>
          {delayPresets.map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.chip,
                settings.startDelayMinutes === m && styles.chipActive,
              ]}
              onPress={() => updateSetting('startDelayMinutes', m)}
            >
              <Text
                style={[
                  styles.chipText,
                  settings.startDelayMinutes === m && styles.chipTextActive,
                ]}
              >
                {m === 0 ? t('immediate') : `${m} ${t('minutesSuffix')}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Snore score goal (streaks) */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Ionicons name="flag-outline" size={20} color={COLORS.quiet} />
          <Text style={styles.cardTitle}>{t('snoreGoalTitle')}</Text>
        </View>
        <Text style={styles.cardDesc}>{t('snoreGoalDesc')}</Text>
        <View style={styles.chipsRow}>
          {[10, 25, 35, 50].map((goal) => (
            <TouchableOpacity
              key={goal}
              style={[styles.chip, (settings.snoreGoal ?? 25) === goal && styles.chipActive]}
              onPress={() => updateSetting('snoreGoal', goal)}
            >
              <Text style={[styles.chipText, (settings.snoreGoal ?? 25) === goal && styles.chipTextActive]}>
                {t('snoreGoalOption', { goal })}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.switchLabel}>{t('keepAwakeTitle')}</Text>
            <Text style={styles.switchDesc}>{t('keepAwakeDesc')}</Text>
          </View>
          <Switch
            value={settings.keepAwake}
            onValueChange={(val) => updateSetting('keepAwake', val)}
            trackColor={{ false: COLORS.surfaceHighlight, true: COLORS.primary }}
          />
        </View>

        <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, marginTop: 12 }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.switchLabel}>{t('stopOnAlarmTitle')}</Text>
            <Text style={styles.switchDesc}>{t('stopOnAlarmDesc')}</Text>
          </View>
          <Switch
            value={settings.stopOnAlarm !== false}
            onValueChange={(val) => updateSetting('stopOnAlarm', val)}
            trackColor={{ false: COLORS.surfaceHighlight, true: COLORS.primary }}
          />
        </View>

        <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, marginTop: 12 }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.switchLabel}>{t('saveClipsTitle')}</Text>
            <Text style={styles.switchDesc}>{t('saveClipsDesc')}</Text>
          </View>
          <Switch
            value={settings.saveAudioClips}
            onValueChange={(val) => updateSetting('saveAudioClips', val)}
            trackColor={{ false: COLORS.surfaceHighlight, true: COLORS.primary }}
          />
        </View>

        <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, marginTop: 12 }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.switchLabel}>{t('keepFullRecordingTitle')}</Text>
            <Text style={styles.switchDesc}>{t('keepFullRecordingDesc')}</Text>
          </View>
          <Switch
            value={settings.saveAudioClips && !!settings.keepFullRecording}
            disabled={!settings.saveAudioClips}
            onValueChange={(val) => updateSetting('keepFullRecording', val)}
            trackColor={{ false: COLORS.surfaceHighlight, true: COLORS.primary }}
          />
        </View>
      </View>

      {/* Pollen and weather */}
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.switchLabel}>{t('environmentTitle')}</Text>
            <Text style={styles.switchDesc}>{t('environmentToggleDesc')}</Text>
          </View>
          <Switch
            value={!!settings.environmentData}
            onValueChange={toggleEnvironment}
            trackColor={{ false: COLORS.surfaceHighlight, true: COLORS.primary }}
          />
        </View>
      </View>

      {/* Recordings and storage */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Ionicons name="folder-open-outline" size={20} color={COLORS.cyan} />
          <Text style={styles.cardTitle}>{t('storageTitle')}</Text>
        </View>
        {usage && (
          <Text style={styles.cardDesc}>
            {t('storageUsage', { nights: usage.nights, size: formatBytes(usage.bytes) })}
            {usage.wholeNights > 0 ? ` (${t('storageWholeNights', { count: usage.wholeNights })})` : ''}
          </Text>
        )}

        <Text style={styles.switchLabel}>{t('keepFullNightTitle')}</Text>
        <Text style={styles.switchDesc}>{t('keepFullNightDesc')}</Text>
        <View style={[styles.chipsRow, { marginBottom: 14 }]}>
          {[1, 3, 7, null].map((days) => (
            <TouchableOpacity
              key={String(days)}
              style={[styles.chip, (settings.keepFullNightDays ?? null) === days && styles.chipActive]}
              onPress={() => updateRetention('keepFullNightDays', days)}
            >
              <Text style={[styles.chipText, (settings.keepFullNightDays ?? null) === days && styles.chipTextActive]}>
                {days === null ? t('keepFullNightAlways') : t('daysOption', { days })}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.switchLabel}>{t('deleteAudioTitle')}</Text>
        <Text style={styles.switchDesc}>{t('deleteAudioDesc')}</Text>
        <View style={[styles.chipsRow, { marginBottom: 14 }]}>
          {[null, 30, 90].map((days) => (
            <TouchableOpacity
              key={String(days)}
              style={[styles.chip, (settings.deleteAudioAfterDays ?? null) === days && styles.chipActive]}
              onPress={() => updateRetention('deleteAudioAfterDays', days)}
            >
              <Text style={[styles.chipText, (settings.deleteAudioAfterDays ?? null) === days && styles.chipTextActive]}>
                {days === null ? t('deleteAudioNever') : t('daysOption', { days })}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {usage && usage.wholeNights > 0 && (
          <TouchableOpacity style={styles.chip} onPress={compactNow} disabled={isCompacting}>
            {isCompacting ? (
              <ActivityIndicator size="small" color={COLORS.primaryLight} />
            ) : (
              <Text style={styles.chipText}>{t('compactNowBtn')}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* About & TestFlight Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('aboutTitle')}</Text>
        <Text style={styles.infoLine}>{t('versionLabel')}: 1.0.0 (Build 1)</Text>
        <Text style={styles.infoLine}>Bundle ID: com.limpetdrone.freesnore</Text>
        <Text style={styles.infoLine}>{t('platformLabel')}: iOS (TestFlight) & Android</Text>
        <Text style={[styles.infoLine, { marginTop: 6, color: COLORS.textMuted }]}>
          {t('aboutDescription')}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  card: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surfaceHighlight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  switchDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  infoLine: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
});
