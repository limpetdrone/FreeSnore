import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const NOTIFICATION_ID = 'freesnore-active-tracking';
const CHANNEL_ID = 'freesnore-tracking';
const SAVED_NOTIFICATION_ID = 'freesnore-session-saved';
const NUDGE_CHANNEL_ID = 'freesnore-nudge';
const NUDGE_NOTIFICATION_ID = 'freesnore-snore-nudge';

// Silent behavior during sleep (do not beep or vibrate when tracking starts)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function initNotifications(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Alvás és horkolás figyelése',
        importance: Notifications.AndroidImportance.LOW, // Quiet, persistent banner
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        vibrationPattern: null,
        sound: undefined,
        enableLights: false,
        enableVibrate: false,
      });
      // Labs snore nudge: a short vibration (forwarded to a paired watch)
      await Notifications.setNotificationChannelAsync(NUDGE_CHANNEL_ID, {
        name: 'Horkolás-jelzés (Labs)',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 150, 250],
        enableVibrate: true,
        sound: null,
      });
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Failed to init notifications:', error);
    return false;
  }
}

/**
 * Display active tracking banner on lock screen and notification shade
 */
export async function showTrackingNotification(
  elapsedText: string = '0 perc',
  modeText: string = 'Alvás és horkolás figyelése folyamatban...'
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_ID,
      content: {
        title: '🌙 FreeSnore Figyelés Aktív',
        body: `${modeText} (${elapsedText})`,
        sticky: true,
        autoDismiss: false,
        sound: false,
        priority: Notifications.AndroidNotificationPriority.LOW,
      },
      trigger: null, // Instant presentation
    });
  } catch (error) {
    console.warn('Could not display tracking notification:', error);
  }
}

/**
 * One-off notice that the night was ended and saved without the user (e.g. by the alarm)
 */
export async function showSessionSavedNotification(title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: SAVED_NOTIFICATION_ID,
      content: { title, body, sound: false },
      trigger: null,
    });
  } catch (error) {
    console.warn('Could not display session saved notification:', error);
  }
}

/**
 * Labs: a nudge to turn over. Silent on the phone; with the iPhone locked it is mirrored to a
 * worn Apple Watch as a wrist tap. Time-sensitive, so the Sleep focus lets it through.
 */
export async function showSnoreNudge(title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: NUDGE_NOTIFICATION_ID,
      content: { title, body, sound: false, interruptionLevel: 'timeSensitive' },
      trigger: Platform.OS === 'android' ? { channelId: NUDGE_CHANNEL_ID } : null,
    });
  } catch (error) {
    console.warn('Could not show the snore nudge:', error);
  }
}

/**
 * Dismiss tracking notification when session finishes or cancels
 */
export async function dismissTrackingNotification(): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
  } catch {
    // Ignore dismissal errors
  }
}
