// Shared helpers for the test suite. Dependency-free, Node >= 4 compatible
// (no async/await, no arrow functions, callback style only).
var fs = require('fs');
var Path = require('path');

var TMP_ROOT = Path.join(__dirname, '.tmp');

// Fresh directory for one test suite, relative to test/.
function sandbox(name) {
  var dir = Path.join(TMP_ROOT, name);
  rmdirRecursive(dir);
  mkdirp(dir);
  return dir;
}

function mkdirp(p) {
  var abs = Path.isAbsolute(p);
  var parts = p.split(Path.sep);
  var cur = abs ? Path.sep : '';
  for (var i = 0; i < parts.length; i++) {
    if (!parts[i]) continue;
    cur = Path.join(cur, parts[i]);
    if (!fs.existsSync(cur)) fs.mkdirSync(cur);
  }
}

function rmdirRecursive(p) {
  var entries;
  try {
    entries = fs.readdirSync(p);
  } catch (e) {
    return;
  }
  entries.forEach(function(entry) {
    var full = Path.join(p, entry);
    if (fs.statSync(full).isDirectory()) rmdirRecursive(full);
    else fs.unlinkSync(full);
  });
  try { fs.rmdirSync(p); } catch (e) { /* already gone */ }
}

function busyWait(ms) {
  var end = Date.now() + ms;
  while (Date.now() < end) { /* spin */ }
}

function write(dir, name, content) {
  // old Node StatWatchers only compare millisecond mtime, so make sure
  // consecutive writes always land on different mtime ticks
  busyWait(5);
  fs.writeFileSync(Path.join(dir, name), content);
}

// Poll until check() returns a truthy value without throwing.
// Gives up after `timeout` ms and calls cb(err).
function waitFor(check, timeout, cb) {
  var started = Date.now();
  (function poll() {
    var ok = false;
    try { ok = check(); } catch (e) { ok = false; }
    if (ok) return cb(null, ok);
    if (Date.now() - started > timeout) {
      return cb(new Error('waitFor: condition not met within ' + timeout + 'ms'));
    }
    setTimeout(poll, 60);
  })();
}

// Temporarily replace console[method] while `run` executes.
// `run` receives (calls, next); cb receives (err, calls).
function captureConsole(method, run, cb) {
  var calls = [];
  var orig = console[method];
  console[method] = function() {
    var parts = [];
    for (var i = 0; i < arguments.length; i++) parts.push(String(arguments[i]));
    calls.push(parts.join(' '));
  };
  run(calls, function(err) {
    console[method] = orig;
    cb(err, calls);
  });
}

exports.sandbox = sandbox;
exports.write = write;
exports.waitFor = waitFor;
exports.captureConsole = captureConsole;
exports.rmdirRecursive = rmdirRecursive;
exports.TMP_ROOT = TMP_ROOT;
