const fs = require('fs');
const reload = require('../');
const data = reload('./data/json'); // reload after file changed

// print data every sec
setInterval(() => {
  console.log(data);
}, 1000);

// update data.json every 3 secs
setInterval(() => {
  const text = '{ "rand":' + Math.random() + ' }';
  fs.writeFileSync('./data/json.json', text);
}, 3000);
