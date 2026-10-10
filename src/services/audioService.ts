import {
  AudioModule,
  AudioQuality,
  IOSOutputFormat,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import type { AudioPlayer, AudioRecorder } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { SnoreIntensity, SnoreClip, TimelineSample } from '../types/session';
import { snoreClassifier } from './snoreDetector';

export interface LiveAudioStatus {
  currentDb: number;
  peakDb: number;
  category: SnoreIntensity;
  durationSeconds: number;
  snoringSeconds: number;
}

export interface MonitoringOptions {
  delaySeconds: number; // Fall-asleep delay: microphone starts early, but acoustic classification starts after this delay
  minSnoreDb: number; // Sensitivity: absolute minimum threshold
  maxClips: number;
  saveAudio: boolean;
}

export interface MonitoringResult {
  audioUri: string | null;
  startTime: number; // Actual monitoring start timestamp (epoch ms)
  totalSeconds: number;
  snoreSeconds: number;
  peakDb: number;
  timeline: TimelineSample[];
  clips: SnoreClip[];
}

const FRAME_INTERVAL_MS = 250;

// Mono, 22 kHz, 32 kbps AAC: optimal for snore frequencies (<1.5 kHz), low CPU and storage footprint
const SLEEP_RECORDING_OPTIONS = {
  extension: '.m4a',
  sampleRate: 22050,
  numberOfChannels: 1,
  bitRate: 32000,
  isMeteringEnabled: true,
  directory: 'document' as const,
  ...Platform.select({
    ios: {
      outputFormat: IOSOutputFormat.MPEG4AAC,
      audioQuality: AudioQuality.MEDIUM,
    },
    android: {
      outputFormat: 'mpeg4' as const,
      audioEncoder: 'aac' as const,
    },
    default: {},
  }),
};

export class SleepMonitorService {
  private recorder: AudioRecorder | null = null;
  private player: AudioPlayer | null = null;
  private playerSubscription: { remove: () => void } | null = null;
  private onPlaybackEnd: (() => void) | null = null;
  private frameTimer: ReturnType<typeof setInterval> | null = null;

  private isRunning: boolean = false;
  private options: MonitoringOptions = { delaySeconds: 0, minSnoreDb: 44, maxClips: 15, saveAudio: true };
  private recordingStartTime: number = 0; // Timestamp when audio file recording starts
  private monitorStartTime: number = 0; // Timestamp when snore classification begins (after delay)
  private lastEmitTime: number = 0;
  private currentDb: number = 30;
  private peakDb: number = 30;
  private snoringSeconds: number = 0;

  // Real-time tracking arrays
  private minuteBuckets: { [minute: number]: number[] } = {};
  private detectedClips: SnoreClip[] = [];

  private onStatusCallback: ((status: LiveAudioStatus) => void) | null = null;

  async requestPermissions(): Promise<boolean> {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      return granted;
    } catch (e) {
      console.warn('Audio permission request error:', e);
      return false;
    }
  }

  get running(): boolean {
    return this.isRunning;
  }

  /** Timestamp when actual evaluation begins (epoch ms) */
  getMonitorStartTime(): number {
    return this.monitorStartTime;
  }

  /** Skip start countdown delay: begins evaluation immediately */
  skipDelay() {
    if (this.isRunning && Date.now() < this.monitorStartTime) {
      this.monitorStartTime = Date.now();
    }
  }

  /**
   * Recording starts right away so that iOS background mode can acquire the microphone
   * before the screen turns off. During the delay countdown, acoustic frame processing is skipped.
   */
  async startMonitoring(
    onUpdate: (status: LiveAudioStatus) => void,
    options: MonitoringOptions
  ): Promise<boolean> {
    if (this.isRunning) {
      console.warn('Sleep monitoring is already running');
      return false;
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        allowsBackgroundRecording: true,
        interruptionMode: 'mixWithOthers',
      });

      this.stopPlayback();
      this.options = options;
      this.onStatusCallback = onUpdate;
      this.currentDb = 30;
      this.peakDb = 30;
      this.snoringSeconds = 0;
      this.minuteBuckets = {};
      this.detectedClips = [];

      snoreClassifier.reset();
      snoreClassifier.setMinThreshold(options.minSnoreDb);

      // Instantiate recorder outside component using native class
      // eslint-disable-next-line import/namespace -- Native class exported by expo-audio
      const recorder = new AudioModule.AudioRecorder(SLEEP_RECORDING_OPTIONS);
      this.recorder = recorder;
      await recorder.prepareToRecordAsync();
      recorder.record();

      this.recordingStartTime = Date.now();
      this.monitorStartTime = this.recordingStartTime + options.delaySeconds * 1000;
      this.lastEmitTime = 0;
      this.isRunning = true;

      this.frameTimer = setInterval(() => this.onFrameTick(), FRAME_INTERVAL_MS);
      return true;
    } catch (error) {
      console.error('Failed to start sleep monitoring:', error);
      await this.releaseRecorder(true);
      this.isRunning = false;
      return false;
    }
  }

  private onFrameTick() {
    if (!this.isRunning || !this.recorder) return;
    const now = Date.now();
    if (now < this.monitorStartTime) return;

    let db = 32;
    const metering = this.recorder.getStatus().metering;
    if (typeof metering === 'number' && metering > -160) {
      // Metering is in dBFS (-160 to 0). Calibrate to approximated dBA SPL range (30 - 90 dB)
      db = Math.max(30, Math.min(95, Math.round(metering + 95)));
    }
    this.processAudioFrame(db, now);

    if (this.onStatusCallback && now - this.lastEmitTime >= 1000) {
      this.lastEmitTime = now;
      this.onStatusCallback({
        currentDb: this.currentDb,
        peakDb: this.peakDb,
        category: this.classifyDb(this.currentDb),
        durationSeconds: this.elapsedSeconds(now),
        snoringSeconds: this.snoringSeconds,
      });
    }
  }

  private elapsedSeconds(now: number): number {
    return Math.max(0, Math.floor((now - this.monitorStartTime) / 1000));
  }

  private classifyDb(db: number): SnoreIntensity {
    return snoreClassifier.classifyIntensity(db);
  }

  private processAudioFrame(db: number, now: number) {
    this.currentDb = db;
    if (db > this.peakDb) {
      this.peakDb = db;
    }

    const currentMinute = Math.floor((now - this.monitorStartTime) / 60000);
    if (!this.minuteBuckets[currentMinute]) {
      this.minuteBuckets[currentMinute] = [];
    }
    this.minuteBuckets[currentMinute].push(db);

    // Run acoustic classifier
    const candidate = snoreClassifier.processFrame(db, now);
    if (candidate) {
      // Valid snore event: accumulate snore duration
      const eventSec = Math.max(1, Math.round(candidate.durationMs / 1000));
      this.snoringSeconds += eventSec;

      // Register audio clip reference if within limit
      if (this.options.saveAudio && this.detectedClips.length < this.options.maxClips) {
        this.detectedClips.push({
          id: `clip-${candidate.startTime}`,
          timestamp: new Date(candidate.startTime).toISOString(),
          // Position offset within the continuous night recording file (in seconds)
          offsetSeconds: Math.max(0, (candidate.startTime - this.recordingStartTime) / 1000),
          durationSeconds: eventSec,
          peakDb: candidate.peakDb,
          avgDb: candidate.avgDb,
          category: this.classifyDb(candidate.peakDb),
          audioUri: '',
        });
      }
    }
  }

  private async releaseRecorder(deleteFile: boolean): Promise<string | null> {
    if (this.frameTimer) {
      clearInterval(this.frameTimer);
      this.frameTimer = null;
    }

    let uri: string | null = null;
    const recorder = this.recorder;
    this.recorder = null;
    if (recorder) {
      try {
        if (recorder.isRecording) {
          await recorder.stop();
        }
        uri = recorder.uri;
      } catch (err) {
        console.warn('Error stopping recording:', err);
      }
      recorder.release();
    }

    if (uri && deleteFile) {
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch (e) {
        console.warn('Could not delete recording:', e);
      }
      uri = null;
    }

    try {
      // Reset audio mode for normal playback
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        allowsBackgroundRecording: false,
      });
    } catch (e) {
      console.warn('Could not reset audio mode:', e);
    }
    return uri;
  }

  /** Cancel monitoring without saving data (e.g. user pressed Cancel during countdown) */
  async cancelMonitoring(): Promise<void> {
    this.isRunning = false;
    this.onStatusCallback = null;
    await this.releaseRecorder(true);
  }

  async stopMonitoring(): Promise<MonitoringResult> {
    this.isRunning = false;
    this.onStatusCallback = null;
    const now = Date.now();
    // If stopped during delay, monitoring was active for 0 seconds
    const startTime = Math.min(this.monitorStartTime, now);
    const totalSeconds = Math.max(1, Math.floor((now - startTime) / 1000));

    const keepAudio = this.options.saveAudio && this.detectedClips.length > 0;
    const finalUri = await this.releaseRecorder(!keepAudio);

    // Compile timeline samples
    const timeline: TimelineSample[] = [];
    const minutes = Object.keys(this.minuteBuckets).map(Number).sort((a, b) => a - b);

    for (const m of minutes) {
      const values = this.minuteBuckets[m];
      const avg = values.reduce((acc, v) => acc + v, 0) / (values.length || 1);
      const roundedDb = Math.round(avg);

      const sampleTime = new Date(startTime + m * 60 * 1000);
      const hh = sampleTime.getHours().toString().padStart(2, '0');
      const mm = sampleTime.getMinutes().toString().padStart(2, '0');

      timeline.push({
        offsetMinutes: m,
        timeFormatted: `${hh}:${mm}`,
        db: roundedDb,
        category: this.classifyDb(roundedDb),
      });
    }

    // Assign final audio URI to recorded clips
    const clips = finalUri ? this.detectedClips.map((c) => ({ ...c, audioUri: finalUri })) : [];

    return {
      audioUri: finalUri,
      startTime,
      totalSeconds,
      snoreSeconds: this.snoringSeconds,
      peakDb: this.peakDb,
      timeline,
      clips,
    };
  }

  /**
   * Play a specific snore clip segment from the recorded night audio file:
   * seeks to the clip offset (-1s padding) and stops after clip duration.
   */
  async playClip(
    audioUri: string,
    offsetSeconds: number,
    durationSeconds: number,
    onEnd: () => void
  ): Promise<boolean> {
    try {
      this.stopPlayback();

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });

      const startAt = Math.max(0, offsetSeconds - 1);
      const endAt = offsetSeconds + durationSeconds + 1;

      const player = createAudioPlayer(audioUri, { updateInterval: 200 });
      this.player = player;
      this.onPlaybackEnd = onEnd;

      // Seeking is reliable only once loaded
      let started = false;
      const startPlayback = async () => {
        if (started || this.player !== player) return;
        started = true;
        try {
          await player.seekTo(startAt);
          player.play();
        } catch (e) {
          console.error('Failed to seek audio clip:', e);
          this.stopPlayback();
        }
      };

      this.playerSubscription = player.addListener('playbackStatusUpdate', (status) => {
        if (this.player !== player) return;
        if (!started) {
          if (status.isLoaded) startPlayback();
          return;
        }
        if (status.didJustFinish || (status.playing && status.currentTime >= endAt)) {
          this.stopPlayback();
        }
      });

      if (player.isLoaded) startPlayback();
      return true;
    } catch (err) {
      console.error('Failed to play audio clip:', err);
      this.stopPlayback();
      return false;
    }
  }

  stopPlayback(): void {
    const player = this.player;
    const onEnd = this.onPlaybackEnd;
    this.player = null;
    this.onPlaybackEnd = null;
    this.playerSubscription?.remove();
    this.playerSubscription = null;
    if (player) {
      try {
        player.pause();
        player.remove();
      } catch {
        // ignore
      }
    }
    onEnd?.();
  }
}

export const sleepMonitor = new SleepMonitorService();
