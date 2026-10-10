/**
 * Runs real audio files through the app's SnoreClassifier, without a phone.
 *
 *   node scripts/analyze-snore-audio.mts [options] <file[@peakDb]>...
 *   node scripts/analyze-snore-audio.mts --demo
 *
 * Files are decoded (afconvert on macOS, ffmpeg elsewhere), concatenated and turned into the
 * same 250 ms loudness envelope the app gets from expo-audio metering (dBFS + 95, clamped 30-95).
 * Envelope RMS is close to, but not identical with, native metering: expect a few dB offset.
 *
 * Options:
 *   --raw               Keep the original levels (use for recordings made by the app itself).
 *                       Otherwise each file is scaled so its loudest frames reach @peakDb (default 62).
 *   --fan <db>          Mix in steady brown noise at this level (app dB), like a fan or AC.
 *   --sensitivity <s>   low | medium | high (default medium), same thresholds as the app.
 *   --envelope          Print the loudness envelope, one line per second.
 *   --demo              Run the built-in scenarios on scripts/audio-fixtures.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

// The app sources use extensionless imports (Metro style); resolve them to .ts for Node
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.startsWith('.')) return nextResolve(`${specifier}.ts`, context);
      throw error;
    }
  },
});
const { SnoreClassifier } = await import('../src/services/snoreDetector');
const { buildTimeline, emptyBucket } = await import('../src/services/timeline');

const SAMPLE_RATE = 16000;
const FRAME_MS = 250;
const FRAME_SAMPLES = (SAMPLE_RATE * FRAME_MS) / 1000;
const SENSITIVITY_MIN_DB = { low: 52, medium: 44, high: 38 } as const; // Same as RecordScreen
const FIXTURES = new URL('./audio-fixtures/', import.meta.url).pathname;

type Sensitivity = keyof typeof SENSITIVITY_MIN_DB;

function decode(path: string): Float32Array {
  const dir = mkdtempSync(join(tmpdir(), 'snore-'));
  const wav = join(dir, 'decoded.wav');
  try {
    try {
      execFileSync('afconvert', ['-f', 'WAVE', '-d', `LEI16@${SAMPLE_RATE}`, '-c', '1', path, wav], {
        stdio: 'pipe',
      });
    } catch {
      execFileSync('ffmpeg', ['-v', 'error', '-i', path, '-ac', '1', '-ar', `${SAMPLE_RATE}`, wav], {
        stdio: 'pipe',
      });
    }
    return readWav16(readFileSync(wav));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function readWav16(buf: Buffer): Float32Array {
  let pos = 12;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    if (id === 'data') {
      const count = Math.floor(Math.min(size, buf.length - pos - 8) / 2);
      const out = new Float32Array(count);
      for (let i = 0; i < count; i++) out[i] = buf.readInt16LE(pos + 8 + i * 2) / 32768;
      return out;
    }
    pos += 8 + size + (size % 2);
  }
  throw new Error('No data chunk in decoded WAV');
}

const frameDbfs = (samples: Float32Array): number[] => {
  const out: number[] = [];
  for (let i = 0; i + FRAME_SAMPLES <= samples.length; i += FRAME_SAMPLES) {
    let sum = 0;
    for (let j = i; j < i + FRAME_SAMPLES; j++) sum += samples[j] * samples[j];
    out.push(10 * Math.log10(sum / FRAME_SAMPLES + 1e-12));
  }
  return out;
};

/** Scales a clip so its loudest frames (98th percentile) reach `peakDb` on the app scale. */
function normalize(samples: Float32Array, peakDb: number): Float32Array {
  const sorted = frameDbfs(samples).sort((a, b) => a - b);
  const loud = sorted[Math.floor(sorted.length * 0.98)] ?? -100;
  const gain = Math.pow(10, (peakDb - 95 - loud) / 20);
  return samples.map((s) => s * gain);
}

function addFan(samples: Float32Array, fanDb: number): Float32Array {
  // Brown noise: integrated white noise, the typical spectrum of fans and air conditioners
  const noise = new Float32Array(samples.length);
  let last = 0;
  let seed = 12345;
  const random = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  for (let i = 0; i < noise.length; i++) {
    last = (last + 0.02 * random()) / 1.02;
    noise[i] = last;
  }
  const rms = Math.sqrt(noise.reduce((a, b) => a + b * b, 0) / noise.length);
  const gain = Math.pow(10, (fanDb - 95) / 20) / rms;
  return samples.map((s, i) => s + noise[i] * gain);
}

function concat(parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

interface Analysis {
  seconds: number;
  events: { startSec: number; durationMs: number; peakDb: number }[];
  snoreSeconds: number;
  envelope: number[];
}

function analyze(samples: Float32Array, sensitivity: Sensitivity): Analysis {
  // Same mapping as audioService.onFrameTick
  const envelope = frameDbfs(samples).map((d) => Math.max(30, Math.min(95, Math.round(d + 95))));
  const classifier = new SnoreClassifier();
  classifier.setMinThreshold(SENSITIVITY_MIN_DB[sensitivity]);
  const events: Analysis['events'] = [];
  envelope.forEach((db, i) => {
    for (const e of classifier.processFrame(db, i * FRAME_MS)) {
      events.push({ startSec: e.startTime / 1000, durationMs: e.durationMs, peakDb: e.peakDb });
    }
  });
  return {
    seconds: (envelope.length * FRAME_MS) / 1000,
    events,
    snoreSeconds: Math.round(events.reduce((n, e) => n + e.durationMs, 0) / 1000),
    envelope,
  };
}

function printEnvelope(envelope: number[], events: Analysis['events']) {
  const framesPerSecond = 1000 / FRAME_MS;
  for (let s = 0; s * framesPerSecond < envelope.length; s++) {
    const frames = envelope.slice(s * framesPerSecond, (s + 1) * framesPerSecond);
    const bars = frames.map((db) => ' ▁▂▃▄▅▆▇█'[Math.max(0, Math.min(8, Math.round((db - 30) / 6)))]).join('');
    const mark = events.some((e) => Math.floor(e.startSec) === s) ? ' ◀ snore' : '';
    console.log(`${String(s).padStart(4)}s ${bars} ${Math.max(...frames)} dB${mark}`);
  }
}

function report(label: string, a: Analysis, verbose: boolean) {
  console.log(
    `\n${label}\n  ${a.seconds.toFixed(0)} s audio → ${a.events.length} snores, ${a.snoreSeconds} s snoring`
  );
  if (verbose) {
    for (const e of a.events) {
      console.log(`    ${e.startSec.toFixed(2).padStart(7)} s  ${e.durationMs} ms  peak ${e.peakDb} dB`);
    }
  }
}

function printTimeline(a: Analysis) {
  const buckets: Record<number, ReturnType<typeof emptyBucket>> = {};
  a.envelope.forEach((db, i) => {
    const b = (buckets[Math.floor((i * FRAME_MS) / 60000)] ??= emptyBucket());
    b.dbSum += db;
    b.frames++;
  });
  for (const e of a.events) {
    const b = buckets[Math.floor(e.startSec / 60)];
    b.snoreMs += e.durationMs;
    b.snorePeakSum += e.peakDb;
    b.snoreEvents++;
  }
  console.log('  minute  room dB  snoring  category');
  for (const s of buildTimeline(buckets, 0, false)) {
    console.log(
      `  ${String(s.offsetMinutes).padStart(6)}  ${String(s.db).padStart(7)}  ${String(s.snoreSeconds).padStart(5)} s  ${s.category}`
    );
  }
}

function speech(seconds: number): Float32Array {
  // macOS text-to-speech as a stand-in for a partner talking or a TV
  const dir = mkdtempSync(join(tmpdir(), 'snore-say-'));
  const aiff = join(dir, 'speech.aiff');
  const sentence =
    'I was thinking about the trip next weekend, maybe we should leave early on Saturday morning. ';
  try {
    execFileSync('say', ['-o', aiff, sentence.repeat(8)], { stdio: 'pipe' });
    const all = decode(aiff);
    return all.subarray(0, Math.min(all.length, seconds * SAMPLE_RATE));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const silence = (seconds: number, db = 33) => addFan(new Float32Array(seconds * SAMPLE_RATE), db);

function knocks(seconds: number): Float32Array {
  // Short loud impacts at irregular times (bed, door, movement)
  const out = silence(seconds);
  for (const at of [2.0, 5.5, 6.3, 13.0, 21.7, 24.1]) {
    const start = Math.floor(at * SAMPLE_RATE);
    for (let i = 0; i < 0.3 * SAMPLE_RATE && start + i < out.length; i++) {
      out[start + i] += 0.3 * Math.exp(-i / 800) * Math.sin(i * 0.3);
    }
  }
  return out;
}

function runDemo() {
  const clips = [
    'snore-freesound-234867.mp3',
    'snore-freesound-114609.mp3',
    'snore-bigsoundbank-0170.mp3',
  ].map((f) => ({ name: f, samples: decode(join(FIXTURES, f)) }));

  console.log('Each clip alone (scaled to 62 dB peaks, medium sensitivity):');
  for (const c of clips) report(c.name, analyze(normalize(c.samples, 62), 'medium'), true);

  const allSnore = concat(clips.map((c) => normalize(c.samples, 62)));
  report('All clips + fan at 48 dB', analyze(addFan(allSnore, 48), 'medium'), false);
  report('Quiet snoring (50 dB peaks), high sensitivity', analyze(concat(clips.map((c) => normalize(c.samples, 50))), 'high'), false);
  report('Quiet snoring (50 dB peaks), low sensitivity', analyze(concat(clips.map((c) => normalize(c.samples, 50))), 'low'), false);
  report('Fan only, 55 dB, 3 min (expect 0)', analyze(silence(180, 55), 'medium'), false);
  report('Speech only, 60 s (expect 0)', analyze(concat([silence(2), normalize(speech(60), 62)]), 'medium'), true);
  report('Knocks only, 30 s (expect 0)', analyze(knocks(30), 'medium'), false);
  report(
    'Snoring, then speech, then snoring (speech must add nothing)',
    analyze(concat([normalize(clips[0].samples, 62), normalize(speech(45), 62), normalize(clips[2].samples, 62)]), 'medium'),
    true
  );
}

// --- CLI ---
const args = process.argv.slice(2);
if (args.includes('--demo')) {
  runDemo();
} else {
  let raw = false;
  let fan: number | null = null;
  let sensitivity: Sensitivity = 'medium';
  let showEnvelope = false;
  const files: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--raw') raw = true;
    else if (a === '--fan') fan = Number(args[++i]);
    else if (a === '--sensitivity') sensitivity = args[++i] as Sensitivity;
    else if (a === '--envelope') showEnvelope = true;
    else files.push(a);
  }
  if (files.length === 0 || !(sensitivity in SENSITIVITY_MIN_DB)) {
    console.log('Usage: node scripts/analyze-snore-audio.mts [--raw] [--fan db] [--sensitivity low|medium|high] [--envelope] <file[@peakDb]>...');
    process.exit(1);
  }
  const parts = files.map((spec) => {
    const [path, peak] = spec.split('@');
    const samples = decode(path);
    return raw ? samples : normalize(samples, peak ? Number(peak) : 62);
  });
  let samples = concat(parts);
  if (fan !== null) samples = addFan(samples, fan);
  const result = analyze(samples, sensitivity);
  if (showEnvelope) printEnvelope(result.envelope, result.events);
  report(files.map((f) => basename(f)).join(' + '), result, true);
  printTimeline(result);
}
