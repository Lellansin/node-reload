// Error handling: broken files, old-data preservation, error suppression.
// Uses interval mode (deterministic ticks) instead of fs.watchFile polling.
var assert = require('assert');
var reload = require('../');
var helpers = require('./helpers');

var dir = helpers.sandbox('err');
var TICK = 1100; // > 1000 -> periodic check mode

module.exports = [
  {
    name: 'errors: broken json keeps old data, recovers when fixed',
    timeout: 25000,
    fn: function(done) {
      helpers.write(dir, 'data.json', '{"v":1}');
      var data = reload('./.tmp/err/data', TICK);
      assert.strictEqual(data.v, 1);

      helpers.captureConsole('error', function(calls, next) {
        helpers.write(dir, 'data.json', '{broken');
        helpers.waitFor(function() { return calls.length > 0; }, 10000, next);
      }, function(err, calls) {
        if (err) return done(err);
        try {
          assert.strictEqual(data.v, 1, 'old data must survive a failed update');
          assert(calls.join('\n').indexOf('failed to update') !== -1, 'failure must be reported');

          helpers.write(dir, 'data.json', '{"v":3}');
          helpers.waitFor(function() { return data.v === 3; }, 10000, function(err2) {
            if (err2) return done(err2);
            try {
              assert.strictEqual(data.v, 3, 'must recover after the file is fixed');
              done();
            } catch (e) { done(e); }
          });
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'errors: identical consecutive failures are logged only once',
    timeout: 30000,
    fn: function(done) {
      helpers.write(dir, 'dup.json', '{"v":1}');
      var data = reload('./.tmp/err/dup', TICK);

      helpers.captureConsole('error', function(calls, next) {
        helpers.write(dir, 'dup.json', '{"v":');            // broken, size 6
        setTimeout(function() {
          helpers.write(dir, 'dup.json', '{"v":    ');      // still broken, same parse error, new size
          setTimeout(next, TICK * 2 + 400);                 // let at least 2 more checks pass
        }, TICK + 400);
      }, function(err, calls) {
        if (err) return done(err);
        try {
          assert.strictEqual(data.v, 1);
          assert.strictEqual(calls.length, 1,
            'the same failure must be logged once, not on every tick; got: ' +
            JSON.stringify(calls));
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'errors: broken js syntax keeps old data and recovers',
    timeout: 25000,
    fn: function(done) {
      helpers.write(dir, 'broken.js', 'module.exports = { v: 1 };');
      var data = reload('./.tmp/err/broken', TICK);
      assert.strictEqual(data.v, 1);

      helpers.write(dir, 'broken.js', 'module.exports = { v: 2 '); // syntax error
      helpers.captureConsole('error', function(calls, next) {
        helpers.waitFor(function() { return calls.length > 0; }, 10000, next);
      }, function(err, calls) {
        if (err) return done(err);
        try {
          assert.strictEqual(data.v, 1, 'syntax errors must not touch old data');
          assert(calls.join('\n').indexOf('failed to update') !== -1, 'failure must be reported');
          helpers.write(dir, 'broken.js', 'module.exports = { v: 3 };');
          helpers.waitFor(function() { return data.v === 3; }, 10000, function(err2) {
            if (err2) return done(err2);
            try {
              assert.strictEqual(data.v, 3, 'must recover after the syntax error is fixed');
              done();
            } catch (e) { done(e); }
          });
        } catch (e) { done(e); }
      });
    }
  }
];
