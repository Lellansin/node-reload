var reload = require('./exports_not')

// print data from module every sec
setInterval(function() {
    console.log(reload.data.name);
}, 1000);