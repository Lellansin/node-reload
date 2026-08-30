var fs = require('fs');
var path = require('path');
var reload = require('../../');

module.exports = reload('../data.json');

// update file every 3 secs
setInterval(function() {
  var data = '{ "name":"' + Math.random() + '" }';
  fs.writeFile(path.join(__dirname, '..', 'data.json'), data, function(err) {
    if (err) console.error(err);
  });
}, 3000);
