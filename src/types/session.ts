export type SnoreIntensity = 'quiet' | 'light' | 'loud' | 'epic';

export interface SnoreClip {
  id: string;
  timestamp: string; // ISO string
  offsetSeconds: number; // Position of the clip inside the night's audio file (seconds)
  durationSeconds: number;
  peakDb: number;
  avgDb: number;
  category: SnoreIntensity;
  audioUri: string; // File URI for replay
}

export interface TimelineSample {
  offsetMinutes: number; // minute index from session start
  timeFormatted: string; // e.g. "01:45"
  db: number; // Average room loudness in this minute
  category: SnoreIntensity; // Snore intensity of this minute ('quiet' = no snoring)
  // Detector results (missing on sessions recorded before snore-based timelines)
  snoreSeconds?: number;
  snoreDb?: number; // Average peak loudness of the snores in this minute
  audioOffsetSeconds?: number; // Position of the loudest snore of this minute in the night's audio file
}

export interface SleepSession {
  id: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  delayMinutes: number; // Configured start delay
  totalDurationSeconds: number; // In seconds
  snoreDurationSeconds: number; // Seconds spent snoring
  snoreScore: number; // SnoreLab-like composite score (0 - 150+)
  quietPercent: number; // Percentage of quiet sleep
  lightPercent: number; // Percentage of light snoring
  loudPercent: number; // Percentage of loud snoring
  epicPercent: number; // Percentage of epic snoring
  peakDb: number;
  timeline: TimelineSample[];
  clips: SnoreClip[];
  audioUri?: string; // Whole-night recording (kept when snoring was detected)
  factors: string[]; // i18n keys, e.g. ['factorBackSleep', 'remedyNasalStrips'] (legacy sessions: plain text)
  notes?: string;
}

export interface AppSettings {
  startDelayMinutes: number; // Default start delay (e.g. 15 mins)
  sensitivity: 'low' | 'medium' | 'high';
  keepAwake: boolean;
  saveAudioClips: boolean;
  maxClipsPerSession: number;
  stopOnAlarm?: boolean; // End and save the night when the phone's alarm rings
  keepFullRecording?: boolean; // Keep the night's audio even without detected snoring (for testing)
  language?: 'hu' | 'en'; // Unset: follow the device locale
}
