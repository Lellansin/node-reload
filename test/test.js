var fs = require('fs');
var reload = require('../');
var data = reload('./data');

// print data from module every sec
setInterval(function() {
  console.log(data.name);
}, 1000);

// update file every 3 secs
setInterval(function() {
  var data = '{ "name":"' + Math.random() + '" }';
  fs.writeFile('./data.json', data);
}, 3000);