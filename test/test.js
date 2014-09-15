var reload = require('../');

setInterval(function() {
    var data = reload('./data');
    console.log(data.name);
}, 1000);