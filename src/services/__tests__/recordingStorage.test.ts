import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SleepSession, TimelineSample } from '../../types/session';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// File system: a set of existing mockFiles, with every call logged in order
const mockFiles = new Set<string>();
const mockCalls: string[] = [];
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  cacheDirectory: 'file:///cache/',
  getInfoAsync: jest.fn(async (uri: string) => ({ exists: mockFiles.has(uri), size: 1000 })),
  deleteAsync: jest.fn(async (uri: string) => {
    mockCalls.push(`delete ${uri}`);
    mockFiles.delete(uri);
  }),
}));

const mockExtract = jest.fn(async (_src: string, ranges: { start: number; end: number }[], dest: string) => {
  mockCalls.push(`extract ${dest}`);
  mockFiles.add(dest);
  let out = 0;
  return ranges.map((r) => {
    const copied = { ...r, outStart: out };
    out += r.end - r.start;
    return copied;
  });
});
jest.mock('../../../modules/audio-segments', () => ({
  audioSegmentsAvailable: () => true,
  extractSegments: (...args: unknown[]) => (mockExtract as (...a: unknown[]) => unknown)(...args),
}));

// eslint-disable-next-line import/first -- after the mocks
import { compactRecording } from '../recordingStorage';
// eslint-disable-next-line import/first
import { getSessions, patchSession, saveSession } from '../storage';

const NIGHT = 'file:///docs/ExpoAudio/night.m4a';
const sample = (m: number, offset?: number): TimelineSample => ({
  offsetMinutes: m,
  timeFormatted: '01:00',
  db: 40,
  category: offset === undefined ? 'quiet' : 'loud',
  snoreSeconds: offset === undefined ? 0 : 10,
  snoreDb: offset === undefined ? 0 : 60,
  ...(offset === undefined ? {} : { audioOffsetSeconds: offset }),
});
const night = (extra: Partial<SleepSession> = {}): SleepSession => ({
  id: 'n1',
  startTime: '2026-10-01T22:00:00.000Z',
  endTime: '2026-10-02T05:00:00.000Z',
  delayMinutes: 0,
  totalDurationSeconds: 25200,
  snoreDurationSeconds: 120,
  snoreScore: 30,
  quietPercent: 90,
  lightPercent: 0,
  loudPercent: 10,
  epicPercent: 0,
  peakDb: 70,
  timeline: [sample(0), sample(1, 100), sample(2, 1000)],
  clips: [],
  audioUri: NIGHT,
  factors: [],
  ...extra,
});

beforeEach(async () => {
  await AsyncStorage.clear();
  mockFiles.clear();
  mockCalls.length = 0;
  mockExtract.mockClear();
  mockFiles.add(NIGHT);
});

describe('session writes', () => {
  it('keeps both of two concurrent changes to different fields', async () => {
    await saveSession(night());
    await Promise.all([
      patchSession('n1', (s) => ({ ...s, environment: { pollen: { grass: 10 } } })),
      patchSession('n1', (s) => ({ ...s, health: { fetchedAt: 'x' } })),
      patchSession('n1', (s) => ({ ...s, audioCompacted: true })),
    ]);
    const [stored] = await getSessions();
    expect(stored.environment).toEqual({ pollen: { grass: 10 } });
    expect(stored.health).toEqual({ fetchedAt: 'x' });
    expect(stored.audioCompacted).toBe(true);
  });
});

describe('compactRecording', () => {
  it('writes the new file, saves the night, then deletes the original', async () => {
    await saveSession(night());
    const compacted = await compactRecording(night());
    const dest = 'file:///docs/ExpoAudio/night-snoring.m4a';
    expect(mockCalls).toEqual([`extract ${dest}`, `delete ${NIGHT}`]);
    expect(compacted.audioUri).toBe(dest);
    const [stored] = await getSessions();
    expect(stored.audioCompacted).toBe(true);
    // 100 -> start of the first range (95..116), 1000 -> second range (995..1016) after 21 s
    expect(stored.timeline.map((s) => s.audioOffsetSeconds)).toEqual([undefined, 5, 26]);
  });

  it('keeps data saved meanwhile (e.g. pollen) when it saves the compacted night', async () => {
    await saveSession(night({ environment: { pollen: { birch: 3 } } }));
    await compactRecording(night()); // Caller's copy has no environment
    const [stored] = await getSessions();
    expect(stored.environment).toEqual({ pollen: { birch: 3 } });
  });

  it('never deletes the original when extraction fails', async () => {
    await saveSession(night());
    mockExtract.mockImplementationOnce(async () => {
      throw new Error('disk full');
    });
    await expect(compactRecording(night())).rejects.toThrow('disk full');
    expect(mockFiles.has(NIGHT)).toBe(true);
    expect((await getSessions())[0].audioUri).toBe(NIGHT);
  });

  it('does nothing for a night that is already compacted or has no file', async () => {
    await saveSession(night({ audioCompacted: true }));
    await compactRecording(night({ audioCompacted: true }));
    mockFiles.delete(NIGHT);
    await compactRecording(night());
    expect(mockCalls).toEqual([]);
  });

  it('drops the new copy if the night was deleted meanwhile', async () => {
    // Not saved: the night is gone
    await compactRecording(night());
    expect(mockFiles.has('file:///docs/ExpoAudio/night-snoring.m4a')).toBe(false);
    expect(mockFiles.has(NIGHT)).toBe(true);
  });
});
