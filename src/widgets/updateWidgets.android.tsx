import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import type { SleepSession } from '../types/session';
import { LastNightAndroidWidget } from './LastNightAndroidWidget';
import { buildWidgetData } from './widgetData';
import { saveWidgetData, WIDGET_NAME } from './widgetStorage';

/** Shows the latest night on the Android home screen widget. */
export async function updateWidgets(sessions: SleepSession[], goal: number): Promise<void> {
  try {
    const data = buildWidgetData(sessions, goal);
    await saveWidgetData(data);
    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: () => <LastNightAndroidWidget data={data} />,
    });
  } catch (e) {
    console.warn('Could not update the widget:', e);
  }
}
