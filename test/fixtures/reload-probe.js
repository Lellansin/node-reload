// Test fixture for child-process tests in edge.test.js.
// Spawned as `node reload-probe.js [-d]` with cwd pointing at a sandbox
// that contains probe.json.
var Path = require('path');
var reload = require(Path.join(__dirname, '..', '..', 'index.js'));

var data = reload(Path.join(process.cwd(), 'probe'));
console.log('LOADED v=' + data.v);
process.exit(0); // reload() registered a persistent watcher; do not wait for it
