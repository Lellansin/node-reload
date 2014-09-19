var data = require('./exports')

// print data from module every sec
setInterval(function() {
    console.log(data);
}, 1000);