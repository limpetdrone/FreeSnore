import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSettings, saveSettings, DEFAULT_SETTINGS } from '../services/storage';
import { AppSettings } from '../types/session';
import { COLORS } from '../constants/theme';

export const SettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);
  };

  const delayPresets = [0, 5, 10, 15, 20, 30];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={styles.screenTitle}>Beállítások</Text>

      {/* Default delay section */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Ionicons name="timer-outline" size={20} color={COLORS.primaryLight} />
          <Text style={styles.cardTitle}>Alapértelmezett Elalvási Késleltetés</Text>
        </View>
        <Text style={styles.cardDesc}>
          A felvétel indítását követő várakozási idő az elalvás megkönnyítésére.
        </Text>

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
                {m === 0 ? 'Azonnal' : `${m} perc`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sensitivity section */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Ionicons name="disc-outline" size={20} color={COLORS.cyan} />
          <Text style={styles.cardTitle}>Mikrofon Érzékenység</Text>
        </View>
        <Text style={styles.cardDesc}>
          Állítsd be, hogy milyen küszöbérték felett minősüljön a hang horkolásnak.
        </Text>

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
                {sens === 'low' ? 'Alacsony (52+ dB)' : sens === 'medium' ? 'Közepes (44+ dB)' : 'Magas (38+ dB)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Toggles */}
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.switchLabel}>Képernyő ébrentartása (Keep Awake)</Text>
            <Text style={styles.switchDesc}>
              Megakadályozza a telefon lezárását a felvétel alatt.
            </Text>
          </View>
          <Switch
            value={settings.keepAwake}
            onValueChange={(val) => updateSetting('keepAwake', val)}
            trackColor={{ false: COLORS.surfaceHighlight, true: COLORS.primary }}
          />
        </View>

        <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, marginTop: 12 }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.switchLabel}>Horkolási hangminták mentése</Text>
            <Text style={styles.switchDesc}>
              Hangminták visszahallgatása a reggeli kiértékelésben.
            </Text>
          </View>
          <Switch
            value={settings.saveAudioClips}
            onValueChange={(val) => updateSetting('saveAudioClips', val)}
            trackColor={{ false: COLORS.surfaceHighlight, true: COLORS.primary }}
          />
        </View>
      </View>

      {/* About & TestFlight Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>TestFlight & Alkalmazás Infó</Text>
        <Text style={styles.infoLine}>Verzió: 1.0.0 (Build 1)</Text>
        <Text style={styles.infoLine}>Bundle ID: com.limpetdrone.freesnore</Text>
        <Text style={styles.infoLine}>Platform: iOS (TestFlight) & Android</Text>
        <Text style={[styles.infoLine, { marginTop: 6, color: COLORS.textMuted }]}>
          A FreeSnore a SnoreLabhez hasonló fejlett akusztikai kiértékelést nyújt nyílt, ingyenes formában.
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
