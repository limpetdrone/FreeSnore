import type { SleepSession } from '../types/session';

export interface AudioRange {
  start: number; // Seconds
  end: number;
}

export interface CopiedRange extends AudioRange {
  outStart: number; // Start in the compacted file
}

// Around each snoring minute's loudest snore: the timeline replays from 3 s before it for 15 s
const TIMELINE_BEFORE = 5;
const TIMELINE_AFTER = 16;
// Around each highlight clip (played with 1 s padding)
const CLIP_PADDING = 3;
// Ranges closer than this are kept as one (no audible cut between them)
const MERGE_GAP = 2;

/** The parts of a night's recording worth keeping: everything the app can replay. */
export function snoringRanges(session: SleepSession): AudioRange[] {
  const ranges: AudioRange[] = [];
  for (const s of session.timeline || []) {
    if (s.audioOffsetSeconds !== undefined && (s.snoreSeconds ?? 0) > 0) {
      ranges.push({ start: s.audioOffsetSeconds - TIMELINE_BEFORE, end: s.audioOffsetSeconds + TIMELINE_AFTER });
    }
  }
  for (const c of session.clips || []) {
    ranges.push({ start: c.offsetSeconds - CLIP_PADDING, end: c.offsetSeconds + c.durationSeconds + CLIP_PADDING });
  }
  return mergeRanges(ranges.map((r) => ({ start: Math.max(0, r.start), end: r.end })));
}

/** Sorted, non-overlapping ranges (as the native extractor requires). */
export function mergeRanges(ranges: AudioRange[]): AudioRange[] {
  const sorted = [...ranges].filter((r) => r.end > r.start).sort((a, b) => a.start - b.start);
  const merged: AudioRange[] = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (last && r.start - last.end <= MERGE_GAP) last.end = Math.max(last.end, r.end);
    else merged.push({ ...r });
  }
  return merged;
}

/** Position of a source offset in the compacted file, or undefined if it was not kept. */
export function remapOffset(offset: number, copied: CopiedRange[]): number | undefined {
  // Android snaps range starts to audio frames (some ms): allow a little slack
  const range = copied.find((r) => offset >= r.start - 0.5 && offset <= r.end);
  if (!range) return undefined;
  return Math.round((range.outStart + Math.max(0, offset - range.start)) * 100) / 100;
}

/** The session pointing into the compacted recording. */
export function compactedSession(session: SleepSession, copied: CopiedRange[], audioUri: string): SleepSession {
  return {
    ...session,
    audioUri,
    audioCompacted: true,
    timeline: (session.timeline || []).map((s) => {
      if (s.audioOffsetSeconds === undefined) return s;
      const offset = remapOffset(s.audioOffsetSeconds, copied);
      const { audioOffsetSeconds: _old, ...rest } = s;
      return offset === undefined ? rest : { ...rest, audioOffsetSeconds: offset };
    }),
    clips: (session.clips || []).flatMap((c) => {
      const offset = remapOffset(c.offsetSeconds, copied);
      return offset === undefined ? [] : [{ ...c, offsetSeconds: offset, audioUri }];
    }),
  };
}

/** The session after its recording was deleted: statistics stay, replay goes. */
export function withoutAudio(session: SleepSession): SleepSession {
  const { audioUri: _uri, ...rest } = session;
  return {
    ...rest,
    audioRemoved: true,
    timeline: (session.timeline || []).map(({ audioOffsetSeconds: _o, ...s }) => s),
    clips: [],
  };
}

const DAY_MS = 24 * 3600 * 1000;

export type RetentionAction = 'compact' | 'delete' | null;

/** What the retention settings ask for a night now. */
export function retentionAction(
  session: SleepSession,
  keepFullNightDays: number | null | undefined,
  deleteAudioAfterDays: number | null | undefined,
  hasAudio: boolean,
  now: number
): RetentionAction {
  if (!hasAudio) return null;
  const age = now - new Date(session.endTime).getTime();
  if (deleteAudioAfterDays != null && age >= deleteAudioAfterDays * DAY_MS) return 'delete';
  if (keepFullNightDays != null && !session.audioCompacted && age >= keepFullNightDays * DAY_MS) return 'compact';
  return null;
}
