const fs = require('fs');
const path = require('path');
const reload = require('../');

const INTERVAL = 3000;
const data = reload('./data.js', INTERVAL);

// print data from module every sec
setInterval(function() {
  console.log(new Date, data.time);
}, 1000);

setInterval(() => {
  fs.writeFileSync(path.join(__dirname, './data.js'), `
module.exports = {
  name: '${Date.now()}'
};
  `);
}, INTERVAL);
