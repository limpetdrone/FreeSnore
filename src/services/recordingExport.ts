import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { SleepSession } from '../types/session';
import { t } from '../i18n';

const EXPORT_PREFIX = 'FreeSnore-';

/** The night's whole recording (older sessions only reference it through their clips). */
export function nightRecordingUri(session: SleepSession): string | undefined {
  return session.audioUri ?? session.clips?.find((c) => c.audioUri)?.audioUri;
}

/** Size of the night's recording in bytes, or null when there is none on this device. */
export async function nightRecordingSize(session: SleepSession): Promise<number | null> {
  const uri = nightRecordingUri(session);
  if (!uri) return null;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists ? info.size : null;
  } catch {
    return null;
  }
}

const exportFileName = (session: SleepSession) => {
  const d = new Date(session.startTime);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${EXPORT_PREFIX}${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.m4a`;
};

/**
 * Opens the share sheet with the night's recording under a readable file name
 * (save to Files, AirDrop, Drive, e-mail...). The caller shows the message for a failure.
 */
export async function exportNightRecording(session: SleepSession): Promise<'shared' | 'missing' | 'unavailable' | 'error'> {
  const uri = nightRecordingUri(session);
  if (!uri || (await nightRecordingSize(session)) === null) return 'missing';
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';

  try {
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) return 'error';
    // Only one exported copy is kept: remove the ones from earlier exports (~100 MB each)
    const old = await FileSystem.readDirectoryAsync(cacheDir);
    await Promise.all(
      old
        .filter((name) => name.startsWith(EXPORT_PREFIX))
        .map((name) => FileSystem.deleteAsync(cacheDir + name, { idempotent: true }))
    );

    const target = cacheDir + exportFileName(session);
    await FileSystem.copyAsync({ from: uri, to: target });
    await Sharing.shareAsync(target, {
      mimeType: 'audio/mp4',
      UTI: 'public.mpeg-4-audio',
      dialogTitle: t('exportRecordingBtn'),
    });
    return 'shared';
  } catch (e) {
    console.warn('Recording export failed:', e);
    return 'error';
  }
}
