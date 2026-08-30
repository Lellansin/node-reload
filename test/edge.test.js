// Edge cases: argument validation, exotic exports, error shapes, the
// legacy watchFile fallback, debug switching and REPL-style usage.
// Some cases run child processes (they exercise argv/env depending code).
var assert = require('assert');
var fs = require('fs');
var Path = require('path');
var execFile = require('child_process').execFile;
var reload = require('../');
var fw = require('../lib/fileWatcher');
var helpers = require('./helpers');

var dir = helpers.sandbox('edge');
var FIXTURE = Path.join(__dirname, 'fixtures', 'reload-probe.js');
var TICK = 1100; // > 1000 -> periodic check mode

helpers.write(dir, 'probe.json', '{"v":1}');

function runNode(args, env, cb) {
  execFile(process.execPath, args, { cwd: dir, env: env }, cb);
}

module.exports = [
  {
    name: 'edge: reload() without a path throws',
    fn: function(done) {
      assert.throws(function() { reload(); }, /Cannot find module/);
      done();
    }
  },
  {
    name: 'edge: non-string path throws a TypeError',
    fn: function(done) {
      assert.throws(function() { reload(123); }, TypeError);
      assert.throws(function() { reload(true); }, TypeError);
      done();
    }
  },
  {
    name: 'edge: interval 0 behaves like the default watch mode',
    fn: function(done) {
      helpers.write(dir, 'zero.json', '{"v":1}');
      var data = reload('./.tmp/edge/zero', 0);
      assert.strictEqual(data.v, 1);
      helpers.write(dir, 'zero.json', '{"v":2}');
      helpers.waitFor(function() { return data.v === 2; }, 10000, done);
    }
  },
  {
    name: 'edge: reloading a directory throws',
    fn: function(done) {
      var sub = Path.join(dir, 'just-a-dir');
      fs.mkdirSync(sub);
      assert.throws(function() { reload('./.tmp/edge/just-a-dir'); }, /Cannot find module/);
      done();
    }
  },
  {
    name: 'edge: deleting a watched file keeps the last data without errors',
    fn: function(done) {
      helpers.write(dir, 'gone.json', '{"v":1}');
      var data = reload('./.tmp/edge/gone');
      assert.strictEqual(data.v, 1);
      helpers.captureConsole('error', function(calls, next) {
        fs.unlinkSync(Path.join(dir, 'gone.json'));
        setTimeout(next, 1600); // let the watcher notice the deletion
      }, function(err, calls) {
        if (err) return done(err);
        try {
          assert.strictEqual(data.v, 1, 'last good data must survive deletion');
          assert.strictEqual(calls.length, 0, 'deletion must not be reported as an update failure');
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'edge: primitive export replaced by an object leaves the old value alone',
    fn: function(done) {
      helpers.write(dir, 'prim-obj.js', 'module.exports = 5;');
      var data = reload('./.tmp/edge/prim-obj');
      assert.strictEqual(data, 5);

      helpers.write(dir, 'prim-obj.js', 'module.exports = { v: 2 };');
      var resolved = Path.join(dir, 'prim-obj.js');
      helpers.waitFor(function() { return require(resolved).v === 2; }, 10000, function(err) {
        if (err) return done(err);
        try {
          assert.strictEqual(data, 5, 'old primitive reference is untouched');
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'edge: null export replaced by an object does not crash',
    fn: function(done) {
      helpers.write(dir, 'null-obj.js', 'module.exports = null;');
      var data = reload('./.tmp/edge/null-obj');
      assert.strictEqual(data, null);

      helpers.write(dir, 'null-obj.js', 'module.exports = { v: 2 };');
      var resolved = Path.join(dir, 'null-obj.js');
      helpers.waitFor(function() { return require(resolved).v === 2; }, 10000, function(err) {
        if (err) return done(err);
        try {
          assert.strictEqual(data, null, 'old null reference is untouched');
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'edge: object values can switch to and from null',
    fn: function(done) {
      helpers.write(dir, 'nulls.js', 'module.exports = { x: null, y: { a: 1 } };');
      var data = reload('./.tmp/edge/nulls');

      helpers.write(dir, 'nulls.js', 'module.exports = { x: { b: 2 }, y: null };');
      helpers.waitFor(function() { return data.x && data.x.b === 2; }, 10000, function(err) {
        if (err) return done(err);
        try {
          assert.strictEqual(data.y, null, 'object -> null must replace the value');
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'edge: own properties of a function export are synced',
    fn: function(done) {
      helpers.write(dir, 'fntags.js',
        "var f = function () { return 'v1'; };\nf.tag = 'a';\nmodule.exports = f;");
      var fn = reload('./.tmp/edge/fntags');
      assert.strictEqual(fn.tag, 'a');

      helpers.write(dir, 'fntags.js',
        "var f = function () { return 'v1'; };\nf.tag = 'b';\nmodule.exports = f;");
      helpers.waitFor(function() { return fn.tag === 'b'; }, 10000, function(err) {
        if (err) return done(err);
        try {
          assert.strictEqual(fn(), 'v1', 'function body still can not be swapped');
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'edge: read-only properties of a function export are skipped safely',
    fn: function(done) {
      helpers.write(dir, 'fnro.js',
        "var f = function () { return 'v1'; };\n" +
        "Object.defineProperty(f, 'tag', { value: 'a' });\n" +
        'module.exports = f;');
      var fn = reload('./.tmp/edge/fnro');
      assert.strictEqual(fn.tag, 'a');

      helpers.write(dir, 'fnro.js',
        "var f = function () { return 'v1'; };\nf.tag = 'b';\nmodule.exports = f;");
      helpers.waitFor(function() { return false; }, 1800, function() {
        // waitFor only served as a paced sleep; the write itself must not crash
        try {
          assert.strictEqual(fn.tag, 'a', 'read-only property must be skipped');
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'edge: function property replacing a non-function value is kept out',
    fn: function(done) {
      helpers.write(dir, 'fnslot.js', 'module.exports = { x: 5 };');
      var data = reload('./.tmp/edge/fnslot');

      helpers.write(dir, 'fnslot.js', 'module.exports = { x: function () { return 1; } };');
      helpers.waitFor(function() { return false; }, 1800, function() {
        try {
          assert.strictEqual(data.x, 5, 'old non-function value must not become a function');
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'edge: read-only properties of function properties are skipped safely',
    fn: function(done) {
      helpers.write(dir, 'fnpro.js',
        "var g = function () {};\n" +
        "Object.defineProperty(g, 'meta', { value: 'a' });\n" +
        'module.exports = { fn: g };');
      var data = reload('./.tmp/edge/fnpro');
      assert.strictEqual(data.fn.meta, 'a');

      helpers.write(dir, 'fnpro.js',
        "var g = function () {};\ng.meta = 'b';\nmodule.exports = { fn: g };");
      helpers.waitFor(function() { return false; }, 1800, function() {
        try {
          assert.strictEqual(data.fn.meta, 'a', 'read-only property must be skipped');
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'edge: prototype properties of exports are ignored',
    fn: function(done) {
      helpers.write(dir, 'proto.js',
        'module.exports = Object.create({ inherited: 1 });\nmodule.exports.own = 2;');
      var data = reload('./.tmp/edge/proto');
      assert.strictEqual(data.own, 2);
      assert.strictEqual(data.inherited, 1); // readable through the prototype

      helpers.write(dir, 'proto.js',
        'module.exports = Object.create({ inherited: 1 });\nmodule.exports.own = 8;');
      helpers.waitFor(function() { return data.own === 8; }, 10000, function(err) {
        if (err) return done(err);
        try {
          // renew works on own properties only: the prototype of the old
          // reference is untouched, and inherited keys never become own keys
          assert.strictEqual(data.inherited, 1, 'prototype of old reference is not renewed');
          assert(!data.hasOwnProperty('inherited'), 'inherited keys must not become own keys');
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'edge: repeated function exports warn only once',
    timeout: 30000,
    fn: function(done) {
      helpers.write(dir, 'warnonce.js', "module.exports = function () { return 1; };");
      var fn = reload('./.tmp/edge/warnonce');

      helpers.captureConsole('warn', function(calls, next) {
        helpers.write(dir, 'warnonce.js', "module.exports = function () { return 2; };");
        helpers.waitFor(function() { return calls.length > 0; }, 10000, next);
      }, function(err) {
        if (err) return done(err);
        helpers.captureConsole('warn', function(calls, next) {
          helpers.write(dir, 'warnonce.js', "module.exports = function () { return 3; };");
          setTimeout(next, 1800); // at least two checks pass
        }, function(err2, calls) {
          if (err2) return done(err2);
          try {
            assert.strictEqual(calls.length, 0, 'the warning must fire only once');
            done();
          } catch (e) { done(e); }
        });
      });
    }
  },
  {
    name: 'edge: a module throwing a string is reported raw and recovers',
    timeout: 30000,
    fn: function(done) {
      helpers.write(dir, 'strerr.js', 'module.exports = { v: 1 };');
      var data = reload('./.tmp/edge/strerr', TICK);
      assert.strictEqual(data.v, 1);

      helpers.write(dir, 'strerr.js', "module.exports = (function () { throw 'boom-str'; })();");
      helpers.waitFor(function() { return false; }, TICK * 2 + 400, function() {
        try {
          assert.strictEqual(data.v, 1);
          helpers.write(dir, 'strerr.js', 'module.exports = { v: 3 };');
          helpers.waitFor(function() { return data.v === 3; }, 10000, function(err2) {
            if (err2) return done(err2);
            try {
              assert.strictEqual(data.v, 3, 'recovers after a thrown string');
              done();
            } catch (e) { done(e); }
          });
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'edge: a module throwing null is reported via String() and recovers',
    timeout: 30000,
    fn: function(done) {
      helpers.write(dir, 'nullerr.js', 'module.exports = { v: 1 };');
      var data = reload('./.tmp/edge/nullerr', TICK);
      assert.strictEqual(data.v, 1);

      helpers.write(dir, 'nullerr.js', 'module.exports = (function () { throw null; })();');
      helpers.waitFor(function() { return false; }, TICK * 2 + 400, function() {
        try {
          assert.strictEqual(data.v, 1);
          helpers.write(dir, 'nullerr.js', 'module.exports = { v: 3 };');
          helpers.waitFor(function() { return data.v === 3; }, 10000, function(err2) {
            if (err2) return done(err2);
            try {
              assert.strictEqual(data.v, 3, 'recovers after a thrown null');
              done();
            } catch (e) { done(e); }
          });
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'edge: fileWatcher.check tolerates a missing file at registration',
    fn: function(done) {
      var missing = Path.join(dir, 'fw-missing.json');
      var fired = false;
      var secondCallbackFired = false;
      fw.check(missing, function() { fired = true; });
      fw.check(missing, function() { secondCallbackFired = true; }); // deduped, never fires

      helpers.write(dir, 'fw-missing.json', '{"a":1}');
      helpers.waitFor(function() { return fired; }, 8000, function(err) {
        if (err) return done(err);
        try {
          assert.strictEqual(fired, true, 'creation must be reported as a change');
          assert.strictEqual(secondCallbackFired, false, 'duplicate check() must be a no-op');
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'edge: legacy fs.watchFile without an options argument still works',
    fn: function(done) {
      var orig = fs.watchFile;
      fs.watchFile = function(file, options, listener) {
        if (typeof options === 'object' && typeof listener === 'function') {
          throw new Error('simulated old runtime without the options argument');
        }
        return orig.apply(fs, arguments);
      };

      helpers.write(dir, 'legacy.json', '{"v":1}');
      var data;
      try {
        data = reload('./.tmp/edge/legacy');
      } finally {
        fs.watchFile = orig;
      }
      assert.strictEqual(data.v, 1);

      helpers.write(dir, 'legacy.json', '{"v":2}');
      helpers.waitFor(function() { return data.v === 2; }, 10000, done);
    }
  },
  {
    name: 'edge: -d argv flag enables debug output (child process)',
    fn: function(done) {
      runNode([FIXTURE, '-d'], process.env, function(err, stdout) {
        if (err) return done(err);
        try {
          assert(stdout.indexOf('LOADED v=1') !== -1, 'fixture must load probe.json, got: ' + JSON.stringify(stdout));
          assert(stdout.indexOf('path:') !== -1, 'expected debug output, got: ' + JSON.stringify(stdout));
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'edge: NODE_DEBUG=auto-reload enables debug output (child process)',
    fn: function(done) {
      var env = Object.assign({}, process.env, { NODE_DEBUG: 'auto-reload' });
      runNode([FIXTURE], env, function(err, stdout) {
        if (err) return done(err);
        try {
          assert(stdout.indexOf('LOADED v=1') !== -1, 'fixture must load probe.json, got: ' + JSON.stringify(stdout));
          assert(stdout.indexOf('path:') !== -1, 'expected debug output, got: ' + JSON.stringify(stdout));
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'edge: debug output is silent by default (child process)',
    fn: function(done) {
      runNode([FIXTURE], process.env, function(err, stdout) {
        if (err) return done(err);
        try {
          assert(stdout.indexOf('LOADED v=1') !== -1, 'fixture must load probe.json, got: ' + JSON.stringify(stdout));
          assert.strictEqual(stdout.indexOf('path:'), -1, 'must be silent without -d/NODE_DEBUG');
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'edge: eval context falls back to process.cwd() for relative paths',
    fn: function(done) {
      var env = Object.assign({}, process.env, {
        NR_LIB: Path.join(__dirname, '..', 'index.js')
      });
      var script = "var d = require(process.env.NR_LIB)('./probe'); " +
        "console.log('VAL=' + d.v); process.exit(0);";
      runNode(['-e', script], env, function(err, stdout) {
        if (err) return done(err);
        try {
          assert(stdout.indexOf('VAL=1') !== -1, 'expected VAL=1 from cwd resolution, got: ' + JSON.stringify(stdout));
          done();
        } catch (e) { done(e); }
      });
    }
  }
];
