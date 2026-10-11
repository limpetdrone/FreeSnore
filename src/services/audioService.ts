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
import { SnoreEventCandidate, snoreClassifier } from './snoreDetector';
import { MinuteBucket, PauseInterval, audioFileOffsetSeconds, buildTimeline, emptyBucket } from './timeline';
import { resolveAppFileUri } from './appFiles';

export interface LiveAudioStatus {
  currentDb: number;
  peakDb: number;
  category: SnoreIntensity;
  durationSeconds: number;
  snoringSeconds: number;
  paused: boolean;
  pauseRemainingSeconds: number | null; // Until the pause ends on its own
}

export interface MonitoringOptions {
  delaySeconds: number; // Fall-asleep delay: microphone starts early, but acoustic classification starts after this delay
  minSnoreDb: number; // Sensitivity: absolute minimum threshold
  maxClips: number;
  saveAudio: boolean;
  keepFullRecording?: boolean; // Keep the audio file even if no snoring was detected
  // Another app took the microphone (iOS: alarm, call, Siri). `atMs` is when audio last came in.
  onInterrupted?: (atMs: number) => void;
  resumeAfterInterruption?: boolean; // Otherwise the caller is expected to stop the session
}

export interface MonitoringResult {
  audioUri: string | null;
  startTime: number; // Actual monitoring start timestamp (epoch ms)
  endTime: number; // End of monitoring (epoch ms); the interruption time if the recorder was interrupted
  totalSeconds: number;
  snoreSeconds: number;
  peakDb: number;
  timeline: TimelineSample[];
  clips: SnoreClip[];
}

const FRAME_INTERVAL_MS = 250;

// A pause (awake at night) ends on its own: a forgotten pause must not lose the rest of the night
export const PAUSE_MAX_MS = 15 * 60 * 1000;

// An alarm or call this early (e.g. during the fall-asleep delay) is not the morning:
// keep the night going instead of saving a few minutes as a finished night
export const AUTO_STOP_MIN_MONITORING_MS = 30 * 60 * 1000;

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
  private options: MonitoringOptions = {
    delaySeconds: 0,
    minSnoreDb: 44,
    maxClips: 15,
    saveAudio: true,
  };
  private recordingStartTime: number = 0; // Timestamp when audio file recording starts
  private lastRecordingSeenAt: number = 0; // Last tick at which the recorder was still recording
  private interruptedAt: number | null = null;
  private lastResumeAttempt: number = 0;
  private pauses: PauseInterval[] = []; // Gaps in the audio file (interruptions)
  private pausedAt: number | null = null; // The user paused monitoring (e.g. awake at night)
  private pauseEndsAt: number | null = null;
  private userPausedMs: number = 0; // Finished user pauses: not counted as sleep
  private monitorStartTime: number = 0; // Timestamp when snore classification begins (after delay)
  private lastEmitTime: number = 0;
  private currentDb: number = 30;
  private peakDb: number = 30;
  private snoringSeconds: number = 0;
  private snoringMs: number = 0;

  // Real-time tracking arrays
  // Running sums per minute instead of every frame (~115k values per night)
  private minuteBuckets: { [minute: number]: MinuteBucket } = {};
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
      this.snoringMs = 0;
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
      this.lastRecordingSeenAt = this.recordingStartTime;
      this.interruptedAt = null;
      this.pauses = [];
      this.pausedAt = null;
      this.pauseEndsAt = null;
      this.userPausedMs = 0;
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
    if (this.pausedAt !== null) {
      if (this.pauseEndsAt !== null && now >= this.pauseEndsAt) {
        this.resumeMonitoring();
      } else {
        this.emitStatus(now);
        return;
      }
    }
    if (!this.checkRecorderRunning(now)) return;
    if (now < this.monitorStartTime) return;

    let db = 32;
    const metering = this.recorder.getStatus().metering;
    if (typeof metering === 'number' && metering > -160) {
      // Metering is in dBFS (-160 to 0). Calibrate to approximated dBA SPL range (30 - 90 dB)
      db = Math.max(30, Math.min(95, Math.round(metering + 95)));
    }
    this.processAudioFrame(db, now);
    this.emitStatus(now);
  }

  private emitStatus(now: number) {
    if (!this.onStatusCallback || now - this.lastEmitTime < 1000) return;
    this.lastEmitTime = now;
    this.onStatusCallback({
      currentDb: this.currentDb,
      peakDb: this.peakDb,
      category: this.classifyDb(this.currentDb),
      durationSeconds: this.elapsedSeconds(now),
      snoringSeconds: this.snoringSeconds,
      paused: this.pausedAt !== null,
      pauseRemainingSeconds:
        this.pauseEndsAt !== null ? Math.max(0, Math.ceil((this.pauseEndsAt - now) / 1000)) : null,
    });
  }

  get paused(): boolean {
    return this.pausedAt !== null;
  }

  /**
   * Pauses the analysis, e.g. while the user is awake at night, for at most PAUSE_MAX_MS.
   * The recorder keeps running: on iOS a stopped recorder lets the app be suspended in the
   * background, and nothing could then resume the night. The paused time has no timeline
   * data and does not count as sleep.
   */
  pauseMonitoring(): boolean {
    const now = Date.now();
    // Only after the fall-asleep delay: before it nothing is analysed anyway
    if (!this.isRunning || this.pausedAt !== null || now < this.monitorStartTime) return false;
    this.pausedAt = now;
    this.pauseEndsAt = now + PAUSE_MAX_MS;
    this.lastEmitTime = 0;
    this.emitStatus(now);
    return true;
  }

  resumeMonitoring(): boolean {
    if (!this.isRunning || this.pausedAt === null) return false;
    const now = Date.now();
    // A late tick (app in the background) does not stretch the pause beyond its limit
    this.userPausedMs += Math.min(now - this.pausedAt, PAUSE_MAX_MS);
    this.pausedAt = null;
    this.pauseEndsAt = null;
    // Breaths before the pause are no rhythm reference for the ones after it
    snoreClassifier.reset();
    this.lastEmitTime = 0;
    this.emitStatus(now);
    return true;
  }

  /** The night so far, for viewing the timeline while monitoring (no replay: the file is open). */
  getLiveTimeline(): TimelineSample[] {
    if (!this.isRunning || Date.now() < this.monitorStartTime) return [];
    return buildTimeline(this.minuteBuckets, this.monitorStartTime, false);
  }

  /**
   * iOS stops our recorder when another app takes the audio session (Clock alarm, call, Siri)
   * and expo-audio does not report it; the native `isRecording` flag does show it.
   * Frames are skipped meanwhile, so no fake quiet minutes are recorded.
   */
  private checkRecorderRunning(now: number): boolean {
    const recorder = this.recorder;
    if (!recorder) return false;

    if (recorder.isRecording) {
      if (this.interruptedAt !== null) {
        this.pauses.push({ start: this.interruptedAt, end: now });
        this.interruptedAt = null;
      }
      this.lastRecordingSeenAt = now;
      return true;
    }

    const firstTick = this.interruptedAt === null;
    // The app may have been suspended right after the interruption: the last tick that
    // still saw the recorder running is the best estimate of when it happened
    const interruptedAt = (this.interruptedAt ??= Math.min(now, this.lastRecordingSeenAt + FRAME_INTERVAL_MS));
    const resume = this.options.resumeAfterInterruption || !this.canAutoStopAt(interruptedAt);
    if (firstTick && !resume) this.options.onInterrupted?.(interruptedAt);

    if (resume && now - this.lastResumeAttempt > 5000) {
      this.lastResumeAttempt = now;
      try {
        // expo-audio still believes it is recording: pause() syncs its state so record() resumes
        recorder.pause();
        recorder.record();
      } catch {
        // Session still taken by the other app; retry later
      }
    }
    return false;
  }

  /** Whether an alarm at `atMs` may end the night (see AUTO_STOP_MIN_MONITORING_MS) */
  canAutoStopAt(atMs: number): boolean {
    return this.isRunning && atMs - this.monitorStartTime >= AUTO_STOP_MIN_MONITORING_MS;
  }

  /** Monitored time without the user's pauses */
  private elapsedSeconds(now: number): number {
    const paused = this.userPausedMs + (this.pausedAt !== null ? Math.min(now - this.pausedAt, PAUSE_MAX_MS) : 0);
    return Math.max(0, Math.floor((now - this.monitorStartTime - paused) / 1000));
  }

  private classifyDb(db: number): SnoreIntensity {
    return snoreClassifier.classifyIntensity(db);
  }

  private processAudioFrame(db: number, now: number) {
    this.currentDb = db;
    if (db > this.peakDb) {
      this.peakDb = db;
    }

    const bucket = this.bucketAt(now);
    bucket.dbSum += db;
    bucket.frames += 1;

    // Run acoustic classifier. Confirmed events can lie a few breaths in the past.
    for (const event of snoreClassifier.processFrame(db, now)) {
      this.registerSnore(event);
    }
  }

  private bucketAt(timestampMs: number): MinuteBucket {
    const minute = Math.max(0, Math.floor((timestampMs - this.monitorStartTime) / 60000));
    return (this.minuteBuckets[minute] ??= emptyBucket());
  }

  private registerSnore(event: SnoreEventCandidate) {
    this.snoringMs += event.durationMs;

    const offsetSeconds = audioFileOffsetSeconds(event.startTime, this.recordingStartTime, this.pauses);
    const bucket = this.bucketAt(event.startTime);
    // Snoring time counts whole minutes with snoring (breaths between snores included),
    // the same way the timeline, the score and the saved night count it
    if (bucket.snoreEvents === 0) this.snoringSeconds += 60;
    bucket.snoreMs += event.durationMs;
    bucket.snorePeakSum += event.peakDb;
    bucket.snoreEvents += 1;
    if (event.peakDb > bucket.loudestSnoreDb) {
      bucket.loudestSnoreDb = event.peakDb;
      bucket.loudestSnoreOffset = offsetSeconds;
    }

    if (!this.options.saveAudio || this.options.maxClips <= 0) return;

    // Keep the loudest snores of the night as highlights, at most one per minute
    const clip: SnoreClip = {
      id: `clip-${event.startTime}`,
      timestamp: new Date(event.startTime).toISOString(),
      offsetSeconds,
      durationSeconds: Math.max(1, Math.round(event.durationMs / 1000)),
      peakDb: event.peakDb,
      avgDb: event.avgDb,
      category: this.classifyDb(event.peakDb),
      audioUri: '',
    };
    const minuteOf = (c: SnoreClip) =>
      Math.floor((new Date(c.timestamp).getTime() - this.monitorStartTime) / 60000);
    const sameMinute = this.detectedClips.findIndex((c) => minuteOf(c) === minuteOf(clip));
    if (sameMinute >= 0) {
      if (this.detectedClips[sameMinute].peakDb < clip.peakDb) this.detectedClips[sameMinute] = clip;
      return;
    }
    if (this.detectedClips.length < this.options.maxClips) {
      this.detectedClips.push(clip);
      return;
    }
    let quietest = 0;
    this.detectedClips.forEach((c, i) => {
      if (c.peakDb < this.detectedClips[quietest].peakDb) quietest = i;
    });
    if (this.detectedClips[quietest].peakDb < clip.peakDb) this.detectedClips[quietest] = clip;
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
        // Also after an interruption (isRecording false): stop() finalizes the m4a file
        await recorder.stop();
      } catch (err) {
        console.warn('Error stopping recording:', err);
      }
      uri = recorder.uri;
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
    // A night cut short by an interruption ends there, not when the user opens the app
    const now = this.interruptedAt ?? Date.now();
    // If stopped during delay, monitoring was active for 0 seconds
    const startTime = Math.min(this.monitorStartTime, now);
    const totalSeconds = Math.max(1, this.elapsedSeconds(now));
    this.pausedAt = null;
    this.pauseEndsAt = null;

    const keepAudio =
      this.options.saveAudio && (this.snoringMs > 0 || !!this.options.keepFullRecording);
    const finalUri = await this.releaseRecorder(!keepAudio);

    const timeline = buildTimeline(this.minuteBuckets, startTime, !!finalUri);

    // Assign final audio URI to recorded clips, in chronological order
    const clips = finalUri
      ? this.detectedClips
          .map((c) => ({ ...c, audioUri: finalUri }))
          .sort((a, b) => a.offsetSeconds - b.offsetSeconds)
      : [];

    return {
      audioUri: finalUri,
      startTime,
      endTime: now,
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
    storedUri: string,
    offsetSeconds: number,
    durationSeconds: number,
    onEnd: () => void
  ): Promise<boolean> {
    try {
      this.stopPlayback();

      // A missing file would play silence without any error
      const audioUri = resolveAppFileUri(storedUri);
      if (!(await FileSystem.getInfoAsync(audioUri)).exists) {
        console.warn('Recording not found:', audioUri);
        return false;
      }

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
