'use strict'; // required for let/const on Node.js 4

const fs = require('fs');
const Path = require('path');
const fw = require('./fileWatcher');

// poll interval (ms) used by the default watching mode
const POLL_MODE_THRESHOLD = 1000; // interval > this switches to periodic polling

const resolvedPaths = {}; // requested path -> resolved file path
const lastErrors = {};    // file path -> last reported error text
const flushers = {};      // file path -> [flush callbacks of every reload() caller]
const warned = new WeakMap(); // old exports object -> already warned about it

// reload(path[, interval])
//
// - relative `path` resolves against the directory of the file that CALLS
//   reload(); absolute paths are used as-is
// - returns the module exports, and that exact object keeps being updated
//   in place when the file changes, so references you handed out stay alive
// - without `interval` (or with interval <= 1000) the file is watched via
//   stat polling; with interval > 1000 the file is checked every `interval`
//   milliseconds instead
function reload(path, interval) {
  if (path != null && typeof path !== 'string') {
    throw new TypeError('reload: path must be a string, got ' + typeof path);
  }
  interval = normalizeInterval(interval);

  let pathPrefix = '';
  if (path == null || !path.match(/^\/|^[a-zA-Z]:|^\\/)) {
    const caller = getCallerFile();
    pathPrefix = caller ? Path.dirname(caller) : process.cwd();
  }

  const whole = getWhole(Path.join(pathPrefix, path || ''));

  const module = require(whole);
  const stat = statOf(whole);

  function flush() {
    const current = statOf(whole);
    if (!current) return; // file gone/unreadable: keep the last good data
    if (current.time === stat.time && current.size === stat.size) return;
    stat.time = current.time;
    stat.size = current.size;
    debug('it\'s time to update! ' + whole);

    try {
      const update = load(whole);
      renew(module, update, [], whole);
      delete lastErrors[whole];
    } catch (err) {
      reportError(whole, err);
    }
  }

  if (interval > POLL_MODE_THRESHOLD) {
    setInterval(flush, interval);
  } else {
    addFlusher(whole, flush);
  }
  return module;
}

function normalizeInterval(interval) {
  if (interval == null) return 0;
  const n = Number(interval);
  if (!isFinite(n) || n < 0) {
    throw new TypeError('reload: interval must be a positive number, got: ' + interval);
  }
  return n;
}

function statOf(path) {
  try {
    const st = fs.statSync(path);
    return { time: st.mtime.getTime(), size: st.size };
  } catch (e) {
    return null;
  }
}

function load(path) {
  const ext = Path.extname(path);
  if (ext === '.json') {
    return loadJson(path);
  }
  if (ext === '.js') {
    return loadCode(path);
  }
  throw new Error('Bad file extname ' + ext);
}

function loadJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

// Re-run the module through the normal require machinery instead of a vm
// sandbox: relative requires inside the module resolve from its own
// directory, the code stays in the main realm (instanceof etc. keep
// working) and no vm context leaks per reload. The fresh exports object is
// then merged into the object old references hold (see renew), while
// require.cache now points at the new module, so fresh require() calls get
// the new data as well.
function loadCode(path) {
  delete require.cache[require.resolve(path)];
  return require(path);
}

function renew(dest, src, seen, path) {
  if (!dest || !src) return;
  if (typeof dest !== 'object' && typeof dest !== 'function') return;

  // Functions and primitives keep their identity forever, so a new
  // module.exports of that kind can not be merged into the old value.
  if (typeof src !== 'object') {
    if (typeof src === 'function' && typeof dest === 'function') {
      for (const f in src) {
        if (src.hasOwnProperty(f)) {
          try { dest[f] = src[f]; } catch (e) { /* read-only property */ }
        }
      }
    }
    warnOnce(dest, path, src);
    return;
  }

  // `seen` holds flat [dest, src] pairs already being merged; it breaks
  // reference cycles and keeps shared sub-objects shared.
  for (let i = 0; i < seen.length; i += 2) {
    if (seen[i] === dest && seen[i + 1] === src) return;
  }
  seen.push(dest, src);

  let f;
  for (f in src) {
    if (!src.hasOwnProperty(f)) continue;
    const sv = src[f];
    const dv = dest[f];
    const typeSrc = typeof sv;

    // function properties can not swap their code in place either; sync
    // their own properties so they at least stay current data-wise
    if (typeSrc === 'function') {
      if (typeof dv === 'function') {
        for (const k in sv) {
          if (sv.hasOwnProperty(k)) {
            try { dv[k] = sv[k]; } catch (e) { /* read-only property */ }
          }
        }
      }
      continue;
    }

    if (sv !== null && typeSrc === 'object' && dv !== null && typeof dv === 'object') {
      if (Array.isArray(sv) !== Array.isArray(dv)) {
        dest[f] = sv; // array <-> plain object shape switch: replace wholesale
      } else {
        renew(dv, sv, seen, path); // deep update keeps nested references alive
      }
    } else {
      dest[f] = sv;
    }
  }

  // keys removed in the new module disappear from old references too
  for (f in dest) {
    if (!src.hasOwnProperty(f)) delete dest[f];
  }

  // `delete` on array elements leaves `length` untouched, so shrinking
  // arrays have to be truncated explicitly
  if (Array.isArray(dest) && Array.isArray(src)) {
    dest.length = src.length;
  }
}

function warnOnce(dest, path, src) {
  if (warned.has(dest)) return;
  warned.set(dest, true);
  const kind = typeof src;
  console.warn('reload: ' + path + ' now exports a ' + kind + ', which can not be updated in place. ' +
    (kind === 'function'
      ? 'Old function references keep running the previous code; wrap it in an object (e.g. module.exports = { handler: ... }) to get live updates.'
      : 'Old references will keep the previous value.'));
}

function addFlusher(path, fn) {
  if (!flushers[path]) {
    flushers[path] = [];
    fw.check(path, function() {
      const list = flushers[path] || [];
      for (let i = 0; i < list.length; i++) list[i]();
    });
  }
  flushers[path].push(fn);
}

function getWhole(path) {
  if (resolvedPaths[path]) return resolvedPaths[path];

  let resolved = path;
  if (fs.existsSync(path + '.js')) {
    resolved = path + '.js';
  } else if (fs.existsSync(path + '.json')) {
    resolved = path + '.json';
  } else if (!fs.existsSync(path)) {
    // nothing there (yet): let require() fail with its usual "Cannot find
    // module" error, but don't cache so a file created later still resolves
    return path;
  }

  resolvedPaths[path] = resolved;
  debug('path: ' + resolved);
  return resolved;
}

// File name of the first stack frame outside of this module, i.e. the
// script that called reload(). Returns null when it can not be determined
// (e.g. inside the node REPL).
function getCallerFile() {
  const origPrepare = Error.prepareStackTrace;
  Error.prepareStackTrace = function(_, stack) {
    return stack;
  };
  const err = new Error();
  Error.captureStackTrace(err, getCallerFile);
  const stack = err.stack;
  Error.prepareStackTrace = origPrepare;

  const self = Path.resolve(__filename);
  for (let i = 0; i < stack.length; i++) {
    const file = stack[i].getFileName();
    if (file && Path.resolve(file) !== self) return file;
  }
  return null;
}

function reportError(path, err) {
  const text = (err && (err.stack || err.message)) || String(err);
  if (lastErrors[path] === text) return; // same failure as before: stay quiet
  lastErrors[path] = text;
  console.error('reload: failed to update ' + path + '\n  ' + text);
}

var debug = function() {};
(function enableDebug() {
  for (var i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '-d') {
      debug = console.log;
      return;
    }
  }
  if (/(^|[\s,])auto-reload([\s,]|$)/.test(process.env.NODE_DEBUG || '')) {
    debug = console.log;
  }
})();

module.exports = reload;
