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
  snoreCount?: number; // Number of snores in this minute (missing on older sessions)
  audioOffsetSeconds?: number; // Position of the loudest snore of this minute in the night's audio file
}

/** Outdoor conditions of the night (Open-Meteo), when the user turned the feature on */
export interface NightEnvironment {
  pollen: Partial<Record<'alder' | 'birch' | 'grass' | 'mugwort' | 'ragweed', number>>; // Peak grains/m³
  humidity?: number; // Average outdoor relative humidity, %
  temperature?: number; // Average outdoor temperature, °C
  pressure?: number; // Average sea-level air pressure, hPa
  pm10?: number; // Average particulate matter, µg/m³
  pm25?: number;
}

export interface SleepSession {
  id: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  delayMinutes: number; // Configured start delay
  totalDurationSeconds: number; // In seconds
  snoreDurationSeconds: number; // Minutes with snoring, in seconds (older sessions: sum of snore sounds; use snoringTimeSeconds())
  snoreScore: number; // Composite snore score (0 - 150+)
  quietPercent: number; // Percentage of quiet sleep
  lightPercent: number; // Percentage of light snoring
  loudPercent: number; // Percentage of loud snoring
  epicPercent: number; // Percentage of epic snoring
  peakDb: number;
  timeline: TimelineSample[];
  clips: SnoreClip[];
  audioUri?: string; // Night recording (kept when snoring was detected)
  audioCompacted?: boolean; // The recording holds only the snoring parts (offsets point into it)
  audioRemoved?: boolean; // The recording was deleted by the retention setting; statistics remain
  factors: string[]; // i18n keys, e.g. ['factorBackSleep', 'remedyNasalStrips'] (legacy sessions: plain text)
  notes?: string;
  environment?: NightEnvironment;
}

export interface AppSettings {
  startDelayMinutes: number; // Default start delay (e.g. 15 mins)
  sensitivity: 'low' | 'medium' | 'high'; // No longer used: the detection threshold is fixed
  keepAwake: boolean;
  saveAudioClips: boolean;
  maxClipsPerSession: number;
  stopOnAlarm?: boolean; // End and save the night when the phone's alarm rings
  keepFullRecording?: boolean; // Keep the night's audio even without detected snoring (for testing)
  keepFullNightDays?: number | null; // Keep the whole night this many days, then only the snoring parts (null: always whole)
  deleteAudioAfterDays?: number | null; // Delete recordings after this many days, keeping the statistics (null: never)
  language?: 'hu' | 'en'; // Unset: follow the device locale
  snoreGoal?: number; // A night meets the goal at or below this score (streaks)
  environmentData?: boolean; // Fetch pollen and outdoor humidity for each night (needs location)
}
