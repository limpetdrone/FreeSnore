import type { SleepSession } from '../types/session';

// Platforms without home screen widgets; see updateWidgets.ios.ts / .android.ts
export async function updateWidgets(_sessions: SleepSession[], _goal: number): Promise<void> {}
