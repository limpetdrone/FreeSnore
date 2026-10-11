import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { AppSettings, SleepSession } from '../types/session';
import { extractSegments, audioSegmentsAvailable } from '../../modules/audio-segments';
import { getSessions, getSettings, updateSession, DEFAULT_SETTINGS } from './storage';
import { nightRecordingUri } from './recordingExport';
import { compactedSession, mergeRanges, retentionAction, snoringRanges, withoutAudio } from './recordingCompaction';
import { t } from '../i18n';

const fileExists = async (uri: string) => {
  try {
    return (await FileSystem.getInfoAsync(uri)).exists;
  } catch {
    return false;
  }
};

/** Every file of a night (older nights reference the recording through their clips). */
const nightFiles = (session: SleepSession) =>
  [...new Set([nightRecordingUri(session), ...(session.clips || []).map((c) => c.audioUri)])].filter(
    (uri): uri is string => !!uri && uri.startsWith('file://')
  );

/**
 * Replaces the night's recording with one that holds only the snoring parts. Crash-safe order:
 * the new file is written and the night saved before the old file is deleted.
 */
export async function compactRecording(session: SleepSession): Promise<SleepSession> {
  const source = nightRecordingUri(session);
  if (!source || session.audioCompacted || !audioSegmentsAvailable() || !(await fileExists(source))) return session;

  const ranges = snoringRanges(session);
  if (ranges.length === 0) return deleteRecording(session); // Kept for testing only (no snoring)

  const destination = source.replace(/(\.m4a)?$/i, '-snoring.m4a');
  const copied = await extractSegments(source, ranges, destination);
  const updated = compactedSession(session, copied, destination);
  await updateSession(updated);
  await FileSystem.deleteAsync(source, { idempotent: true });
  return updated;
}

/** Deletes the night's recording; the statistics and the timeline stay. */
export async function deleteRecording(session: SleepSession): Promise<SleepSession> {
  const files = nightFiles(session);
  const updated = withoutAudio(session);
  await updateSession(updated);
  for (const uri of files) {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  }
  return updated;
}

let retentionRun: Promise<number> | null = null;

/**
 * Applies the recording settings to the saved nights: whole nights become their snoring
 * parts after `keepFullNightDays`, recordings go after `deleteAudioAfterDays`.
 * `force` compacts every whole night now. Returns the number of nights changed.
 */
export function applyRecordingRetention(force = false): Promise<number> {
  retentionRun ??= (async () => {
    try {
      const settings: AppSettings = { ...DEFAULT_SETTINGS, ...(await getSettings()) };
      const now = Date.now();
      let changed = 0;
      for (const session of await getSessions()) {
        const uri = nightRecordingUri(session);
        const hasAudio = !!uri && (await fileExists(uri));
        const action = retentionAction(
          session,
          force ? 0 : settings.keepFullNightDays,
          settings.deleteAudioAfterDays,
          hasAudio,
          now
        );
        try {
          if (action === 'delete') await deleteRecording(session);
          else if (action === 'compact') await compactRecording(session);
          if (action) changed++;
        } catch (e) {
          // One unreadable file must not stop the others; it is retried next time
          console.warn('Recording retention failed for', session.id, e);
        }
      }
      return changed;
    } finally {
      retentionRun = null;
    }
  })();
  return retentionRun;
}

export interface RecordingUsage {
  bytes: number;
  nights: number;
  wholeNights: number; // Not yet compacted
}

export async function recordingUsage(sessions: SleepSession[]): Promise<RecordingUsage> {
  const usage: RecordingUsage = { bytes: 0, nights: 0, wholeNights: 0 };
  for (const session of sessions) {
    let found = false;
    for (const uri of nightFiles(session)) {
      try {
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists) {
          usage.bytes += info.size;
          found = true;
        }
      } catch {
        // Unreadable: not counted
      }
    }
    if (found) {
      usage.nights++;
      if (!session.audioCompacted) usage.wholeNights++;
    }
  }
  return usage;
}

const BEST_OF_SNORES = 3;
const BEST_OF_SECONDS = 10; // Per snore: a few breaths

/**
 * Shares the night's loudest moments (three ~10 s snippets) as one short audio file.
 */
export async function shareBestOf(session: SleepSession): Promise<'shared' | 'missing' | 'unavailable' | 'error'> {
  const source = nightRecordingUri(session);
  if (!source || !(await fileExists(source))) return 'missing';
  if (!audioSegmentsAvailable() || !(await Sharing.isAvailableAsync())) return 'unavailable';
  const loudest = (session.timeline || [])
    .filter((s) => s.audioOffsetSeconds !== undefined && (s.snoreDb ?? 0) > 0)
    .sort((a, b) => (b.snoreDb ?? 0) - (a.snoreDb ?? 0))
    // Different moments, not one episode three times
    .filter((s, i, all) => all.findIndex((o) => Math.abs(o.offsetMinutes - s.offsetMinutes) < 5) === i)
    .slice(0, BEST_OF_SNORES);
  if (loudest.length === 0) return 'missing';

  try {
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) return 'error';
    const d = new Date(session.startTime);
    const target = `${cacheDir}FreeSnore-best-of-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}.m4a`;
    const ranges = mergeRanges(
      loudest
        .map((s) => s.audioOffsetSeconds!)
        .sort((a, b) => a - b)
        .map((o) => ({ start: Math.max(0, o - 2), end: o + BEST_OF_SECONDS - 2 }))
    );
    await extractSegments(source, ranges, target);
    await Sharing.shareAsync(target, { mimeType: 'audio/mp4', UTI: 'public.mpeg-4-audio', dialogTitle: t('bestOfTitle') });
    return 'shared';
  } catch (e) {
    console.warn('Best-of export failed:', e);
    return 'error';
  }
}
