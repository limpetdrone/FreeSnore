import type { SleepSession } from '../types/session';
import LastNightWidget from './LastNightWidget';
import { buildWidgetData } from './widgetData';

/** Shows the latest night on the iOS home screen widget. */
export async function updateWidgets(sessions: SleepSession[], goal: number): Promise<void> {
  try {
    LastNightWidget.updateSnapshot(buildWidgetData(sessions, goal));
  } catch (e) {
    console.warn('Could not update the widget:', e);
  }
}
