import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { SleepSession, AppSettings } from '../types/session';
import { createMockSessions } from './mockData';

const SESSIONS_STORAGE_KEY = '@freesnore_sessions_v1';
const SETTINGS_STORAGE_KEY = '@freesnore_settings_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  startDelayMinutes: 15,
  sensitivity: 'medium',
  keepAwake: true,
  saveAudioClips: true,
  maxClipsPerSession: 15,
  language: 'hu',
  antiSnoreNudge: false,
  nudgeThresholdDb: 56,
};

export async function getSessions(): Promise<SleepSession[]> {
  try {
    const raw = await AsyncStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) {
      // In development builds, seed with realistic mock data for charts & trends inspection.
      // In production, start empty so real nights are not polluted.
      if (!__DEV__) return [];
      const initial = createMockSessions();
      await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to load sessions from storage:', error);
    return [];
  }
}

export async function saveSession(session: SleepSession): Promise<void> {
  try {
    const existing = await getSessions();
    const updated = [session, ...existing.filter((s) => s.id !== session.id)];
    await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save session:', error);
    throw error;
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  try {
    const existing = await getSessions();
    const sessionToDelete = existing.find((s) => s.id === sessionId);

    // Clean up audio files if they were recorded
    if (sessionToDelete?.clips) {
      for (const clip of sessionToDelete.clips) {
        if (clip.audioUri && clip.audioUri.startsWith('file://')) {
          try {
            await FileSystem.deleteAsync(clip.audioUri, { idempotent: true });
          } catch (e) {
            console.warn('Could not delete audio file:', clip.audioUri, e);
          }
        }
      }
    }

    const updated = existing.filter((s) => s.id !== sessionId);
    await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to delete session:', error);
    throw error;
  }
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}
