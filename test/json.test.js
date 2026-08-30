// JSON hot reload tests (default watch mode).
var assert = require('assert');
var reload = require('../');
var helpers = require('./helpers');

var dir = helpers.sandbox('json');

module.exports = [
  {
    name: 'json: updates the same reference when the file changes',
    fn: function(done) {
      helpers.write(dir, 'data.json', '{"v":1,"name":"alan"}');
      var data = reload('./.tmp/json/data');
      assert.strictEqual(data.v, 1);
      assert.strictEqual(data.name, 'alan');
      var ref = data;

      helpers.write(dir, 'data.json', '{"v":2,"name":"bob"}');
      helpers.waitFor(function() { return data.v === 2; }, 10000, function(err) {
        if (err) return done(err);
        try {
          assert.strictEqual(data.name, 'bob');
          assert.strictEqual(data, ref, 'old reference must be updated in place');
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'json: nested references are preserved AND updated (deep renew)',
    fn: function(done) {
      helpers.write(dir, 'nested.json', '{"a":{"x":1},"list":[{"name":"alan"}]}');
      var data = reload('./.tmp/json/nested');
      var inner = data.a;
      var item = data.list[0];

      helpers.write(dir, 'nested.json', '{"a":{"x":2},"list":[{"name":"bob"}]}');
      helpers.waitFor(function() { return inner.x === 2; }, 10000, function(err) {
        if (err) return done(new Error('nested reference did not get the update (deep renew broken): ' + err.message));
        try {
          assert.strictEqual(data.a, inner, 'nested object identity must be preserved');
          assert.strictEqual(data.list[0], item, 'array item identity must be preserved');
          assert.strictEqual(item.name, 'bob');
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'json: added keys appear, removed keys disappear, type switches replace',
    fn: function(done) {
      helpers.write(dir, 'shape.json', '{"keep":1,"gone":2,"shape":{"a":1}}');
      var data = reload('./.tmp/json/shape');

      helpers.write(dir, 'shape.json', '{"keep":1,"added":3,"shape":"flat"}');
      helpers.waitFor(function() { return data.added === 3; }, 10000, function(err) {
        if (err) return done(err);
        try {
          assert(!('gone' in data), 'removed key must disappear from old references');
          assert.strictEqual(data.shape, 'flat', 'object->string switch must replace the value');
          done();
        } catch (e) { done(e); }
      });
    }
  }
];
