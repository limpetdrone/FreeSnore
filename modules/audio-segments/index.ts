import { NativeModule, requireOptionalNativeModule } from 'expo-modules-core';

export interface SourceSegment {
  start: number; // Seconds in the source file
  end: number;
}

export interface CopiedSegment extends SourceSegment {
  outStart: number; // Where the segment starts in the new file (seconds)
}

declare class AudioSegmentsModule extends NativeModule {
  extractSegments(source: string, segments: SourceSegment[], destination: string): Promise<CopiedSegment[]>;
}

// Null in Expo Go, in tests and on builds without the module
const AudioSegments = requireOptionalNativeModule<AudioSegmentsModule>('AudioSegments');

export const audioSegmentsAvailable = () => AudioSegments !== null;

/**
 * Copies time ranges of an m4a file, back to back, into a new file (no re-encoding where the
 * platform allows). Ranges must be sorted and must not overlap. The returned ranges are the
 * ones actually copied: Android snaps them to audio frames.
 */
export async function extractSegments(
  source: string,
  segments: SourceSegment[],
  destination: string
): Promise<CopiedSegment[]> {
  if (!AudioSegments) throw new Error('Audio segment extraction is not available in this build');
  return AudioSegments.extractSegments(source, segments, destination);
}
