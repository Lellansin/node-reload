const reload = require('../');
const data = reload('./data', 5000);
const heapdump = require('heapdump');

const save = () => {
  gc();
  heapdump.writeSnapshot('./' + Date.now() + '.heapsnapshot');
};

// print data from module every sec
setInterval(function() {
  console.log(new Date, data.name);
}, 1000);

// setInterval(() => {
//   save();
// }, 1000 * 30);

