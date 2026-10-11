import type { SleepSession } from '../types/session';

// The iOS widget (LastNightWidget.tsx) is turned off until the App Groups capability is enabled
// for com.limpetdrone.freesnore.ExpoWidgetsTarget in the Apple developer portal (EAS cannot
// enable it through the API). To turn it back on: add the expo-widgets plugin to app.json
// (see git history) and restore the LastNightWidget.updateSnapshot(buildWidgetData(...)) call.
export async function updateWidgets(_sessions: SleepSession[], _goal: number): Promise<void> {}
