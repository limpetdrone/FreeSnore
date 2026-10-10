import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSettings, saveSettings, DEFAULT_SETTINGS } from '../services/storage';
import { AppSettings } from '../types/session';
import { COLORS } from '../constants/theme';
import { t, getLanguage, setLanguage, Language } from '../i18n';

interface SettingsScreenProps {
  onLanguageChange?: (lang: Language) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onLanguageChange }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

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

      {/* Sensitivity section */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Ionicons name="disc-outline" size={20} color={COLORS.accent} />
          <Text style={styles.cardTitle}>{t('sensitivityTitle')}</Text>
        </View>
        <Text style={styles.cardDesc}>{t('sensitivityDesc')}</Text>

        <View style={styles.chipsRow}>
          {(['low', 'medium', 'high'] as const).map((sens) => (
            <TouchableOpacity
              key={sens}
              style={[
                styles.chip,
                settings.sensitivity === sens && styles.chipActive,
              ]}
              onPress={() => updateSetting('sensitivity', sens)}
            >
              <Text
                style={[
                  styles.chipText,
                  settings.sensitivity === sens && styles.chipTextActive,
                ]}
              >
                {sens === 'low' ? t('sensLow') : sens === 'medium' ? t('sensMed') : t('sensHigh')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Toggles */}
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
