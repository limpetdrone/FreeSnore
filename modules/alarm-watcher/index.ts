import { NativeModule, requireOptionalNativeModule } from 'expo-modules-core';

type AlarmWatcherEvents = {
  onAlarmStarted(event: { timestamp: number }): void;
};

declare class AlarmWatcherModule extends NativeModule<AlarmWatcherEvents> {
  isSupported(): boolean;
}

// Android only; null on iOS, in Expo Go and in tests
const AlarmWatcher = requireOptionalNativeModule<AlarmWatcherModule>('AlarmWatcher');

/**
 * Calls `onAlarm` when another app (e.g. the clock) starts ringing an alarm.
 * Returns an unsubscribe function, or null where alarm detection is not available.
 */
export function watchAlarms(onAlarm: (timestamp: number) => void): (() => void) | null {
  if (!AlarmWatcher?.isSupported()) return null;
  const subscription = AlarmWatcher.addListener('onAlarmStarted', (e) => onAlarm(e.timestamp));
  return () => subscription.remove();
}
