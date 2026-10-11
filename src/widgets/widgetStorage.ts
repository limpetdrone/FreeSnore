import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetData } from './widgetData';

export const WIDGET_NAME = 'LastNight'; // Android widget name (app.json plugin config)
const WIDGET_DATA_KEY = '@freesnore_widget_v1';

export async function saveWidgetData(data: WidgetData): Promise<void> {
  await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
}

/** Widget data saved for the Android task handler, which renders without the app running. */
export async function storedWidgetData(): Promise<WidgetData | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
