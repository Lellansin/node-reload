const fs = require('fs');
const path = require('path');
const reload = require('../');
const data = reload('./data/json'); // reload after file changed

// print data every sec
setInterval(() => {
  console.log(data.rand, data.list[0].name);
}, 1000);

// update data.json after startup
setTimeout(() => {
  const text = `{
  "rand": ${Math.random()},
  "list": [{
    "name": "Test"
  }]
}`;
  fs.writeFileSync(path.join(__dirname, './data/json.json'), text);
}, 0);
