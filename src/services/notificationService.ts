import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const NOTIFICATION_ID = 'freesnore-active-tracking';
const CHANNEL_ID = 'freesnore-tracking';

// Értesítés viselkedése: csendes megjelenítés (ne csipogjon alvás közben!)
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
        importance: Notifications.AndroidImportance.LOW, // Csendes, állandó jellegű
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        vibrationPattern: null,
        sound: undefined,
        enableLights: false,
        enableVibrate: false,
      });
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Failed to init notifications:', error);
    return false;
  }
}

/**
 * Megjeleníti a folyamatban lévő figyelés értesítését
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
      trigger: null, // Azonnali megjelenítés
    });
  } catch (error) {
    console.warn('Could not display tracking notification:', error);
  }
}

/**
 * Eltávolítja az értesítést a megfigyelés befejezésekor
 */
export async function dismissTrackingNotification(): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
  } catch (error) {
    // ignore
  }
}
