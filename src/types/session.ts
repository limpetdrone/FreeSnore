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
  db: number;
  category: SnoreIntensity;
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
  factors: string[]; // e.g., ["Hanyatt alvás", "Alkohol", "Orrdugulás"]
  notes?: string;
}

export interface AppSettings {
  startDelayMinutes: number; // Default start delay (e.g. 15 mins)
  sensitivity: 'low' | 'medium' | 'high';
  keepAwake: boolean;
  saveAudioClips: boolean;
  maxClipsPerSession: number;
}
