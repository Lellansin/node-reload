var fs = require('fs');
var reload = require('../');

exports.data = reload('./data');

// update file every 5 secs
setInterval(function() {
    var data = '{ "name":"' + random(100000, 999999) + '" }';
    fs.writeFile('./data.json', data);
    console.log('file update!');
}, 5000);

var random = function(min, max) {
    var range = max - min;
    var rand = Math.random();
    return (min + Math.round(rand * range));
};