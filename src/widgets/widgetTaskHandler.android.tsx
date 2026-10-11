import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { getSessions, getSettings } from '../services/storage';
import { LastNightAndroidWidget } from './LastNightAndroidWidget';
import { buildWidgetData } from './widgetData';
import { storedWidgetData } from './widgetStorage';

/** Renders the widget when Android asks for it (added, resized, periodic update). */
export async function widgetTaskHandler({ widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') return;
  const settings = await getSettings();
  const data = (await storedWidgetData()) ?? buildWidgetData(await getSessions(), settings.snoreGoal ?? 25);
  renderWidget(<LastNightAndroidWidget data={data} />);
}
