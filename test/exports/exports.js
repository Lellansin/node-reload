var fs = require('fs');
var reload = require('../../');

exports.data = reload('../data');

// update file every 3 secs
setInterval(function() {
  var data = '{ "name":"' + Math.random() + '" }';
  fs.writeFile('../data.json', data);
}, 3000);