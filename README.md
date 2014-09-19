node-reload
===========

For node.js to reload the module ,which was to be load by `require`, automaticly.

**realod .js file havent support** it's only work for .json now.

Install

    npm install auto-reload

example
------------

data.json

    { "name" : "Alan" }

test.js

    var fs = require('fs');
    var reload = require('auto-reload');
    var data = reload('./data', 3000); // reload every 3 secs
    
    // print data every sec
    setInterval(function() {
        console.log(data);
    }, 1000);
    
    // update data.json every 3 secs
    setInterval(function() {
        var data = '{ "name":"' + Math.random() + '" }';
        fs.writeFile('./data.json', data);
    }, 3000);

Result:

    { name: 'Alan' }
    { name: 'Alan' }
    { name: 'Alan' }
    { name: 'Alan' }
    { name: 'Alan' }
    { name: '0.8272748321760446' }
    { name: '0.8272748321760446' }
    { name: '0.8272748321760446' }
    { name: '0.07935990858823061' }
    { name: '0.07935990858823061' }
    { name: '0.07935990858823061' }
    { name: '0.20851597073487937' }
    { name: '0.20851597073487937' }
    { name: '0.20851597073487937' }