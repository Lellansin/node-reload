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
    return { time: mtimeValue(st), size: st.size };
  } catch (e) {
    return null; // file vanished between require() and registration
  }
}

// sub-ms precision on Node >= 8.1; the getTime fallback only runs on
// Node < 8.1 (covered by the Node 4/6 CI jobs, not by coverage runs)
function mtimeValue(st) {
  /* v8 ignore next */
  return typeof st.mtimeMs === 'number' ? st.mtimeMs : st.mtime.getTime();
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

  const listener = function(curr) {
    // equal content means a startup no-op event on older runtimes only
    // (unreachable on modern runtimes, exercised on the Node 4/6 CI jobs)
    /* v8 ignore next */
    if (baseline && mtimeValue(curr) === baseline.time && curr.size === baseline.size) return;
    baseline = null;
    callback(path);
  };

  try {
    fs.watchFile(path, { persistent: true, interval: POLL_INTERVAL }, listener);
  } catch (e) {
    fs.watchFile(path, listener); // very old runtimes without the options argument
  }
};
