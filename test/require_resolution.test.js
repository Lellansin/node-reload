// Module resolution inside reloaded code.
var assert = require('assert');
var reload = require('../');
var helpers = require('./helpers');

var dir = helpers.sandbox('req');

module.exports = [
  {
    name: 'require: relative require of a file created after startup resolves',
    fn: function(done) {
      // the old vm-based implementation resolved './extra' from lib/ and
      // failed with MODULE_NOT_FOUND on every flush
      helpers.write(dir, 'main.js', 'module.exports = { tag: "one" };');
      var m = reload('./.tmp/req/main');
      assert.strictEqual(m.tag, 'one');

      helpers.write(dir, 'extra.js', 'module.exports = "extra-loaded";');
      helpers.write(dir, 'main.js', 'module.exports = { tag: "two", extra: require("./extra") };');
      helpers.waitFor(function() { return m.tag === 'two'; }, 10000, function(err) {
        if (err) return done(err);
        try {
          assert.strictEqual(m.extra, 'extra-loaded',
            'relative require inside a reloaded module must resolve from the module directory');
          done();
        } catch (e) { done(e); }
      });
    }
  },
  {
    name: 'require: reloaded modules can use builtins',
    fn: function(done) {
      helpers.write(dir, 'builtin.js', 'module.exports = { len: 0 };');
      var data = reload('./.tmp/req/builtin');

      helpers.write(dir, 'builtin.js',
        'var path = require("path");\nmodule.exports = { len: path.join("a", "b").length };');
      helpers.waitFor(function() { return data.len === 3; }, 10000, function(err) {
        if (err) return done(err);
        try {
          assert.strictEqual(data.len, 3);
          done();
        } catch (e) { done(e); }
      });
    }
  }
];
