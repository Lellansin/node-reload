const fs = require('fs');
const list = Array(10000000).fill(0).map((_, i) => i).join(','); 

// update file every 3 secs
setInterval(function() {
  const data = '{ "name":"' + Math.random() + '", "test":"1234","hi":{"hello":"world", "name":"Allansin", "age":12345678, "list":["test", 1234, { "hello":"world" }]}, "tmp": [' + list + ']  }';
  fs.writeFileSync('./data.json', data);
}, 3000);

