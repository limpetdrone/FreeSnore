import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { SnoreIntensity, SnoreClip, TimelineSample } from '../types/session';
import { snoreClassifier } from './snoreDetector';

export interface LiveAudioStatus {
  currentDb: number;
  peakDb: number;
  category: SnoreIntensity;
  durationSeconds: number;
  snoringSeconds: number;
}

export class SleepMonitorService {
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private intervalTimer: any = null;

  private isRunning: boolean = false;
  private sessionStartTime: number = 0;
  private currentDb: number = 32;
  private peakDb: number = 32;
  private snoringSeconds: number = 0;
  private totalSeconds: number = 0;

  // Real-time tracking arrays
  private minuteBuckets: { [minute: number]: number[] } = {};
  private detectedClips: SnoreClip[] = [];
  private currentSnoreStreak: number = 0;
  private streakPeakDb: number = 0;

  private onStatusCallback: ((status: LiveAudioStatus) => void) | null = null;

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (e) {
      console.warn('Audio permission request error:', e);
      return false;
    }
  }

  async startMonitoring(onUpdate: (status: LiveAudioStatus) => void): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      this.onStatusCallback = onUpdate;
      this.isRunning = true;
      this.sessionStartTime = Date.now();
      this.currentDb = 30;
      this.peakDb = 30;
      this.snoringSeconds = 0;
      this.totalSeconds = 0;
      this.minuteBuckets = {};
      this.detectedClips = [];
      this.currentSnoreStreak = 0;

    snoreClassifier.reset();

    const SLEEP_RECORDING_OPTIONS: Audio.RecordingOptions = {
      isMeteringEnabled: true,
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 22050,
        numberOfChannels: 1, // Mono: 50% kevesebb CPU és tárhely
        bitRate: 32000,      // 32kbps AAC tökéletes horkoláshoz
      },
      ios: {
        extension: '.m4a',
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        audioQuality: Audio.IOSAudioQuality.MEDIUM,
        sampleRate: 22050,
        numberOfChannels: 1, // Mono
        bitRate: 32000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 32000,
      },
    };

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(SLEEP_RECORDING_OPTIONS);

    recording.setProgressUpdateInterval(250);
    recording.setOnRecordingStatusUpdate((status) => {
      if (!status.isRecording) return;

      let db = 32;
      if (typeof status.metering === 'number' && status.metering > -160) {
        // Metering is in dBFS (-160 to 0). Calibrate to dBA SPL range (approx 30 - 90 dB)
        db = Math.max(30, Math.min(95, Math.round(status.metering + 95)));
      }

      this.processAudioFrame(db);
    });

    await recording.startAsync();
    this.recording = recording;

    // 1-second cadence timer for clock & streak aggregation
    this.intervalTimer = setInterval(() => {
      if (!this.isRunning) return;
      this.totalSeconds += 1;

      if (this.onStatusCallback) {
        this.onStatusCallback({
          currentDb: this.currentDb,
          peakDb: this.peakDb,
          category: this.classifyDb(this.currentDb),
          durationSeconds: this.totalSeconds,
          snoringSeconds: this.snoringSeconds,
        });
      }
    }, 1000);

    return true;
  } catch (error) {
    console.error('Failed to start sleep monitoring:', error);
    this.isRunning = false;
    return false;
  }
}

private classifyDb(db: number): SnoreIntensity {
  return snoreClassifier.classifyIntensity(db);
}

private processAudioFrame(db: number) {
  this.currentDb = db;
  if (db > this.peakDb) {
    this.peakDb = db;
  }

  const currentMinute = Math.floor(this.totalSeconds / 60);
  if (!this.minuteBuckets[currentMinute]) {
    this.minuteBuckets[currentMinute] = [];
  }
  this.minuteBuckets[currentMinute].push(db);

  // Intelligens akusztikai osztályozó futtatása
  const candidate = snoreClassifier.processFrame(db, Date.now());
  if (candidate) {
    // Érvényes horkolási esemény: hozzáadjuk a horkolási másodpercekhez
    const eventSec = Math.max(1, Math.round(candidate.durationMs / 1000));
    this.snoringSeconds += eventSec;

    // Ha még nem értük el a maximális klip számot, rögzítjük az eseményt
    if (this.detectedClips.length < 25) {
      const cat = this.classifyDb(candidate.peakDb);
      const clip: SnoreClip = {
        id: `clip-${Date.now()}`,
        timestamp: new Date(candidate.startTime).toISOString(),
        offsetSeconds: Math.max(0, this.totalSeconds - eventSec),
        durationSeconds: eventSec,
        peakDb: candidate.peakDb,
        avgDb: candidate.avgDb,
        category: cat,
        audioUri: this.recording?.getURI() || '',
      };
      this.detectedClips.push(clip);
    }
  }
}

  async stopMonitoring(): Promise<{
    audioUri: string | null;
    totalSeconds: number;
    snoreSeconds: number;
    peakDb: number;
    timeline: TimelineSample[];
    clips: SnoreClip[];
  }> {
    this.isRunning = false;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }

    let finalUri: string | null = null;
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
        const uri = this.recording.getURI();
        if (uri) {
          // Copy to persistent document directory
          const filename = `session_${Date.now()}.m4a`;
          const persistentUri = `${FileSystem.documentDirectory}${filename}`;
          await FileSystem.copyAsync({ from: uri, to: persistentUri });
          finalUri = persistentUri;
        }
      } catch (err) {
        console.warn('Error unloading recording:', err);
      }
      this.recording = null;
    }

    // Reset audio mode for normal app playback
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    // Compile timeline samples
    const timeline: TimelineSample[] = [];
    const minutes = Object.keys(this.minuteBuckets).map(Number).sort((a, b) => a - b);

    const startDate = new Date(this.sessionStartTime);

    for (const m of minutes) {
      const values = this.minuteBuckets[m];
      const avg = values.reduce((acc, v) => acc + v, 0) / (values.length || 1);
      const roundedDb = Math.round(avg);
      const cat = this.classifyDb(roundedDb);

      const sampleTime = new Date(startDate.getTime() + m * 60 * 1000);
      const hh = sampleTime.getHours().toString().padStart(2, '0');
      const mm = sampleTime.getMinutes().toString().padStart(2, '0');

      timeline.push({
        offsetMinutes: m,
        timeFormatted: `${hh}:${mm}`,
        db: roundedDb,
        category: cat,
      });
    }

    // Assign final audio URI to recorded clips
    const finalizedClips = this.detectedClips.map((c) => ({
      ...c,
      audioUri: finalUri || c.audioUri,
    }));

    return {
      audioUri: finalUri,
      totalSeconds: Math.max(1, this.totalSeconds),
      snoreSeconds: this.snoringSeconds,
      peakDb: this.peakDb,
      timeline,
      clips: finalizedClips,
    };
  }

  // Audio playback for snore clips
  async playClip(audioUri: string, onPlaybackStatusUpdate?: (status: any) => void): Promise<Audio.Sound | null> {
    try {
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      this.sound = sound;
      return sound;
    } catch (err) {
      console.error('Failed to play audio clip:', err);
      return null;
    }
  }

  async stopPlayback(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch (e) {
        // ignore
      }
      this.sound = null;
    }
  }
}

export const sleepMonitor = new SleepMonitorService();
