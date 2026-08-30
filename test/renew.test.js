// renew() deep-merge semantics: cycles, arrays, shared references.
var assert = require('assert');
var reload = require('../');
var helpers = require('./helpers');

var dir = helpers.sandbox('renew');

module.exports = [
  {
    name: 'renew: circular reference (o.self = o) updates without stack overflow',
    fn: function(done) {
      helpers.write(dir, 'self.js', 'var o = { v: 1 };\no.self = o;\nmodule.exports = o;');
      var data = reload('./.tmp/renew/self');
      assert.strictEqual(data.v, 1);
      assert.strictEqual(data.self, data);

      helpers.write(dir, 'self.js', 'var o = { v: 2 };\no.self = o;\nmodule.exports = o;');
      helpers.waitFor(function() { return data.v === 2; }, 10000, function(err) {
        if (err) return done(err);
        try {
          assert.strictEqual(data.self, data, 'cycle must survive the update');
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'renew: mutually circular objects (a.b / b.a) stay consistent',
    fn: function(done) {
      helpers.write(dir, 'mutual.js',
        'var a = { n: 1 }, b = { n: 1 };\na.b = b;\nb.a = a;\nmodule.exports = { a: a, b: b };');
      var data = reload('./.tmp/renew/mutual');

      helpers.write(dir, 'mutual.js',
        'var a = { n: 2 }, b = { n: 2 };\na.b = b;\nb.a = a;\nmodule.exports = { a: a, b: b };');
      helpers.waitFor(function() { return data.a.n === 2; }, 10000, function(err) {
        if (err) return done(err);
        try {
          assert.strictEqual(data.b.n, 2);
          assert.strictEqual(data.a.b, data.b, 'mutual references must stay wired');
          assert.strictEqual(data.b.a, data.a, 'mutual references must stay wired');
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'renew: shrinking and growing arrays keep working',
    fn: function(done) {
      helpers.write(dir, 'arr.js',
        'module.exports = { list: [1, 2, 3], items: [{name:"a"},{name:"b"},{name:"c"}] };');
      var data = reload('./.tmp/renew/arr');
      var items = data.items;
      var first = items[0];
      assert.strictEqual(data.list.length, 3);

      helpers.write(dir, 'arr.js', 'module.exports = { list: [9], items: [{name:"z"}] };');
      helpers.waitFor(function() { return data.list[0] === 9; }, 10000, function(err) {
        if (err) return done(err);
        try {
          assert.strictEqual(data.list.length, 1, 'array length must shrink with the file');
          assert.strictEqual(items.length, 1, 'nested array length must shrink too');
          assert.strictEqual(data.items, items, 'array identity must be preserved');
          assert.strictEqual(data.items[0], first, 'item identity must be preserved');
          assert.strictEqual(first.name, 'z');
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'renew: shared sub-objects stay shared after an update',
    fn: function(done) {
      helpers.write(dir, 'shared.js', 'var shared = { n: 1 };\nmodule.exports = { a: shared, b: shared };');
      var data = reload('./.tmp/renew/shared');
      assert.strictEqual(data.a, data.b);

      helpers.write(dir, 'shared.js', 'var shared = { n: 2 };\nmodule.exports = { a: shared, b: shared };');
      helpers.waitFor(function() { return data.a.n === 2; }, 10000, function(err) {
        if (err) return done(err);
        try {
          assert.strictEqual(data.a, data.b, 'shared identity must survive updates');
          assert.strictEqual(data.b.n, 2);
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'renew: array <-> object switches replace the value wholesale',
    fn: function(done) {
      helpers.write(dir, 'switch.js', 'module.exports = { x: [1, 2] };');
      var data = reload('./.tmp/renew/switch');
      assert.strictEqual(Array.isArray(data.x), true);

      helpers.write(dir, 'switch.js', 'module.exports = { x: { a: 1 } };');
      helpers.waitFor(function() { return data.x && data.x.a === 1; }, 10000, function(err) {
        if (err) return done(err);
        try {
          assert.strictEqual(Array.isArray(data.x), false, 'array->object must replace wholesale');
          done();
        } catch (e) { done(e); }
      });
    }
  }
];
