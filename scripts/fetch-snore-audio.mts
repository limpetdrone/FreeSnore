/**
 * Downloads the snoring recordings listed in scripts/audio-fixtures/freesound-snoring.tsv
 * into scripts/audio-fixtures/downloads/ (git-ignored). Already downloaded files are skipped.
 *
 *   npm run fetch-snore-audio
 *   npm run analyze-audio -- --batch scripts/audio-fixtures/downloads
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const fixtures = new URL('./audio-fixtures/', import.meta.url).pathname;
const target = join(fixtures, 'downloads');
mkdirSync(target, { recursive: true });

const rows = readFileSync(join(fixtures, 'freesound-snoring.tsv'), 'utf8')
  .split('\n')
  .filter((line) => line.trim() && !line.startsWith('#'))
  .map((line) => line.split('\t'));

const CONCURRENCY = 4;
let downloaded = 0;
const queue = rows.filter(([id]) => !existsSync(join(target, `snore-freesound-${id}.mp3`)));

async function worker() {
  for (let row = queue.shift(); row; row = queue.shift()) {
    const [id, author, license, url] = row;
    const file = join(target, `snore-freesound-${id}.mp3`);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // Write to a temp name first so an interrupted download is retried next time
      writeFileSync(`${file}.part`, Buffer.from(await response.arrayBuffer()));
      renameSync(`${file}.part`, file);
      downloaded++;
      console.log(`  ${id} by ${decodeURIComponent(author)} (${license})`);
    } catch (e) {
      console.warn(`  ${id}: ${(e as Error).message}, skipped`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`${downloaded} new file(s) in ${target}`);
