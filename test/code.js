const reload = require('../');
const data = reload('./data/code');

// print data from module every sec
setInterval(function() {
  console.log(new Date, data);
}, 1000);

// If you update the `time` in data.js
// the output will change immediately
