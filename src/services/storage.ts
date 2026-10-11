import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { SleepSession, AppSettings } from '../types/session';
import { createMockSessions } from './mockData';
import { resolveAppFileUri } from './appFiles';

const SESSIONS_STORAGE_KEY = '@freesnore_sessions_v1';
const SETTINGS_STORAGE_KEY = '@freesnore_settings_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  startDelayMinutes: 15,
  sensitivity: 'medium',
  // Android pauses JS timers (and so the analysis) while the screen is off; iOS keeps them running
  keepAwake: Platform.OS === 'android',
  saveAudioClips: true,
  maxClipsPerSession: 15,
  keepFullRecording: false,
  stopOnAlarm: true,
  snoreGoal: 25,
  keepFullNightDays: 3,
  deleteAudioAfterDays: null,
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

// Every write reads the whole list and writes it back: writes run one after the other, or a
// slower one would bring back a night as it was before a faster one changed it
let writeQueue: Promise<unknown> = Promise.resolve();
function serialized<T>(write: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(write, write);
  writeQueue = run.catch(() => {});
  return run;
}

export function saveSession(session: SleepSession): Promise<void> {
  return serialized(async () => {
    try {
      const existing = await getSessions();
      const updated = [session, ...existing.filter((s) => s.id !== session.id)];
      await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save session:', error);
      throw error;
    }
  });
}

/**
 * Changes one saved night in place. `change` gets the night as currently stored (not an older
 * copy the caller may hold), so concurrent changes to different fields all survive.
 * Returns the updated night, or null if it no longer exists.
 */
export function patchSession(
  id: string,
  change: (current: SleepSession) => SleepSession
): Promise<SleepSession | null> {
  return serialized(async () => {
    const existing = await getSessions();
    const current = existing.find((s) => s.id === id);
    if (!current) return null;
    const updated = change(current);
    await AsyncStorage.setItem(
      SESSIONS_STORAGE_KEY,
      JSON.stringify(existing.map((s) => (s.id === id ? updated : s)))
    );
    return updated;
  });
}

export function deleteSession(sessionId: string): Promise<void> {
  return serialized(() => deleteSessionNow(sessionId));
}

async function deleteSessionNow(sessionId: string): Promise<void> {
  try {
    const existing = await getSessions();
    const sessionToDelete = existing.find((s) => s.id === sessionId);

    // Clean up the night's recording (clips point into the same file)
    const audioUris = new Set(
      [sessionToDelete?.audioUri, ...(sessionToDelete?.clips || []).map((c) => c.audioUri)].filter(
        (uri): uri is string => !!uri && uri.startsWith('file://')
      )
    );
    for (const uri of audioUris) {
      try {
        await FileSystem.deleteAsync(resolveAppFileUri(uri), { idempotent: true });
      } catch (e) {
        console.warn('Could not delete audio file:', uri, e);
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
