// Manual demo for observing memory behaviour while reloading a large json.
// Run: node --expose-gc test/memory_leak.js   (heap snapshots via your profiler)
var reload = require('../');
var data = reload('./data.json', 5000);

// print data + memory every sec
setInterval(function() {
  var mem = process.memoryUsage();
  console.log(new Date, data.name, 'rss=' + Math.round(mem.rss / 1048576) + 'MB');
}, 1000);
