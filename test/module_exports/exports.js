var fs = require('fs');
var reload = require('../../');

module.exports = reload('../data');

// update file every 3 secs
setInterval(function() {
    var data = '{ "name":"' + random(100000, 999999) + '" }';
    fs.writeFile('../data.json', data);
}, 3000);

var random = function(min, max) {
    var range = max - min;
    var rand = Math.random();
    return (min + Math.round(rand * range));
};