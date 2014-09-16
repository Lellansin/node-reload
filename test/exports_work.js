var reload = require('./exports_yes')

// print data from module every sec
setInterval(function() {
    console.log(reload().name);
}, 1000);