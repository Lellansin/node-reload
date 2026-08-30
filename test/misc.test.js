// Path resolution, argument validation, interval mode, multi-caller support.
var assert = require('assert');
var Path = require('path');
var reload = require('../');
var helpers = require('./helpers');

var dir = helpers.sandbox('misc');

module.exports = [
  {
    name: 'misc: extensionless paths resolve to .json',
    fn: function(done) {
      helpers.write(dir, 'extless.json', '{"ok":1}');
      var data = reload('./.tmp/misc/extless');
      assert.strictEqual(data.ok, 1);
      done();
    }
  },
  {
    name: 'misc: absolute paths work',
    fn: function(done) {
      helpers.write(dir, 'abs.json', '{"abs":true}');
      var data = reload(Path.join(dir, 'abs.json'));
      assert.strictEqual(data.abs, true);
      done();
    }
  },
  {
    name: 'misc: missing file throws and is not negatively cached',
    fn: function(done) {
      assert.throws(function() {
        reload('./.tmp/misc/nope');
      }, /Cannot find module/);

      helpers.write(dir, 'nope.json', '{"ok":1}');
      var data = reload('./.tmp/misc/nope');
      assert.strictEqual(data.ok, 1);
      done();
    }
  },
  {
    name: 'misc: invalid interval arguments throw a TypeError',
    fn: function(done) {
      assert.throws(function() {
        reload('./.tmp/misc/any', 'abc');
      }, TypeError);
      assert.throws(function() {
        reload('./.tmp/misc/any', -5);
      }, TypeError);
      done();
    }
  },
  {
    name: 'misc: interval mode skips unchanged files and reloads changed ones',
    timeout: 25000,
    fn: function(done) {
      helpers.write(dir, 'counter.js',
        'global.__nrEvalCount = (global.__nrEvalCount || 0) + 1;\nmodule.exports = { n: global.__nrEvalCount };');
      var data = reload('./.tmp/misc/counter', 1100);
      assert.strictEqual(data.n, 1);

      // several checks pass with no file change: must not re-evaluate
      setTimeout(function() {
        try {
          assert.strictEqual(data.n, 1, 'unchanged file must not be re-evaluated');
          helpers.write(dir, 'counter.js',
            'global.__nrEvalCount = (global.__nrEvalCount || 0) + 1;\nmodule.exports = { n: global.__nrEvalCount };');
          helpers.waitFor(function() { return data.n === 2; }, 10000, function(err) {
            if (err) return done(err);
            try {
              assert.strictEqual(data.n, 2);
              done();
            } catch (e) { done(e); }
          });
        } catch (e) { done(e); }
      }, 2600);
    }
  },
  {
    name: 'misc: two reload() callers of the same file both get updates',
    fn: function(done) {
      helpers.write(dir, 'twice.json', '{"v":1}');
      var a = reload('./.tmp/misc/twice');
      var b = reload('./.tmp/misc/twice');
      assert.strictEqual(a.v, 1);
      assert.strictEqual(b.v, 1);

      helpers.write(dir, 'twice.json', '{"v":9}');
      helpers.waitFor(function() { return a.v === 9; }, 10000, function(err) {
        if (err) return done(err);
        try {
          assert.strictEqual(b.v, 9, 'every reload() caller of a file must be notified');
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'misc: unsupported extensions throw',
    fn: function(done) {
      helpers.write(dir, 'file.txt', 'hello');
      assert.throws(function() {
        reload('./.tmp/misc/file');
      });
      done();
    }
  }
];
