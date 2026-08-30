'use strict'; // required for const on Node.js 4

const fs = require('fs');

const WATCHED = {};

// Poll interval (ms) for the default (no interval argument) mode.
// fs.watchFile defaults to ~5s polling, which makes updates feel broken;
// 500ms is still cheap (one stat call per file per tick).
const POLL_INTERVAL = 500;

function statSnapshot(path) {
  try {
    const st = fs.statSync(path);
    return { time: st.mtime.getTime(), size: st.size };
  } catch (e) {
    return null;
  }
}

// Register `callback` to fire when the file at `path` changes.
// Idempotent: only one stat watcher is kept per path.
exports.check = function(path, callback) {
  if (WATCHED[path]) return;
  WATCHED[path] = true;

  // Content snapshot from registration time. If the file was already
  // rewritten before the watcher's first poll ran, that first poll would
  // otherwise become the baseline and swallow the change entirely.
  let baseline = statSnapshot(path);

  const listener = function(curr, prev) {
    if (baseline) {
      // skip the initial poll and no-op stat bumps
      if (curr.mtime.getTime() === baseline.time && curr.size === baseline.size) return;
      baseline = null; // only the first poll is filtered against the snapshot
    }
    callback(path);
  };

  try {
    fs.watchFile(path, { persistent: true, interval: POLL_INTERVAL }, listener);
  } catch (e) {
    fs.watchFile(path, listener); // very old runtimes without the options argument
  }
};
