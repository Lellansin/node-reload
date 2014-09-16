var fs = require('fs');
var reload = require('../');

// print data from module every sec
setInterval(function() {
    var data = reload('./data');
    console.log(data.name);
}, 1000);

// update file every 5 secs
setInterval(function() {
    var data = '{ "name":"' + random(100000, 999999) + '" }';
    fs.writeFile('./data.json', data);
}, 5000);

var random = function(min, max) {
    var range = max - min;
    var rand = Math.random();
    return (min + Math.round(rand * range));
};