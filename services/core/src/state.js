// Small persistent state: which Discord event belongs to which Twitch segment,
// which clips have been posted, and whether we were live. A JSON file is plenty
// for one process; writes are atomic (temp file + rename).
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';

const empty = () => ({
  version: 1,
  events: {},            // segmentId -> { eventId, hash, start, end }
  live: { wasLive: false, activeEventId: null },
  clips: { seededAt: null, posted: [] },
});

export async function loadState(file) {
  try {
    const data = JSON.parse(await readFile(file, 'utf8'));
    return { ...empty(), ...data, live: { ...empty().live, ...data.live }, clips: { ...empty().clips, ...data.clips } };
  } catch (err) {
    if (err.code !== 'ENOENT') throw new Error(`Could not read state file ${file}: ${err.message}`);
    return empty();
  }
}

let queue = Promise.resolve();
export function saveState(file, state) {
  // Serialise writes so two jobs finishing together can't interleave.
  queue = queue.then(async () => {
    await mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(state, null, 2));
    await rename(tmp, file);
  });
  return queue;
}
