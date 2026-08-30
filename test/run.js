// Minimal dependency-free test runner. Node >= 4 compatible.
// Usage: node test/run.js   (or: npm test)
var Path = require('path');
var helpers = require('./helpers');

var suites = [
  './json.test.js',
  './js_module.test.js',
  './renew.test.js',
  './require_resolution.test.js',
  './errors.test.js',
  './misc.test.js',
  './edge.test.js'
];

var passed = 0;
var failed = 0;
var failures = [];

helpers.rmdirRecursive(helpers.TMP_ROOT);
runSuite(0);

function runSuite(index) {
  if (index >= suites.length) return finish();
  var file = suites[index];
  var tests = require(file);
  console.log('# ' + file);
  var i = 0;
  (function next() {
    if (i >= tests.length) return runSuite(index + 1);
    var t = tests[i++];
    var timeout = t.timeout || 20000;
    process.stdout.write('  - ' + t.name + ' ... ');
    var settled = false;
    var timer = setTimeout(function() {
      settle(new Error('test timed out after ' + timeout + 'ms'));
    }, timeout);
    try {
      t.fn(function(err) { settle(err); });
    } catch (e) {
      settle(e);
    }
    function settle(err) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) {
        failed++;
        failures.push('  - ' + t.name + '\n      ' + ((err && err.stack) || err));
        console.log('FAIL');
      } else {
        passed++;
        console.log('ok');
      }
      next();
    }
  })();
}

function finish() {
  console.log('');
  console.log('passed: ' + passed + ', failed: ' + failed);
  if (failed) {
    console.log('\nfailures:');
    failures.forEach(function(f) { console.log(f); });
  }
  // wait briefly so coverage dumps of recently exited child processes
  // land before the runner (and the c8 report) is done
  setTimeout(function() {
    helpers.rmdirRecursive(helpers.TMP_ROOT);
    process.exit(failed ? 1 : 0);
  }, 500);
}
