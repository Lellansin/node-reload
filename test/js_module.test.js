// JS module hot reload tests (default watch mode).
var assert = require('assert');
var Path = require('path');
var reload = require('../');
var helpers = require('./helpers');

var dir = helpers.sandbox('js');

module.exports = [
  {
    name: 'js: object exports update in place, nested identity preserved',
    fn: function(done) {
      helpers.write(dir, 'mod.js', 'module.exports = { obj: { n: 1 } };');
      var data = reload('./.tmp/js/mod');
      var obj = data.obj;

      helpers.write(dir, 'mod.js', 'module.exports = { obj: { n: 2 } };');
      helpers.waitFor(function() { return obj.n === 2; }, 10000, function(err) {
        if (err) return done(err);
        try {
          assert.strictEqual(data.obj, obj, 'nested object identity must be preserved');
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'js: data properties update while function properties keep old code',
    fn: function(done) {
      helpers.write(dir, 'mix.js', 'module.exports = { n: 1, fn: function () { return "a1"; } };');
      var data = reload('./.tmp/js/mix');
      assert.strictEqual(data.fn(), 'a1');

      helpers.write(dir, 'mix.js', 'module.exports = { n: 2, fn: function () { return "a2"; } };');
      helpers.waitFor(function() { return data.n === 2; }, 10000, function(err) {
        if (err) return done(err);
        try {
          assert.strictEqual(typeof data.fn, 'function');
          assert.strictEqual(data.fn(), 'a1', 'function bodies can not be swapped in place (documented)');
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'js: function export warns and keeps running the old code',
    fn: function(done) {
      helpers.write(dir, 'fnexport.js', 'module.exports = function () { return "v1"; };');
      var fn = reload('./.tmp/js/fnexport');
      assert.strictEqual(fn(), 'v1');

      helpers.captureConsole('warn', function(calls, next) {
        helpers.write(dir, 'fnexport.js', 'module.exports = function () { return "v2"; };');
        helpers.waitFor(function() { return calls.length > 0; }, 10000, next);
      }, function(err, calls) {
        if (err) return done(err);
        try {
          assert.strictEqual(fn(), 'v1', 'function export keeps running the old code');
          assert(calls.join('\n').indexOf('can not be updated in place') !== -1,
            'should warn once about function exports, got: ' + JSON.stringify(calls));
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'js: fresh require() sees the new data after a reload',
    fn: function(done) {
      helpers.write(dir, 'cohere.js', 'module.exports = { v: 1 };');
      var data = reload('./.tmp/js/cohere');

      helpers.write(dir, 'cohere.js', 'module.exports = { v: 2 };');
      helpers.waitFor(function() { return data.v === 2; }, 10000, function(err) {
        if (err) return done(err);
        try {
          var fresh = require(Path.join(dir, 'cohere.js'));
          assert.strictEqual(fresh.v, 2, 'require cache must reflect the new data');
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'js: primitive export warns and does not destroy old data',
    fn: function(done) {
      helpers.write(dir, 'prim.js', 'module.exports = { v: 1 };');
      var data = reload('./.tmp/js/prim');

      helpers.captureConsole('warn', function(calls, next) {
        helpers.write(dir, 'prim.js', 'module.exports = 5;');
        helpers.waitFor(function() { return calls.length > 0; }, 10000, next);
      }, function(err, calls) {
        if (err) return done(err);
        try {
          assert.strictEqual(data.v, 1, 'old object must be kept when export becomes a primitive');
          assert(calls.join('\n').indexOf('can not be updated in place') !== -1,
            'should warn about primitive exports, got: ' + JSON.stringify(calls));
          done();
        } catch (e) { done(e); }
      });
    }
  }
];
